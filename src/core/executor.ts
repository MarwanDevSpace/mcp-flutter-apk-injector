import { spawn } from "node:child_process";
import { mkdir, access, stat } from "node:fs/promises";
import { constants as fsConstants } from "node:fs";
import path from "node:path";
import { homedir } from "node:os";
import { ToolNotFoundError } from "./errors.js";
import { logger } from "./logger.js";

export interface ExecResult {
  exitCode: number;
  stdout: string;
  stderr: string;
  command: string;
}

export interface ExecOptions {
  /** Working directory for the child process. */
  cwd?: string;
  /** Environment overrides merged over process.env. */
  env?: Record<string, string | undefined>;
  /** Milliseconds to wait before sending SIGKILL. 0 = no timeout. */
  timeoutMs?: number;
  /** Additional hint text if the executable is missing. */
  missingHint?: string;
}

/**
 * Locate an executable on PATH (or via an explicit env override).
 * Supports both bare names ("apktool") and explicit paths.
 */
export async function resolveExecutable(
  name: string,
  envVar?: string,
  fallbackPaths: string[] = [],
): Promise<string> {
  const explicit = envVar ? process.env[envVar] : undefined;
  if (explicit) {
    if (await isExecutable(explicit)) return explicit;
    throw new ToolNotFoundError(name, `Env var ${envVar} is set to '${explicit}' but that file is not executable.`);
  }

  if (isBareName(name)) {
    const onPath = await findOnPath(name);
    if (onPath) return onPath;
  }

  for (const p of fallbackPaths) {
    if (await isExecutable(p)) return p;
  }

  // Common default install locations.
  const candidates = defaultInstallCandidates(name);
  for (const c of candidates) {
    if (await isExecutable(c)) return c;
  }

  throw new ToolNotFoundError(name);
}

function isBareName(name: string): boolean {
  return !name.includes(path.sep) && !name.includes("/");
}

async function isExecutable(filePath: string): Promise<boolean> {
  try {
    const s = await stat(filePath);
    if (!s.isFile()) return false;
    await access(filePath, fsConstants.X_OK);
    return true;
  } catch {
    return false;
  }
}

async function findOnPath(name: string): Promise<string | null> {
  const pathEnv = process.env.PATH ?? process.env.Path ?? "";
  const extensions = process.platform === "win32" ? ["", ".exe", ".bat", ".cmd", ".ps1"] : [""];
  for (const dir of pathEnv.split(path.delimiter)) {
    if (!dir) continue;
    for (const ext of extensions) {
      const candidate = path.join(dir, name + ext);
      if (await isExecutable(candidate)) return candidate;
    }
  }
  return null;
}

function defaultInstallCandidates(name: string): string[] {
  const home = homedir();
  const base = [
    path.join(home, "AppData", "Local", "Android", "Sdk", "build-tools"),
    path.join(home, "Library", "Android", "sdk", "build-tools"),
    path.join(home, "Android", "Sdk", "build-tools"),
    path.join(home, "android-sdk", "build-tools"),
    "/opt/android-sdk/build-tools",
    "/usr/local/android-sdk/build-tools",
    "/usr/lib/android-sdk/build-tools",
    "/opt/Android/Sdk/build-tools",
  ];
  // build-tools is versioned (e.g. 35.0.0); probe newest first.
  const results: string[] = [];
  for (const dir of base) {
    results.push(path.join(dir, name, process.platform === "win32" ? name + ".bat" : name));
    results.push(path.join(dir, name, process.platform === "win32" ? name + ".exe" : name));
  }
  return results;
}

/**
 * Scan the Android SDK build-tools directories (newest first) and return a
 * resolved absolute path for a build-tools binary such as zipalign/apksigner.
 */
