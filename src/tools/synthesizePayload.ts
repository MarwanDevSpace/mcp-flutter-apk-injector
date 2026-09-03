import os from "node:os";
import path from "node:path";
import { ensureDir } from "../core/fileUtils.js";
import { buildFlutterPayload } from "../payload/builder.js";
import type { SynthesizedPayload } from "../types.js";
import type { SynthesizePayloadParams } from "./schemas.js";

export const synthesizePayloadTitle = "Build Flutter runtime payload";
export const synthesizePayloadDescription =
  "Compile a source Flutter project into platform native libraries (libflutter.so, libapp.so) and flutter_assets partitioned by target Android ABIs. " +
  "Invokes the local Flutter CLI, writes compiled artifacts to outputDir (or system temp if omitted), and overwrites existing destination files; requires flutterProjectPath containing pubspec.yaml. " +
  "Set targetAbis to match the target APK architectures discovered via analyze_injection_surface, choose buildMode ('release' for AOT production, 'debug' for JIT), and forward the emitted payloadDir to inject_flutter_runtime_and_smali.";

export async function synthesizePayload(
  params: SynthesizePayloadParams,
): Promise<SynthesizedPayload> {
  const outputDir =
    params.outputDir ?? path.join(os.tmpdir(), "mcp-flutter-injector", `payload-${Date.now()}`);
  await ensureDir(outputDir);

  return buildFlutterPayload({
    flutterProjectPath: params.flutterProjectPath,
    targetAbis: params.targetAbis,
    buildMode: params.buildMode,
    outputDir,
  });
}
