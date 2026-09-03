---
name: hermes-apk-reverse-engineering
description: Analyze authorized Android APK workspaces with evidence-first APKTool, Smali, native-library, manifest, and Flutter integration workflows.
---

# Hermes+ Android Workspace Integrity Skill

This skill implements the canonical `GEMINI.md` contract for authorized Android workspace analysis and transformation. It is complementary guidance; when it differs from `GEMINI.md`, the root workspace contract is authoritative.

## Evidence-first workflow

| Stage | Action | Required evidence |
|---|---|---|
| Decode | Run `decompile_apk` into a dedicated workspace. | Input path/hash, package, SDK values, manifest path, Smali roots, and ABI directories. |
| Analyze | Run `analyze_injection_surface` without workspace mutation. | Application/activity/JNI/Flutter findings, native `.so` libraries, security analysis (anti-debug, root checks, SSL pinning, obfuscators), multi-dex roots, warnings, and candidate hooks. |
| Prepare | Build or validate the Flutter payload. | ABI coverage, native libraries, assets, build mode, engine identity, and warning set. |
| Integrate | Run `inject_flutter_runtime_and_smali` only after selecting a supported mode. | Generated descriptors, changed files, register/lifecycle evidence, and warnings. |
| Configure | Run `patch_manifest_and_config` for reviewed manifest changes. | Exact component, permission, application, and rendering deltas. |
| Verify | Run `recompile_align_and_sign` as the final output step. | Build, alignment, signature, certificate context, output path, and artifact classification. |

## Deep reverse engineering & security audit

1. **Anti-debugging & Root Detection:** Review `securityAnalysis` results (`isDebuggerConnected`, `RootBeer`, `su` binaries, `test-keys`, `TracerPid`). Ensure injected Smali execution paths do not trip host tamper mechanisms.
2. **Native Libraries & ABI Parity:** Inspect `nativeLibraries` mapping per ABI before payload synthesis. Ensure injected Flutter libraries match the target's native architectures.
3. **Multi-DEX Integrity:** Resolve classes and methods across all `smali_classes*` directories. Never assume a single primary `smali/` root in modern applications.

## Smali and Android integrity rules

1. Treat `.registers`, `.locals`, wide values, parameter registers, labels, and try/catch regions as executable contracts. Never insert instructions based only on a textual method-name match when an overload/signature or control-flow location remains ambiguous.
2. Keep `invoke-super` and host lifecycle behavior intact. The optional `attachBaseContextHook` is inserted after base-context attachment and must be reported as unavailable rather than silently skipped when the target lacks a suitable method.
3. Validate every generated class descriptor, manifest class name, resource identifier, asset path, and ABI directory against the decoded workspace before building.
4. Keep analysis read-only. Any tool that copies assets/libraries, creates Smali, changes XML, runs a build command, writes a signed APK, or replaces an output must disclose that behavior in its result and MCP annotations.

## Flutter mode decision table

| Mode | Decision rule |
|---|---|
| `activity_overlay` | Preferred user-interface mode. Require a cached engine before activity launch and preserve route/entrypoint decisions made before engine startup. |
| `direct_application_hook` | Use only when the target Application class and method implementation are resolvable. Record all changed host methods. |
| `headless_engine` | Use only for non-UI runtime work and do not invent activity or service lifecycle support. |
| `view_tree_injection` | Experimental. Require an exact lifecycle-compatible adapter and host-specific validation before enabling. |

## Native library and build policy

`nativeLibraryFallback` prevents generated initialization from crashing immediately when Flutter libraries cannot load. It is not a successful engine start and must remain visible in the warning set. Package output only after APKTool build, alignment, and signature verification succeed. Describe a default-key artifact as a debug/test artifact unless a verified signing relationship establishes otherwise.

## Split sets and restoration

`/merge` performs split-set planning: validate package identity, version, signer, ABI, language/density, feature, and manifest dependencies before proposing an install set. Do not merge arbitrary split directories into a base APK. `/revert` is limited to verified patch-set backups and matching hashes; recorded telemetry alone is insufficient for a binary restore.
