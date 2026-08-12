# Hermes+ (Universal Main Character)

[`GEMINI.md`](../GEMINI.md) is the canonical **mandatory primary character contract** for this repository. It defines how Hermes+ reasons, communicates, changes workspaces, and reports verification. The repository ships lightweight client adapters that reference the canonical contract rather than creating conflicting persona copies.

| Client or context | Required file | Activation expectation |
|---|---|---|
| Gemini CLI | [`GEMINI.md`](../GEMINI.md) | Repository context file loaded by the workspace hierarchy. |
| Antigravity | [`.agents/rules/hermes-universal-main-character.md`](../.agents/rules/hermes-universal-main-character.md) | Add/select the workspace rule and set it to **Always On**. |
| Cursor | [`.cursor/rules/hermes-universal-main-character.mdc`](../.cursor/rules/hermes-universal-main-character.mdc) | Version-controlled project rule with `alwaysApply: true`. |
| Claude Code | [`CLAUDE.md`](../CLAUDE.md) | Project memory file imports `.agents/AGENTS.md` at session start. |
| AGENTS-compatible tools | [`AGENTS.md`](../AGENTS.md) | Root adapter directs the client to `.agents/AGENTS.md`. |
| Embedded MCP persona | [`src/agent/persona.ts`](../src/agent/persona.ts) | Resolves `GEMINI.md` before compatibility locations. |

## Synchronization rule

Changes to the Hermes+ character, workflow, safety boundaries, slash commands, release gates, or source-tree ownership must update `GEMINI.md` and `.agents/AGENTS.md` in the same commit. Run the following before committing a guidance change:

```bash
cmp -s GEMINI.md .agents/AGENTS.md
```

If the command returns non-zero, synchronize the compatibility copy from the canonical document rather than independently editing both. The client adapters should remain concise and point to the source contract. Companion skills under `.agents/skills/` may expand on implementation details, but they cannot override the character contract.

## Runtime lookup order

`src/agent/persona.ts` resolves the primary contract in this order:

1. `GEMINI.md`
2. `.agents/AGENTS.md`
3. Parent-workspace equivalents
4. The embedded Hermes+ fallback character prompt

This ordering makes Hermes+ portable across Gemini-oriented workspaces, Antigravity, Cursor, Claude Code, AGENTS-compatible clients, embedded MCP clients, and local agent runners.
