import { patchManifest as patch } from "../manifest/patcher.js";
import type { ManifestPatchResult } from "../types.js";
import type { PatchManifestParams } from "./schemas.js";

export const patchManifestTitle = "patch_manifest_and_config";
export const patchManifestDescription =
  "Patch the decoded AndroidManifest.xml with Flutter runtime requirements: INTERNET/WAKE_LOCK permissions, custom Application class override, FlutterActivity entry (activity_overlay), engine-id metadata, and optional usesCleartextTraffic. Returns a validation status for the patched manifest.";

export async function patchManifest(
  params: PatchManifestParams,
): Promise<ManifestPatchResult> {
  return patch({
    workspaceDir: params.workspaceDir,
    customApplicationClass: params.customApplicationClass ?? "",
    engineId: "injected_flutter_engine",
    additionalPermissions: params.additionalPermissions,
    usesCleartextTraffic: params.usesCleartextTraffic,
  });
}
