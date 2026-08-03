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

Model Context Protocol (MCP) server for **Android APK reverse engineering and Flutter runtime injection** — an automated, enterprise-grade white-hat security research & penetration testing toolkit exposing a complete **Decompile ➔ Analyze ➔ Synthesize ➔ Inject ➔ Patch ➔ Repackage** pipeline as six modular MCP tools and agent prompt triggers.

> 🔒 **Scope & Compliance Statement**  
> This project is designed exclusively for security researchers, mobile auditors, and application owners auditing **their own** binaries or authorized targets. Repackaging third-party applications without explicit authorization is prohibited. You are responsible for using this tool lawfully.

---

### 🚀 Quick Start & Installation

You can run `mcp-flutter-apk-injector` directly via `npx` (no manual build required), or install it globally:

#### 📦 Global NPM Install
```bash
npm install -g mcp-flutter-apk-injector
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

### 🛡️ Hermes+ Master Agent & MCP Skills System

`mcp-flutter-apk-injector` is tightly integrated with **Hermes+** (Elite Android Systems & Reverse Engineering Architect) and exposes pre-configured **MCP Skills** (`.agents/skills/`):

* 🧠 **`hermes-apk-reverse-engineering`**: Master skill for disassembling, DEX/Smali refactoring, register frame allocation (`v0`-`vN`, `p0`-`pN`), native `.so` library deployment, and Flutter runtime injection.
* ⚡ **`mcp-toolchain-orchestrator`**: Master skill for high-precision MCP toolchain orchestration, zero-argument prompt handling, automated testing, and distribution.

#### ⚡ Agent Prompts & Slash Commands
`mcp-flutter-apk-injector` registers native zero-argument resilient MCP Prompts for AI desktop agents (Antigravity IDE, Claude Desktop, Cursor):

- **`/scan`**: Diagnostic audit scan of decompiled APK workspace, entry points, Smali structure, and native ABIs.
- **`/decompile`**: Disassemble target `.apk` into Smali bytecode and resources using `apktool`.
- **`/inject`**: Execute Flutter runtime payload & Smali glue code injection into target APK.
- **`/patch`**: Patch `AndroidManifest.xml` (application class, hardware acceleration, cleartext traffic, permissions).
- **`/recompile`**: Repackage (`apktool b`), byte-align (`zipalign`), and cryptographically sign (`apksigner`) modified target.
- **`/pipeline`**: Full automated end-to-end decompilation ➔ analysis ➔ payload synthesis ➔ injection ➔ manifest patch ➔ recompilation pipeline.

---

### 🧠 How it Works & Injection Modes

The pipeline supports four flexible injection strategies aligning with Flutter's "Add-to-App" v2 architecture:

1. **`activity_overlay`**: Generates a dedicated `FlutterOverlayActivity` extending `FlutterActivity` that reuses the pre-warmed cached engine.
2. **`view_tree_injection`**: Programmatically attaches a `FlutterView` into the decor view layout tree of the target Activity's `onCreate()`.
3. **`headless_engine`**: Initializes a background `FlutterEngine` without UI for headless Dart execution, channel routing, and telemetry.
4. **`direct_application_hook`**: Directly instruments existing `Application.onCreate()` or `attachBaseContext()` methods in decompiled Smali without altering `android:name` in `AndroidManifest.xml`.

---

### 🛠️ The 6 Core MCP Tools

| Tool Name | Detailed Function & Output |
| --- | --- |
| `decompile_apk` | Disassemble a target Android APK into Smali bytecode, native library trees (`lib/`), resources (`res/`), and a decoded `AndroidManifest.xml` using `apktool`. Returns package name, main Activity, Application class, min/target SDKs, native ABIs, and file manifest. |
| `analyze_injection_surface` | Scan a decompiled APK workspace to identify optimal injection hooks for Flutter runtime initialization: Application class presence (`android:name`), entry Activity, JNI loading sites, pre-existing Flutter classes, native ABIs, and recommended Smali patch points. |
| `synthesize_flutter_payload` | Compile a source Flutter project and extract the runtime artifacts required for injection: `libflutter.so` (Flutter engine), `libapp.so` (Dart AOT snapshot), the `flutter_assets` bundle, and ICU data. Produces a payload directory ready to merge into a decompiled APK workspace. |
| `inject_flutter_runtime_and_smali` | Inject Flutter engine assets, native libraries, and Smali glue code into a decompiled APK tree. Generates an `InjectedApplication` (`FlutterEngine` init + `libflutter`/`libapp` loading with try-catch fallback), a cached-engine bootstrap, an optional `FlutterOverlayActivity` (`activity_overlay` mode), and an optional two-way Smali<->Dart `MethodChannel` bridge. Returns a detailed patch report. |
| `patch_manifest_and_config` | Patch the decoded `AndroidManifest.xml` with Flutter runtime requirements: `INTERNET`/`WAKE_LOCK` permissions, custom Application class override, `FlutterActivity` entry (`activity_overlay`), `engine-id` metadata, `extractNativeLibs`, `hardwareAccelerated`, and optional `usesCleartextTraffic`. Returns a validation status for the patched manifest. |
| `recompile_align_and_sign` | Repack the decompiled APK workspace with `apktool`, run `zipalign` for 4-byte alignment, and sign with `apksigner` using V1/V2/V3 schemes. Uses an auto-generated debug keystore unless a custom `keystoreConfig` is provided. Returns the verified, aligned, installable APK path. |

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

# Execute Vitest suite (35 unit tests)
npm test
```

