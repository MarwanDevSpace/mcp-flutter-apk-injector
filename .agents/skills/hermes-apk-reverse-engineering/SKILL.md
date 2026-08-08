---
name: hermes-apk-reverse-engineering
description: Master Android & Game reverse engineering, DEX/Smali stack balance refactoring, native .so library symbol tracing, Lua/asset script modding, and seamless Flutter runtime overlay injection.
---

# 🛡️ Hermes+ Deep Android & Game Reverse Engineering Skill

This skill provides comprehensive instructions for executing deep static and dynamic bytecode analysis, native `.so` assembly inspection, DEX/Smali refactoring, game script tracing (Lua, C++, JNI), AXML manifest surgery, native library deployment, and Flutter runtime injection on Android APK targets using the **`mcp-flutter-apk-injector`** toolchain.

---

## 🧠 1. The 5-Step Deep Reverse Engineering Pipeline

When analyzing, modifying, or patching an Android application or mobile game (e.g. modifying UI elements, altering game buttons, injecting Flutter popups/overlays):

```
                       [Target .apk / Workspace]
                                  │
                                  ▼
 ┌─────────────────────────────────────────────────────────────────┐
 │ STEP 1: Binary & Asset Deconstruction (decompile_apk)           │
 │ Extract DEX Smali, lib/*.so binaries, AXML, assets/ (Lua/JSON)  │
 └─────────────────────────────────────────────────────────────────┘
                                  │
                                  ▼
 ┌─────────────────────────────────────────────────────────────────┐
 │ STEP 2: Precision Native & Smali Tracing (analyze_injection)   │
 │ Trace UI click handlers, View$OnClickListener, 0x7f... R-ids,   │
 │ C/C++ JNI native symbols, and Lua script hook points             │
 └─────────────────────────────────────────────────────────────────┘
                                  │
                                  ▼
 ┌─────────────────────────────────────────────────────────────────┐
 │ STEP 3: Seamless Payload Injection (inject_flutter_runtime)     │
 │ Synthesize Flutter/Smali payload; balance register frames       │
 │ (.registers N); inject native-looking UI without crashes       │
 └─────────────────────────────────────────────────────────────────┘
                                  │
                                  ▼
 ┌─────────────────────────────────────────────────────────────────┐
 │ STEP 4: Manifest Surgery & Assembly (patch_manifest & recompile)│
 │ Patch AndroidManifest.xml (permissions, application, ABIs);     │
 │ Rebuild (apktool b), Align (zipalign 4-byte), Sign (apksigner)  │
 └─────────────────────────────────────────────────────────────────┘
                                  │
                                  ▼
 ┌─────────────────────────────────────────────────────────────────┐
 │ STEP 5: Architectural Summary & Chain Memory Logging             │
 │ Document modified Smali paths, .so symbol offsets, injected    │
 │ channels, register maps, and verified output APK location       │
 └─────────────────────────────────────────────────────────────────┘
```

---

## 📐 2. Register Frame Balance & Stack Safety Rules

When generating or injecting Dalvik/Smali instructions:
1. **Local vs Parameter Registers:**
   - Parameter registers (`p0`, `p1`, `p2`, ...) map to the highest numbered register slots in non-static methods (`p0` is `this`).
   - Local registers (`v0`, `v1`, `v2`, ...) map to local variable slots.
2. **Register Allocation Bumping:**
   - When injecting temporary registers into existing methods, inspect `.registers N` or `.locals M`.
   - Update `.registers` to `N + required_temps` using `planInjectedRegisters()`.
3. **Register Non-Interference:**
   - Inject temporary instructions using registers higher than `M` (e.g. `vM`, `vM+1`) to prevent overwriting active local variables.

---

## 🎮 3. Game & App Patching Strategies

| Target Type | Method / Injection Hook | Primary Inspection Points | Description |
| --- | --- | --- | --- |
| **Native Game Engine** | Lua/C++ JNI Binding | `assets/mods/*.lua`, `lib/*.so` symbols | Trace native function offsets, modify Lua script triggers, or hook JNI entry points. |
| **Android Native App** | `direct_application_hook` | `Application.onCreate()`, `attachBaseContext()` | Instrument Application class directly in Smali without changing `android:name` in Manifest. |
| **Flutter UI Overlay** | `activity_overlay` | `FlutterOverlayActivity` | Launch dedicated Flutter activity reusing pre-warmed cached engine for custom UI inside games/apps. |
| **View Tree Injection** | `view_tree_injection` | Launcher Activity `onCreate()` | Programmatically attach `FlutterView` to decor view tree of target Activity. |

---

## 🔒 4. Recompile & Signing Guarantee
All bytecode and manifest alterations must strictly preserve Dalvik stack syntax to eliminate assembly errors during `apktool b`. Recompilation, 4-byte byte alignment (`zipalign`), and cryptographic signing (`apksigner`) with automatic debug keystore fallback guarantee an installable output binary.

