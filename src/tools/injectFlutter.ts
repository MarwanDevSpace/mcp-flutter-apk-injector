import { injectFlutterRuntimeAndSmali } from "../core/injector.js";
import type { InjectionReport } from "../types.js";
import type { InjectFlutterParams } from "./schemas.js";

export const injectFlutterTitle = "Inject Flutter runtime into APK workspace";
export const injectFlutterDescription =
  "Inject a synthesized Flutter payload and generated Smali bootstrap into a decoded APK workspace after decompile_apk and synthesize_flutter_payload have completed. " +
  "This mutates workspaceDir by adding libraries, assets, and Smali files; run analyze_injection_surface first when the host lifecycle or ABI compatibility is uncertain. " +
  "Choose activity_overlay for the supported cached-engine screen path, use direct_application_hook only for a resolvable host Application, and treat view_tree_injection as experimental because it requires a lifecycle-compatible host.";

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
