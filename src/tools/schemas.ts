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
 * The `Params` interfaces mirror the zod output types for typed handlers.
 */

export const AbiSchema = z.enum(["arm64-v8a", "armeabi-v7a", "x86", "x86_64"]);

export const DecompileApkSchema = {
  apkPath: z.string().min(1, "apkPath is required"),
  outputDir: z.string().min(1, "outputDir is required"),
  decompileSources: z.boolean().default(true),
};
export interface DecompileApkParams {
  apkPath: string;
  outputDir: string;
  decompileSources: boolean;
}

export const AnalyzeSurfaceSchema = {
  workspaceDir: z.string().min(1, "workspaceDir is required"),
};
export interface AnalyzeSurfaceParams {
  workspaceDir: string;
}

export const SynthesizePayloadSchema = {
  flutterProjectPath: z.string().min(1, "flutterProjectPath is required"),
  targetAbis: z.array(AbiSchema).default(["arm64-v8a", "armeabi-v7a"]),
  buildMode: z.enum(["release", "profile", "debug"]).default("release"),
  outputDir: z.string().optional().describe("Override payload output directory"),
};
export interface SynthesizePayloadParams {
  flutterProjectPath: string;
  targetAbis: Abi[];
  buildMode: FlutterBuildMode;
  outputDir?: string;
}

export const MethodChannelBridgeSchema = z
  .object({
    channelName: z.string().default("injected_bridge"),
    handlerClass: z.string().optional(),
    methodWhitelist: z.array(z.string()).optional(),
  })
  .optional();

export const InjectFlutterSchema = {
  workspaceDir: z.string().min(1, "workspaceDir is required"),
  payloadDir: z.string().min(1, "payloadDir is required"),
  injectionMode: z.enum([
    "activity_overlay",
    "view_tree_injection",
    "headless_engine",
    "direct_application_hook",
  ]),
  methodChannelBridge: MethodChannelBridgeSchema,
  engineId: z.string().optional(),
  attachBaseContextHook: z.boolean().optional().describe("Inject engine init into attachBaseContext(Context) as well as onCreate()"),
  nativeLibraryFallback: z.boolean().optional().describe("Wrap System.loadLibrary in try-catch to prevent UnsatisfiedLinkError crashes"),
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
  workspaceDir: z.string().min(1, "workspaceDir is required"),
  customApplicationClass: z.string().optional(),
  additionalPermissions: z.array(z.string()).optional(),
  usesCleartextTraffic: z.boolean().optional(),
  extractNativeLibs: z.boolean().optional().describe("Set android:extractNativeLibs in application element"),
  hardwareAccelerated: z.boolean().optional().describe("Set android:hardwareAccelerated in application element"),
  largeHeap: z.boolean().optional().describe("Set android:largeHeap in application element"),
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
    keystorePath: z.string().optional(),
    keystorePass: z.string().optional(),
    keyAlias: z.string().optional(),
    keyPass: z.string().optional(),
    cn: z.string().optional(),
  })
  .optional();

export const RecompileSignSchema = {
  workspaceDir: z.string().min(1, "workspaceDir is required"),
  outputApkPath: z.string().min(1, "outputApkPath is required"),
  keystoreConfig: KeystoreConfigSchema,
};
export interface RecompileSignParams {
  workspaceDir: string;
  outputApkPath: string;
  keystoreConfig?: KeystoreConfig;
}
