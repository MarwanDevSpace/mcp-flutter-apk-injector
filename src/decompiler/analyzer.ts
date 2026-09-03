import path from "node:path";
import { readdir, readFile, stat } from "node:fs/promises";
import { parseManifestFile, type ParsedManifest } from "./manifestParser.js";
import { assertDirExists } from "../core/fileUtils.js";
import type {
  InjectionSurface,
  SecurityAnalysis,
  ManifestSecurity,
  MultiDexInfo,
} from "../types.js";

export function classDescriptorToSmaliPath(smaliRoot: string, descriptor: string): string | null {
  const rel = descriptor.replaceAll(".", "/") + ".smali";
  return path.join(smaliRoot, rel);
}

export async function findSmaliRoots(workspaceDir: string): Promise<string[]> {
  const entries = await readdir(workspaceDir, { withFileTypes: true }).catch(() => []);
  return entries
    .filter((e) => e.isDirectory() && /^smali(_classes\d+)?$/.test(e.name))
    .map((e) => path.join(workspaceDir, e.name))
    .sort((a, b) => a.localeCompare(b));
}

export async function findSmaliRoot(workspaceDir: string): Promise<string | null> {
  const roots = await findSmaliRoots(workspaceDir);
  return roots[0] ?? null;
}

export async function resolveClassSmaliPath(
  smaliRoots: string[],
  descriptor: string,
): Promise<string | null> {
  const rel = descriptor.replaceAll(".", "/") + ".smali";
  for (const root of smaliRoots) {
    const p = path.join(root, rel);
    if (await exists(p)) return p;
  }
  return smaliRoots.length > 0 ? path.join(smaliRoots[0]!, rel) : null;
}

async function exists(p: string): Promise<boolean> {
  try {
    await stat(p);
    return true;
  } catch {
    return false;
  }
}

const DANGEROUS_PERMISSIONS = new Set([
  "android.permission.READ_CALENDAR",
  "android.permission.WRITE_CALENDAR",
  "android.permission.CAMERA",
  "android.permission.READ_CONTACTS",
  "android.permission.WRITE_CONTACTS",
  "android.permission.GET_ACCOUNTS",
  "android.permission.ACCESS_FINE_LOCATION",
  "android.permission.ACCESS_COARSE_LOCATION",
  "android.permission.ACCESS_BACKGROUND_LOCATION",
  "android.permission.RECORD_AUDIO",
  "android.permission.READ_PHONE_STATE",
  "android.permission.READ_PHONE_NUMBERS",
  "android.permission.CALL_PHONE",
  "android.permission.ANSWER_PHONE_CALLS",
  "android.permission.READ_CALL_LOG",
  "android.permission.WRITE_CALL_LOG",
  "android.permission.ADD_VOICEMAIL",
  "android.permission.USE_SIP",
  "android.permission.BODY_SENSORS",
  "android.permission.BODY_SENSORS_BACKGROUND",
  "android.permission.ACTIVITY_RECOGNITION",
  "android.permission.SEND_SMS",
  "android.permission.RECEIVE_SMS",
  "android.permission.READ_SMS",
  "android.permission.RECEIVE_WAP_PUSH",
  "android.permission.RECEIVE_MMS",
  "android.permission.READ_EXTERNAL_STORAGE",
  "android.permission.WRITE_EXTERNAL_STORAGE",
  "android.permission.MANAGE_EXTERNAL_STORAGE",
  "android.permission.SYSTEM_ALERT_WINDOW",
  "android.permission.REQUEST_INSTALL_PACKAGES",
  "android.permission.POST_NOTIFICATIONS",
  "android.permission.NEARBY_WIFI_DEVICES",
  "android.permission.BLUETOOTH_SCAN",
  "android.permission.BLUETOOTH_CONNECT",
  "android.permission.BLUETOOTH_ADVERTISE",
]);

