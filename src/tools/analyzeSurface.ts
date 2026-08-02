import { analyzeInjectionSurface as analyze } from "../decompiler/analyzer.js";
import type { InjectionSurface } from "../types.js";
import type { AnalyzeSurfaceParams } from "./schemas.js";

export const analyzeSurfaceTitle = "analyze_injection_surface";
export const analyzeSurfaceDescription =
  "Scan a decompiled APK workspace to identify optimal injection hooks for Flutter runtime initialization: Application class presence (android:name), entry Activity, JNI loading sites, pre-existing Flutter classes, native ABIs, and recommended Smali patch points.";

export async function analyzeSurface(params: AnalyzeSurfaceParams): Promise<InjectionSurface> {
  return analyze(params.workspaceDir);
}
