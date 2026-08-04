import path from "node:path";
import { readdir, stat } from "node:fs/promises";
import { parseManifestFile } from "./manifestParser.js";
import { assertDirExists } from "../core/fileUtils.js";
import type { InjectionSurface } from "../types.js";

export function classDescriptorToSmaliPath(smaliRoot: string, descriptor: string): string | null {
  const rel = descriptor.replaceAll(".", "/") + ".smali";
  return path.join(smaliRoot, rel);
}

export async function findSmaliRoot(workspaceDir: string): Promise<string | null> {
  const entries = await readdir(workspaceDir, { withFileTypes: true }).catch(() => []);
  const smaliDirs = entries
    .filter((e) => e.isDirectory() && /^smali/.test(e.name))
    .sort((a, b) => b.name.localeCompare(a.name));
  return smaliDirs.length > 0 ? path.join(workspaceDir, smaliDirs[0]!.name) : null;
}

async function exists(p: string): Promise<boolean> {
  try {
    await stat(p);
    return true;
  } catch {
    return false;
  }
}

export async function analyzeInjectionSurface(workspaceDir: string): Promise<InjectionSurface> {
  const abs = await assertDirExists(workspaceDir);
  const manifestPath = path.join(abs, "AndroidManifest.xml");
  if (!(await exists(manifestPath))) {
    throw new Error(`Not a decompiled APK workspace: missing AndroidManifest.xml in ${abs}`);
  }

  const manifest = await parseManifestFile(manifestPath);
  const smaliRoot = await findSmaliRoot(abs);
  const packageName = manifest.packageName || "com.injected.target";

  const appName = manifest.application.name ?? packageName;
  const applicationClassPath = smaliRoot
    ? classDescriptorToSmaliPath(smaliRoot, qualifyClass(appName, packageName))
    : null;

  const entryActivities = manifest.activities.map((a) => ({
    name: a.name,
    exported: a.exported,
    launcher: a.launcher,
    path: smaliRoot
      ? classDescriptorToSmaliPath(smaliRoot, qualifyClass(a.name, packageName))
      : null,
  }));

  const existingFlutterClasses = smaliRoot ? await findFlutterClasses(smaliRoot) : [];
  const jniLoadingHooks = smaliRoot ? await findJniLoadingHooks(smaliRoot, applicationClassPath) : [];
  const assetScripts = await findAssetScripts(abs);
  const luaMods = await findLuaMods(abs);

  const warnings: string[] = [];
  if (!smaliRoot) warnings.push("No smali directory found; decompile with sources enabled first.");
  if (!manifest.application.name) {
    warnings.push("No custom Application class declared; the injector will generate one.");
  }
  if (existingFlutterClasses.length > 0) {
    warnings.push("Target already contains Flutter embedding classes; injection may conflict.");
  }

  const recommendedPatchPoints: string[] = [];
  if (manifest.application.name) {
    recommendedPatchPoints.push(
      `Application.onCreate: ${applicationClassPath ?? "application class not decompiled"}`,
    );
  } else {
    recommendedPatchPoints.push(
      "Generate synthetic Application subclass and wire it into AndroidManifest.xml",
    );
  }
  recommendedPatchPoints.push(
    `Entry Activity launch: ${entryActivities.find((a) => a.launcher)?.name ?? "none found"}`,
  );
  recommendedPatchPoints.push(
    "AndroidManifest.xml: add <activity> for FlutterActivity (activity_overlay mode)",
  );

  const automatedChainSuggestions: string[] = [
    `1. Synthesize Flutter runtime payload for ABIs: ${ (await detectLibAbis(abs)).join(", ") || "arm64-v8a" } using synthesize_flutter_payload`,
    `2. Inject runtime & Smali glue code via inject_flutter_runtime_and_smali (mode: ${ manifest.application.name ? "direct_application_hook" : "activity_overlay" })`,
    "3. Apply manifest permissions and metadata via patch_manifest_and_config",
    "4. Repackage, align 4-byte, and sign output APK via recompile_align_and_sign",
  ];

  return {
    workspaceDir: abs,
    packageName,
    applicationClass: manifest.application.name,
    applicationClassPath,
    existingApplication: Boolean(manifest.application.name),
    entryActivities,
    existingFlutter: existingFlutterClasses.length > 0,
    existingFlutterClasses,
    existingNativeAbis: await detectLibAbis(abs),
    jniLoadingHooks,
    assetScripts,
    luaMods,
    recommendedPatchPoints,
    automatedChainSuggestions,
    warnings,
  };
}

