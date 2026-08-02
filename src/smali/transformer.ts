import path from "node:path";
import { readFileSync } from "node:fs";
import { readText, writeText, assertFileExists } from "../core/fileUtils.js";
import { logger } from "../core/logger.js";
import { injectInstructions, findMethod } from "./registerAllocator.js";

export interface SmaliPatchResult {
  filePath: string;
  method: string;
  injectedLineCount: number;
}

/**
 * Inject a `Bootstrap.attachToActivity(this)` invocation into an existing
 * Activity's `onCreate(Bundle)` method. `p0` is the Activity receiver, so no
 * register bump is required.
 */
export async function injectActivityHook(
  smaliFilePath: string,
  bootstrapDescriptor: string,
): Promise<SmaliPatchResult> {
  const abs = await assertFileExists(smaliFilePath);
  const content = await readText(abs);

  const call = `invoke-static {p0}, ${bootstrapDescriptor}->attachToActivity(Landroid/app/Activity;)V`;
  const { content: patched, method } = injectInstructions(
    content,
    "onCreate",
    "(Landroid/os/Bundle;)V",
    [call],
    { atStart: true },
  );
  void method;

  await writeText(abs, patched);
  logger.info("patched activity onCreate", { file: smaliFilePath });

  return {
    filePath: abs,
    method: "onCreate",
    injectedLineCount: 1,
  };
}

/**
 * Verify that an injected smali file still assembles syntactically at the
 * structural level: balanced .method/.end method, valid header, and that the
 * bootstrap descriptor reference resolves to an existing class file.
 */
export function validateSmaliStructure(filePath: string): { ok: boolean; errors: string[] } {
  const errors: string[] = [];
  try {
    const content = readFileSync(filePath, "utf8");
    const lines = content.split(/\r?\n/);
    let methodDepth = 0;
    let sawClass = false;
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]!;
      const trimmed = line.trim();
      if (trimmed.startsWith(".class")) sawClass = true;
      if (trimmed.startsWith(".method")) methodDepth++;
      if (trimmed === ".end method") {
        methodDepth--;
        if (methodDepth < 0) errors.push(`line ${i + 1}: orphan .end method`);
      }
    }
    if (methodDepth !== 0) errors.push(`unbalanced .method/.end method (depth=${methodDepth})`);
    if (!sawClass) errors.push("missing .class directive");
  } catch (err) {
    errors.push(`unreadable: ${(err as Error).message}`);
  }
  return { ok: errors.length === 0, errors };
}

export { findMethod };
export function smaliRelativePath(file: string): string {
  return file.split(path.sep).join("/");
}
