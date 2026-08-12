# Changelog

All notable changes to `mcp-flutter-apk-injector` are documented in this file.

## [0.6.0] — 2026-08-12

### Added

- Typed MCP output schemas and `structuredContent` responses for all six primary pipeline tools.
- Behavior annotations for read-only, destructive, idempotent, and open-world selection hints.
- Canonical `GEMINI.md` workspace contract, synchronized `.agents/AGENTS.md` compatibility copy, updated embedded skills, and workspace-contract documentation.
- Evidence-first `/merge` and `/revert` prompts that accurately describe current planning/verification capabilities.
- Native-library fallback propagation for generated Flutter initialization and optional `attachBaseContext` hook support for direct Application integration.
- CI package-content verification with `npm pack --dry-run`.
- Release-quality documentation, including a preserved Glama benchmark and stale-release baseline.

### Changed

- Primary MCP tools now expose human-readable titles and concise tool-selection descriptions.
- Runtime guidance loader now resolves `GEMINI.md` before legacy `.agents/AGENTS.md` paths.
- `view_tree_injection` is documented as experimental; `activity_overlay` is the preferred UI integration path.
- Package version and runtime server default are now `0.6.0`.

### Fixed

- Forwarded `attachBaseContextHook` and `nativeLibraryFallback` from the public injection schema to the injection implementation.
- Added contract tests for output schemas, behavior annotations, meaningful titles, and `/merge`/`/revert` prompt registration.

## [0.5.5]

- Embedded `.agents` skills and dynamic workspace persona loading.
