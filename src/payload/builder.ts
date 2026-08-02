import path from "node:path";
import { exec, resolveExecutable } from "../core/executor.js";
import { ToolErrorCode } from "../core/errors.js";
import { ensureDir, rmTree } from "../core/fileUtils.js";
import { logger } from "../core/logger.js";
import type { Abi, FlutterBuildMode, SynthesizedPayload } from "../types.js";

const ABI_PLATFORM_FLAG: Record<Abi, string> = {
  "arm64-v8a": "android-arm64",
  "armeabi-v7a": "android-arm",
  x86: "android-x86",
  x86_64: "android-x64",
};

export interface FlutterPayloadOptions {
  flutterProjectPath: string;
  targetAbis: Abi[];
  buildMode: FlutterBuildMode;
  /** Where to write the synthesized payload (a directory). */
  outputDir: string;
  flutterBin?: string;
  timeoutMs?: number;
}

const RELEASE_MODES: FlutterBuildMode[] = ["release", "profile", "debug"];

/**
 * Orchestrates a Flutter build and extracts the artifacts needed for APK
 * injection (libflutter.so, libapp.so, flutter_assets, icudtl.dat).
 */
export async function buildFlutterPayload(opts: FlutterPayloadOptions): Promise<SynthesizedPayload> {
  const flutter = await resolveExecutable("flutter", "FLUTTER_BIN");
  const projectPath = path.resolve(opts.flutterProjectPath);
  await ensureDir(projectPath);

  const buildMode = RELEASE_MODES.includes(opts.buildMode) ? opts.buildMode : "release";
  const targetAbis: Abi[] =
    opts.targetAbis.length > 0 ? opts.targetAbis : ["arm64-v8a", "armeabi-v7a"];
  const uniqueAbis = [...new Set(targetAbis)];

  const versionInfo = await flutterVersion(flutter, opts.timeoutMs);
  const engineVersion = parseEngineVersion(versionInfo);

  logger.info("flutter payload build", {
    projectPath,
    mode: buildMode,
    abis: uniqueAbis,
    flutter: versionInfo.trim().split("\n")[0],
  });

  const staging = path.join(opts.outputDir, ".staging");
  await ensureDir(staging);
  const builtApk = path.join(staging, "payload-app.apk");

  const targetPlatform = uniqueAbis.map((a) => ABI_PLATFORM_FLAG[a]).join(",");
  const buildFlag = buildMode === "release" ? "--release" : buildMode === "profile" ? "--profile" : "--debug";

  try {
    await exec(
      flutter,
      [
        "build", "apk",
        buildFlag,
        "--target-platform", targetPlatform,
        "--output", builtApk,
        "--no-pub",
      ],
      { cwd: projectPath, timeoutMs: opts.timeoutMs },
    );
  } catch (err) {
    // Some Flutter versions require pub get on a clean checkout. Retry once.
    logger.warn("flutter build failed, retrying with pub get", { err: (err as Error).message });
    await exec(flutter, ["pub", "get"], { cwd: projectPath, timeoutMs: opts.timeoutMs });
    await exec(
      flutter,
      [
        "build", "apk",
        buildFlag,
        "--target-platform", targetPlatform,
        "--output", builtApk,
      ],
      { cwd: projectPath, timeoutMs: opts.timeoutMs },
    );
  }

  return extractPayloadFromApk(builtApk, opts.outputDir, {
    buildMode,
    abis: uniqueAbis,
    engineVersion,
  });
}

async function flutterVersion(flutter: string, timeoutMs?: number): Promise<string> {
  try {
    const res = await exec(flutter, ["--version"], { timeoutMs });
    return res.stdout;
  } catch (err) {
    logger.warn("flutter --version failed", { err: (err as Error).message });
    return "";
  }
}

function parseEngineVersion(versionInfo: string): string | null {
  const match = /Flutter\s+([\d.]+)/.exec(versionInfo);
  return match?.[1] ?? null;
}

interface ExtractMeta {
  buildMode: FlutterBuildMode;
  abis: Abi[];
  engineVersion: string | null;
}

/**
 * Extract libflutter.so, libapp.so, and flutter_assets from the built APK
 * into the payload layout used by the injector.
 */
export async function extractPayloadFromApk(
  builtApk: string,
  outputDir: string,
  meta: ExtractMeta,
): Promise<SynthesizedPayload> {
  const { default: AdmZip } = await import("adm-zip");
  const zip = new AdmZip(builtApk);
  const entries = zip.getEntries();

  await rmTree(outputDir);
  await ensureDir(outputDir);

  const files: { libs: string[]; assets: string[] } = {
    libs: [],
    assets: [],
  };
  const warnings: string[] = [];

  let copiedSoCount = 0;
  let copiedAssetCount = 0;
  let appSizeBytes: number | null = null;

  for (const entry of entries) {
    const name = entry.entryName;
    if (entry.isDirectory) continue;

    // Native libraries
    const libMatch = /^lib\/([^/]+)\/(libflutter\.so|libapp\.so)$/.exec(name);
    if (libMatch) {
      const abi = libMatch[1]!;
      if (!meta.abis.includes(abi as Abi)) continue;
      const libName = libMatch[2]!;
      const dest = path.join(outputDir, "lib", abi, libName);
      await ensureDir(path.dirname(dest));
      await zip.extractEntryTo(entry, path.dirname(dest), false, true);
      files.libs.push(`lib/${abi}/${libName}`);
      copiedSoCount++;
      if (libName === "libapp.so") appSizeBytes = entry.header.size;
      continue;
    }

    // Flutter asset bundle (contains icudtl.dat on modern Flutter).
    const assetsMatch = /^assets\/flutter_assets\/(.*)$/.exec(name);
    if (assetsMatch) {
      const dest = path.join(outputDir, "flutter_assets", assetsMatch[1]!);
      await ensureDir(path.dirname(dest));
      await zip.extractEntryTo(entry, path.dirname(dest), false, true);
      files.assets.push(assetsMatch[1]!);
      copiedAssetCount++;
      continue;
    }
  }

  if (copiedSoCount === 0) {
    warnings.push(
      "No libflutter.so/libapp.so found in built APK for requested ABIs. " +
        "Verify the Flutter project targets Android and that target ABIs are supported.",
    );
  }
  if (copiedAssetCount === 0) {
    warnings.push("No flutter_assets found in built APK; the Dart entrypoint will fail to run.");
  }

  // Infer actual engine version from libflutter.so build info if not from CLI.
  const engineVersion = meta.engineVersion ?? null;

  const payload: SynthesizedPayload = {
    payloadDir: outputDir,
    buildMode: meta.buildMode,
    abis: meta.abis.filter((a) => files.libs.some((f) => f.includes(`/${a}/`))),
    files,
    engineVersion,
    appSizeBytes,
    warnings,
  };
  return payload;
}

export { ToolErrorCode };

/** Compute the size of a payload directory (for reporting). */
export async function payloadSizeBytes(payloadDir: string): Promise<number> {
  const { listTree } = await import("../core/fileUtils.js");
  const entries = await listTree(payloadDir);
  return entries.reduce((sum, e) => sum + e.size, 0);
}

export async function extractEngineVersionFromLib(libflutterPath: string): Promise<string | null> {
  const { readFile } = await import("node:fs/promises");
  try {
    const buf = await readFile(libflutterPath);
    const text = buf.toString("latin1");
    const match = /Flutter\s+([\d.]+)/.exec(text);
    return match?.[1] ?? null;
  } catch {
    return null;
  }
}
