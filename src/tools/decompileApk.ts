import { assertFileExists } from "../core/fileUtils.js";
import { Apktool } from "../decompiler/apktool.js";
import { logger } from "../core/logger.js";
import type { DecompileResult } from "../types.js";
import type { DecompileApkParams } from "./schemas.js";

export const decompileApkTitle = "decompile_apk";
export const decompileApkDescription =
  "Disassemble a target Android APK into Smali bytecode, native library trees (lib/), resources (res/), and a decoded AndroidManifest.xml using apktool. Returns a manifest summary: package name, main/entry Activity, Application class, min/target SDKs, detected native ABIs, and a file manifest.";

export async function decompileApk(params: DecompileApkParams): Promise<DecompileResult> {
  const apkPath = await assertFileExists(params.apkPath);
  const apktool = await Apktool.create();
  const result = await apktool.decompile(apkPath, params.outputDir, params.decompileSources);
  logger.info("decompile_apk complete", { packageName: result.packageName, fileCount: result.fileCount });
  return result;
}