export async function resolveBuildToolsBinary(name: string, envVar = "ANDROID_HOME"): Promise<string> {
  const sdkRoot = process.env[envVar] ?? process.env["ANDROID_SDK_ROOT"];
  if (sdkRoot) {
    const buildTools = path.join(sdkRoot, "build-tools");
    const versions = await listSubdirs(buildTools).catch(() => []);
    const sorted = versions.sort().reverse();
    const exe = process.platform === "win32" ? name + ".bat" : name;
    for (const v of sorted) {
      const candidate = path.join(buildTools, v, exe);
      if (await isExecutable(candidate)) return candidate;
    }
  }
  // Fall back to PATH / default locations.
  return resolveExecutable(name);
}

async function listSubdirs(dir: string): Promise<string[]> {
  const { readdir } = await import("node:fs/promises");
  const entries = await readdir(dir, { withFileTypes: true });
  return entries.filter((e) => e.isDirectory()).map((e) => e.name);
}

/**
 * Execute a command with a shell, capturing stdout/stderr.
 * Throws ProcessExecutionError on non-zero exit or spawn failure.
 */
export async function exec(
  command: string,
  args: string[],
  options: ExecOptions = {},
): Promise<ExecResult> {
  const cmdLine = quoteCommand([command, ...args]);
  logger.debug(`exec: ${cmdLine}`, { cwd: options.cwd });

  // On Windows, .bat/.cmd wrappers must be launched through cmd.exe.
  const isWindowsBatch =
    process.platform === "win32" && /\.(bat|cmd)$/i.test(command);
  let effectiveCommand = command;
  let effectiveArgs = args;
  if (isWindowsBatch) {
    effectiveCommand = "cmd.exe";
    effectiveArgs = ["/d", "/s", "/c", `"${command}" ${args.map((a) => `"${a}"`).join(" ")}`];
  }

  const child = spawn(effectiveCommand, effectiveArgs, {
    cwd: options.cwd,
    env: { ...process.env, ...options.env },
    windowsHide: true,
    shell: false,
  });

  let stdout = "";
  let stderr = "";
  let timedOut = false;

  const timeoutMs = options.timeoutMs ?? 0;
  const timer =
    timeoutMs > 0
      ? setTimeout(() => {
          timedOut = true;
          child.kill("SIGKILL");
        }, timeoutMs)
      : undefined;

  child.stdout?.setEncoding("utf8");
  child.stderr?.setEncoding("utf8");
  child.stdout?.on("data", (chunk: string) => (stdout += chunk));
  child.stderr?.on("data", (chunk: string) => (stderr += chunk));

  try {
    const exitCode = await new Promise<number | null>((resolve, reject) => {
      child.on("error", reject);
      child.on("close", (code) => resolve(code));
    });
    if (timer) clearTimeout(timer);

    if (exitCode !== 0) {
      const { ProcessExecutionError } = await import("./errors.js");
      throw new ProcessExecutionError({
        code: exitCode === null && timedOut ? 1400 : inferErrorCode(command),
        command: cmdLine,
        exitCode,
        stdout,
        stderr,
        message: timedOut
          ? `Command timed out after ${timeoutMs}ms: ${cmdLine}`
          : undefined,
      });
    }
    return { exitCode: exitCode ?? -1, stdout, stderr, command: cmdLine };
  } catch (err) {
    if (timer) clearTimeout(timer);
    throw err;
  }
}

/**
 * Execute a batch of commands sequentially, failing fast on the first error.
 */
export async function execSequence(
  steps: Array<{ command: string; args: string[]; options?: ExecOptions }>,
): Promise<ExecResult[]> {
  const results: ExecResult[] = [];
  for (const step of steps) {
    results.push(await exec(step.command, step.args, step.options));
  }
  return results;
}

function inferErrorCode(command: string): 1400 | 1800 {
  const name = path.basename(command).toLowerCase();
  if (name.includes("apktool") || name.includes("aapt")) return 1400;
  return 1800;
}

/** Quote each token for a human-readable command line (Windows safe). */
function quoteCommand(tokens: string[]): string {
  return tokens
    .map((t) => (/[\s"']/.test(t) ? `"${t.replaceAll('"', '\\"')}"` : t))
    .join(" ");
}

/** Ensure a directory exists (recursive). */
export async function ensureDir(dir: string): Promise<void> {
  await mkdir(dir, { recursive: true });
}
