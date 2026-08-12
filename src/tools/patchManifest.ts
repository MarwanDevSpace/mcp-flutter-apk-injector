import { patchManifest as patch } from "../manifest/patcher.js";
import type { ManifestPatchResult } from "../types.js";
import type { PatchManifestParams } from "./schemas.js";

export const patchManifestTitle = "Apply Android manifest configuration";
export const patchManifestDescription =
  "Apply requested Flutter-related component, application, permission, and rendering changes to AndroidManifest.xml in a decoded workspace. " +
  "Use it only after reviewing the injection surface and generated classes; it mutates the manifest in place, so use analyze_injection_surface instead when only inspection is needed. " +
  "Review the structured delta before recompilation, especially for application-class, permission, exported-component, or network-security changes.";

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
