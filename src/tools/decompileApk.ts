import { assertFileExists } from "../core/fileUtils.js";
import { Apktool } from "../decompiler/apktool.js";
import { logger } from "../core/logger.js";
import type { DecompileResult } from "../types.js";
import type { DecompileApkParams } from "./schemas.js";

export const decompileApkTitle = "Decode Android APK into workspace";
export const decompileApkDescription =
  "Decode an APK into a Smali, resources, assets, native-library, and manifest workspace for later analysis or modification. " +
  "The input APK is read-only, but outputDir is removed and recreated; use analyze_injection_surface next, and do not call this when a valid decoded workspace already exists. " +
  "Full source decoding requires apktool and Java, while decompileSources=false is limited to resource and manifest inspection.";

export async function decompileApk(params: DecompileApkParams): Promise<DecompileResult> {
  const apkPath = await assertFileExists(params.apkPath);
  const apktool = await Apktool.create();
  const result = await apktool.decompile(apkPath, params.outputDir, params.decompileSources);
  logger.info("decompile_apk complete", { packageName: result.packageName, fileCount: result.fileCount });
  return result;
}
