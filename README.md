# mcp-flutter-apk-injector

[![npm version](https://img.shields.io/npm/v/mcp-flutter-apk-injector.svg?color=blue)](https://www.npmjs.com/package/mcp-flutter-apk-injector)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js](https://img.shields.io/badge/node-%3E%3D18.0.0-green.svg)](https://nodejs.org/)
[![Model Context Protocol](https://img.shields.io/badge/MCP-1.30.0-purple.svg)](https://modelcontextprotocol.io)
[![GitHub Repository](https://img.shields.io/badge/GitHub-MarwanDevSpace-black?logo=github)](https://github.com/MarwanDevSpace/mcp-flutter-apk-injector)

---

### 🌐 Select Language / اختر اللغة
[ 🇬🇧 **English Documentation** ](#-english-documentation) &nbsp; | &nbsp; [ 🇸🇦 **التوثيق باللغة العربية** ](#-التوثيق-باللغة-العربية)

---

## 🇬🇧 English Documentation

Model Context Protocol (MCP) server for **Android APK reverse engineering, Smali refactoring, and Flutter runtime injection** — an automated, enterprise-grade white-hat security research & penetration testing toolkit exposing a complete **Decompile ➔ Analyze ➔ Synthesize ➔ Inject ➔ Patch ➔ Repackage** pipeline as 9 modular MCP tools, persistent session memory graph, native MCP resources, and agent prompt triggers.

> 🔒 **Scope & Compliance Statement**  
> This project is designed exclusively for security researchers, mobile auditors, and application owners auditing **their own** binaries or authorized targets. Repackaging third-party applications without explicit authorization is prohibited. You are responsible for using this tool lawfully.

---

### 🚀 Quick Start & Installation (v0.5.1)

You can run `mcp-flutter-apk-injector` directly via `npx` (no manual build required), or install it globally:

#### 📦 Global NPM Install
```bash
npm install -g mcp-flutter-apk-injector@latest
```

#### ⚡ Running via `npx`
```bash
npx -y mcp-flutter-apk-injector@latest
```

---

### 🛠️ MCP Client Setup

#### Claude Desktop Configuration
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

### 🛡️ Hermes+ Master Agent, Memory Graph & MCP Skills System

`mcp-flutter-apk-injector` (v0.5.1) is natively powered by **Hermes+** (Elite Android Systems & Reverse Engineering Architect) with an embedded memory engine and pre-configured **MCP Skills** (`.agents/skills/`):

* 🧠 **`hermes-apk-reverse-engineering`**: Master skill for disassembling, DEX/Smali refactoring, register frame allocation (`v0`-`vN`, `p0`-`pN`), native `.so` library deployment, and Flutter runtime injection.
* ⚡ **`mcp-toolchain-orchestrator`**: Master skill for high-precision MCP toolchain orchestration, zero-argument prompt handling, automated testing, and distribution.

#### 📡 Native MCP Resources
- `resource://agent/persona`: Hermes+ identity, system prompt, and core reverse engineering rules.
- `resource://agent/rules`: 5-step deep reverse engineering protocol.
- `resource://agent/skills/hermes-apk-reverse-engineering`: Reverse engineering skill document.
- `resource://agent/skills/mcp-toolchain-orchestrator`: Toolchain orchestrator skill document.
- `resource://memory/session`: Live JSON session memory graph state.
- `resource://memory/patch_history`: Log of applied Smali and Manifest patches.

#### ⚡ Agent Prompts & Slash Commands
- **`/scan`**: Diagnostic audit scan of decompiled APK workspace, entry points, Smali structure, and native ABIs.
- **`/decompile`**: Disassemble target `.apk` into Smali bytecode and resources using `apktool`.
- **`/inject`**: Execute Flutter runtime payload & Smali glue code injection into target APK.
- **`/patch`**: Patch `AndroidManifest.xml` (application class, hardware acceleration, cleartext traffic, permissions).
- **`/recompile`**: Repackage (`apktool b`), byte-align (`zipalign`), and cryptographically sign (`apksigner`) modified target.
- **`/pipeline`**: Full automated end-to-end decompilation ➔ analysis ➔ payload synthesis ➔ injection ➔ manifest patch ➔ recompilation pipeline.
- **`/memory`**: Inspect active session memory state, historical patch logs, and allocated register frames.
- **`/hermes_guide`**: Display Hermes+ architecture rules and reverse engineering guidelines.

---

### 🛠️ The 9 MCP Tools

| Tool Name | Detailed Function & Output |
| --- | --- |
| `decompile_apk` | Disassemble target APK into Smali bytecode, native libraries (`lib/`), resources (`res/`), and decoded `AndroidManifest.xml`. Updates memory graph automatically. |
| `analyze_injection_surface` | Scan decompiled APK workspace to identify optimal injection hooks, entry Activity, Application class, JNI loading hooks, native ABIs, and recommended patch points. |
| `synthesize_flutter_payload` | Extract Flutter runtime artifacts (`libflutter.so`, `libapp.so`, `flutter_assets`, ICU data) ready to merge into decompiled APK workspace. |
| `inject_flutter_runtime_and_smali` | Inject Flutter assets, native `.so` libraries, and Smali glue code (`InjectedApplication`, `FlutterOverlayActivity`, or `MethodChannel` bridge) preserving Dalvik stack register bounds. |
| `patch_manifest_and_config` | Patch `AndroidManifest.xml` with permissions (`INTERNET`, `WAKE_LOCK`), Application class configuration, cleartext traffic allowance, and activity registrations. |
| `recompile_align_and_sign` | Rebuild workspace with `apktool`, 4-byte align with `zipalign`, and sign with `apksigner` using V1/V2/V3 schemes and debug keystore fallback. |
| `get_agent_context` | Retrieve Hermes+ persona, loaded skills, live memory summary, and pipeline telemetry. |
| `update_agent_memory` | Explicitly update active session memory state with notes, identified targets, or patch logs. |
| `query_memory_graph` | Search and inspect historical patch logs, register allocations, and decompilation metadata. |

---

### 💻 System Requirements

- **Node.js >= 18.0.0**
- **Java Runtime / JDK** (required by `apktool` and `apksigner`)
- **Android SDK Build-Tools** (`zipalign`, `apksigner` — auto-discovered from `ANDROID_HOME` or system PATH)
- **apktool** installed on system PATH
- **Flutter SDK** (required only when executing `synthesize_flutter_payload`)

---

### 🧪 Development & Testing

```bash
# Install local dependencies
npm install

# Build TypeScript to dist/
npm run build

# Typecheck without emitting
npm run typecheck

# Code formatting & lint check
npm run lint

# Execute Vitest suite (40 unit tests)
npm test
```

---
---

## 🇸🇦 التوثيق باللغة العربية

خادم **Model Context Protocol (MCP)** المتخصص في **الهندسة العكسية لتطبيقات أندرويد APK وحقن بيئة تشغيل Flutter** — منظومة برمجية متكاملة ومتقدمة لأبحاث الأمان والحماية واختبار الاختراق الأخلاقي تُوفر مسار عمل متكامل: **تفكيك ➔ تحليل ➔ بناء الحمولة ➔ حقن ➔ تعديل Manifest ➔ إعادة التجميع والتوقيع** عبر 9 أدوات MCP، محرك ذاكرة حية ورسم بياني للجلسات، وموارد MCP أصلية، وأوامر توجيه ذكية للمساعدين.

> 🔒 **بيان الامتثال والمسؤولية**  
> تم تصميم هذا المشروع حصريًا لمهندسي الأمان، ومدققي التطبيقات، وأصحاب التطبيقات الذين يقومون بفحص تطبيقاتهم أو أهداف مأذون بها صراحة. يُحظر إعادة بناء وتعديل تطبيقات الأطراف الثالثة دون إذن صريح. أنت مسؤول قانونيًا عن استخدام هذه الأداة وفقًا للقوانين.

---

### 🚀 البداية السريعة والتثبيت (v0.5.1)

يمكنك تشغيل `mcp-flutter-apk-injector` مباشرة عبر `npx` (دون الحاجة لبناء يدوي)، أو تثبيته عالمياً:

#### 📦 التثبيت العالمي عبر NPM
```bash
npm install -g mcp-flutter-apk-injector@latest
```

#### ⚡ التشغيل المباشر عبر `npx`
```bash
npx -y mcp-flutter-apk-injector@latest
```

---

### 🛠️ إعداد عملاء MCP

#### إعداد Claude Desktop
أضف التكوين التالي داخل ملف `claude_desktop_config.json`:

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

#### إعداد Antigravity IDE / عملاء MCP المستقلين (`stdio`)
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

### 🛡️ نظام الوكيل الرئيسي Hermes+ ورسم الذاكرة البياني وموارد MCP

يعمل الإصدار v0.5.1 بمحرك ذكاء مدمج لشخصية **Hermes+** مع محرك ذاكرة حية لحفظ تفاصيل وتحديثات الجلسات تلقائياً:

* 🧠 **`hermes-apk-reverse-engineering`**: المهارة الرئيسية لتفكيك التطبيقات، إعادة بناء شفرات Smali/DEX، موازنة سجلات Stack (`v0`-`vN`, `p0`-`pN`)، زرع المكتبات الأصلية `.so` وحقن بيئة Flutter.
* ⚡ **`mcp-toolchain-orchestrator`**: المهارة الرئيسية لإدارة وتنسيق أدوات MCP المتقدمة، معالجة الأوامر السريعة بدون وسائط، وأتمتة الاختبارات والنشر.

#### 📡 موارد MCP الأصلية (MCP Resources)
- `resource://agent/persona`: هوية Hermes+ وقواعد الهندسة العكسية.
- `resource://agent/rules`: بروتوكول الخطوات الخمس للهندسة العكسية.
- `resource://agent/skills/hermes-apk-reverse-engineering`: وثيقة مهارة الهندسة العكسية.
- `resource://agent/skills/mcp-toolchain-orchestrator`: وثيقة مهارة تنسيق الأدوات.
- `resource://memory/session`: حالة الذاكرة الحية للجلسة الحالية بصيغة JSON.
- `resource://memory/patch_history`: سجل تعديلات وترقيعات شفرات Smali و Manifest.

---

### 🛠️ الأدوات الـ 9 في MCP

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
