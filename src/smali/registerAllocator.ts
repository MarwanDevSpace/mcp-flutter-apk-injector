import { parseSignature } from "./descriptors.js";
import { logger } from "../core/logger.js";

export const HEADER_REGEX = /^(\s*\.(?:registers|locals)\s+)(\d+)/;

export interface MethodInfo {
  name: string;
  signature: string;
  returnType: string;
  params: string[];
  paramSlots: number;
  isStatic: boolean;
  declaredRegisters: number;
  bodyStartIndex: number;
  bodyEndIndex: number;
}

export interface InjectedRegisterPlan {
  headerLine: string;
  newRegisters: number;
  /** Register indices safe to use for injected temps (may exceed original count). */
  tempStart: number;
  /** Parameter aliases usable in injected code. */
  paramAliases: string[];
}

/**
 * Parse a smali method body (lines between ".method" and ".end method").
 * Returns null if the method isn't found.
 */
export function findMethod(lines: string[], methodName: string, signature: string): MethodInfo | null {
  let i = 0;
  while (i < lines.length) {
    const trimmed = lines[i]!.trim();
    if (trimmed.startsWith(".method")) {
      const decl = trimmed.slice(".method".length).trim();
      const match = /^(public|private|protected|static|final|synthetic|abstract|varargs|native|constructor|declared-synchronized)\s*.*?\s+([^\s(]+)\((.*)\)(.*)$/.exec(decl);
      const nameMatch = /(?:^|\s)([\w$<>]+)\(/.exec(decl);
      const sigMatch = /\(([^)]*)\)(.*)$/.exec(decl);
      if (nameMatch && sigMatch) {
        const name = nameMatch[1] ?? "";
        const params = sigMatch[1] ?? "";
        const fullSignature = `(${params})${sigMatch[2] ?? ""}`;
        if (name === methodName && (signature === "*" || fullSignature === signature || fullSignature.startsWith(signature))) {
          const isStatic = /\bstatic\b/.test(decl);
          const { returnType, params: parsedParams } = parseSignature(fullSignature);
          const paramSlots = parsedParams.reduce((sum, p) => sum + (p === "J" || p === "D" ? 2 : 1), 0);
          // Find the closing ".end method".
          let end = i + 1;
          while (end < lines.length && lines[end]!.trim() !== ".end method") end++;
          const bodyStart = i + 1;
          const bodyEnd = end < lines.length ? end : lines.length - 1;
          // Prefer the explicit .locals/.registers directive declared at the
          // top of the method body; fall back to parameter register width.
          let declaredRegisters = paramSlots + (isStatic ? 0 : 1);
          const headerIndex = findHeaderLineIndex(lines, bodyStart, bodyEnd);
          if (headerIndex >= 0) {
            const m = HEADER_REGEX.exec(lines[headerIndex]!.trim());
            if (m) declaredRegisters = parseInt(m[2]!, 10);
          }
          void match;
          return {
            name,
            signature: fullSignature,
            returnType,
            params: parsedParams,
            paramSlots: paramSlots + (isStatic ? 0 : 1),
            isStatic,
            declaredRegisters,
            bodyStartIndex: bodyStart,
            bodyEndIndex: bodyEnd,
          };
        }
      }
      // Skip to the end of this method even if not matched (handle nested).
      while (i < lines.length && lines[i]!.trim() !== ".end method") i++;
    }
    i++;
  }
  return null;
}

/**
 * Rewrite a method's register header so that injected code may use temporary
 * registers above the previously declared maximum.
 */
export function planInjectedRegisters(
  method: MethodInfo,
  tempRegistersNeeded: number,
): InjectedRegisterPlan {
  const newRegisters = method.declaredRegisters + tempRegistersNeeded;
  return {
    headerLine: `    .registers ${newRegisters}`,
    newRegisters,
    tempStart: method.declaredRegisters,
    paramAliases: [],
  };
}

/** Apply a register header replacement to a raw line. */
export function replaceHeaderLine(line: string, newRegisters: number): string {
  return line.replace(HEADER_REGEX, (m, prefix: string, _old: string) => {
    void _old;
    return `${prefix}${newRegisters}`;
  });
}

/**
 * Find the index of the first real instruction line within a method body
 * (skipping directives, annotations, comments and blank lines).
 */
export function firstInstructionIndex(lines: string[], start: number, end: number): number {
  for (let i = start; i < end; i++) {
    const line = lines[i]!;
    const trimmed = line.trim();
    if (trimmed === "" || trimmed.startsWith("#") || trimmed.startsWith(".")) continue;
    return i;
  }
  return -1;
}

/** Locate the return instruction (last non-directive line) within a method body. */
export function lastInstructionIndex(lines: string[], start: number, end: number): number {
  let last = -1;
  for (let i = start; i < end; i++) {
    const trimmed = lines[i]!.trim();
    if (trimmed === "" || trimmed.startsWith("#") || trimmed.startsWith(".")) continue;
    last = i;
  }
  return last;
}

/**
 * Inject smali instruction lines into an existing method body at a given
 * index, adjusting register headers if temp registers are required.
 */
export function injectInstructions(
  smaliContent: string,
  targetMethod: string,
  targetSignature: string,
  injectedLines: string[],
  opts: { tempRegistersNeeded?: number; atStart?: boolean } = {},
): { content: string; method: MethodInfo } {
  const lines = smaliContent.split(/\r?\n/);
  const method = findMethod(lines, targetMethod, targetSignature);
  if (!method) {
    throw new Error(`Method ${targetMethod}${targetSignature} not found in smali file`);
  }
  const tempNeeded = opts.tempRegistersNeeded ?? 0;
  let insertIndex: number;
  if (opts.atStart) {
    const first = firstInstructionIndex(lines, method.bodyStartIndex, method.bodyEndIndex);
    insertIndex = first >= 0 ? first : method.bodyStartIndex;
  } else {
    const last = lastInstructionIndex(lines, method.bodyStartIndex, method.bodyEndIndex);
    insertIndex = last >= 0 ? last : method.bodyStartIndex;
  }

  const headerIndex = findHeaderLineIndex(lines, method.bodyStartIndex, method.bodyEndIndex);
  if (tempNeeded > 0 && headerIndex >= 0) {
    const plan = planInjectedRegisters(method, tempNeeded);
    lines[headerIndex] = replaceHeaderLine(lines[headerIndex]!, plan.newRegisters);
    logger.debug("bumped smali register count", {
      method: targetMethod,
      from: method.declaredRegisters,
      to: plan.newRegisters,
    });
  }

  const indented = injectedLines.map((l) => (l.startsWith(" ") || l.trim() === "" ? l : `    ${l}`));
  lines.splice(insertIndex, 0, ...indented);
  return { content: lines.join("\n"), method };
}

function findHeaderLineIndex(lines: string[], start: number, end: number): number {
  for (let i = start; i < end; i++) {
    const trimmed = lines[i]!.trim();
    if (HEADER_REGEX.test(trimmed)) return i;
    if (trimmed.startsWith(".method")) return i;
    if (trimmed.startsWith(".end")) break;
    if (trimmed.startsWith(".") === false && trimmed !== "") break;
  }
  return -1;
}
