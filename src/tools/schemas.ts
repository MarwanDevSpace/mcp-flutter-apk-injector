import { z } from "zod";
import type {
  Abi,
  FlutterBuildMode,
  InjectionMode,
  KeystoreConfig,
  MethodChannelBridgeConfig,
} from "../types.js";

/**
 * Input schemas for each MCP tool (raw zod shapes, per the MCP SDK contract).
 * Hardened with explicit .describe() metadata per Glama / MCP standards.
 */

export const AbiSchema = z
  .enum(["arm64-v8a", "armeabi-v7a", "x86", "x86_64"])
  .describe("Target Android Native ABI architecture (e.g. 'arm64-v8a' for modern 64-bit devices)");

export const DecompileApkSchema = {
  apkPath: z
    .string()
    .min(1, "apkPath is required")
    .describe("Absolute path to target source .apk file to decompile"),
  outputDir: z
    .string()
    .min(1, "outputDir is required")
    .describe("Destination directory path where decompiled Smali code, resources, assets, and AndroidManifest.xml will be extracted"),
  decompileSources: z
    .boolean()
    .default(true)
    .describe("Whether to disassemble DEX files into Smali code (default: true). Set false for resource/asset-only disassembly"),
};
export interface DecompileApkParams {
  apkPath: string;
  outputDir: string;
  decompileSources: boolean;
}

export const AnalyzeSurfaceSchema = {
  workspaceDir: z
    .string()
    .min(1, "workspaceDir is required")
    .describe("Path to decompiled APK workspace root directory containing AndroidManifest.xml and Smali structures produced by decompile_apk"),
};
export interface AnalyzeSurfaceParams {
  workspaceDir: string;
}

export const SynthesizePayloadSchema = {
  flutterProjectPath: z
    .string()
    .min(1, "flutterProjectPath is required")
    .describe("Path to source Flutter project root containing pubspec.yaml and lib/main.dart"),
  targetAbis: z
    .array(AbiSchema)
    .default(["arm64-v8a", "armeabi-v7a"])
    .describe("Target native CPU architectures to build payload binaries for (default: ['arm64-v8a', 'armeabi-v7a'])"),
  buildMode: z
    .enum(["release", "profile", "debug"])
    .default("release")
    .describe("Flutter build mode target: 'release' (AOT production build), 'profile' (AOT performance build), 'debug' (JIT build)"),
  outputDir: z
    .string()
    .optional()
    .describe("Optional custom directory path to write synthesized payload artifacts (defaults to system temp dir)"),
};
export interface SynthesizePayloadParams {
  flutterProjectPath: string;
  targetAbis: Abi[];
  buildMode: FlutterBuildMode;
  outputDir?: string;
}

export const MethodChannelBridgeSchema = z
  .object({
    channelName: z
      .string()
      .default("injected_bridge")
      .describe("Name of two-way Flutter MethodChannel identifier for Smali<->Dart communication"),
    handlerClass: z
      .string()
      .optional()
      .describe("Optional custom Smali handler class name to process incoming MethodChannel calls"),
    methodWhitelist: z
      .array(z.string())
      .optional()
      .describe("Optional whitelist of method names allowed over the MethodChannel bridge"),
  })
  .optional()
  .describe("Optional MethodChannel bridge config for two-way communication between target Android Smali host and injected Flutter Dart layer");