---
---

## 🇸🇦 التوثيق باللغة العربية

خادم **Model Context Protocol (MCP)** المتخصص في **الهندسة العكسية لتطبيقات أندرويد APK وحقن بيئة تشغيل Flutter** — منظومة برمجية متكاملة ومتقدمة لأبحاث الأمان والحماية واختبار الاختراق الأخلاقي تُوفر مسار عمل متكامل: **تفكيك ➔ تحليل ➔ بناء الحمولة ➔ حقن ➔ تعديل Manifest ➔ إعادة التجميع والتوقيع** عبر 6 أدوات MCP وأوامر توجيه ذكية للمساعدين.

> 🔒 **بيان الامتثال والمسؤولية**  
> تم تصميم هذا المشروع حصريًا لمهندسي الأمان، ومدققي التطبيقات، وأصحاب التطبيقات الذين يقومون بفحص تطبيقاتهم أو أهداف مأذون بها صراحة. يُحظر إعادة بناء وتعديل تطبيقات الأطراف الثالثة دون إذن صريح. أنت مسؤول قانونيًا عن استخدام هذه الأداة وفقًا للقوانين.

---

### 🚀 البداية السريعة والتثبيت

يمكنك تشغيل `mcp-flutter-apk-injector` مباشرة عبر `npx` (دون الحاجة لبناء يدوي)، أو تثبيته عالمياً:

