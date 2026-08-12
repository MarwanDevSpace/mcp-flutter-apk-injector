import os from "node:os";
import path from "node:path";
import { ensureDir } from "../core/fileUtils.js";
import { buildFlutterPayload } from "../payload/builder.js";
import type { SynthesizedPayload } from "../types.js";
import type { SynthesizePayloadParams } from "./schemas.js";

export const synthesizePayloadTitle = "Build Flutter runtime payload";
export const synthesizePayloadDescription =
  "Build a Flutter project into native libraries and flutter_assets for the selected Android ABIs, ready for injection into a decoded workspace. " +
  "Use it after target ABI analysis and before injection when source Flutter code is available; use an existing validated payload directory instead when artifacts are already built. " +
  "This invokes the local Flutter SDK and replaces the payload output directory, so expect build time, disk writes, and build diagnostics.";

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
