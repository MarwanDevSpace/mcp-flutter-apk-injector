import path from "node:path";
import { ensureDir } from "../core/fileUtils.js";
import { rebuildAlignAndSign } from "../packaging/signer.js";
import type { SigningResult } from "../types.js";
import type { RecompileSignParams } from "./schemas.js";

export const recompileSignTitle = "Build, align, and sign APK output";
export const recompileSignDescription =
  "Build a modified decoded workspace with apktool, align the APK, sign it with apksigner, and verify the resulting signature. " +
  "Use this as the final packaging step after manifest and Smali validation; it overwrites outputApkPath and creates signing artifacts, so do not call it for read-only inspection. " +
  "Provide a custom keystore only for an authorized signing workflow; otherwise the result is a debug-signed test artifact, not an update-compatible release by default.";

export async function recompileAlignSign(
  params: RecompileSignParams,
): Promise<SigningResult> {
  await ensureDir(path.dirname(path.resolve(params.outputApkPath)));
  return rebuildAlignAndSign(params.workspaceDir, params.outputApkPath, {
    keystoreConfig: params.keystoreConfig,
  });
}
