import { injectFlutterRuntimeAndSmali } from "../core/injector.js";
import type { InjectionReport } from "../types.js";
import type { InjectFlutterParams } from "./schemas.js";

export const injectFlutterTitle = "Inject Flutter runtime into APK workspace";
export const injectFlutterDescription =
  "Inject a synthesized Flutter payload (lib/ and assets/) and generated Smali bootstrap classes into a decoded APK workspace. " +
  "Mutates workspaceDir in-place by writing Smali classes, copying native libraries per ABI, and deploying Flutter assets; requires payloadDir containing valid Flutter binaries. " +
  "Select injectionMode based on target structure: prefer activity_overlay for cached-engine screens, direct_application_hook for custom Application classes, headless_engine for background tasks, or view_tree_injection (experimental); enable nativeLibraryFallback to guard against missing ABI crashes.";

export async function injectFlutter(
  params: InjectFlutterParams,
): Promise<InjectionReport> {
  return injectFlutterRuntimeAndSmali({
    workspaceDir: params.workspaceDir,
    payloadDir: params.payloadDir,
    injectionMode: params.injectionMode,
    methodChannel: params.methodChannelBridge,
    engineId: params.engineId,
    attachBaseContextHook: params.attachBaseContextHook,
    nativeLibraryFallback: params.nativeLibraryFallback,
  });
}
