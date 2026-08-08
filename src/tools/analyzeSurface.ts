import { analyzeInjectionSurface as analyze } from "../decompiler/analyzer.js";
import type { InjectionSurface } from "../types.js";
import type { AnalyzeSurfaceParams } from "./schemas.js";

export const analyzeSurfaceTitle = "analyze_injection_surface";
export const analyzeSurfaceDescription =
  "USAGE GUIDELINES: Step 2 of the 6-step injection pipeline. Mandatory diagnostic step after decompile_apk and before inject_flutter_runtime_and_smali. Do NOT use on raw un-decompiled APK files or un-extracted directories.\n" +
  "PURPOSE: Perform deep static bytecode and manifest audit to identify optimal Flutter initialization hook sites, detect existing native JNI calls, and prevent Smali register allocation corruption.\n" +
  "SIDE EFFECTS & MUTATIONS: Strictly read-only static analysis operation. Does not modify, mutate, delete, or write any files in workspaceDir or on local disk.\n" +
  "PARAMETERS & CONSTRAINTS:\n" +
  "  • workspaceDir: Absolute path to decompiled APK workspace root directory containing AndroidManifest.xml and smali/ directory (produced by decompile_apk).\n" +
  "PREREQUISITES & FAILURE MODES: Requires extracted workspace directory from decompile_apk. Throws ANALYSIS_ERROR if AndroidManifest.xml is missing or invalid.\n" +
  "RETURNS: InjectionSurface JSON object detailing applicationClass presence, mainActivity launcher entry, jniLibraries, hasExistingFlutter boolean, nativeAbis list, and recommendedHook Strategy.";

export async function analyzeSurface(params: AnalyzeSurfaceParams): Promise<InjectionSurface> {
  return analyze(params.workspaceDir);
}
