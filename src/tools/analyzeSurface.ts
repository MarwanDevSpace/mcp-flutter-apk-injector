import { analyzeInjectionSurface as analyze } from "../decompiler/analyzer.js";
import type { InjectionSurface } from "../types.js";
import type { AnalyzeSurfaceParams } from "./schemas.js";

export const analyzeSurfaceTitle = "Analyze APK integration surface";
export const analyzeSurfaceDescription =
  "Perform static bytecode analysis and security auditing on a decoded APK workspace to identify manifest components, ABI coverage, JNI loading hooks, native libraries, anti-debug/root checks, and candidate injection hooks. " +
  "This operation is read-only, non-mutating, and idempotent; requires workspaceDir pointing to a valid directory produced by decompile_apk with an AndroidManifest.xml and smali structures. " +
  "Use after decompile_apk to audit the target before modifying files; review returned warnings, securityAnalysis, and candidate hooks before selecting an injection mode with inject_flutter_runtime_and_smali.";

export async function analyzeSurface(params: AnalyzeSurfaceParams): Promise<InjectionSurface> {
  return analyze(params.workspaceDir);
}
