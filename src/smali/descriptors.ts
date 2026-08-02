/**
 * Smali/type descriptor helpers.
 */

/** Convert a Java class name to a smali descriptor: "io.flutter.engine.Foo" -> "Lio/flutter/engine/Foo;". */
export function classToDescriptor(className: string): string {
  const trimmed = className.trim();
  if (trimmed.startsWith("L") && trimmed.endsWith(";")) return trimmed;
  return "L" + trimmed.replaceAll(".", "/") + ";";
}

/** Convert a descriptor to a class name: "Lio/flutter/engine/Foo;" -> "io.flutter.engine.Foo". */
export function descriptorToClassName(descriptor: string): string {
  const d = descriptor.startsWith("L") ? descriptor.slice(1) : descriptor;
  return d.endsWith(";") ? d.slice(0, -1) : d;
}

/** Convert a class name to a file-system path fragment: "com.example.Foo" -> "com/example/Foo". */
export function classNameToPath(className: string): string {
  return className.replaceAll(".", "/");
}

/** Convert a class name to a smali source file name: "com.example.Foo" -> "Foo.smali". */
export function classNameToFileName(className: string): string {
  const parts = className.split(".");
  return parts[parts.length - 1] + ".smali";
}

/**
 * Compute the total parameter register width for a method signature's params.
 * Each parameter takes one register slot except long (J) and double (D),
 * which take two.
 */
export function paramSlotWidth(paramDescriptors: string[]): number {
  return paramDescriptors.reduce((sum, p) => sum + (p === "J" || p === "D" ? 2 : 1), 0);
}

/** Parse a Java-style method signature into return type + parameter descriptors. */
export function parseSignature(signature: string): { returnType: string; params: string[] } {
  const match = /^\(([^)]*)\)(.*)$/.exec(signature);
  if (!match) throw new Error(`Invalid method signature: ${signature}`);
  const params = parseParamDescriptors(match[1] ?? "");
  return { returnType: match[2] ?? "V", params };
}

function parseParamDescriptors(descriptors: string): string[] {
  const out: string[] = [];
  let i = 0;
  while (i < descriptors.length) {
    const c = descriptors[i]!;
    if (c === "L") {
      const end = descriptors.indexOf(";", i);
      if (end < 0) throw new Error(`Malformed descriptor: ${descriptors}`);
      out.push(descriptors.slice(i, end + 1));
      i = end + 1;
    } else if (c === "[") {
      // Array: consume the array brackets plus the element descriptor.
      let j = i;
      while (descriptors[j] === "[") j++;
      if (descriptors[j] === "L") {
        const end = descriptors.indexOf(";", j);
        out.push(descriptors.slice(i, end + 1));
        i = end + 1;
      } else {
        out.push(descriptors.slice(i, j + 1));
        i = j + 1;
      }
    } else {
      out.push(c);
      i += 1;
    }
  }
  return out;
}

/** Sanitize an arbitrary string to a valid Java identifier fragment. */
export function sanitizeIdentifier(input: string): string {
  const cleaned = input
    .replace(/[^A-Za-z0-9_.]/g, "_")
    .replace(/^[0-9]+/, "_$&");
  return cleaned || "Injected";
}
