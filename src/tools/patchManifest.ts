import { patchManifest as patch } from "../manifest/patcher.js";
import type { ManifestPatchResult } from "../types.js";
import type { PatchManifestParams } from "./schemas.js";

export const patchManifestTitle = "patch_manifest_and_config";
export const patchManifestDescription =
  "USAGE GUIDELINES: Step 5 of the 6-step injection pipeline. Mandatory step after inject_flutter_runtime_and_smali and immediately before recompile_align_and_sign. Do NOT use on raw un-decompiled APK files.\n" +
  "PURPOSE: Modify decoded AndroidManifest.xml to register the injected Application subclass, declare FlutterOverlayActivity for UI overlays, add network/wake permissions, and configure rendering attributes.\n" +
  "SIDE EFFECTS & MUTATIONS: Performs non-destructive XML surgery on AndroidManifest.xml in workspaceDir in-place. If an existing <application android:name> exists, preserves original host Application class and binds InjectedApplication subclass. Appends non-duplicate <uses-permission> elements.\n" +
  "PARAMETERS & CONSTRAINTS:\n" +
  "  • workspaceDir: Absolute path to decompiled APK workspace directory containing AndroidManifest.xml (produced by decompile_apk).\n" +
  "  • customApplicationClass: Optional fully qualified class name for injected Application subclass (defaults to 'com.injected.flutter.InjectedApplication').\n" +
  "  • additionalPermissions: Optional array of Android permissions to inject (e.g. ['android.permission.INTERNET', 'android.permission.WAKE_LOCK']).\n" +
  "  • usesCleartextTraffic: Optional boolean to enable unencrypted HTTP network calls via android:usesCleartextTraffic='true'.\n" +
  "  • extractNativeLibs: Optional boolean to control android:extractNativeLibs in <application> tag.\n" +
  "  • hardwareAccelerated: Optional boolean to enable GPU hardware acceleration via android:hardwareAccelerated='true'.\n" +
  "  • largeHeap: Optional boolean to request higher RAM allocation via android:largeHeap='true'.\n" +
  "PREREQUISITES & FAILURE MODES: Requires decompiled workspace with injected Smali glue code. Throws MANIFEST_PARSE_ERROR or MANIFEST_PATCH_ERROR if AndroidManifest.xml is missing or malformed.\n" +
  "RETURNS: ManifestPatchResult detailing added permissions, Application class binding, activity declarations, metadata entries, and XML validation status.";

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