export function auditManifestSecurity(manifest: ParsedManifest): ManifestSecurity {
  const exportedActivities = manifest.activities.filter((a) => a.exported);
  const dangerousPermissions = (manifest.permissions ?? []).filter(
    (p) =>
      DANGEROUS_PERMISSIONS.has(p) ||
      p.startsWith("android.permission.READ_") ||
      p.startsWith("android.permission.WRITE_"),
  );

  return {
    debuggable: Boolean(manifest.application.debuggable),
    allowBackup: manifest.application.allowBackup ?? true,
    usesCleartextTraffic: Boolean(manifest.application.usesCleartextTraffic),
    exportedComponentsCount: exportedActivities.length,
    dangerousPermissions,
  };
}

export async function enumerateNativeLibraries(workspaceDir: string): Promise<Record<string, string[]>> {
  const result: Record<string, string[]> = {};
  const libDir = path.join(workspaceDir, "lib");
  if (!(await exists(libDir))) return result;
  const abiEntries = await readdir(libDir, { withFileTypes: true }).catch(() => []);
  for (const abiEntry of abiEntries) {
    if (!abiEntry.isDirectory()) continue;
    const abiName = abiEntry.name;
    const abiPath = path.join(libDir, abiName);
    const libFiles = await readdir(abiPath, { withFileTypes: true }).catch(() => []);
    const soFiles = libFiles
      .filter((f) => f.isFile() && f.name.endsWith(".so"))
      .map((f) => f.name)
      .sort();
    if (soFiles.length > 0) {
      result[abiName] = soFiles;
    }
  }
  return result;
}

export async function scanSecurityProtections(
  smaliRoots: string[],
  nativeLibs: Record<string, string[]>,
): Promise<SecurityAnalysis> {
  const rootDetection: Set<string> = new Set();
  const antiDebug: Set<string> = new Set();
  const emulatorDetection: Set<string> = new Set();
  const sslPinning: Set<string> = new Set();
  let obfuscator: string | null = null;

  // Check packer signatures from native libraries
  const allSos = Object.values(nativeLibs).flat();
  for (const so of allSos) {
    if (so.startsWith("libshella") || so.startsWith("libshell")) {
      obfuscator = "Tencent Legu (Packer)";
    } else if (so.includes("jiagu") || so.includes("protectClass")) {
      obfuscator = "Qihoo 360 (Packer)";
    } else if (so.includes("secexe") || so.includes("secmain")) {
      obfuscator = "Bangcle / SecNeo (Packer)";
    } else if (so.includes("libexec") || so.includes("libexecmain")) {
      obfuscator = "Ijiami (Packer)";
    }
  }

  // Smali bytecode scan (scan up to 250 smali files across roots)
  let filesScanned = 0;
  let shortNamedClassCount = 0;

  for (const smaliRoot of smaliRoots) {
    if (filesScanned >= 250) break;
    const walk = async (dir: string): Promise<void> => {
      if (filesScanned >= 250) return;
      const entries = await readdir(dir, { withFileTypes: true }).catch(() => []);
      for (const e of entries) {
        if (filesScanned >= 250) return;
        const full = path.join(dir, e.name);
        if (e.isDirectory()) {
          // Check for rootbeer package
          if (e.name === "rootbeer") {
            rootDetection.add("Scottyab RootBeer Library");
          }
          await walk(full);
        } else if (e.isFile() && e.name.endsWith(".smali")) {
          filesScanned++;
          // Proguard check: single letter or very short names
          if (/^[a-z]\.smali$/i.test(e.name)) {
            shortNamedClassCount++;
          }
          try {
            const content = await readFile(full, "utf8");

            // Root checks
            if (content.includes("/system/bin/su") || content.includes("/system/xbin/su")) {
              rootDetection.add("SU binary filesystem path check");
            }
            if (content.includes("test-keys")) {
              rootDetection.add("Build.TAGS test-keys check");
            }
            if (content.includes("com.topjohnwu.magisk")) {
              rootDetection.add("Magisk package check");
            }
            if (content.includes("eu.chainfire.supersu") || content.includes("com.noshufou.android.su")) {
              rootDetection.add("Superuser app check");
            }
            if (content.includes("which su")) {
              rootDetection.add("Which su command execution");
            }

            // Anti-debug checks
            if (content.includes("android/os/Debug;->isDebuggerConnected")) {
              antiDebug.add("Debug.isDebuggerConnected() API query");
            }
            if (content.includes("android/os/Debug;->waitingForDebugger")) {
              antiDebug.add("Debug.waitingForDebugger() API query");
            }
            if (content.includes("TracerPid") || content.includes("checkTracerPid")) {
              antiDebug.add("TracerPid /proc inspection");
            }

            // Emulator checks
            if (
              content.includes("goldfish") ||
              content.includes("ranchu") ||
              content.includes("generic_x86") ||
              content.includes("qemu")
            ) {
              emulatorDetection.add("QEMU/Goldfish/Ranchu hardware string check");
            }

            // SSL Pinning
            if (content.includes("okhttp3/CertificatePinner")) {
              sslPinning.add("OkHttp CertificatePinner");
            }
            if (
              content.includes("TrustManager") &&
              (content.includes("checkServerTrusted") || content.includes("X509TrustManager"))
            ) {
              sslPinning.add("Custom X509TrustManager verification");
            }
            if (content.includes("PinningTrustManager")) {
              sslPinning.add("PinningTrustManager implementation");
            }

            // DexGuard check
            if (content.includes("DexGuard")) {
              obfuscator = "DexGuard";
            }
          } catch {
            // Ignore read errors
          }
        }
      }
    };
    await walk(smaliRoot);
  }

  if (!obfuscator && shortNamedClassCount > 10) {
    obfuscator = "ProGuard / R8 (Observed short-identifier mapping)";
  }

  return {
    rootDetection: Array.from(rootDetection),
    antiDebug: Array.from(antiDebug),
    emulatorDetection: Array.from(emulatorDetection),
    sslPinning: Array.from(sslPinning),
    obfuscator,
  };
}

