import os from "node:os";
import path from "node:path";
import { ensureDir } from "../core/fileUtils.js";
import { buildFlutterPayload } from "../payload/builder.js";
import type { SynthesizedPayload } from "../types.js";
import type { SynthesizePayloadParams } from "./schemas.js";

export const synthesizePayloadTitle = "synthesize_flutter_payload";
export const synthesizePayloadDescription =
  "USAGE GUIDELINES: Step 3 of the 6-step injection pipeline. Run before inject_flutter_runtime_and_smali to compile a custom Flutter project into payload binaries. Do NOT use if pre-compiled payload artifacts are already available.\n" +
  "PURPOSE: Compile source Flutter code into AOT/JIT native engine libraries (libflutter.so, libapp.so), asset bundles (flutter_assets), FontManifest.json, and ICU data.\n" +
  "SIDE EFFECTS & RESOURCE USAGE: Invokes local subprocess 'flutter build apk'. May take 30-120s execution time and write 20-50MB of temporary payload artifacts to outputDir on local disk.\n" +
  "PARAMETERS & CONSTRAINTS:\n" +
  "  • flutterProjectPath: Absolute path to source Flutter project root containing pubspec.yaml and lib/main.dart.\n" +
  "  • targetAbis: Array of target ABIs ['arm64-v8a', 'armeabi-v7a', 'x86', 'x86_64'] (default: ['arm64-v8a', 'armeabi-v7a']).\n" +
  "  • buildMode: 'release' (default, AOT production mode), 'profile' (AOT benchmark mode), 'debug' (JIT development mode).\n" +
  "  • outputDir: Optional destination directory path (auto-created under system temp dir if omitted).\n" +
  "PREREQUISITES & FAILURE MODES: Requires active Flutter SDK installation in system PATH. Throws PAYLOAD_BUILD_ERROR if Flutter build fails, SDK is missing, or Dart entrypoint contains syntax errors.\n" +
  "RETURNS: SynthesizedPayload object containing absolute payloadDir path, generated native library list, target ABI mappings, asset count, and total byte size.";

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
