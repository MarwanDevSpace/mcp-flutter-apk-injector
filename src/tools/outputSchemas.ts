import { z } from "zod";

const AbiOutputSchema = z.enum(["arm64-v8a", "armeabi-v7a", "x86", "x86_64"]);
const InjectionModeOutputSchema = z.enum([
  "activity_overlay",
  "view_tree_injection",
  "headless_engine",
  "direct_application_hook",
]);

const MethodChannelBridgeOutputSchema = z.object({
  channelName: z.string().describe("Dart/host channel identifier."),
  handlerClass: z.string().optional().describe("Optional generated or host-side Smali handler class."),
  methodWhitelist: z.array(z.string()).optional().describe("Optional allowed inbound method names."),
});

export const DecompileApkOutputSchema = {
  workspaceDir: z.string().describe("Absolute path to the decoded workspace."),
  sourceApk: z.string().describe("Absolute path to the input APK that was read."),
  packageName: z.string().describe("Package name parsed from AndroidManifest.xml."),
  mainActivity: z.string().nullable().describe("Resolved launcher activity, when present."),
  applicationClass: z.string().nullable().describe("Declared application class, when present."),
  minSdkVersion: z.number().int().nullable().describe("Declared minimum Android API level."),
  targetSdkVersion: z.number().int().nullable().describe("Declared target Android API level."),
  targetAbis: z.array(z.string()).describe("Native ABI directories detected in the workspace."),
  fileCount: z.number().int().nonnegative().describe("Number of extracted workspace files."),
  hasNativeLibs: z.boolean().describe("Whether the decoded workspace contains native libraries."),
  manifestPath: z.string().describe("Absolute path to decoded AndroidManifest.xml."),
  smaliRoot: z.string().nullable().describe("Primary Smali root, when source decoding was enabled."),
};

export const SecurityAnalysisOutputSchema = z.object({
  rootDetection: z.array(z.string()).describe("Detected root and integrity check markers in bytecode."),
  antiDebug: z.array(z.string()).describe("Detected anti-debugging checks (e.g. Debug.isDebuggerConnected)."),
  emulatorDetection: z.array(z.string()).describe("Detected emulator environment markers."),
  sslPinning: z.array(z.string()).describe("Detected SSL pinning or custom TrustManager markers."),
  obfuscator: z.string().nullable().describe("Detected obfuscator or native packer fingerprint."),
});

export const ManifestSecurityOutputSchema = z.object({
  debuggable: z.boolean().describe("Whether android:debuggable is enabled."),
  allowBackup: z.boolean().describe("Whether android:allowBackup is enabled."),
  usesCleartextTraffic: z.boolean().describe("Whether android:usesCleartextTraffic is permitted."),
  exportedComponentsCount: z.number().int().nonnegative().describe("Count of exported activities/components without permission barriers."),
  dangerousPermissions: z.array(z.string()).describe("Declared dangerous Android permissions."),
});

export const MultiDexOutputSchema = z.object({
  isMultiDex: z.boolean().describe("Whether the workspace contains multiple Smali root classes."),
  smaliRoots: z.array(z.string()).describe("List of detected Smali root directory names."),
});

export const AnalyzeSurfaceOutputSchema = {
  workspaceDir: z.string().describe("Analyzed decoded APK workspace."),
  packageName: z.string().describe("Manifest package identity."),
  applicationClass: z.string().nullable().describe("Declared application class, when present."),
  applicationClassPath: z.string().nullable().describe("Resolved application Smali path, when available."),
  existingApplication: z.boolean().describe("Whether the manifest declares an application class."),
  entryActivities: z.array(z.object({
    name: z.string(),
    exported: z.boolean(),
    launcher: z.boolean(),
    path: z.string().nullable(),
  })).describe("Manifest activities and their resolved Smali paths."),
  existingFlutter: z.boolean().describe("Whether Flutter embedding classes were detected."),
  existingFlutterClasses: z.array(z.string()).describe("Detected existing Flutter class paths."),
  existingNativeAbis: z.array(z.string()).describe("Native ABI directories detected in the target."),
  nativeLibraries: z.record(z.array(z.string())).describe("Detected native .so libraries grouped by ABI architecture."),
  securityAnalysis: SecurityAnalysisOutputSchema.describe("Deep bytecode security audit (root, anti-debug, emulator, ssl pinning, obfuscator)."),
  manifestSecurity: ManifestSecurityOutputSchema.describe("Manifest security configuration and attack surface audit."),
  multiDex: MultiDexOutputSchema.describe("Multi-DEX architecture and Smali root layout analysis."),
  jniLoadingHooks: z.array(z.string()).describe("Evidence strings for detected JNI library loading calls."),
  assetScripts: z.array(z.string()).describe("Candidate script-like asset paths."),
  luaMods: z.array(z.string()).describe("Detected Lua asset paths."),
  recommendedPatchPoints: z.array(z.string()).describe("Suggested host integration points."),
  automatedChainSuggestions: z.array(z.string()).describe("Suggested next pipeline actions."),
  warnings: z.array(z.string()).describe("Compatibility warnings that require review before mutation."),
};

