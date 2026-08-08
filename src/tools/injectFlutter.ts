import { injectFlutterRuntimeAndSmali } from "../core/injector.js";
import type { InjectionReport } from "../types.js";
import type { InjectFlutterParams } from "./schemas.js";

export const injectFlutterTitle = "inject_flutter_runtime_and_smali";
export const injectFlutterDescription =
  "USAGE GUIDELINES: Step 4 of pipeline. Must be run after decompile_apk and synthesize_flutter_payload. Run immediately before patch_manifest_and_config.\n" +
  "PURPOSE: Merge synthesized Flutter payload (libflutter.so, libapp.so, flutter_assets) and inject Smali engine bootstrap code into a decompiled APK workspace.\n" +
  "SIDE EFFECTS: In-place mutation of workspaceDir tree. Copies native libraries into lib/<abi>/, asset bundles into assets/, and injects new Smali classes/methods into smali/.\n" +
  "PARAMETERS & CONSTRAINTS:\n" +
  "  • workspaceDir: Decompiled APK workspace directory produced by decompile_apk.\n" +
  "  • payloadDir: Directory containing synthesized Flutter payload produced by synthesize_flutter_payload.\n" +
  "  • injectionMode: Enum strategy — 'direct_application_hook' (hooks host Application class), 'activity_overlay' (adds dedicated FlutterOverlayActivity), 'view_tree_injection' (attaches FlutterView to launcher Activity), 'headless_engine' (background engine without UI).\n" +
  "  • engineId: Optional FlutterEngineCache ID string (defaults to 'injected_flutter_engine').\n" +
  "  • methodChannelBridge: Optional config for two-way Smali<->Dart MethodChannel communication.\n" +
  "  • attachBaseContextHook: Optional boolean to inject engine init into attachBaseContext(Context) as well as onCreate().\n" +
  "  • nativeLibraryFallback: Optional boolean to wrap System.loadLibrary in defensive try-catch blocks.\n" +
  "PREREQUISITES: Extracted APK workspace from decompile_apk and synthesized payload from synthesize_flutter_payload.\n" +
  "RETURNS: InjectionReport detailing injected native libraries, asset files, allocated Smali register bounds, and patch status.";

export async function injectFlutter(
  params: InjectFlutterParams,
): Promise<InjectionReport> {
  return injectFlutterRuntimeAndSmali({
    workspaceDir: params.workspaceDir,
    payloadDir: params.payloadDir,
    injectionMode: params.injectionMode,
    methodChannel: params.methodChannelBridge,
    engineId: params.engineId,
  });
}
