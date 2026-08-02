import os from "node:os";
import path from "node:path";
import { ensureDir } from "../core/fileUtils.js";
import { buildFlutterPayload } from "../payload/builder.js";
import type { SynthesizedPayload } from "../types.js";
import type { SynthesizePayloadParams } from "./schemas.js";

export const synthesizePayloadTitle = "synthesize_flutter_payload";
export const synthesizePayloadDescription =
  "Compile a source Flutter project and extract the runtime artifacts required for injection: libflutter.so (Flutter engine), libapp.so (Dart AOT snapshot), the flutter_assets bundle, and ICU data. Produces a payload directory ready to merge into a decompiled APK workspace.";

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
