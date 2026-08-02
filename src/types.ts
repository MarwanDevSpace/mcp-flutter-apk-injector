export type InjectionMode =
  | "activity_overlay"
  | "view_tree_injection"
  | "headless_engine"
  | "direct_application_hook";

export type FlutterBuildMode = "release" | "profile" | "debug";

export type Abi = "arm64-v8a" | "armeabi-v7a" | "x86" | "x86_64";

export interface MethodChannelBridgeConfig {
  /** Dart-side channel name. */
  channelName: string;
  /** Smali-side handler class descriptor, e.g. "Lcom/target/InjectedChannelHandler;". */
  handlerClass?: string;
  /** Optional method whitelist (empty = all methods routed to Dart). */
  methodWhitelist?: string[];
}

export interface DecompileResult {
  workspaceDir: string;
  sourceApk: string;
  packageName: string;
  mainActivity: string | null;
  applicationClass: string | null;
  minSdkVersion: number | null;
  targetSdkVersion: number | null;
  targetAbis: string[];
  fileCount: number;
  hasNativeLibs: boolean;
  manifestPath: string;
  smaliRoot: string | null;
}

export interface InjectionSurface {
  workspaceDir: string;
  packageName: string;
  applicationClass: string | null;
  applicationClassPath: string | null;
  existingApplication: boolean;
  entryActivities: Array<{
    name: string;
    exported: boolean;
    launcher: boolean;
    path: string | null;
  }>;
  existingFlutter: boolean;
  existingFlutterClasses: string[];
  existingNativeAbis: string[];
  jniLoadingHooks: string[];
  recommendedPatchPoints: string[];
  warnings: string[];
}

export interface SynthesizedPayload {
  payloadDir: string;
  buildMode: FlutterBuildMode;
  abis: Abi[];
  files: Record<string, string[]>;
  engineVersion: string | null;
  appSizeBytes: number | null;
  warnings: string[];
}

export interface InjectedFilePatch {
  filePath: string;
  patchType: "smali_insert" | "smali_create" | "asset_copy" | "lib_copy" | "manifest_edit";
  description: string;
  verified: boolean;
}

export interface InjectionReport {
  workspaceDir: string;
  injectionMode: InjectionMode;
  methodChannel?: MethodChannelBridgeConfig;
  generatedClasses: string[];
  modifiedFiles: InjectedFilePatch[];
  copiedAssets: number;
  copiedLibs: number;
  engineId: string;
  launchActivityName: string;
  warnings: string[];
}

export interface ManifestPatchResult {
  workspaceDir: string;
  patchedPermissions: string[];
  addedApplicationMetadata: string[];
  addedActivities: string[];
  applicationClass: string | null;
  usesCleartextTraffic: boolean;
  validation: {
    status: "ok" | "warning" | "error";
    messages: string[];
  };
}

export interface SigningResult {
  outputApkPath: string;
  signingScheme: string[];
  keystorePath: string | null;
  aligned: boolean;
  verified: boolean;
  sizeBytes: number;
}

export interface KeystoreConfig {
  keystorePath?: string;
  keystorePass?: string;
  keyAlias?: string;
  keyPass?: string;
  cn?: string;
}
