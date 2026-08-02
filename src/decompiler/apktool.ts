import { resolveExecutable, exec } from "../core/executor.js";
import { ToolErrorCode } from "../core/errors.js";
import { logger } from "../core/logger.js";
import { ensureDir, rmTree, assertDirExists, listTree, countFilesMatching } from "../core/fileUtils.js";
import { parseManifestFile } from "./manifestParser.js";
import type { DecompileResult } from "../types.js";
import path from "node:path";

const APKTOOL_JAR = "apktool.jar";

export interface ApktoolOptions {
  apktoolPath?: string;
  javaPath?: string;
  timeoutMs?: number;
}

export class Apktool {
  private readonly toolPath: string;
  private readonly javaPath?: string;
  private readonly timeoutMs: number;

  private constructor(toolPath: string, javaPath: string | undefined, timeoutMs: number) {
    this.toolPath = toolPath;
    this.javaPath = javaPath;
    this.timeoutMs = timeoutMs;
  }

  static async create(options: ApktoolOptions = {}): Promise<Apktool> {
    let toolPath: string;
    if (options.apktoolPath) {
      toolPath = await resolveExecutable("apktool", "APKTOOL_PATH", [options.apktoolPath]);
    } else {
      toolPath = await resolveExecutable("apktool", "APKTOOL_PATH", [
        APKTOOL_JAR,
        path.join(process.env.APKTOOL_HOME ?? "", "apktool.jar"),
      ]);
    }
    return new Apktool(toolPath, options.javaPath ?? process.env.JAVA_HOME ? undefined : undefined, options.timeoutMs ?? 0);
  }

  private get command(): string {
    if (this.toolPath.endsWith(".jar")) {
      const java = this.javaPath ?? process.env.JAVA_HOME
        ? path.join(process.env.JAVA_HOME!, "bin", process.platform === "win32" ? "java.exe" : "java")
        : "java";
      return java;
    }
    return this.toolPath;
  }

  private get args(): string[] {
    if (this.toolPath.endsWith(".jar")) {
      return ["-jar", this.toolPath];
    }
    return [];
  }

  /**
   * Disassemble an APK into a workspace directory.
   */
  async decompile(apkPath: string, outputDir: string, decompileSources = true): Promise<DecompileResult> {
    await ensureDir(outputDir);
    await rmTree(outputDir);
    await ensureDir(outputDir);

    const args = [...this.args, "d", "-f", apkPath, "-o", outputDir];
    if (!decompileSources) args.push("-s", "--no-src");

    logger.info("apktool decompile", { apkPath, outputDir, decompileSources });
    await exec(this.command, args, { timeoutMs: this.timeoutMs });

    const manifestPath = path.join(outputDir, "AndroidManifest.xml");
    const manifest = await parseManifestFile(manifestPath);
    const targetAbis = await detectNativeAbis(outputDir);
    const fileCount = (await listTree(outputDir)).length;
    const smaliRoot = decompileSources ? (await findSmaliRoot(outputDir)) : null;

    return {
      workspaceDir: outputDir,
      sourceApk: apkPath,
      packageName: manifest.packageName,
      mainActivity: manifest.activities.find((a) => a.launcher)?.name ?? null,
      applicationClass: manifest.application.name,
      minSdkVersion: manifest.minSdkVersion,
      targetSdkVersion: manifest.targetSdkVersion,
      targetAbis,
      fileCount,
      hasNativeLibs: targetAbis.length > 0,
      manifestPath,
      smaliRoot,
    };
  }

  /**
   * Rebuild a decompiled workspace into an APK file.
   */
  async build(workspaceDir: string, outputApkPath: string): Promise<void> {
    await assertDirExists(workspaceDir);
    logger.info("apktool build", { workspaceDir, outputApkPath });
    await exec(this.command, [...this.args, "b", workspaceDir, "-o", outputApkPath], {
      timeoutMs: this.timeoutMs,
    });
  }
}

export async function detectNativeAbis(workspaceDir: string): Promise<string[]> {
  const { readdir } = await import("node:fs/promises");
  try {
    const libDir = path.join(workspaceDir, "lib");
    const entries = await readdir(libDir, { withFileTypes: true });
    return entries
      .filter((e) => e.isDirectory())
      .map((e) => e.name)
      .filter((n) => /^(arm64-v8a|armeabi-v7a|arm|x86|x86_64|mips|mips64|riscv64)$/.test(n));
  } catch {
    return [];
  }
}

async function findSmaliRoot(workspaceDir: string): Promise<string | null> {
  const { readdir } = await import("node:fs/promises");
  try {
    const entries = await readdir(workspaceDir, { withFileTypes: true });
    const smali = entries.find((e) => e.isDirectory() && e.name.startsWith("smali"));
    return smali ? path.join(workspaceDir, smali.name) : null;
  } catch {
    return null;
  }
}

export async function countSmaliFiles(smaliRoot: string): Promise<number> {
  return countFilesMatching(smaliRoot, ".smali");
}

export { ToolErrorCode };
