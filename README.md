# mcp-flutter-apk-injector

[![npm version](https://img.shields.io/npm/v/mcp-flutter-apk-injector.svg?color=blue)](https://www.npmjs.com/package/mcp-flutter-apk-injector)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js](https://img.shields.io/badge/node-%3E%3D18.0.0-green.svg)](https://nodejs.org/)
[![Model Context Protocol](https://img.shields.io/badge/MCP-1.30.0-purple.svg)](https://modelcontextprotocol.io)
[![GitHub Repository](https://img.shields.io/badge/GitHub-MarwanDevSpace-black?logo=github)](https://github.com/MarwanDevSpace/mcp-flutter-apk-injector)

Model Context Protocol (MCP) server for **Android APK reverse engineering and Flutter runtime injection** — an automated, enterprise-grade white-hat security research & penetration testing toolkit exposing a complete **Decompile ➔ Analyze ➔ Synthesize ➔ Inject ➔ Patch ➔ Repackage** pipeline as six modular MCP tools.

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
npx -y mcp-flutter-apk-injector
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

## 🧠 How it Works

The pipeline mirrors the official Flutter "Add-to-App" v2 embedding model to attach a **fresh Flutter runtime engine** into target native Android APKs without breaking original application code execution paths:

1. **Decompile (`decompile_apk`)**: Invokes `apktool` with framework-aware options, decodes binary AXML, and maps DEX/Smali structures.
2. **Analyze (`analyze_injection_surface`)**: Scans entry Activity classes, Application sub-classes, register frame allocations (`v0`-`vN`, `p0`-`pN`), native JNI boundaries, and ABI architectures (`arm64-v8a`, `armeabi-v7a`, `x86`, `x86_64`).
3. **Synthesize (`synthesize_flutter_payload`)**: Compiles Flutter payload sources and extracts `libflutter.so`, `libapp.so`, and `flutter_assets`.
4. **Inject (`inject_flutter_runtime_and_smali`)**: Generates structure-safe Smali classes (`InjectedApplication`, `FlutterOverlayActivity`, `InjectedFlutterBootstrap`, `InjectedChannelHandler`) with strict stack preservation and hooks the target Activity's `onCreate`.
5. **Patch (`patch_manifest_and_config`)**: Refactors `AndroidManifest.xml` (AXML/XML) for custom application classes, hardware acceleration, permissions, and overlay activities.
6. **Repackage (`recompile_align_and_sign`)**: Rebuilds (`apktool b`), aligns (`zipalign`), and cryptographically signs (`apksigner`) with automatic debug keystore fallback.

---

## 🛠️ Tools Exposed

| Tool | Description |
| --- | --- |
| `decompile_apk` | Decompiles target Android APK using `apktool` into an isolated workspace directory |
| `analyze_injection_surface` | Scans decompiled workspace for entry Activities, application classes, Smali methods, and ABIs |
| `synthesize_flutter_payload` | Builds Flutter application assets (`libflutter.so`, `libapp.so`, `flutter_assets`) |
| `inject_flutter_runtime_and_smali` | Allocates Smali register frames and deploys Flutter runtime into target APK workspace |
| `patch_manifest_and_config` | Modifies `AndroidManifest.xml` (custom Application, permissions, activities, metadata) |
| `recompile_align_and_sign` | Rebuilds (`apktool b`), byte-aligns (`zipalign`), and signs (`apksigner`) target APK |

---

## 💻 Requirements

- **Node.js >= 18.0.0**
- **Java Runtime / JDK** (required by `apktool` and signing tools)
- **Android SDK Build-Tools** (`zipalign`, `apksigner` — auto-discovered from `ANDROID_HOME` or system PATH)
- **apktool** installed on system PATH
- **Flutter SDK** (required only when invoking `synthesize_flutter_payload`)

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

