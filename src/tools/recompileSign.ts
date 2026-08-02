import path from "node:path";
import { ensureDir } from "../core/fileUtils.js";
import { rebuildAlignAndSign } from "../packaging/signer.js";
import type { SigningResult } from "../types.js";
import type { RecompileSignParams } from "./schemas.js";

export const recompileSignTitle = "recompile_align_and_sign";
export const recompileSignDescription =
  "Repack the decompiled APK workspace with apktool, run zipalign for 4-byte alignment, and sign with apksigner using V1/V2/V3 schemes. Uses an auto-generated debug keystore unless a custom keystoreConfig is provided. Returns the verified, aligned, installable APK path.";

export async function recompileAlignSign(
  params: RecompileSignParams,
): Promise<SigningResult> {
  await ensureDir(path.dirname(path.resolve(params.outputApkPath)));
  return rebuildAlignAndSign(params.workspaceDir, params.outputApkPath, {
    keystoreConfig: params.keystoreConfig,
  });
}
