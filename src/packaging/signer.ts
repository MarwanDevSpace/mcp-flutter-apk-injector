import path from "node:path";
import { exec, resolveExecutable, resolveBuildToolsBinary, ensureDir } from "../core/executor.js";
import { ToolErrorCode } from "../core/errors.js";
import { fileSize } from "../core/fileUtils.js";
import { logger } from "../core/logger.js";
import { Apktool } from "../decompiler/apktool.js";
import type { KeystoreConfig, SigningResult } from "../types.js";

export interface RebuildOptions {
  apktool?: Apktool;
  apktoolPath?: string;
  javaPath?: string;
  timeoutMs?: number;
}

/** Rebuild a decompiled workspace into a raw (unsigned) APK. */
export async function rebuildApk(
  workspaceDir: string,
  outputApkPath: string,
  options: RebuildOptions = {},
): Promise<void> {
  const apktool = options.apktool ?? (await Apktool.create(options));
  await apktool.build(workspaceDir, outputApkPath);
  logger.info("apk rebuilt", { outputApkPath });
}

export interface AlignOptions {
  alignment?: number;
  sdkRootEnv?: string;
  timeoutMs?: number;
}

/** Run zipalign on an APK (default 4-byte alignment). */
export async function zipalignApk(
  inputApk: string,
  outputApk: string,
  options: AlignOptions = {},
): Promise<{ aligned: boolean; toolPath: string }> {
  const tool = await resolveBuildToolsBinary("zipalign", options.sdkRootEnv);
  const alignment = options.alignment ?? 4;
  await exec(tool, ["-f", String(alignment), inputApk, outputApk], {
    timeoutMs: options.timeoutMs,
  });
  return { aligned: true, toolPath: tool };
}

export interface SignOptions {
  keystoreConfig?: KeystoreConfig;
  sdkRootEnv?: string;
  timeoutMs?: number;
  cacheDir?: string;
}

const DEBUG_KEYSTORE_PASS = "android";
const DEBUG_KEY_ALIAS = "androiddebugkey";

/** Generate a debug keystore using keytool (idempotent by path). */
export async function ensureDebugKeystore(
  cacheDir: string,
  config?: KeystoreConfig,
): Promise<{ keystorePath: string; keystorePass: string; keyAlias: string; keyPass: string }> {
  const keystorePath = config?.keystorePath ?? path.join(cacheDir, "debug.keystore");
  const keystorePass = config?.keystorePass ?? DEBUG_KEYSTORE_PASS;
  const keyAlias = config?.keyAlias ?? DEBUG_KEY_ALIAS;
  const keyPass = config?.keyPass ?? keystorePass;

  const existing = await fileSizeSafe(keystorePath);
  if (existing === null) {
    const keytool = await resolveKeytool();
    await ensureDir(path.dirname(keystorePath));
    await exec(
      keytool,
      [
        "-genkeypair",
        "-v",
        "-keystore", keystorePath,
        "-alias", keyAlias,
        "-keyalg", "RSA",
        "-keysize", "2048",
        "-validity", "10000",
        "-storepass", keystorePass,
        "-keypass", keyPass,
        "-dname", config?.cn ?? "CN=Android Debug,O=Android,C=US",
      ],
      { timeoutMs: 60000 },
    );
  }

  return { keystorePath, keystorePass, keyAlias, keyPass };
}

async function fileSizeSafe(p: string): Promise<number | null> {
  try {
    return await fileSize(p);
  } catch {
    return null;
  }
}

async function resolveKeytool(): Promise<string> {
  const javaHome = process.env.JAVA_HOME;
  if (javaHome) {
    const candidate = path.join(javaHome, "bin", process.platform === "win32" ? "keytool.exe" : "keytool");
    if (candidate) {
      try {
        await exec(candidate, ["-help"], { timeoutMs: 15000 });
        return candidate;
      } catch {
        // Fall through to PATH resolution.
      }
    }
  }
  return resolveExecutable("keytool", "KEYTOOL_PATH");
}

export interface SignAndAlignOptions extends RebuildOptions, SignOptions {}

/**
 * Full pipeline: rebuild -> zipalign -> apksigner sign -> apksigner verify.
 */
export async function rebuildAlignAndSign(
  workspaceDir: string,
  outputApkPath: string,
  options: SignAndAlignOptions = {},
): Promise<SigningResult> {
  const cacheDir = options.cacheDir ?? path.join(path.dirname(outputApkPath), ".signing");
  await ensureDir(cacheDir);

  const unsignedApk = path.join(cacheDir, "unsigned.apk");
  const alignedApk = path.join(cacheDir, "aligned.apk");

  await rebuildApk(workspaceDir, unsignedApk, options);

  const { aligned } = await zipalignApk(unsignedApk, alignedApk, {
    sdkRootEnv: options.sdkRootEnv,
    timeoutMs: options.timeoutMs,
  });

  const ks = await ensureDebugKeystore(cacheDir, options.keystoreConfig);
  const apksigner = await resolveBuildToolsBinary("apksigner", options.sdkRootEnv);

  await exec(
    apksigner,
    [
      "sign",
      "--ks", ks.keystorePath,
      "--ks-pass", `pass:${ks.keystorePass}`,
      "--ks-key-alias", ks.keyAlias,
      "--key-pass", `pass:${ks.keyPass}`,
      "--out", outputApkPath,
      alignedApk,
    ],
    { timeoutMs: options.timeoutMs },
  );

  const verifyRes = await exec(apksigner, ["verify", "--verbose", outputApkPath], {
    timeoutMs: options.timeoutMs,
  });
  const schemeLine = /scheme\s+v(\d)/i;
  const signingScheme = verifyRes.stdout
    .split("\n")
    .filter((l) => schemeLine.test(l))
    .map((l) => {
      const m = schemeLine.exec(l);
      return `v${m?.[1]}`;
    });

  const sizeBytes = await fileSize(outputApkPath);
  logger.info("apk signed", { outputApkPath, signingScheme, sizeBytes });

  return {
    outputApkPath,
    signingScheme,
    keystorePath: ks.keystorePath,
    aligned,
    verified: true,
    sizeBytes,
  };
}

export { ToolErrorCode };
