import { assertFileExists } from "../core/fileUtils.js";
import { Apktool } from "../decompiler/apktool.js";
import { logger } from "../core/logger.js";
import type { DecompileResult } from "../types.js";
import type { DecompileApkParams } from "./schemas.js";

export const decompileApkTitle = "decompile_apk";
export const decompileApkDescription =
  "USAGE GUIDELINES: Step 1 of the reverse engineering pipeline. Mandatory initial step before running analyze_injection_surface or inject_flutter_runtime_and_smali. Do NOT use if an extracted Smali workspace directory already exists.\n" +
  "PURPOSE: Disassemble an Android APK file into Smali bytecode, native library trees (lib/), resources (res/), assets, and decoded AndroidManifest.xml using apktool (or internal TS AXML fallback).\n" +
  "SIDE EFFECTS: Non-destructive to source APK (apkPath is read-only). Creates outputDir on local disk and writes extracted files (smali/, res/, assets/, lib/, AndroidManifest.xml, apktool.yml).\n" +
  "PARAMETERS & CONSTRAINTS:\n" +
  "  • apkPath: Absolute path to target source .apk file (must exist on local filesystem).\n" +
  "  • outputDir: Target directory where decompiled workspace will be extracted.\n" +
  "  • decompileSources: boolean (default: true). Set true for full DEX-to-Smali disassembly; set false for fast resource/manifest-only extraction.\n" +
  "PREREQUISITES: Java Runtime Environment (JRE) for apktool execution (or internal TS fallback for AXML).\n" +
  "RETURNS: DecompileResult object containing package name, main Activity, Application class, min/target SDKs, detected native ABIs, file manifest, and workspace directory path.";

export async function decompileApk(params: DecompileApkParams): Promise<DecompileResult> {
  const apkPath = await assertFileExists(params.apkPath);
  const apktool = await Apktool.create();
  const result = await apktool.decompile(apkPath, params.outputDir, params.decompileSources);
  logger.info("decompile_apk complete", { packageName: result.packageName, fileCount: result.fileCount });
  return result;
}
