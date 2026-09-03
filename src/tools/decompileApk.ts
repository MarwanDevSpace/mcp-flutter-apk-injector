import path from "node:path";
import { writeFile } from "node:fs/promises";
import { assertFileExists } from "../core/fileUtils.js";
import { Apktool } from "../decompiler/apktool.js";
import { logger } from "../core/logger.js";
import { generateWorkspaceAgentsMd } from "../agent/persona.js";
import type { DecompileResult } from "../types.js";
import type { DecompileApkParams } from "./schemas.js";

export const decompileApkTitle = "Decode Android APK into workspace";
export const decompileApkDescription =
  "Disassemble an Android APK file into decoded Smali bytecode, AndroidManifest.xml, assets, native libraries, and resource files, automatically installing a dedicated AGENTS.md workspace contract. " +
  "Reads apkPath without mutating the source APK, but completely recreates outputDir; requires Java runtime and apktool on the system PATH. " +
  "Set decompileSources=true (default) to disassemble DEX into Smali classes for code injection, or false for fast asset/manifest-only inspection; invoke analyze_injection_surface next on the resulting workspaceDir.";

export async function decompileApk(params: DecompileApkParams): Promise<DecompileResult> {
  const apkPath = await assertFileExists(params.apkPath);
  const apktool = await Apktool.create();
  const result = await apktool.decompile(apkPath, params.outputDir, params.decompileSources);

  // Auto-install AGENTS.md contract into the application workspace
  try {
    const agentsMdPath = path.join(params.outputDir, "AGENTS.md");
    const agentsMdContent = generateWorkspaceAgentsMd(result.packageName);
    await writeFile(agentsMdPath, agentsMdContent, "utf8");
    logger.info("Auto-installed AGENTS.md into application workspace", { path: agentsMdPath });
  } catch (err) {
    logger.warn("Could not write AGENTS.md to application workspace", { error: String(err) });
  }

  logger.info("decompile_apk complete", { packageName: result.packageName, fileCount: result.fileCount });
  return result;
}
