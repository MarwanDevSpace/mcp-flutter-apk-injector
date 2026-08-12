# mcp-flutter-apk-injector

<div align="center">

![mcp-flutter-apk-injector Banner](https://img.shields.io/badge/MCP-Flutter_APK_Injector-blueviolet?style=for-the-badge&logo=android&logoColor=white)

[![npm version](https://img.shields.io/npm/v/mcp-flutter-apk-injector.svg?style=flat-badge&color=blue)](https://www.npmjs.com/package/mcp-flutter-apk-injector)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=flat-badge)](https://opensource.org/licenses/MIT)
[![Node.js](https://img.shields.io/badge/node-%3E%3D18.0.0-green.svg?style=flat-badge&logo=nodedotjs)](https://nodejs.org/)
[![Model Context Protocol](https://img.shields.io/badge/MCP-1.30.0-purple.svg?style=flat-badge)](https://modelcontextprotocol.io)
[![Hermes+ Engine](https://img.shields.io/badge/Agent-Hermes%2B_Memory_Engine-red?style=flat-badge&logo=openai)](https://github.com/MarwanDevSpace/mcp-flutter-apk-injector)
[![GitHub Repository](https://img.shields.io/badge/GitHub-MarwanDevSpace-black?style=flat-badge&logo=github)](https://github.com/MarwanDevSpace/mcp-flutter-apk-injector)
[![mcp-flutter-apk-injector MCP server](https://glama.ai/mcp/servers/MarwanDevSpace/mcp-flutter-apk-injector/badges/score.svg)](https://glama.ai/mcp/servers/MarwanDevSpace/mcp-flutter-apk-injector)

**The World's Most Advanced Memory-Aware Model Context Protocol (MCP) Server for Android APK Reverse Engineering, Dalvik/Smali Bytecode Refactoring, Native JNI Tracing, and Flutter Runtime Overlay Injection.**

[ 🇬🇧 **English Documentation** ](#-english-documentation) &nbsp; | &nbsp; [ 🇸🇦 **التوثيق باللغة العربية** ](#-التوثيق-باللغة-العربية)

</div>

---

## 🇬🇧 English Documentation

### 🌟 Executive Overview & Key Advantages

`mcp-flutter-apk-injector` is a highly developed, enterprise-grade Model Context Protocol (MCP) Server designed for security researchers, reverse engineers, and mobile penetration testers. It seamlessly combines **automated static/dynamic Android binary analysis**, **Dalvik/ART Smali stack frame balance refactoring**, **native `.so` library symbol tracing**, and **Flutter Add-to-App v2 runtime injection**.

Powered natively by the **Hermes+ Master Agent Engine**, this server provides persistent session telemetry, searchable patch history, MCP resources, and zero-argument resilient prompt handlers. Version 0.6.0 adds typed output schemas, behavioral annotations, structured responses, and the canonical [`GEMINI.md`](GEMINI.md) workspace contract for evidence-first workflow guidance.

```
                          ┌─────────────────────────────────────────┐
                          │   AI Assistant / MCP Client (Claude,   │
                          │   Antigravity IDE, Cursor, Windsurf)    │
                          └────────────────────┬────────────────────┘
                                               │
                                               ▼
  ┌────────────────────────────────────────────────────────────────────────────────────────┐
  │                           mcp-flutter-apk-injector (v0.6.0)                            │
  │                                                                                        │
  │  ┌────────────────────────┐  ┌─────────────────────────┐  ┌─────────────────────────┐  │
  │  │  Hermes+ Agent Engine  │  │ Session Memory Manager  │  │ Embedded Skills & Prompts│  │
  │  │ (Persona & Rules Graph)│  │ (.mcp_memory/session)   │  │ (/scan, /decompile, ...)│  │
  │  └───────────┬────────────┘  └────────────┬────────────┘  └────────────┬────────────┘  │
  └──────────────┼────────────────────────────┼────────────────────────────┼───────────────┘
                 │                            │                            │
                 ▼                            ▼                            ▼
  ┌────────────────────────────────────────────────────────────────────────────────────────┐
  │                          THE 9 ENTERPRISE MCP TOOLS & RESOURCES                        │
  │                                                                                        │
  │  [decompile_apk] ──► [analyze_surface] ──► [synthesize_payload] ──► [inject_flutter]  │
  │  [patch_manifest] ──► [recompile_align_sign] ──► [get_context] ──► [update_memory]    │
  └────────────────────────────────────────────────────────────────────────────────────────┘
```

---

### 🧠 The Hermes+ Agent Persona & MCP Skill Ecosystem

#### 1. Embedded Persona: `Hermes+` (Elite Android Systems Architect)
Hermes+ is an embedded AI assistant identity specialized in ARM/ARM64 binary inspection, JNI method hooks, Dalvik register stack allocation (`v0`-`vN`, `p0`-`pN`), and game engine asset modding (Lua/C++ symbols).

#### 2. Native MCP Skills (`.agents/skills/`)
* 🧠 **`hermes-apk-reverse-engineering`**: Guides static/dynamic DEX bytecode refactoring, register frame bumping (`.registers N`), native `.so` library deployment, and zero-crash UI overlay injection.
* ⚡ **`mcp-toolchain-orchestrator`**: Manages MCP server quality assurance, zero-argument prompt resiliency, automated testing, and distribution workflows.

#### 📡 Native MCP Resources
- `resource://agent/persona`: Hermes+ identity, system prompt, and core reverse engineering rules.
- `resource://agent/rules`: 5-step deep reverse engineering protocol.
- `resource://agent/skills/hermes-apk-reverse-engineering`: Reverse engineering skill document.
- `resource://agent/skills/mcp-toolchain-orchestrator`: Toolchain orchestrator skill document.
- `resource://memory/session`: Live JSON session memory graph state.
- `resource://memory/patch_history`: Audit log of applied Smali and Manifest patches.

---

### ⚙️ 5-Step Deep Reverse Engineering Pipeline

```
                       [Target Android .apk / Workspace]
                                       │
                                       ▼
 ┌───────────────────────────────────────────────────────────────────────────┐
 │ STEP 1: Binary & Asset Deconstruction (decompile_apk)                     │
 │ Extract DEX Smali bytecode, native lib/*.so trees, AXML, assets/          │
 └─────────────────────────────────────┬─────────────────────────────────────┘
                                       │
                                       ▼
 ┌───────────────────────────────────────────────────────────────────────────┐
 │ STEP 2: Precision Native & Smali Tracing (analyze_injection_surface)      │
 │ Trace UI click handlers (View$OnClickListener), 0x7f... R-ids,            │
 │ JNI native symbols, and Lua script hook points                            │
 └─────────────────────────────────────┬─────────────────────────────────────┘
                                       │
                                       ▼
 ┌───────────────────────────────────────────────────────────────────────────┐
 │ STEP 3: Seamless Payload Injection (inject_flutter_runtime_and_smali)     │
 │ Synthesize Flutter engine payload; balance register stack frames          │
 │ (.registers N); inject native-looking UI without crashes                  │
 └─────────────────────────────────────┬─────────────────────────────────────┘
                                       │
                                       ▼
 ┌───────────────────────────────────────────────────────────────────────────┐
 │ STEP 4: Manifest Surgery & Assembly (patch_manifest & recompile_align)    │
 │ Patch AndroidManifest.xml (permissions, Application override, ABIs);      │
 │ Rebuild (apktool b), 4-byte Align (zipalign), Sign (apksigner)            │
 └─────────────────────────────────────┬─────────────────────────────────────┘
                                       │
                                       ▼
 ┌───────────────────────────────────────────────────────────────────────────┐
 │ STEP 5: Architectural Summary & Session Memory Persistence                │
 │ Document modified Smali paths, .so symbol offsets, injected channels,     │
 │ register maps, and verified output APK location                           │
 └───────────────────────────────────────────────────────────────────────────┘
```

---

### 🛠️ The 9 Enterprise MCP Tools

| Tool Name | Detailed Function & Output |
| --- | --- |
| `decompile_apk` | Disassemble target APK into Smali bytecode, native libraries (`lib/`), resources (`res/`), and decoded `AndroidManifest.xml`. Updates memory graph automatically. |
| `analyze_injection_surface` | Scan decompiled APK workspace to identify optimal injection hooks, entry Activity, Application class, JNI loading hooks, native ABIs, and recommended patch points. |
| `synthesize_flutter_payload` | Extract Flutter runtime artifacts (`libflutter.so`, `libapp.so`, `flutter_assets`, ICU data) ready to merge into decompiled APK workspace. |
| `inject_flutter_runtime_and_smali` | Inject Flutter assets, native `.so` libraries, and Smali glue code (`InjectedApplication`, `FlutterOverlayActivity`, or `MethodChannel` bridge) preserving Dalvik stack register bounds. |
| `patch_manifest_and_config` | Patch `AndroidManifest.xml` with permissions (`INTERNET`, `WAKE_LOCK`), Application class configuration, cleartext traffic allowance, and activity registrations. |
| `recompile_align_and_sign` | Rebuild workspace with `apktool`, align and verify with `zipalign`, then sign and verify with `apksigner`. Outputs are explicitly classified as test/debug or signing-context-dependent artifacts. |
| `get_agent_context` | Retrieve Hermes+ persona, loaded skills, live memory summary, and pipeline telemetry. |
| `update_agent_memory` | Explicitly update active session memory state with notes, identified targets, or patch logs. |
| `query_memory_graph` | Search and inspect historical patch logs, register allocations, and decompilation metadata. |

---

### 🎮 The 4 Dynamic Injection Modes

| Injection Strategy | Primary Smali Target | Description |
| --- | --- | --- |
| **`activity_overlay`** | `FlutterOverlayActivity` | Launches a dedicated Flutter Activity reusing a pre-warmed cached engine for custom UI overlays inside apps or mobile games. |
| **`view_tree_injection`** | Launcher Activity `onCreate()` | **Experimental:** attaches `FlutterView` to a target Activity only when a lifecycle-compatible host adapter has been verified. |
| **`headless_engine`** | `BackgroundFlutterEngine` | Initializes a background engine without UI for headless Dart execution, channel routing, and telemetry. |
| **`direct_application_hook`** | `Application.onCreate()` / `attachBaseContext()` | Directly instruments existing Application class in Smali without modifying `android:name` in `AndroidManifest.xml`. |

---

### ⚡ Agent Prompts & Slash Commands

- **`/scan`**: Diagnostic audit scan of decompiled APK workspace, entry points, Smali structure, and native ABIs.
- **`/decompile`**: Disassemble target `.apk` into Smali bytecode and resources using `apktool`.
- **`/inject`**: Execute Flutter runtime payload & Smali glue code injection into target APK.
- **`/patch`**: Patch `AndroidManifest.xml` (application class, hardware acceleration, cleartext traffic, permissions).
- **`/recompile`**: Repackage (`apktool b`), byte-align (`zipalign`), and cryptographically sign (`apksigner`) modified target.
- **`/pipeline`**: Evidence-first decompilation ➔ analysis ➔ payload synthesis ➔ injection ➔ manifest patch ➔ build verification workflow.
- **`/merge`**: Plan split-package compatibility without claiming arbitrary APK splits can be file-merged into a standalone APK.
- **`/revert`**: Inspect patch-history and backup evidence; restoration is only available when verified patch-set artifacts exist.
- **`/memory`**: Inspect active session memory state, historical patch logs, and allocated register frames.
- **`/hermes_guide`**: Display Hermes+ architecture rules and reverse engineering guidelines.

---

### 🚀 Quick Start & Client Configuration (v0.6.0)

#### 📦 NPM Install & NPX Execution
```bash
# Global Install
npm install -g mcp-flutter-apk-injector@latest

# NPX Direct Run
npx -y mcp-flutter-apk-injector@latest
```

#### Claude Desktop Configuration (`claude_desktop_config.json`)
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

#### Antigravity IDE / Generic MCP Client (`stdio`)
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
---

## 🇸🇦 التوثيق باللغة العربية

### 🌟 الملخص التنفيذي والمميزات الاستثنائية

خادم **mcp-flutter-apk-injector** هو خادم **Model Context Protocol (MCP)** الأكثر تطوراً واحترافية عالمياً والمخصص لـ **الهندسة العكسية لتطبيقات أندرويد APK، إعادة هيكلة شفرات Smali/DEX، تتبع رموز JNI الأصلية، وحقن محرك تشغيل Flutter (Add-to-App v2)**.

مدعوماً بالمحرك الذكي **Hermes+ Master Agent Engine**، ينتقل هذا الخادم من مجرد خادم أدوات عادي إلى **منظومة ذكاء اصطناعي ذاتية التوجيه والتصحيح (Stateful Agentic System)** تمتلك ذاكرة جلسات مستمرة، ورسم بياني محلي قابل للبحث لتعديلات الشفرات، وموارد MCP أصلية، وأوامر تفاعلية مرنة ضد أخطاء المعاملات.

---

### 🧠 منظومة الوكيل الذكي Hermes+ ومهارات MCP Skills

#### 1. شخصية الوكيل المدمجة: `Hermes+`
شخصية ذكاء اصطناعي مدمجة تخصصية في تحليل معمارية تطبيقات وألعاب أندرويد (ARM/ARM64)، فحص رموز JNI، موازنة سجلات Dalvik Stack (`v0`-`vN`, `p0`-`pN`)، وتعديل أصول المحركات مثل Lua/C++.

#### 2. مهارات MCP المدمجة (`.agents/skills/`)
* 🧠 **`hermes-apk-reverse-engineering`**: المهارة الرئيسية لإعادة هيكلة شفرات DEX/Smali، موازنة السجلات (`.registers N`)، زرع المكتبات الأصلية `.so` وحقن واجهات Flutter بدون انهيار التطبيق.
* ⚡ **`mcp-toolchain-orchestrator`**: المهارة الرئيسية لإدارة وتنسيق أدوات MCP، المعالجة السريعة للأوامر بدون وسائط، وأتمتة الاختبارات والنشر.

#### 📡 موارد MCP الأصلية (MCP Resources)
- `resource://agent/persona`: هوية Hermes+ وقواعد الهندسة العكسية.
- `resource://agent/rules`: بروتوكول الخطوات الخمس للهندسة العكسية.
- `resource://agent/skills/hermes-apk-reverse-engineering`: وثيقة مهارة الهندسة العكسية.
- `resource://agent/skills/mcp-toolchain-orchestrator`: وثيقة مهارة تنسيق الأدوات.
- `resource://memory/session`: حالة الذاكرة الحية للجلسة الحالية بصيغة JSON.
- `resource://memory/patch_history`: سجل تعديلات وترقيعات شفرات Smali و Manifest.

---

### ⚙️ مسار العمل الخماسي للهندسة العكسية (5-Step Pipeline)

```
                       [تطبيق أندرويد APK Target / مساحة العمل]
                                       │
                                       ▼
 ┌───────────────────────────────────────────────────────────────────────────┐
 │ الخطوة 1: تفكيك البناء والأصول (decompile_apk)                            │
 │ استخراج شفرات Smali DEX، أشجار مكتبات lib/*.so، ملفات AXML والأصول      │
 └─────────────────────────────────────┬─────────────────────────────────────┘
                                       │
                                       ▼
 ┌───────────────────────────────────────────────────────────────────────────┐
 │ الخطوة 2: التتبع الدقيق لرموز JNI و Smali (analyze_injection_surface)     │
 │ تتبع معالجات النقر (View$OnClickListener)، معرفات 0x7f... R-ids،        │
 │ رموز JNI الأصلية، ونقاط خطاطيف سكربتات Lua                              │
 └─────────────────────────────────────┬─────────────────────────────────────┘
                                       │
                                       ▼
 ┌───────────────────────────────────────────────────────────────────────────┐
 │ الخطوة 3: زرع وحقن المحرك والحمولة (inject_flutter_runtime_and_smali)      │
 │ بناء أصول Flutter؛ موازنة سجلات الـ Stack (.registers N)؛                │
 │ حقن الواجهات بشكل أصيل ودون حدوث انهيار                                   │
 └─────────────────────────────────────┬─────────────────────────────────────┘
                                       │
                                       ▼
 ┌───────────────────────────────────────────────────────────────────────────┐
 │ الخطوة 4: تعديل الـ Manifest وإعادة التجميع (patch_manifest & recompile) │
 │ تعديل AndroidManifest.xml (التصاريح، كلاس التطبيق، المعماريات)؛          │
 │ إعادة التجميع (apktool b)، المحاذاة (zipalign)، التوقيع (apksigner)     │
 └─────────────────────────────────────┬─────────────────────────────────────┘
                                       │
                                       ▼
 ┌───────────────────────────────────────────────────────────────────────────┐
 │ الخطوة 5: التقرير المعماري وحفظ الذاكرة (Session Memory Persistence)       │
 │ توثيق مسارات Smali المعدلة، إزاحات مكتبات .so، القنوات المحقونة،        │
 │ وخريطة السجلات وموقع الـ APK النهائي المكتمل                             │
 └───────────────────────────────────────────────────────────────────────────┘
```

---

### 🛠️ الأدوات الـ 9 الاحترافية في MCP

| اسم الأداة | الوظيفة التفصيلية والمخرجات |
| --- | --- |
| `decompile_apk` | تفكيك ملف APK الهدف إلى شفرات Smali bytecode ومكتبات نظام وموارد وفك تشفير AndroidManifest.xml، مع تحديث الذاكرة تلقائياً. |
| `analyze_injection_surface` | مسح مساحة العمل وتحديد كلاس التطبيق والـ Activity الرئيسي ومواقع تحميل JNI والـ ABIs والتوصيات. |
| `synthesize_flutter_payload` | استخراج أصول تشغيل Flutter (`libflutter.so`, `libapp.so`, `flutter_assets`) للحقن. |
| `inject_flutter_runtime_and_smali` | زرع أصول وقواعد Smali ومكتبات النظام مع موازنة سجلات Stack. |
| `patch_manifest_and_config` | تعديل `AndroidManifest.xml` بالتصاريح والتسريع البرمجي وكلاس التطبيق. |
| `recompile_align_and_sign` | إعادة التجميع (`apktool b`) والمحاذاة (`zipalign`) والتوقيع الرقمي (`apksigner`). |
| `get_agent_context` | استرجاع هوية Hermes+ والمهارات المتاحة وحالة الذاكرة الحية والسياق الحالي. |
| `update_agent_memory` | تحديث ذاكرة الجلسة الحية بملحوظات أو أهداف أو سجلات تعديل جديدة. |
| `query_memory_graph` | البحث والافتراش في سجلات الترقيع والذاكرة والمخرجات السابقة. |

---

### 🎮 أنماط الحقن الـ 4 المتقدمة

| نمط الحقن | الهدف الرئيسي في Smali | الوصف المعماري |
| --- | --- | --- |
| **`activity_overlay`** | `FlutterOverlayActivity` | تشغيل Activity مخصص يرث من `FlutterActivity` ويعيد استخدام المحرك الجاهز لتقديم واجهات سريعة فوق التطبيقات أو الألعاب. |
| **`view_tree_injection`** | Launcher Activity `onCreate()` | إرفاق `FlutterView` برمجيًا داخل شجرة عناصر الـ Activity الرئيسية عند استدعاء `onCreate()`. |
| **`headless_engine`** | `BackgroundFlutterEngine` | تشغيل محرك `FlutterEngine` في الخلفية بدون واجهة مستخدم لمعالجة قنوات البيانات والـ Telemetry. |
| **`direct_application_hook`** | `Application.onCreate()` / `attachBaseContext()` | تعديل كلاس الـ `Application.onCreate()` أو `attachBaseContext()` الموجود مسبقًا في الـ Smali مباشرة دون الحاجة لتغيير `android:name` في الـ `AndroidManifest.xml`. |

---

### ⚡ أوامر Tigger والتفاعل السريع (Slash Commands)

- **`/scan`**: فحص وتشخيص السطح القابل للحقن داخل مساحة عمل الـ APK وتحديد مكتبات النظام ودرجات الأمان.
- **`/decompile`**: تفكيك ملف الـ APK الهدف إلى شفرات Smali وموارد باستخدام `apktool`.
- **`/inject`**: تنفيذ حقن بيئة تشغيل Flutter ومكتبات النظام وتوليد شفرات الـ Smali التكيفية.
- **`/patch`**: تعديل ملف `AndroidManifest.xml` (كلاس التطبيق، التسريع البرمجي، تصاريح الشبكة والـ Cleartext Traffic).
- **`/recompile`**: إعادة تجميع التطبيق (`apktool b`)، محاذاة البيانات (`zipalign`) والتوقيع الرقمي (`apksigner`).
- **`/pipeline`**: المسار الآلي الكامل الشامل: تفكيك ➔ تحليل ➔ بناء ➔ حقن ➔ تعديل ➔ إعادة تجميع وتوقيع.
- **`/memory`**: فحص وتفتيش ذاكرة الجلسة الحية وسجل الترقيعات والمجموعات المسجلة.
- **`/hermes_guide`**: عرض قواعد معمارية Hermes+ وإرشادات الهندسة العكسية.

---

### 💻 متطلبات النظام

- **Node.js >= 18.0.0**
- **بيئة جافا / JDK** (مطلوبة لأدوات `apktool` و `apksigner`)
- **أدوات بناء Android SDK** (`zipalign` و `apksigner` — يتم اكتشافها تلقائياً من `ANDROID_HOME` أو متغيرات النظام)
- **apktool** مثبت على متغيرات النظام PATH
- **Flutter SDK** (مطلوب فقط عند استدعاء أداة `synthesize_flutter_payload`)

---

### 🧪 التطوير والاختبار

```bash
# تثبيت التبعيات المحلية
npm install

# بناء مشروع TypeScript إلى dist/
npm run build

# فحص الأنواع دون إخراج
npm run typecheck

# فحص تنسيق الشفرة والأخطاء البرمجية
npm run lint

# تشغيل حزمة اختبارات Vitest (40 اختباراً)
npm test
```

---

## 📜 License / الترخيص

[MIT License](LICENSE) © 2026 [Marwan (MarwanDevSpace)](https://github.com/MarwanDevSpace)
