import fs from "node:fs";
import { writeFile } from "node:fs/promises";
import path from "node:path";
import { assertDirExists, readText } from "./fileUtils.js";
import { analyzeInjectionSurface, findSmaliRoot } from "../decompiler/analyzer.js";
import { parseManifestFile } from "../decompiler/manifestParser.js";
import { generateSmaliClasses } from "../smali/generator.js";
import { injectActivityHook, validateSmaliStructure } from "../smali/transformer.js";
import { deployPayloadIntoWorkspace } from "../payload/deploy.js";
import { patchManifest } from "../manifest/patcher.js";
import { generateWorkspaceAgentsMd } from "../agent/persona.js";
import { logger } from "./logger.js";
import type {
  InjectionMode,
  InjectionReport,
  InjectedFilePatch,
  MethodChannelBridgeConfig,
} from "../types.js";

export const DEFAULT_ENGINE_ID = "injected_flutter_engine";

export interface InjectFlutterOptions {
  workspaceDir: string;
  payloadDir: string;
  injectionMode: InjectionMode;
  methodChannel?: MethodChannelBridgeConfig;
  engineId?: string;
  /** Also initialize from an existing Application.attachBaseContext when available. */
  attachBaseContextHook?: boolean;
  /** Return from generated initialization instead of crashing when native libraries are unavailable. */
  nativeLibraryFallback?: boolean;
}

