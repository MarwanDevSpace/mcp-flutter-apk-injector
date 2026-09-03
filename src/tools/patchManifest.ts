import { patchManifest as patch } from "../manifest/patcher.js";
import type { ManifestPatchResult } from "../types.js";
import type { PatchManifestParams } from "./schemas.js";

export const patchManifestTitle = "Apply Android manifest configuration";
export const patchManifestDescription =
  "Configure AndroidManifest.xml in a decoded workspace by injecting Flutter activities, application subclass bindings, hardware acceleration, network security flags, and required permissions. " +
  "Mutates AndroidManifest.xml in-place within workspaceDir; accepts customApplicationClass to rebind android:name, additionalPermissions to insert <uses-permission> tags, and boolean flags for usesCleartextTraffic, largeHeap, and hardwareAccelerated. " +
  "Use after inject_flutter_runtime_and_smali to configure component declarations before packaging; use analyze_injection_surface instead when inspecting the manifest without changes.";

export async function patchManifest(
  params: PatchManifestParams,
): Promise<ManifestPatchResult> {
  return patch({
    workspaceDir: params.workspaceDir,
    customApplicationClass: params.customApplicationClass ?? "",
    engineId: "injected_flutter_engine",
    additionalPermissions: params.additionalPermissions,
    usesCleartextTraffic: params.usesCleartextTraffic,
    extractNativeLibs: params.extractNativeLibs,
    hardwareAccelerated: params.hardwareAccelerated,
    largeHeap: params.largeHeap,
  });
}