export const SynthesizePayloadOutputSchema = {
  payloadDir: z.string().describe("Absolute directory containing synthesized payload artifacts."),
  buildMode: z.enum(["release", "profile", "debug"]).describe("Flutter build mode used."),
  abis: z.array(AbiOutputSchema).describe("ABIs successfully emitted into the payload."),
  files: z.record(z.array(z.string())).describe("Payload-relative artifact paths grouped by type."),
  engineVersion: z.string().nullable().describe("Detected Flutter engine/version identifier, when available."),
  appSizeBytes: z.number().int().nonnegative().nullable().describe("Extracted libapp.so size, when available."),
  warnings: z.array(z.string()).describe("Build or artifact-completeness warnings."),
};

export const InjectFlutterOutputSchema = {
  workspaceDir: z.string().describe("Mutated decoded APK workspace."),
  injectionMode: InjectionModeOutputSchema.describe("Applied Flutter integration mode."),
  methodChannel: MethodChannelBridgeOutputSchema.optional().describe("Configured method-channel bridge, when requested."),
  generatedClasses: z.array(z.string()).describe("Generated Smali class descriptors."),
  modifiedFiles: z.array(z.object({
    filePath: z.string(),
    patchType: z.enum(["smali_insert", "smali_create", "asset_copy", "lib_copy", "manifest_edit"]),
    description: z.string(),
    verified: z.boolean(),
  })).describe("Workspace files created or changed by the operation."),
  copiedAssets: z.number().int().nonnegative().describe("Number of copied Flutter asset files."),
  copiedLibs: z.number().int().nonnegative().describe("Number of copied native library files."),
  engineId: z.string().describe("FlutterEngineCache identifier used by generated code."),
  launchActivityName: z.string().describe("Resolved activity associated with the selected integration mode."),
  warnings: z.array(z.string()).describe("Compatibility and follow-up warnings."),
};

export const PatchManifestOutputSchema = {
  workspaceDir: z.string().describe("Mutated decoded APK workspace."),
  patchedPermissions: z.array(z.string()).describe("Permissions added during the patch."),
  addedApplicationMetadata: z.array(z.string()).describe("Application metadata keys added during the patch."),
  addedActivities: z.array(z.string()).describe("Activity class names added during the patch."),
  applicationClass: z.string().nullable().describe("Application class after the patch."),
  usesCleartextTraffic: z.boolean().describe("Reported cleartext-traffic configuration request."),
  validation: z.object({
    status: z.enum(["ok", "warning", "error"]),
    messages: z.array(z.string()),
  }).describe("Post-patch manifest validation result."),
};

export const RecompileSignOutputSchema = {
  outputApkPath: z.string().describe("Absolute path to the signed output APK."),
  signingScheme: z.array(z.string()).describe("Detected APK signature schemes."),
  keystorePath: z.string().nullable().describe("Keystore used for signing, when available."),
  aligned: z.boolean().describe("Whether zipalign completed successfully."),
  verified: z.boolean().describe("Whether apksigner verification completed successfully."),
  sizeBytes: z.number().int().nonnegative().describe("Final APK byte size."),
};

export const GetAgentContextOutputSchema = {
  persona: z.object({
    name: z.string().describe("Agent persona name."),
    title: z.string().describe("Agent persona professional title."),
    operationalRules: z.array(z.string()).describe("System and reverse engineering operational rules."),
  }).describe("Hermes+ identity and engineering principles."),
  skills: z.array(z.object({
    name: z.string().describe("Loaded skill identifier."),
    description: z.string().describe("Loaded skill operational capability description."),
  })).describe("Available agent skill sheets."),
  sessionMemory: z.record(z.unknown()).describe("Active session memory snapshot including target metadata, patch logs, and telemetry."),
};

export const UpdateAgentMemoryOutputSchema = {
  status: z.enum(["success", "error"]).describe("Status of the memory state update operation."),
  updatedMemory: z.record(z.unknown()).describe("Complete updated session memory state after applying modifications and persisting to disk."),
};

export const QueryMemoryGraphOutputSchema = {
  query: z.string().describe("Original query search string."),
  matchesCount: z.number().int().nonnegative().describe("Total number of matching memory graph nodes found."),
  results: z.array(z.object({
    category: z.string().describe("Memory graph node category (e.g. Package Name, Patch, Agent Note)."),
    value: z.string().describe("Matched node string value or patch detail."),
    matchScore: z.number().describe("Relevance match score (higher indicates more specific match)."),
  })).describe("Ranked list of matching memory graph elements."),
};

export type OutputShape = Record<string, z.ZodTypeAny>;
