# mcp-flutter-apk-injector

Model Context Protocol (MCP) server for **Android APK reverse engineering and
Flutter runtime injection** — a white-hat security research / testing toolkit
that exposes a full decompile → analyze → inject → repackage pipeline as six
MCP tools.

> **Scope.** This project is intended for security researchers, penetration
> testers and app owners analyzing **their own** APKs. Repackaging third-party
> applications without permission is illegal in most jurisdictions. You are
> responsible for using this tool lawfully.

## How it works

The pipeline mirrors the official Flutter "add to app" v2 embedding to inject
a **fresh Flutter engine** into a native APK without touching its original
code paths:

1. **Decompile** the APK with `apktool` (source + binary `AndroidManifest.xml`
   decoding, ABI detection).
2. **Analyze** the injection surface: original application class, launcher
   activity, JNI entry points, `libflutter.so` presence, minSdk/targetSdk.
3. **Synthesize** a payload by building a Flutter app (`flutter build apk`) and
   extracting `libflutter.so`, `libapp.so` and `flutter_assets`.
4. **Inject** generated Smali classes (`InjectedApplication`,
   `FlutterOverlayActivity`, `InjectedFlutterBootstrap`,
   `InjectedChannelHandler`) plus the Flutter runtime, then hook the launcher
   activity's `onCreate` to attach a `FlutterView`.
5. **Patch** the manifest: custom application class, permissions,
   `usesCleartextTraffic`, meta-data, overlay activity registration.
6. **Recompile** (`apktool b`), **align** (`zipalign`), **sign**
   (`apksigner`, with automatic debug keystore generation).

The engine is created once in `InjectedApplication.onCreate()`, cached in
`FlutterEngineCache`, and reused by the overlay activity via `getCachedEngineId()`
(the Flutter `FlutterActivityAndFragmentDelegate` does **not** re-execute Dart
for cached engines).

## Tools

| Tool | Description |
| --- | --- |
| `decompile_apk` | Decompile an APK with apktool into a working directory |
| `analyze_injection_surface` | Scan a decompiled workspace for injection points (application class, launcher, JNI hooks, ABIs) |
| `synthesize_flutter_payload` | Build a Flutter app and extract `libflutter.so`/`libapp.so`/`flutter_assets` |
| `inject_flutter_runtime_and_smali` | Generate and deploy Smali classes + Flutter runtime into the workspace |
| `patch_manifest_and_config` | Rewrite `AndroidManifest.xml` (application class, permissions, activities, meta-data) |
| `recompile_align_and_sign` | `apktool b` → `zipalign` → `apksigner`, generating a debug keystore if needed |

### Parameters (all fields required unless marked optional)

- **decompile_apk**: `apkPath`, `outputDir`, `decompileSources?`
- **analyze_injection_surface**: `workspaceDir`
- **synthesize_flutter_payload**: `flutterProjectPath`, `targetAbis?` (`arm64-v8a`, `armeabi-v7a`, `x86`, `x86_64`), `buildMode?` (`release`|`profile`|`debug`), `outputDir?`
- **inject_flutter_runtime_and_smali**: `workspaceDir`, `payloadDir`, `injectionMode` (`activity_overlay`|`view_tree_injection`|`headless_engine`), `methodChannelBridge?` (`channelName`, `handlerClass`, `methodWhitelist`), `engineId?`
- **patch_manifest_and_config**: `workspaceDir`, `customApplicationClass?`, `additionalPermissions?`, `usesCleartextTraffic?`
- **recompile_align_and_sign**: `workspaceDir`, `outputApkPath`, `keystoreConfig?` (`keystorePath`, `keystorePass`, `keyAlias`, `keyPass`, `cn`)

## Requirements

- **Node.js >= 18**
- **Java** (for apktool and the signing chain)
- **Android SDK build-tools** (for `zipalign` / `apksigner`) — auto-discovered
  from `ANDROID_HOME` / `ANDROID_SDK_ROOT`, PATH, or default install locations
- **apktool** on PATH (or configured)
- **Flutter SDK** (only for `synthesize_flutter_payload`)

## Install & run

```bash
npm install
npm run build
node dist/index.js
```

Or install globally and use the `mcp-flutter-apk-injector` binary.

### Claude Desktop

Add to your `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "flutter-apk-injector": {
      "command": "node",
      "args": ["C:/path/to/mcp-flutter-apk-injector/dist/index.js"]
    }
  }
}
```

### Generic MCP client (stdio)

```json
{
  "mcpServers": {
    "flutter-apk-injector": {
      "command": "node",
      "args": ["C:/path/to/mcp-flutter-apk-injector/dist/index.js"],
      "env": {
        "MCP_FLUTTER_LOG_LEVEL": "info"
      }
    }
  }
}
```

## Scripts

```bash
npm run build          # tsc compile -> dist/
npm run dev            # tsx watch src/index.ts
npm run typecheck      # tsc --noEmit
npm run lint           # eslint (flat config)
npm test               # vitest run (unit)
npm run test:unit      # vitest run test/unit
npm run test:integration
```

## Repository layout

```
src/
  core/          errors, logger, process executor, file utils, orchestrator
  decompiler/    binary AXML parser, manifest parser, apktool wrapper, analyzer
  smali/         descriptors, register allocator, templates, generator, transformer
  payload/       flutter payload builder + deploy
  manifest/      manifest patcher
  packaging/     rebuild / zipalign / apksigner
  tools/         zod schemas + six MCP tool handlers
  server.ts      MCP server + registration
  index.ts       entry point
test/
  unit/          unit tests (7 files, 35 tests)
  fixtures/      sample AndroidManifest.xml, smali samples
```

## Notes / caveats

- The binary AXML parser is dependency-free and used to analyze manifests
  before apktool runs; apktool still owns the authoritative decode.
- On Windows, `.bat`/`.cmd` build-tools wrappers are launched via `cmd.exe`.
- Register allocation bumps `.locals`/`.registers` in hooked methods and
  validates Smali structure before writing to disk.

## License

MIT
