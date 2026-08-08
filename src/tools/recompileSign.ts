import path from "node:path";
import { ensureDir } from "../core/fileUtils.js";
import { rebuildAlignAndSign } from "../packaging/signer.js";
import type { SigningResult } from "../types.js";
import type { RecompileSignParams } from "./schemas.js";

export const recompileSignTitle = "recompile_align_and_sign";
export const recompileSignDescription =
  "USAGE GUIDELINES: Step 6 (final step) of the 6-step injection pipeline. Mandatory final step after patch_manifest_and_config to assemble, align, and sign the output APK. Do NOT use on raw un-decompiled APK files.\n" +
  "PURPOSE: Reassemble modified Smali workspace into binary APK using apktool b, perform 4-byte ZIP alignment via zipalign, and sign with V1/V2/V3 schemes via apksigner.\n" +
  "SIDE EFFECTS & OVERWRITES: Reads workspaceDir (creates temporary build/ artifacts inside). Overwrites existing file at outputApkPath if present. Invokes subprocesses (apktool, zipalign, apksigner, keytool).\n" +
  "PARAMETERS & CONSTRAINTS:\n" +
  "  • workspaceDir: Absolute path to decompiled and patched APK workspace directory.\n" +
  "  • outputApkPath: Absolute destination file path for final signed APK (will overwrite existing file).\n" +
  "  • keystoreConfig: Optional object specifying custom keystore credentials (keystorePath, keystorePass, keyAlias, keyPass, cn). If omitted, an RSA debug keystore is auto-generated.\n" +
  "PREREQUISITES & FAILURE MODES: Requires patched workspace (produced by patch_manifest_and_config) and Android SDK build-tools (zipalign, apksigner, keytool). Throws RECOMPILE_BUILD_ERROR, ZIPALIGN_ERROR, or APK_SIGNING_ERROR on assembly/signature failure.\n" +
  "RETURNS: SigningResult object detailing output APK path, byte size, 4-byte alignment verification, and V1/V2/V3 cryptographic signature status.";

export async function recompileAlignSign(
  params: RecompileSignParams,
): Promise<SigningResult> {
  await ensureDir(path.dirname(path.resolve(params.outputApkPath)));
  return rebuildAlignAndSign(params.workspaceDir, params.outputApkPath, {
    keystoreConfig: params.keystoreConfig,
  });
}
