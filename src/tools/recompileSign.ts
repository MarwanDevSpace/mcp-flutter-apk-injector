import path from "node:path";
import { ensureDir } from "../core/fileUtils.js";
import { rebuildAlignAndSign } from "../packaging/signer.js";
import type { SigningResult } from "../types.js";
import type { RecompileSignParams } from "./schemas.js";

export const recompileSignTitle = "Build, align, and sign APK output";
export const recompileSignDescription =
  "Rebuild a modified decoded workspace with apktool, 4-byte align the uncompressed APK with zipalign, and cryptographically sign the binary with apksigner (v1-v4 schemes). " +
  "Mutates the filesystem by overwriting outputApkPath and creating temporary alignment artifacts; requires a valid workspaceDir containing modified Smali and AndroidManifest.xml. " +
  "Pass keystoreConfig with custom keystorePath, passwords, and keyAlias for authorized release signatures; if keystoreConfig is omitted, generates an auto-signed debug test artifact.";

export async function recompileAlignSign(
  params: RecompileSignParams,
): Promise<SigningResult> {
  await ensureDir(path.dirname(path.resolve(params.outputApkPath)));
  return rebuildAlignAndSign(params.workspaceDir, params.outputApkPath, {
    keystoreConfig: params.keystoreConfig,
  });
}
