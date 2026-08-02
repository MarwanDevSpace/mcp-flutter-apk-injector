import { injectFlutterRuntimeAndSmali } from "../core/injector.js";
import type { InjectionReport } from "../types.js";
import type { InjectFlutterParams } from "./schemas.js";

export const injectFlutterTitle = "inject_flutter_runtime_and_smali";
export const injectFlutterDescription =
  "Inject Flutter engine assets, native libraries, and Smali glue code into a decompiled APK tree. Generates an InjectedApplication (FlutterEngine init + libflutter/libapp loading), a cached-engine bootstrap, an optional FlutterOverlayActivity (activity_overlay mode), and an optional two-way Smali<->Dart MethodChannel bridge. Returns a detailed patch report.";

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
