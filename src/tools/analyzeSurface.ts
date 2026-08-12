import { analyzeInjectionSurface as analyze } from "../decompiler/analyzer.js";
import type { InjectionSurface } from "../types.js";
import type { AnalyzeSurfaceParams } from "./schemas.js";

export const analyzeSurfaceTitle = "Analyze APK integration surface";
export const analyzeSurfaceDescription =
  "Read a decoded APK workspace to identify manifest components, ABI coverage, Flutter conflicts, JNI loading evidence, and candidate integration points. " +
  "This operation is read-only and idempotent; use it after decompile_apk and before choosing an injection mode, not to modify files. " +
  "Review warnings and evidence before calling inject_flutter_runtime_and_smali or patch_manifest_and_config.";

export async function analyzeSurface(params: AnalyzeSurfaceParams): Promise<InjectionSurface> {
  return analyze(params.workspaceDir);
}
