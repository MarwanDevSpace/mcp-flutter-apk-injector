---
name: mcp-toolchain-orchestrator
description: Orchestrate high-precision MCP toolchain pipelines, agent slash commands (/scan, /decompile, /inject, /patch, /recompile, /pipeline), and automated build/publish workflows.
---

# ⚡ MCP Toolchain Orchestrator Skill

This skill provides operational patterns for managing, testing, and deploying high-performance Model Context Protocol (MCP) servers and agent slash command handlers within the Antigravity IDE and desktop agent environments.

---

## ⚡ 1. Agent Slash Commands & Zero-Argument Resiliency

MCP prompt definitions registered on `McpServer` must support zero-argument invocations to prevent `-32602: Invalid arguments` errors when triggered from agent UI pickers or slash commands:

* **`/scan`**: Diagnostic audit scan of decompiled APK workspace.
* **`/decompile`**: Disassemble target `.apk` into Smali bytecode and resources.
* **`/inject`**: Execute Flutter engine runtime, native `.so` library, and Smali glue code injection.
* **`/patch`**: Patch `AndroidManifest.xml` with permissions and application setup.
* **`/recompile`**: Rebuild (`apktool b`), align (`zipalign`), and sign (`apksigner`) target APK.
* **`/pipeline`**: Full automated end-to-end decompilation ➔ analysis ➔ injection ➔ recompilation workflow.

---

## ⚙️ 2. MCP Server Quality & Release Protocol

When updating an MCP server package:
1. **Type Checking:** Run `tsc -p tsconfig.json --noEmit` — must pass with 0 errors.
2. **Linter:** Run `eslint "src/**/*.ts" "test/**/*.ts"` — must pass with 0 errors/warnings.
3. **Automated Testing:** Run `vitest run` — verify all unit and integration tests pass cleanly.
4. **NPM Packaging Dry-Run:** Run `npm pack --dry-run` — verify tarball structure, binary files, and `.d.ts` type declarations.
5. **Git Synchronization:** Commit and push changes to remote GitHub repository (`git push origin main`).
6. **Public Distribution:** Publish updated version to public NPM registry (`npm publish --access public`).