export async function analyzeInjectionSurface(workspaceDir: string): Promise<InjectionSurface> {
  const abs = await assertDirExists(workspaceDir);
  const manifestPath = path.join(abs, "AndroidManifest.xml");
  if (!(await exists(manifestPath))) {
    throw new Error(`Not a decompiled APK workspace: missing AndroidManifest.xml in ${abs}`);
  }

  const manifest = await parseManifestFile(manifestPath);
  const smaliRoots = await findSmaliRoots(abs);
  const packageName = manifest.packageName || "com.injected.target";

  const appName = manifest.application.name ?? packageName;
  const applicationClassPath = smaliRoots.length > 0
    ? await resolveClassSmaliPath(smaliRoots, qualifyClass(appName, packageName))
    : null;

  const entryActivities = await Promise.all(
    manifest.activities.map(async (a) => ({
      name: a.name,
      exported: a.exported,
      launcher: a.launcher,
      path: smaliRoots.length > 0
        ? await resolveClassSmaliPath(smaliRoots, qualifyClass(a.name, packageName))
        : null,
    })),
  );

  const existingFlutterClasses = await findFlutterClasses(smaliRoots);
  const jniLoadingHooks = await findJniLoadingHooks(smaliRoots, applicationClassPath);
  const assetScripts = await findAssetScripts(abs);
  const luaMods = await findLuaMods(abs);
  const nativeLibraries = await enumerateNativeLibraries(abs);
  const existingNativeAbis = Object.keys(nativeLibraries).length > 0
    ? Object.keys(nativeLibraries).sort()
    : await detectLibAbis(abs);

  const securityAnalysis = await scanSecurityProtections(smaliRoots, nativeLibraries);
  const manifestSecurity = auditManifestSecurity(manifest);

  const multiDex: MultiDexInfo = {
    isMultiDex: smaliRoots.length > 1,
    smaliRoots: smaliRoots.map((r) => path.basename(r)),
  };

  const warnings: string[] = [];
  if (smaliRoots.length === 0) {
    warnings.push("No smali directory found; decompile with sources enabled first.");
  }
  if (!manifest.application.name) {
    warnings.push("No custom Application class declared; the injector will generate one.");
  }
  if (existingFlutterClasses.length > 0) {
    warnings.push("Target already contains Flutter embedding classes; injection may conflict.");
  }
  if (securityAnalysis.antiDebug.length > 0) {
    warnings.push(`Target implements anti-debug defenses: ${securityAnalysis.antiDebug.join("; ")}`);
  }
  if (securityAnalysis.rootDetection.length > 0) {
    warnings.push(`Target implements root/tamper checks: ${securityAnalysis.rootDetection.join("; ")}`);
  }
  if (securityAnalysis.obfuscator) {
    warnings.push(`Obfuscator or packer detected: ${securityAnalysis.obfuscator}`);
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
    `1. Synthesize Flutter runtime payload for ABIs: ${existingNativeAbis.join(", ") || "arm64-v8a"} using synthesize_flutter_payload`,
    `2. Inject runtime & Smali glue code via inject_flutter_runtime_and_smali (mode: ${manifest.application.name ? "direct_application_hook" : "activity_overlay"})`,
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
    existingNativeAbis,
    nativeLibraries,
    securityAnalysis,
    manifestSecurity,
    multiDex,
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

async function findFlutterClasses(smaliRoots: string[]): Promise<string[]> {
  const found: string[] = [];
  for (const smaliRoot of smaliRoots) {
    const flutterDir = path.join(smaliRoot, "io", "flutter");
    if (!(await exists(flutterDir))) continue;
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
  }
  return found.slice(0, 50);
}

async function findJniLoadingHooks(
  smaliRoots: string[],
  applicationClassPath: string | null,
): Promise<string[]> {
  const hooks: string[] = [];
  const targets = applicationClassPath ? [applicationClassPath] : [];
  for (const smaliRoot of smaliRoots) {
    const launcherActivity = await findLauncherActivitySmali(smaliRoot);
    if (launcherActivity && !targets.includes(launcherActivity)) {
      targets.push(launcherActivity);
    }
  }

  for (const target of targets) {
    try {
      const content = await readFile(target, "utf8");
      const lines = content.split("\n");
      for (let i = 0; i < lines.length; i++) {
        if (lines[i]?.includes("System;->loadLibrary") || lines[i]?.includes("Runtime;->loadLibrary")) {
          hooks.push(
            `${path.relative(smaliRoots[0] ?? target, target).replaceAll("\\", "/")}:${i + 1}: ${lines[i]!.trim()}`,
          );
        }
      }
    } catch {
      // Class not decompiled; skip.
    }
  }

  // Scan across smali roots for other classes calling loadLibrary (capped at 15 additional hooks)
  if (hooks.length < 15 && smaliRoots.length > 0) {
    let scanned = 0;
    const searchWalk = async (dir: string): Promise<void> => {
      if (hooks.length >= 15 || scanned >= 100) return;
      const entries = await readdir(dir, { withFileTypes: true }).catch(() => []);
      for (const e of entries) {
        if (hooks.length >= 15 || scanned >= 100) return;
        const full = path.join(dir, e.name);
        if (e.isDirectory()) {
          await searchWalk(full);
        } else if (e.isFile() && e.name.endsWith(".smali") && !targets.includes(full)) {
          scanned++;
          try {
            const content = await readFile(full, "utf8");
            if (content.includes("System;->loadLibrary") || content.includes("Runtime;->loadLibrary")) {
              const lines = content.split("\n");
              for (let i = 0; i < lines.length; i++) {
                if (lines[i]?.includes("System;->loadLibrary") || lines[i]?.includes("Runtime;->loadLibrary")) {
                  hooks.push(
                    `${path.relative(smaliRoots[0]!, full).replaceAll("\\", "/")}:${i + 1}: ${lines[i]!.trim()}`,
                  );
                  if (hooks.length >= 15) break;
                }
              }
            }
          } catch {
            // Ignore
          }
        }
      }
    };
    for (const root of smaliRoots) {
      if (hooks.length >= 15) break;
      await searchWalk(root);
    }
  }

  return hooks;
}

async function findLauncherActivitySmali(smaliRoot: string): Promise<string | null> {
  const walk = async (dir: string): Promise<string | null> => {
    const entries = await readdir(dir, { withFileTypes: true }).catch(() => []);
    for (const e of entries) {
      const full = path.join(dir, e.name);
      if (e.isDirectory()) {
        const found = await walk(full);
        if (found) return found;
      } else if (e.isFile() && e.name.endsWith(".smali")) {
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
    return null;
  };
  return walk(smaliRoot);
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
