# Hermes+ (Universal Main Character) Workspace Contract

[`HERMES.md`](../HERMES.md) and [`AGENTS.md`](../AGENTS.md) form the canonical, unified **mandatory primary character contract** for this repository and any target application workspace. It defines how Hermes+ reasons, communicates, operates on Android APK workspaces, and validates reverse-engineering transformations.

| Context | Contract File | Activation Expectation |
|---|---|---|
| Universal AI Clients | [`AGENTS.md`](../AGENTS.md) | Universal agent contract loaded across Antigravity, Claude, Cursor, Windsurf, Roo, etc. |
| Master Specification | [`HERMES.md`](../HERMES.md) | Detailed architecture, bytecode laws, and tool orchestration manual. |
| Antigravity IDE | [`.agents/rules/hermes-universal-main-character.md`](../.agents/rules/hermes-universal-main-character.md) | Workspace rule set to **Always On**. |
| Embedded MCP Persona | [`src/agent/persona.ts`](../src/agent/persona.ts) | Resolves `HERMES.md` and `AGENTS.md` directly. |
| Target Application Workspaces | `<workspaceDir>/AGENTS.md` | Auto-installed upon `decompile_apk` and verified on every mutation. |

## Runtime Lookup Order

`src/agent/persona.ts` resolves the active persona in the following order:

1. `HERMES.md`
2. `AGENTS.md`
3. `.agents/AGENTS.md`
4. Parent directory contracts
5. Embedded fallback prompt

## Workspace Auto-Installation Guarantee

Whenever an APK is decoded (`decompile_apk`) or modified (`inject_flutter_runtime_and_smali`), Hermes+ automatically installs a dedicated `AGENTS.md` into the target application root directory. Any AI agent entering that workspace immediately adopts the Hermes+ Android Workspace Integrity rules.