export const InjectFlutterSchema = {
  workspaceDir: z
    .string()
    .min(1, "workspaceDir is required")
    .describe("Path to decompiled APK workspace root directory produced by decompile_apk (modified in-place)"),
  payloadDir: z
    .string()
    .min(1, "payloadDir is required")
    .describe("Path to synthesized Flutter payload directory produced by synthesize_flutter_payload containing lib/ native libraries (libflutter.so, libapp.so) and assets/"),
  injectionMode: z
    .enum([
      "activity_overlay",
      "view_tree_injection",
      "headless_engine",
      "direct_application_hook",
    ])
    .describe("Injection strategy enum: 'direct_application_hook' (hooks host Application class), 'activity_overlay' (adds overlay Activity), 'view_tree_injection' (attaches FlutterView to main Activity), 'headless_engine' (background engine without UI)"),
  methodChannelBridge: MethodChannelBridgeSchema,
  engineId: z
    .string()
    .optional()
    .describe("Optional cached FlutterEngine identifier stored in FlutterEngineCache (defaults to 'injected_flutter_engine')"),
  attachBaseContextHook: z
    .boolean()
    .optional()
    .describe("Inject engine init into attachBaseContext(Context) as well as onCreate() for early initialization"),
  nativeLibraryFallback: z
    .boolean()
    .optional()
    .describe("Wrap System.loadLibrary call in defensive try-catch blocks to prevent UnsatisfiedLinkError crashes on missing ABIs"),
};
export interface InjectFlutterParams {
  workspaceDir: string;
  payloadDir: string;
  injectionMode: InjectionMode;
  methodChannelBridge?: MethodChannelBridgeConfig;
  engineId?: string;
  attachBaseContextHook?: boolean;
  nativeLibraryFallback?: boolean;
}

export const PatchManifestSchema = {
  workspaceDir: z
    .string()
    .min(1, "workspaceDir is required")
    .describe("Path to decompiled APK workspace root directory containing AndroidManifest.xml (modified in-place)"),
  customApplicationClass: z
    .string()
    .optional()
    .describe("Fully qualified class name of injected Application subclass (e.g. 'com.example.injected.InjectedApplication')"),
  additionalPermissions: z
    .array(z.string())
    .optional()
    .describe("List of additional Android permissions to inject into AndroidManifest.xml (e.g. ['android.permission.INTERNET', 'android.permission.WAKE_LOCK'])"),
  usesCleartextTraffic: z
    .boolean()
    .optional()
    .describe("Set android:usesCleartextTraffic='true' in application tag to allow unencrypted HTTP traffic"),
  extractNativeLibs: z
    .boolean()
    .optional()
    .describe("Set android:extractNativeLibs in application element for legacy native library extraction"),
  hardwareAccelerated: z
    .boolean()
    .optional()
    .describe("Set android:hardwareAccelerated='true' in application element for GPU hardware rendering"),
  largeHeap: z
    .boolean()
    .optional()
    .describe("Set android:largeHeap='true' in application element to increase RAM heap allocation"),
};
export interface PatchManifestParams {
  workspaceDir: string;
  customApplicationClass?: string;
  additionalPermissions?: string[];
  usesCleartextTraffic?: boolean;
  extractNativeLibs?: boolean;
  hardwareAccelerated?: boolean;
  largeHeap?: boolean;
}

export const KeystoreConfigSchema = z
  .object({
    keystorePath: z
      .string()
      .optional()
      .describe("Path to custom JKS/PKCS12 signing keystore file (auto-generates debug keystore if omitted)"),
    keystorePass: z
      .string()
      .optional()
      .describe("Keystore password for signing keystore access"),
    keyAlias: z
      .string()
      .optional()
      .describe("Private key alias name inside signing keystore"),
    keyPass: z
      .string()
      .optional()
      .describe("Password for specific private key alias"),
    cn: z
      .string()
      .optional()
      .describe("Common Name (CN) owner string for self-signed debug certificate"),
  })
  .optional()
  .describe("Optional signing keystore configuration. If omitted, an auto-generated debug keystore is used");

export const RecompileSignSchema = {
  workspaceDir: z
    .string()
    .min(1, "workspaceDir is required")
    .describe("Path to decompiled APK workspace root directory containing modified Smali, assets, and AndroidManifest.xml"),
  outputApkPath: z
    .string()
    .min(1, "outputApkPath is required")
    .describe("Destination file path for final recompiled, 4-byte aligned, and cryptographically signed APK"),
  keystoreConfig: KeystoreConfigSchema,
};
export interface RecompileSignParams {
  workspaceDir: string;
  outputApkPath: string;
  keystoreConfig?: KeystoreConfig;
}

