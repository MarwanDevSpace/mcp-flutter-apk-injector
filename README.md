# mcp-flutter-apk-injector

<div align="center">

![mcp-flutter-apk-injector Banner](https://img.shields.io/badge/MCP-Flutter_APK_Injector-blueviolet?style=for-the-badge&logo=android&logoColor=white)

[![npm version](https://img.shields.io/npm/v/mcp-flutter-apk-injector.svg?style=flat-badge&color=blue)](https://www.npmjs.com/package/mcp-flutter-apk-injector)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=flat-badge)](https://opensource.org/licenses/MIT)
[![Node.js](https://img.shields.io/badge/node-%3E%3D18.0.0-green.svg?style=flat-badge&logo=nodedotjs)](https://nodejs.org/)
[![Model Context Protocol](https://img.shields.io/badge/MCP-1.30.0-purple.svg?style=flat-badge)](https://modelcontextprotocol.io)
[![Hermes+ Engine](https://img.shields.io/badge/Agent-Hermes%2B_Universal_Engine-red?style=flat-badge&logo=openai)](https://github.com/MarwanDevSpace/mcp-flutter-apk-injector)
[![GitHub Repository](https://img.shields.io/badge/GitHub-MarwanDevSpace-black?style=flat-badge&logo=github)](https://github.com/MarwanDevSpace/mcp-flutter-apk-injector)
[![mcp-flutter-apk-injector MCP server](https://glama.ai/mcp/servers/MarwanDevSpace/mcp-flutter-apk-injector/badges/score.svg)](https://glama.ai/mcp/servers/MarwanDevSpace/mcp-flutter-apk-injector)

**The Premier Memory-Aware Model Context Protocol (MCP) Server for Android APK Reverse Engineering, Smali Frame Refactoring, Native JNI Tracing, and Flutter Runtime Overlay Injection.**

[ 🇬🇧 **English Documentation** ](#-english-documentation) &nbsp; | &nbsp; [ 🇸🇦 **التوثيق باللغة العربية** ](#-التوثيق-باللغة-العربية)

</div>

---

## 🇬🇧 English Documentation

### 🌟 Executive Overview & Key Advantages

`mcp-flutter-apk-injector` (v0.7.1) is an enterprise-grade Model Context Protocol (MCP) Server designed for security researchers, reverse engineers, and mobile penetration testers. It seamlessly combines **automated static/dynamic Android binary analysis**, **Dalvik/ART Smali stack frame balance refactoring**, **native `.so` library symbol tracing**, and **Flutter Add-to-App v2 runtime injection**.

Powered by **Hermes+ (Universal Main Character)**, this server provides persistent session telemetry, searchable patch history, native MCP resources, and resilient zero-argument prompt handlers. Version 0.7.1 introduces unified character contracts ([`HERMES.md`](HERMES.md) & [`AGENTS.md`](AGENTS.md)), automated workspace contract installation across decompiled targets, deep security auditing (anti-debugging, root checks, SSL pinning, native packers), and achieves **5.0/5.0 Tier A+** across all 9 MCP tools according to Glama standards.

```
                          ┌─────────────────────────────────────────┐
                          │   AI Assistant / MCP Client (Claude,   │
                          │   Antigravity IDE, Cursor, Windsurf)    │
                          └────────────────────┬────────────────────┘
                                               │
                                               ▼
  ┌────────────────────────────────────────────────────────────────────────────────────────┐
  │                           mcp-flutter-apk-injector (v0.7.1)                            │
  │                                                                                        │
  │  ┌────────────────────────┐  ┌─────────────────────────┐  ┌─────────────────────────┐  │
  │  │  Hermes+ Master Engine │  │ Session Memory Manager  │  │ Embedded Skills & Prompts│  │
  │  │ (HERMES.md / AGENTS.md)│  │ (.mcp_memory/session)   │  │ (/scan, /decompile, ...)│  │
  │  └───────────┬────────────┘  └────────────┬────────────┘  └────────────┬────────────┘  │
  └──────────────┼────────────────────────────┼────────────────────────────┼───────────────┘
                 │                            │                            │
                 ▼                            ▼                            ▼
  ┌────────────────────────────────────────────────────────────────────────────────────────┐
  │                          THE 9 ENTERPRISE MCP TOOLS & RESOURCES                        │
  │                                                                                        │
  │  [decompile_apk] ──► [analyze_surface] ──► [synthesize_payload] ──► [inject_flutter]  │
  │  [patch_manifest] ──► [recompile_align_sign] ──► [get_context] ──► [update_memory]    │
  │                             [query_memory_graph]                                       │
  └────────────────────────────────────────────────────────────────────────────────────────┘
```

---

### 🧠 Hermes+ Universal Character & Contracts

#### 1. Universal Specification: [`HERMES.md`](HERMES.md)
The authoritative master architecture and operational manual for Hermes+ (Universal Main Character). It defines Dalvik/ART Smali register frame calculus (`.locals + params = .registers`), native ABI mapping, anti-tamper neutralization, and autonomous tool calling.

#### 2. Universal Agent Contract: [`AGENTS.md`](AGENTS.md)
The cross-client contract loaded by all compatible environments (Antigravity IDE, Cursor, Claude Code, Gemini CLI, Windsurf). Synchronized with `.agents/AGENTS.md`.

#### 3. Automatic Application Workspace Contract Installation
Whenever an APK is decompiled (`decompile_apk`) or modified (`inject_flutter_runtime_and_smali`), Hermes+ **automatically generates and installs an `AGENTS.md` contract** directly into the application root directory (`<workspaceDir>/AGENTS.md`). Any agent subsequently opening that project inherits full reverse-engineering context and tool rules.

#### 4. Native MCP Skills (`.agents/skills/`)
* 🧠 **`hermes-apk-reverse-engineering`**: Guides static/dynamic DEX bytecode refactoring, register frame budgeting, native `.so` library deployment, and zero-crash UI overlay injection.
* ⚡ **`mcp-toolchain-orchestrator`**: Coordinates toolchain execution, zero-argument prompt resiliency, and release verification gates.

#### 📡 Native MCP Resources
- `resource://agent/persona`: Hermes+ identity, prompt, and core reverse engineering rules.
- `resource://agent/rules`: 5-step deep reverse engineering protocol.
- `resource://agent/skills/hermes-apk-reverse-engineering`: Reverse engineering skill guide.
- `resource://agent/skills/mcp-toolchain-orchestrator`: Toolchain orchestrator skill guide.
- `resource://memory/session`: Live JSON session memory graph state.
- `resource://memory/patch_history`: Audit log of applied Smali and Manifest patches.

---

### ⚙️ 5-Step Reverse Engineering Pipeline

```
                       [Target Android .apk / Workspace]
                                       │
                                       ▼
 ┌───────────────────────────────────────────────────────────────────────────┐
 │ STEP 1: Binary & Workspace Deconstruction (decompile_apk)                 │
 │ Extract Smali, native lib/*.so trees, AXML; auto-install AGENTS.md        │
 └─────────────────────────────────────┬─────────────────────────────────────┘
                                       │
                                       ▼
 ┌───────────────────────────────────────────────────────────────────────────┐
 │ STEP 2: Deep Security & Surface Audit (analyze_injection_surface)         │
 │ Audit anti-debugging, root checks, SSL pinning, packers, ABIs, multi-DEX  │
 └─────────────────────────────────────┬─────────────────────────────────────┘
                                       │
                                       ▼
 ┌───────────────────────────────────────────────────────────────────────────┐
 │ STEP 3: Payload Synthesis & Injection (inject_flutter_runtime_and_smali)  │
 │ Compile Flutter engine; balance register stack frames; inject UI overlay  │
 └─────────────────────────────────────┬─────────────────────────────────────┘
                                       │
                                       ▼
 ┌───────────────────────────────────────────────────────────────────────────┐
 │ STEP 4: Manifest Configuration & Rebuild (patch_manifest & recompile)     │
 │ Patch AndroidManifest.xml; rebuild (apktool b), zipalign, apksigner sign  │
 └─────────────────────────────────────┬─────────────────────────────────────┘
                                       │
                                       ▼
 ┌───────────────────────────────────────────────────────────────────────────┐
 │ STEP 5: Architectural Telemetry & Session Graph (Session Memory)          │
 │ Query memory graph; record verified patches and output verification       │
 └───────────────────────────────────────────────────────────────────────────┘
```

---

### 🛠️ The 9 Enterprise MCP Tools (Glama 5.0/5.0 Tier A+)

| Tool Name | Type | Annotations | Operational Role |
|---|---|---|---|
| `decompile_apk` | Core | `destructive: true` | Decodes APK into Smali, resources, assets, and manifest; **auto-installs `AGENTS.md` into workspace**. |
| `analyze_injection_surface` | Core | `readOnly: true, idempotent: true` | Static audit: scans components, native `.so` libraries, anti-debugging, root checks, SSL pinning, packers, and multi-DEX. |
| `synthesize_flutter_payload` | Core | `destructive: true` | Compiles Flutter project into platform native libraries (`libflutter.so`, `libapp.so`) and assets. |
| `inject_flutter_runtime_and_smali` | Core | `destructive: true` | Injects Flutter runtime, native libraries, and generated Smali bootstrap classes (`activity_overlay`, etc.). |
| `patch_manifest_and_config` | Core | `destructive: true` | Mutates `AndroidManifest.xml` in-place (activities, Application subclass, hardware acceleration, permissions). |
| `recompile_align_and_sign` | Core | `destructive: true` | Rebuilds with apktool, 4-byte zipaligns, and cryptographically signs with apksigner (v1-v4). |
| `get_agent_context` | Agent | `readOnly: true, idempotent: true` | Inspects Hermes+ persona, embedded rules, registered skills, and live session state. |
| `update_agent_memory` | Agent | `destructive: true` | Records discovered hooks, notes, and patch history into memory and `.mcp_memory/session_state.json`. |
| `query_memory_graph` | Agent | `readOnly: true, idempotent: true` | Searches and ranks recorded patches, security findings, native libraries, and multi-DEX roots. |

---

### 🎮 The 4 Flutter Injection Modes

| Mode | Target Hook | Architectural Description |
|---|---|---|
| **`activity_overlay`** (Preferred) | `FlutterOverlayActivity` | Launches a dedicated Activity extending `FlutterActivity` reusing a pre-warmed cached engine. |
| **`direct_application_hook`** | `Application.onCreate()` | Hooks directly into host Application lifecycle (and optional `attachBaseContext`), preserving host initialization. |
| **`headless_engine`** | `BackgroundFlutterEngine` | Runs headless `FlutterEngine` in background for data channels, telemetry, or headless compute. |
| **`view_tree_injection`** (Experimental) | Launcher `onCreate()` | Attaches programmatic `FlutterView` directly over the host activity decor view. |

---

### ⚡ Interactive Slash Prompts

- **`/scan`**: Read-only diagnostic audit of APK workspace, security posture, and native libraries.
- **`/decompile`**: Decompile APK into a fresh workspace and auto-install `AGENTS.md`.
- **`/inject`**: Execute Flutter runtime payload and Smali bytecode injection.
- **`/patch`**: Configure `AndroidManifest.xml` (components, permissions, hardware acceleration).
- **`/recompile`**: Rebuild (`apktool b`), byte-align (`zipalign`), and sign (`apksigner`).
- **`/pipeline`**: Guide the evidence-first end-to-end injection and verification sequence.
- **`/merge`**: Plan split-package install sets with compatibility validation.
- **`/revert`**: Inspect recorded patch history and verified backup requirements.
- **`/memory`**: Inspect active session telemetry, patch history, and register allocations.
- **`/hermes_guide`**: Display Hermes+ architecture rules and reverse engineering guidelines.

---

### 🚀 Quick Start & Client Configuration (v0.7.1)

```bash
# Global installation
npm install -g mcp-flutter-apk-injector@latest

# Direct execution
npx -y mcp-flutter-apk-injector@latest
```

#### MCP stdio configuration
Add to your client configuration (`claude_desktop_config.json`, Antigravity, Cursor, etc.):

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

## 🇸🇦 التوثيق باللغة العربية

### 🌟 الملخص التنفيذي والمميزات الاستثنائية

خادم **mcp-flutter-apk-injector** (الإصدار 0.7.1) هو خادم **Model Context Protocol (MCP)** الأكثر تقدماً وتطوراً عالمياً في مجال **الهندسة العكسية لتطبيقات أندرويد APK، إعادة هيكلة شفرات Smali/DEX، تتبع رموز JNI الأصلية، وحقن محرك Flutter (Add-to-App v2)**.

مدعوماً بالمحرك الذكي **Hermes+ (Universal Main Character)**، يدمج الخادم وثيقة الشخصية الشاملة ([`HERMES.md`](HERMES.md)) والعقد الموحد ([`AGENTS.md`](AGENTS.md))، مع ميزة التثبيت التلقائي لملف `AGENTS.md` في مجلد أي تطبيق يتم تفكيكه، وفحص الأمان المتقدم (كشف مكافحة تصحيح الأخطاء Anti-Debug، كشف الروت Root Detection، فحص تثبيت الشهادات SSL Pinning، وحزم التشفير Packers)، وحائز على تقييم **5.0/5.0 Tier A+** لجميع الأدوات الـ 9 وفق معايير Glama.

---

### 🧠 عقد Hermes+ والتثبيت التلقائي في التطبيقات

1. **المرجع المعماري الرئيسي ([`HERMES.md`](HERMES.md)):** يحدد القواعد الصارمة لحساب سجلات Smali (`.locals + params = .registers`) وتوزيع مكتبات `.so` وتجاوز آليات الحماية.
2. **العقد الشامل للوكلاء ([`AGENTS.md`](AGENTS.md)):** عقد موحد متوافق مع كافة بيئات التطوير (Antigravity, Cursor, Claude, Gemini, Windsurf).
3. **التثبيت التلقائي لعقد مساحة العمل:** عند استدعاء أداة `decompile_apk` أو `inject_flutter_runtime_and_smali`، يقوم الخادم تلقائياً بإنشاء وتثبيت ملف `AGENTS.md` داخل المجلد الجذري للتطبيق المستهدف لضمان استمرارية السياق الهندسي لأي وكيل ذكاء اصطناعي.

---

### 🛠️ الأدوات الـ 9 الاحترافية (Glama 5.0/5.0 Tier A+)

| اسم الأداة | النوع | الخصائص | الوظيفة الهندسية |
|---|---|---|---|
| `decompile_apk` | أساسية | تعديل (`destructive`) | تفكيك الـ APK إلى Smali وموارد ومكتبات مع **التثبيت التلقائي لـ `AGENTS.md`**. |
| `analyze_injection_surface` | أساسية | قراءة فقط (`readOnly`) | فحص الكلاسات، مكتبات `.so` لكل معمارية، مكافحة الـ Debug، الروت، وتثبيت الشهادات. |
| `synthesize_flutter_payload` | أساسية | تعديل (`destructive`) | تجميع مشروع Flutter إلى مكتبات أصلية وأصول مخصصة لمعماريات الهدف. |
| `inject_flutter_runtime_and_smali` | أساسية | تعديل (`destructive`) | زرع محرك Flutter وشفرات Smali التمهيدية وموازنة سجلات الـ Stack. |
| `patch_manifest_and_config` | أساسية | تعديل (`destructive`) | تعديل `AndroidManifest.xml` (الأنشطة، كلاس التطبيق، التسريع البرمجي، التصاريح). |
| `recompile_align_and_sign` | أساسية | تعديل (`destructive`) | إعادة البناء بـ apktool، المحاذاة بـ zipalign، والتوقيع الرقمي بـ apksigner. |
| `get_agent_context` | وكيل | قراءة فقط (`readOnly`) | قراءة هوية Hermes+، القواعد، المهارات، وحالة الذاكرة الحية. |
| `update_agent_memory` | وكيل | تعديل (`destructive`) | حفظ الملاحظات وسجلات الترقيع في الذاكرة الحية وملف `.mcp_memory/session_state.json`. |
| `query_memory_graph` | وكيل | قراءة فقط (`readOnly`) | البحث المصنف في سجلات الترقيع والنتائج الأمنية والمكتبات الأصلية. |

---

### 💻 متطلبات النظام والتطوير

- **Node.js >= 18.0.0**
- **Java JRE/JDK 11+** (لأدوات `apktool` و `apksigner`)
- **Android SDK Build-Tools** (`zipalign` و `apksigner`)
- **apktool** متاح على مسار النظام PATH
- **Flutter SDK** (مطلوب عند بناء الحمولات عبر `synthesize_flutter_payload`)

```bash
# تثبيت التبعيات
npm install

# التحقق من الأنواع والأنماط
npm run typecheck
npm run lint

# تشغيل حزمة الاختبارات (52 اختباراً)
npm test

# بناء الحزمة النهائية
npm run build
```

---

## 📜 License / الترخيص

[MIT License](LICENSE) © 2026 [Marwan (MarwanDevSpace)](https://github.com/MarwanDevSpace)
