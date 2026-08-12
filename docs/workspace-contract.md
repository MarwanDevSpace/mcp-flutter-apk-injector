# Hermes+ Character Contract

The canonical AI character and workspace guidance for this repository is [`GEMINI.md`](../GEMINI.md). The embedded Hermes+ persona reads this document first at runtime. [`../.agents/AGENTS.md`](../.agents/AGENTS.md) is an intentionally identical compatibility copy for agent environments that expect an `.agents` tree.

## Synchronization rule

Changes to character behavior, workflow, safety boundaries, slash commands, release gates, or source-tree ownership must update both files in the same commit. Run the following before committing a guidance change:

```bash
cmp -s GEMINI.md .agents/AGENTS.md
```

If the command returns non-zero, synchronize the copy from the canonical file rather than independently editing both. The companion skills under `.agents/skills/` may expand on implementation details, but they cannot override `GEMINI.md`.

## Runtime lookup order

`src/agent/persona.ts` resolves workspace guidance in this order:

1. `GEMINI.md`
2. `.agents/AGENTS.md`
3. Parent-workspace equivalents
4. The embedded minimal fallback prompt

This ordering makes the Hermes+ character contract portable across Gemini-oriented workspaces, embedded MCP clients, and local agent runners.