#### 📦 التثبيت العالمي عبر NPM
```bash
npm install -g mcp-flutter-apk-injector
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

### 🛡️ نظام الوكيل الرئيسي Hermes+ ومهارات MCP Skills

يتكامل `mcp-flutter-apk-injector` بشكل وثيق مع الشخصية الرئيسية **Hermes+** (مهندس ومعمار الهندسة العكسية لتطبيقات أندرويد) ويوفر مهارات **MCP Skills** جاهزة داخل الملفات (`.agents/skills/`):

* 🧠 **`hermes-apk-reverse-engineering`**: المهارة الرئيسية لتفكيك التطبيقات، إعادة بناء شفرات Smali/DEX، موازنة سجلات Stack (`v0`-`vN`, `p0`-`pN`)، زرع المكتبات الأصلية `.so` وحقن بيئة Flutter.
* ⚡ **`mcp-toolchain-orchestrator`**: المهارة الرئيسية لإدارة وتنسيق أدوات MCP المتقدمة، معالجة الأوامر السريعة بدون وسائط، وأتمتة الاختبارات والنشر.

#### ⚡ أوامر Slash Commands والتوجيه الذكي
يسجل خادم `mcp-flutter-apk-injector` أوامر MCP Prompts مرنة ومحصنة ضد أخطاء المعاملات لمساعدي الذكاء الاصطناعي (Antigravity IDE, Claude Desktop, Cursor):

- **`/scan`**: فحص وتشخيص السطح القابل للحقن داخل مساحة عمل الـ APK وتحديد مكتبات النظام ودرجات الأمان.
- **`/decompile`**: تفكيك ملف الـ APK الهدف إلى شفرات Smali وموارد باستخدام `apktool`.
- **`/inject`**: تنفيذ حقن بيئة تشغيل Flutter ومكتبات النظام وتوليد شفرات الـ Smali التكيفية.
- **`/patch`**: تعديل ملف `AndroidManifest.xml` (كلاس التطبيق، التسريع البرمجي، تصاريح الشبكة والـ Cleartext Traffic).
- **`/recompile`**: إعادة تجميع التطبيق (`apktool b`)، محاذاة البيانات (`zipalign`) والتوقيع الرقمي (`apksigner`).
- **`/pipeline`**: المسار الآلي الكامل الشامل: تفكيك ➔ تحليل ➔ بناء ➔ حقن ➔ تعديل ➔ إعادة تجميع وتوقيع.

---

### 🧠 آلية العمل وأنماط الحقن (Injection Modes)

يدعم نظام الحقن أربعة استراتيجيات مرنة تتماشى مع معمارية "Add-to-App" الرسمية من Flutter:

1. **`activity_overlay`**: إنشاء `FlutterOverlayActivity` مخصص يرث من `FlutterActivity` ويعيد استخدام المحرك الجاهز في الذاكرة.
2. **`view_tree_injection`**: إرفاق `FlutterView` برمجيًا داخل شجرة عناصر الـ Activity الرئيسية عند استدعاء `onCreate()`.
3. **`headless_engine`**: تشغيل محرك `FlutterEngine` في الخلفية بدون واجهة مستخدم لمعالجة قنوات البيانات والـ Telemetry.
4. **`direct_application_hook`**: تعديل كلاس الـ `Application.onCreate()` أو `attachBaseContext()` الموجود مسبقًا في الـ Smali مباشرة دون الحاجة لتغيير `android:name` في الـ `AndroidManifest.xml`.

---

### 🛠️ الأدوات الـ 6 الرئيسية في MCP

| اسم الأداة | الوظيفة التفصيلية والمخرجات |
| --- | --- |
| `decompile_apk` | تفكيك ملف APK الهدف إلى شفرات Smali bytecode ومكتبات نظام (`lib/`) وموارد (`res/`) وفك تشفير ملف `AndroidManifest.xml` باستخدام `apktool`. تُرجع اسم الحزمة، الـ Activity الرئيسي، كلاس الـ Application، وإصدارات الـ SDK المعمارية. |
| `analyze_injection_surface` | مسح مساحة عمل الـ APK لتحديد نقاط الحقن المثالية لمحرك Flutter: وجود كلاس Application، الـ Activity الرئيسي، أماكن تحميل مكتبات JNI، المعماريات المدعومة (`arm64-v8a` وغيرها)، والتوصية بنقاط التعديل. |
| `synthesize_flutter_payload` | بناء مشروع Flutter المصدر واستخراج مكونات التشغيل المطلوبة للحقن: `libflutter.so` (مكتبة المحرك)، `libapp.so` (ملف Dart AOT)، ومجموعة أصول `flutter_assets` وبيانات ICU. |
| `inject_flutter_runtime_and_smali` | زرع أصول Flutter ومكتبات النظام وشفرات الـ Smali التكيّفية داخل مساحة العمل. تقوم بتوليد كلاس `InjectedApplication` وحقن مكتبات المحرك مع حماية try-catch ضد أخطاء التحميل، وإعداد قنوات التواصل `MethodChannel`. |
| `patch_manifest_and_config` | تعديل ملف `AndroidManifest.xml` بالمتطلبات الأساسية: تصاريح الـ INTERNET/WAKE_LOCK، ضبط كلاس الـ Application، إضافة الـ Overlay Activity، ضبط `extractNativeLibs` و `hardwareAccelerated` وتصريح المرور المباشر للشبكة. |
| `recompile_align_and_sign` | إعادة تجميع مساحة العمل باستخدام `apktool` ومحاذاة البيانات على 4-byte باستخدام `zipalign` وتوقيع الـ APK رقمياً باستخدام `apksigner` بـ V1/V2/V3 schemes لإنتاج ملف جاهز للتثبيت. |

---

### 💻 متطلبات النظام

- **Node.js >= 18.0.0**
- **بيئة بيئة جافا / JDK** (مطلوبة لأدوات `apktool` و `apksigner`)
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

# تشغيل حزمة اختبارات Vitest
npm test
```

---

## 📜 License / الترخيص

[MIT License](LICENSE) © 2026 [Marwan (MarwanDevSpace)](https://github.com/MarwanDevSpace)
