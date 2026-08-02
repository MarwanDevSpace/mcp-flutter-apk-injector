# Research log

Persistent notes on the reverse-engineering findings and design decisions
behind `mcp-flutter-apk-injector`. Updated as the Flutter embedding and the
Android tooling evolve.

## 2026-08-02 — Initial design

### Injection strategy (verified against Flutter engine source)

- `InjectedApplication.onCreate()` loads `libflutter.so` (`System.loadLibrary("flutter")`)
  and the Dart AOT snapshot loader (`System.loadLibrary("app")`), constructs a
  `FlutterEngine` against the application `Context`, executes the default Dart
  entrypoint, and stores the engine in `FlutterEngineCache` under a fixed ID
  (default `injected_flutter_engine`).
- `FlutterOverlayActivity` extends `io.flutter.embedding.android.FlutterActivity`
  and overrides `getCachedEngineId()`. Verified in
  `FlutterActivityAndFragmentDelegate#doInitialFlutterViewRun`: for cached
  engine IDs the delegate **reuses the cached engine and does not re-execute
  Dart**, avoiding double entrypoint runs.
- `view_tree_injection` mode instead calls
  `InjectedFlutterBootstrap.attachToActivity(Activity)` from the launcher
  activity's `onCreate` hook, attaching a programmatic `FlutterView` over the
  decor view — no new activity required.
- `headless_engine` mode creates the engine without UI, exposing only the
  MethodChannel bridge.

### Flutter engine sources consulted

- `FlutterActivityAndFragmentDelegate.java` — cached engine handling
- `FlutterEngineCache.java` / `FlutterEngine.java` — engine lifecycle
- `DartExecutor.java` — `executeDartEntrypoint(DartEntrypoint.createDefault())`
- `FlutterView.java` — `attachToFlutterEngine`, view hierarchy attachment
- `MethodChannel.java` — `setMethodCallHandler`, `invokeMethod`

## Toolchain

- **apktool** — decompile / rebuild Smali and decode resources.
- **zipalign + apksigner** (Android SDK build-tools) — alignment and
  APK Signature Scheme v2+ signing; debug keystore auto-generated via keytool.
- **flutter build apk** — payload synthesis; payload extracted from the built
  APK so `libapp.so` ABI coverage always matches.

## Design decisions

- Binary `AndroidManifest.xml` parsing is implemented in pure TypeScript
  (`src/decompiler/axml.ts`) with no runtime deps, so analysis works even
  before apktool is available. The root `0x0003` chunk is a transparent
  container: the string pool and element chunks are parsed inside it.
- Register allocation in `src/smali/registerAllocator.ts` reads the method's
  explicit `.locals`/`.registers` directive (rather than inferring from the
  parameter list) so injected temporaries never overlap the method's own
  scratch registers.
- MCP SDK `registerTool` accepts raw zod shapes; the tool callback bridges the
  SDK's exported `ToolCallback` type via a structural cast (`cb as never`).
  Runtime objects match the protocol exactly.

## Open items / future research

- Verify injected Smali against `apktool b` with multiple Flutter versions
  (embedding v2 vs. v3 `FlutterEngine` init signature changes).
- Multi-ABI payload de-duplication (only copy `libflutter.so`/`libapp.so`
  for the ABIs actually present in the target).
- Emulator smoke test: install repackaged APK, assert engine runs.
