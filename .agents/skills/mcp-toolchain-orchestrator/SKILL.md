---
name: mcp-toolchain-orchestrator
description: Maintain and release MCP toolchains with typed contracts, behavioral metadata, validation gates, and registry synchronization.
---

# MCP Toolchain Orchestrator Skill

This skill applies the canonical `GEMINI.md` release and tool-definition rules to `mcp-flutter-apk-injector`.

## MCP contract rules

Every public primary tool must publish a human-readable title, short purpose-first description, complete input schema descriptions, output schema, and non-contradictory annotations. Keep long parameter documentation in the schema rather than duplicating it in the description.

| Requirement | Verification |
|---|---|
| Read-only behavior | `readOnlyHint: true`, no target-workspace write, deterministic repeat behavior where claimed. |
| Mutating behavior | `destructiveHint: true`, description says what paths/artifacts can change, and output lists changed files or output paths. |
| Input semantics | All top-level and nested fields have descriptions; enums/defaults explain operational effects. |
| Output semantics | Handler returns `structuredContent` matching the registered output schema as well as readable text JSON. |
| Handler parity | Every public parameter is forwarded to implementation or removed; no inert advertised setting remains. |

## Prompt and command discipline

Prompt handlers must support zero-argument invocation. `/merge` and `/revert` are currently evidence/planning commands: neither should imply that split APKs were merged or workspace files restored without verification artifacts.

## Release protocol

1. Update `package.json`, `package-lock.json`, runtime version defaults, `GEMINI.md`, `.agents/AGENTS.md`, `CHANGELOG.md`, and release notes together.
2. Run `npm run lint`, `npm run typecheck`, `npm test`, `npm run build`, and `npm pack --dry-run`.
3. Inspect the emitted MCP contract in tests, including titles, annotations, input/output schemas, and prompt registration.
4. Review `git diff --check` and the full staged diff before committing.
5. Commit locally with a release-scoped message. Creating GitHub Releases, pushing to remote, publishing to npm, or changing public registry state requires explicit owner confirmation.
6. After an approved public release, create the corresponding GitHub Release, use Glama’s **Sync Server** control, and verify the public listing’s version, latest release, schemas, annotations, and score capture.

## Glama baseline policy

Glama currently records an older `v0.1.2` release while npm/repository metadata reached `v0.5.5` before this update. Preserve the baseline in `docs/quality/glama/`, then record the post-release version and score refresh. Treat a stale public release record as incomplete release work; do not mark registry verification complete until the listing is current.