async function findAssetScripts(workspaceDir: string): Promise<string[]> {
  const assetsDir = path.join(workspaceDir, "assets");
  if (!(await exists(assetsDir))) return [];
  const found: string[] = [];
  const walk = async (dir: string): Promise<void> => {
    const entries = await readdir(dir, { withFileTypes: true }).catch(() => []);
    for (const e of entries) {
      const full = path.join(dir, e.name);
      if (e.isDirectory()) await walk(full);
      else if (/\.(lua|json|js|wasm|py|ini|cfg|conf|asset|bundle)$/i.test(e.name)) {
        found.push(path.relative(assetsDir, full).replaceAll("\\", "/"));
      }
    }
  };
  await walk(assetsDir);
  return found.slice(0, 30);
}

async function findLuaMods(workspaceDir: string): Promise<string[]> {
  const assetsDir = path.join(workspaceDir, "assets");
  if (!(await exists(assetsDir))) return [];
  const found: string[] = [];
  const walk = async (dir: string): Promise<void> => {
    const entries = await readdir(dir, { withFileTypes: true }).catch(() => []);
    for (const e of entries) {
      const full = path.join(dir, e.name);
      if (e.isDirectory()) await walk(full);
      else if (e.name.endsWith(".lua")) {
        found.push(path.relative(assetsDir, full).replaceAll("\\", "/"));
      }
    }
  };
  await walk(assetsDir);
  return found;
}

function qualifyClass(name: string, packageName: string): string {
  if (name.startsWith(".")) return packageName + name;
  return name;
}

async function findFlutterClasses(smaliRoot: string): Promise<string[]> {
  const flutterDir = path.join(smaliRoot, "io", "flutter");
  if (!(await exists(flutterDir))) return [];
  const found: string[] = [];
  const walk = async (dir: string): Promise<void> => {
    const entries = await readdir(dir, { withFileTypes: true }).catch(() => []);
    for (const e of entries) {
      const full = path.join(dir, e.name);
      if (e.isDirectory()) await walk(full);
      else if (e.name.endsWith(".smali")) {
        found.push("io/flutter/" + path.relative(flutterDir, full).replaceAll("\\", "/"));
      }
    }
  };
  await walk(flutterDir);
  return found.slice(0, 50);
}

async function findJniLoadingHooks(
  smaliRoot: string,
  applicationClassPath: string | null,
): Promise<string[]> {
  const hooks: string[] = [];
  const targets = applicationClassPath ? [applicationClassPath] : [];
  const launcherActivity = await findLauncherActivitySmali(smaliRoot);
  if (launcherActivity) targets.push(launcherActivity);

  for (const target of targets) {
    try {
      const content = await (await import("node:fs/promises")).readFile(target, "utf8");
      const lines = content.split("\n");
      for (let i = 0; i < lines.length; i++) {
        if (lines[i]?.includes("System;->loadLibrary")) {
          hooks.push(`${path.relative(smaliRoot, target)}:${i + 1}: ${lines[i]!.trim()}`);
        }
      }
    } catch {
      // Class not decompiled; skip.
    }
  }
  return hooks;
}

async function findLauncherActivitySmali(smaliRoot: string): Promise<string | null> {
  const { readFile } = await import("node:fs/promises");
  const entries = await readdir(smaliRoot, { withFileTypes: true }).catch(() => []);
  const queue: string[] = [];
  const walk = (dir: string): void => {
    for (const e of entries) {
      if (e.isDirectory()) queue.push(path.join(dir, e.name));
    }
  };
  walk(smaliRoot);
  for (const dir of queue) {
    const files = await readdir(dir, { withFileTypes: true }).catch(() => []);
    for (const f of files) {
      if (f.isFile() && f.name.endsWith(".smali")) {
        const full = path.join(dir, f.name);
        try {
          const content = await readFile(full, "utf8");
          if (content.includes("android.intent.category.LAUNCHER")) {
            return full;
          }
        } catch {
          continue;
        }
      }
    }
  }
  return null;
}

export async function detectLibAbis(workspaceDir: string): Promise<string[]> {
  try {
    const libDir = path.join(workspaceDir, "lib");
    const entries = await readdir(libDir, { withFileTypes: true });
    return entries
      .filter((e) => e.isDirectory())
      .map((e) => e.name)
      .filter((n) => /^(arm64-v8a|armeabi-v7a|arm|x86|x86_64|mips|mips64|riscv64)$/.test(n));
  } catch {
    return [];
  }
}
