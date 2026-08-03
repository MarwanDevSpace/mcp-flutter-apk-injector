# mcp-flutter-apk-injector

[![npm version](https://img.shields.io/npm/v/mcp-flutter-apk-injector.svg?color=blue)](https://www.npmjs.com/package/mcp-flutter-apk-injector)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js](https://img.shields.io/badge/node-%3E%3D18.0.0-green.svg)](https://nodejs.org/)
[![Model Context Protocol](https://img.shields.io/badge/MCP-1.30.0-purple.svg)](https://modelcontextprotocol.io)
[![GitHub Repository](https://img.shields.io/badge/GitHub-MarwanDevSpace-black?logo=github)](https://github.com/MarwanDevSpace/mcp-flutter-apk-injector)

Model Context Protocol (MCP) server for **Android APK reverse engineering and Flutter runtime injection** — an automated, enterprise-grade white-hat security research & penetration testing toolkit exposing a complete **Decompile ➔ Analyze ➔ Synthesize ➔ Inject ➔ Patch ➔ Repackage** pipeline as six modular MCP tools and agent prompt triggers.

---

> 🔒 **Scope & Compliance Statement**  
> This project is designed exclusively for security researchers, mobile auditors, and application owners auditing **their own** binaries or authorized targets. Repackaging third-party applications without explicit authorization is prohibited. You are responsible for using this tool lawfully.

---

## 🚀 Quick Start & Installation

You can run `mcp-flutter-apk-injector` directly via `npx` (no manual build required), or install it globally:

### 📦 Global NPM Install

```bash
npm install -g mcp-flutter-apk-injector
```

### ⚡ Running via `npx`

```bash
npx -y mcp-flutter-apk-injector@latest
```

---

## 🛠️ MCP Client Setup

### Claude Desktop Configuration

Add the following block to your `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "mcp-flutter-apk-injector": {
      "command": "npx",
      "args": ["-y", "mcp-flutter-apk-injector@latest"]
    }
  }
}
```

### Antigravity IDE / Generic MCP Client (`stdio`)

```json
{
  "mcpServers": {
    "mcp-flutter-apk-injector": {
      "command": "npx",
      "args": ["-y", "mcp-flutter-apk-injector@latest"],
      "env": {
        "MCP_FLUTTER_LOG_LEVEL": "info"
      }
    }
  }
}
```

---

## 🛡️ Hermes+ Master Agent & MCP Skills System

`mcp-flutter-apk-injector` is tightly integrated with **Hermes+** (Elite Android Systems & Reverse Engineering Architect) and exposes pre-configured **MCP Skills** (`.agents/skills/`):

* 🧠 **`hermes-apk-reverse-engineering`**: Master skill for disassembling, DEX/Smali refactoring, register frame allocation (`v0`-`vN`, `p0`-`pN`), native `.so` library deployment, and Flutter runtime injection.
* ⚡ **`mcp-toolchain-orchestrator`**: Master skill for high-precision MCP toolchain orchestration, zero-argument prompt handling, automated testing, and distribution.

### ⚡ Agent Prompts & Slash Commands

`mcp-flutter-apk-injector` registers native zero-argument resilient MCP Prompts for AI desktop agents (Antigravity IDE, Claude Desktop, Cursor):

- **`/scan`**: Diagnostic audit scan of decompiled APK workspace, entry points, Smali structure, and native ABIs.
- **`/decompile`**: Disassemble target `.apk` into Smali bytecode and resources using `apktool`.
- **`/inject`**: Execute Flutter runtime payload & Smali glue code injection into target APK.
- **`/patch`**: Patch `AndroidManifest.xml` (application class, hardware acceleration, cleartext traffic, permissions).
- **`/recompile`**: Repackage (`apktool b`), byte-align (`zipalign`), and cryptographically sign (`apksigner`) modified target.
- **`/pipeline`**: Full automated end-to-end decompilation ➔ analysis ➔ payload synthesis ➔ injection ➔ manifest patch ➔ recompilation pipeline.

---

## 🧠 How it Works & Injection Modes

The pipeline supports four flexible injection strategies aligning with Flutter's "Add-to-App" v2 architecture:

1. **`activity_overlay`**: Generates a dedicated `FlutterOverlayActivity` extending `FlutterActivity` that reuses the pre-warmed cached engine.
2. **`view_tree_injection`**: Programmatically attaches a `FlutterView` into the decor view layout tree of the target Activity's `onCreate()`.
3. **`headless_engine`**: Initializes a background `FlutterEngine` without UI for headless Dart execution, channel routing, and telemetry.
4. **`direct_application_hook`**: Directly instruments existing `Application.onCreate()` or `attachBaseContext()` methods in decompiled Smali without altering `android:name` in `AndroidManifest.xml`.

---

## 🛠️ The 6 Core MCP Tools

| Tool Name | Detailed Function & Output |
| --- | --- |
| `decompile_apk` | Disassemble a target Android APK into Smali bytecode, native library trees (`lib/`), resources (`res/`), and a decoded `AndroidManifest.xml` using `apktool`. Returns package name, main Activity, Application class, min/target SDKs, native ABIs, and file manifest. |
| `analyze_injection_surface` | Scan a decompiled APK workspace to identify optimal injection hooks for Flutter runtime initialization: Application class presence (`android:name`), entry Activity, JNI loading sites, pre-existing Flutter classes, native ABIs, and recommended Smali patch points. |
| `synthesize_flutter_payload` | Compile a source Flutter project and extract the runtime artifacts required for injection: `libflutter.so` (Flutter engine), `libapp.so` (Dart AOT snapshot), the `flutter_assets` bundle, and ICU data. Produces a payload directory ready to merge into a decompiled APK workspace. |
| `inject_flutter_runtime_and_smali` | Inject Flutter engine assets, native libraries, and Smali glue code into a decompiled APK tree. Generates an `InjectedApplication` (`FlutterEngine` init + `libflutter`/`libapp` loading with try-catch fallback), a cached-engine bootstrap, an optional `FlutterOverlayActivity` (`activity_overlay` mode), and an optional two-way Smali<->Dart `MethodChannel` bridge. Returns a detailed patch report. |
| `patch_manifest_and_config` | Patch the decoded `AndroidManifest.xml` with Flutter runtime requirements: `INTERNET`/`WAKE_LOCK` permissions, custom Application class override, `FlutterActivity` entry (`activity_overlay`), `engine-id` metadata, `extractNativeLibs`, `hardwareAccelerated`, and optional `usesCleartextTraffic`. Returns a validation status for the patched manifest. |
| `recompile_align_and_sign` | Repack the decompiled APK workspace with `apktool`, run `zipalign` for 4-byte alignment, and sign with `apksigner` using V1/V2/V3 schemes. Uses an auto-generated debug keystore unless a custom `keystoreConfig` is provided. Returns the verified, aligned, installable APK path. |

---

## 💻 System Requirements

- **Node.js >= 18.0.0**
- **Java Runtime / JDK** (required by `apktool` and `apksigner`)
- **Android SDK Build-Tools** (`zipalign`, `apksigner` — auto-discovered from `ANDROID_HOME` or system PATH)
- **apktool** installed on system PATH
- **Flutter SDK** (required only when executing `synthesize_flutter_payload`)

---

## 🧪 Development & Testing

```bash
# Install local dependencies
npm install

# Build TypeScript to dist/
npm run build

# Typecheck without emitting
npm run typecheck

# Code formatting & lint check
npm run lint

# Execute Vitest suite (35 unit tests)
npm test
```

---

## 📜 License

[MIT License](LICENSE) © 2026 [Marwan (MarwanDevSpace)](https://github.com/MarwanDevSpace)