export async function injectFlutterRuntimeAndSmali(
  opts: InjectFlutterOptions,
): Promise<InjectionReport> {
  const workspaceDir = await assertDirExists(opts.workspaceDir);
  const payloadDir = await assertDirExists(opts.payloadDir);
  const engineId = opts.engineId ?? DEFAULT_ENGINE_ID;

  const surface = await analyzeInjectionSurface(workspaceDir);
  const smaliRoot = await findSmaliRoot(workspaceDir);
  if (!smaliRoot) {
    throw new Error(
      "No smali directory found in workspace. Decompile the APK with sources enabled (decompileSources=true) before injecting.",
    );
  }

  const packageName = surface.packageName;
  const manifest = await parseManifestFile(path.join(workspaceDir, "AndroidManifest.xml"));
  const originalApplication = manifest.application.name
    ? qualifyClassName(manifest.application.name, packageName)
    : null;

  // Application superclass: subclass the original application so its behavior
  // is preserved via super.onCreate(), otherwise android.app.Application.
  const applicationSuper = originalApplication ?? "android.app.Application";

  const generation = await generateSmaliClasses({
    packageName,
    smaliRoot,
    engineId,
    applicationSuperClass: applicationSuper,
    injectionModes: [opts.injectionMode],
    channel: opts.methodChannel,
    nativeLibraryFallback: opts.nativeLibraryFallback,
  });

  const modifiedFiles: InjectedFilePatch[] = generation.classes.map((c) => ({
    filePath: c.relativePath,
    patchType: "smali_create" as const,
    description: `Injected ${c.className}`,
    verified: validateSmaliStructure(c.absolutePath).ok,
  }));

  // Deploy native libs + assets.
  const deployed = await deployPayloadIntoWorkspace(workspaceDir, payloadDir);

  for (const lib of deployed.copiedLibs) {
    modifiedFiles.push({
      filePath: lib,
      patchType: "lib_copy",
      description: `Native library: ${lib}`,
      verified: true,
    });
  }
  for (const asset of deployed.copiedAssets) {
    modifiedFiles.push({
      filePath: asset,
      patchType: "asset_copy",
      description: `Flutter asset: ${asset}`,
      verified: true,
    });
  }

  // Patch manifest.
  const overlayClass = opts.injectionMode === "activity_overlay" ? generation.overlayActivityDescriptor : null;
  const manifestResult = await patchManifest({
    workspaceDir,
    customApplicationClass: generation.applicationDescriptor.slice(1, -1).replaceAll("/", "."),
    engineId,
    overlayActivityClass: overlayClass ? overlayClass.slice(1, -1).replaceAll("/", ".") : null,
    addLauncherForOverlay: true,
    usesCleartextTraffic: true,
  });

  const patchedActivity = manifestResult.addedActivities[0] ?? null;

  // view_tree_injection / direct_application_hook logic
  let launchActivityName = patchedActivity ?? surface.entryActivities.find((a) => a.launcher)?.name ?? null;
  if (opts.injectionMode === "view_tree_injection") {
    const launcher = surface.entryActivities.find((a) => a.launcher);
    const fallback = surface.entryActivities[0];
    const activityPath = launcher?.path ?? fallback?.path ?? null;
    if (activityPath) {
      const patch = await injectActivityHook(activityPath, generation.bootstrapDescriptor);
      modifiedFiles.push({
        filePath: path.relative(workspaceDir, patch.filePath).split(path.sep).join("/"),
        patchType: "smali_insert",
        description: `Injected FlutterView bootstrap into onCreate (${patch.method})`,
        verified: validateSmaliStructure(patch.filePath).ok,
      });
      launchActivityName = (launcher ?? fallback)?.name ?? launchActivityName;
    } else {
      surface.warnings.push(
        "Could not locate a decompiled Activity to hook; FlutterView will not be attached.",
      );
    }
  } else if (opts.injectionMode === "direct_application_hook") {
    const { injectApplicationHook, injectAttachBaseContextHook } = await import("../smali/transformer.js");
    if (surface.applicationClassPath) {
      const patch = await injectApplicationHook(surface.applicationClassPath, generation.bootstrapDescriptor);
      modifiedFiles.push({
        filePath: path.relative(workspaceDir, patch.filePath).split(path.sep).join("/"),
        patchType: "smali_insert",
        description: `Injected Flutter engine init into Application onCreate (${patch.method})`,
        verified: validateSmaliStructure(patch.filePath).ok,
      });

      if (opts.attachBaseContextHook) {
        try {
          const attachPatch = await injectAttachBaseContextHook(surface.applicationClassPath, generation.bootstrapDescriptor);
          modifiedFiles.push({
            filePath: path.relative(workspaceDir, attachPatch.filePath).split(path.sep).join("/"),
            patchType: "smali_insert",
            description: `Injected Flutter engine fallback init into Application attachBaseContext (${attachPatch.method})`,
            verified: validateSmaliStructure(attachPatch.filePath).ok,
          });
        } catch (err) {
          surface.warnings.push(
            `attachBaseContext hook was requested but not applied: ${(err as Error).message}`,
          );
        }
      }
    } else {
      surface.warnings.push(
        "No decompiled Application class found to hook directly; generated standalone InjectedApplication.",
      );
    }
  }

  logger.info("injection complete", {
    workspaceDir,
    mode: opts.injectionMode,
    generatedClasses: generation.classes.length,
    modifiedFiles: modifiedFiles.length,
  });

  const warnings = [...surface.warnings];
  if (manifest.minSdkVersion !== null && manifest.minSdkVersion < 21) {
    warnings.push(
      `Target minSdkVersion is ${manifest.minSdkVersion}; Flutter requires API 21+.`,
    );
  }
  if (deployed.copiedLibs.length === 0) {
    warnings.push("No native libraries deployed; the Flutter engine will not start.");
  }
  if (opts.attachBaseContextHook && opts.injectionMode !== "direct_application_hook") {
    warnings.push("attachBaseContextHook applies only to direct_application_hook and was not used for this mode.");
  }
  if (opts.nativeLibraryFallback) {
    warnings.push("Native-library fallback is enabled; generated initialization returns without starting an engine when Flutter libraries cannot load.");
  }

  // Auto-install AGENTS.md in the application workspace if missing
  try {
    const agentsMdPath = path.join(workspaceDir, "AGENTS.md");
    if (!fs.existsSync(agentsMdPath)) {
      await writeFile(agentsMdPath, generateWorkspaceAgentsMd(packageName), "utf8");
      logger.info("Auto-installed AGENTS.md into application workspace", { path: agentsMdPath });
    }
  } catch (err) {
    logger.warn("Could not write AGENTS.md to application workspace", { error: String(err) });
  }

  return {
    workspaceDir,
    injectionMode: opts.injectionMode,
    methodChannel: opts.methodChannel,
    generatedClasses: generation.classes.map((c) => c.descriptor),
    modifiedFiles,
    copiedAssets: deployed.copiedAssets.length,
    copiedLibs: deployed.copiedLibs.length,
    engineId,
    launchActivityName: launchActivityName ?? "unknown",
    warnings,
  };
}

function qualifyClassName(name: string, packageName: string): string {
  if (name.startsWith(".")) return packageName + name;
  if (name.startsWith("L") && name.endsWith(";")) return name.slice(1, -1).replaceAll("/", ".");
  return name;
}

export async function readGeneratedSmali(
  workspaceDir: string,
  className: string,
): Promise<string | null> {
  const smaliRoot = await findSmaliRoot(workspaceDir);
  if (!smaliRoot) return null;
  const rel = className.replaceAll(".", "/") + ".smali";
  const abs = path.join(smaliRoot, rel);
  try {
    return await readText(abs);
  } catch {
    return null;
  }
}
