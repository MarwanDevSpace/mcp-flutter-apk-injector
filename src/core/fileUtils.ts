import { readdir, readFile, stat, writeFile, mkdir, rm, copyFile, cp } from "node:fs/promises";
import path from "node:path";
import { InputNotFoundError } from "./errors.js";

/** Ensure a directory exists (recursive). */
export async function ensureDir(dir: string): Promise<void> {
  await mkdir(dir, { recursive: true });
}

export interface FileManifestEntry {
  path: string;
  size: number;
  kind: "file" | "dir";
}

/** Resolve a possibly-relative path against cwd and assert it exists. */
export function resolvePath(p: string, _expected: string): string {
  const abs = path.isAbsolute(p) ? p : path.resolve(process.cwd(), p);
  return abs;
}

export async function assertPathExists(p: string, expected: string): Promise<string> {
  const abs = resolvePath(p, expected);
  try {
    const st = await stat(abs);
    if (!st.isDirectory() && expected === "directory") {
      throw new InputNotFoundError(abs, expected);
    }
    return abs;
  } catch (err) {
    if (err instanceof InputNotFoundError) throw err;
    throw new InputNotFoundError(abs, expected);
  }
}

export async function assertFileExists(p: string): Promise<string> {
  const abs = resolvePath(p, "file");
  try {
    const st = await stat(abs);
    if (!st.isFile()) throw new InputNotFoundError(abs, "file");
    return abs;
  } catch {
    throw new InputNotFoundError(abs, "file");
  }
}

export async function assertDirExists(p: string): Promise<string> {
  const abs = resolvePath(p, "directory");
  try {
    const st = await stat(abs);
    if (!st.isDirectory()) throw new InputNotFoundError(abs, "directory");
    return abs;
  } catch {
    throw new InputNotFoundError(abs, "directory");
  }
}

/** Recursively enumerate a directory into a FileManifestEntry list. */
export async function listTree(dir: string, base = dir): Promise<FileManifestEntry[]> {
  const out: FileManifestEntry[] = [];
  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    return out;
  }
  for (const e of entries) {
    const full = path.join(dir, e.name);
    const rel = path.relative(base, full).split(path.sep).join("/");
    if (e.isDirectory()) {
      out.push({ path: rel + "/", size: 0, kind: "dir" });
      out.push(...(await listTree(full, base)));
    } else {
      const st = await stat(full).catch(() => null);
      out.push({ path: rel, size: st?.size ?? 0, kind: "file" });
    }
  }
  return out;
}

export async function readText(filePath: string): Promise<string> {
  return readFile(filePath, "utf8");
}

export async function writeText(filePath: string, content: string): Promise<void> {
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, content, "utf8");
}

export async function copyFileSafe(src: string, dest: string): Promise<void> {
  await mkdir(path.dirname(dest), { recursive: true });
  await copyFile(src, dest);
}

export async function copyDirRecursive(src: string, dest: string): Promise<void> {
  await mkdir(dest, { recursive: true });
  await cp(src, dest, { recursive: true, force: true });
}

export async function rmTree(target: string): Promise<void> {
  await rm(target, { recursive: true, force: true });
}

/** Count smali files under a workspace (used for patch reports). */
export async function countFilesMatching(dir: string, extension: string): Promise<number> {
  let count = 0;
  const entries = await readdir(dir, { withFileTypes: true }).catch(() => []);
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) count += await countFilesMatching(full, extension);
    else if (e.name.endsWith(extension)) count += 1;
  }
  return count;
}

export async function fileSize(p: string): Promise<number> {
  const st = await stat(p);
  return st.size;
}
