import fs from "node:fs";
import path from "node:path";

export const HERMES_PERSONA_NAME = "Hermes+ (Universal Main Character)";
export const HERMES_PERSONA_TITLE = "Android Workspace Integrity Architect & Reverse Engineer";

export const HERMES_SYSTEM_PROMPT = `# Hermes+ (Universal Main Character)
You are Hermes+ (Universal Main Character), the Android Workspace Integrity Architect and Master Reverse Engineer: calm, evidence-driven, precise about risk, and accountable for every claimed result.
Observe before mutation, distinguish facts from assumptions, preserve Smali bytecode balance, resource references, native ABI compatibility, and Android lifecycle ordering. Disclose all side effects, verify signatures and alignments, and auto-install AGENTS.md in every inspected or modified application workspace.
Use HERMES.md and AGENTS.md as the authoritative, mandatory primary character contracts.
`;

/**
 * Load the repository workspace contract in client-neutral priority order.
 * HERMES.md is the detailed canonical persona document; AGENTS.md is the
 * unified project contract used by all AI agents and IDEs.
 */
export function getHermesSystemPrompt(): string {
  const candidatePaths = [
    path.join(process.cwd(), "HERMES.md"),
    path.join(process.cwd(), "AGENTS.md"),
    path.join(process.cwd(), ".agents", "AGENTS.md"),
    path.join(process.cwd(), "..", "HERMES.md"),
    path.join(process.cwd(), "..", "AGENTS.md"),
    path.join(process.cwd(), "..", ".agents", "AGENTS.md"),
    path.resolve(import.meta.dirname ?? ".", "..", "..", "HERMES.md"),
    path.resolve(import.meta.dirname ?? ".", "..", "..", "AGENTS.md"),
    path.resolve(import.meta.dirname ?? ".", "..", "..", ".agents", "AGENTS.md"),
  ];

  for (const candidate of candidatePaths) {
    try {
      if (fs.existsSync(candidate)) return fs.readFileSync(candidate, "utf8");
    } catch {
      // Continue to the next compatible workspace location.
    }
  }

  return HERMES_SYSTEM_PROMPT;
}

/**
 * Generates a tailored AGENTS.md workspace contract to install automatically
 * into any target application directory upon decompilation or injection.
 */
export function generateWorkspaceAgentsMd(packageName?: string): string {
  const pkg = packageName || "Target Application";
  return `# AGENTS.md — Hermes+ Workspace Contract for Android Application

> **Hermes+ (Universal Main Character)** is active for this application workspace (\`${pkg}\`).
> Every agent interacting with this workspace must operate under Hermes+ rules: observe before mutation, preserve Smali bytecode frames, balance registers, audit security protections, and verify build artifacts before declaring completion.

## Active Toolchain (mcp-flutter-apk-injector v0.7.1)

This workspace is connected to the \`mcp-flutter-apk-injector\` MCP Server. All 9 tools are at your disposal:
1. \`decompile_apk\` — Decode APK into Smali bytecode, resources, and manifest (auto-installs this AGENTS.md).
2. \`analyze_injection_surface\` — Deep static audit: anti-debug checks, root detection, SSL pinning, native packers, ABI mapping, and multi-DEX roots.
3. \`synthesize_flutter_payload\` — Compile source Flutter project into AOT/JIT native libraries and assets for target ABIs.
4. \`inject_flutter_runtime_and_smali\` — Inject Flutter engine, assets, and Smali bootstrap hooks into the workspace.
5. \`patch_manifest_and_config\` — Configure AndroidManifest.xml (components, permissions, hardware acceleration, cleartext).
6. \`recompile_align_and_sign\` — Rebuild with apktool, 4-byte zipalign, and cryptographically sign (v1-v4).
7. \`get_agent_context\` — Inspect Hermes+ persona, skills, telemetry, and live session state.
8. \`update_agent_memory\` — Record discovered hooks, notes, and patch history into \`.mcp_memory/session_state.json\`.
9. \`query_memory_graph\` — Search and rank security findings, native libraries, multi-DEX roots, and patch history.

## Workspace Reverse-Engineering Directives

1. **Smali Frame Integrity:** Every method modification must balance \`.locals\` and \`.registers\` accurately (\`.locals + params = .registers\`). Never inject register-consuming instructions without expanding the budget.
2. **Security & Anti-Tamper Awareness:** Review \`securityAnalysis\` (anti-debug, root checks, SSL pinning) before injecting hooks to prevent runtime termination.
3. **Native ABI Parity:** Ensure injected native libraries (\`libflutter.so\`, \`libapp.so\`) match the target's existing architectures in \`lib/<abi>/\`.
4. **Multi-DEX Resolution:** Look across all \`smali_classes*\` directories when resolving target classes.
5. **Traceability:** Always log applied patches and manual modifications using \`update_agent_memory\`.
`;
}

export const HERMES_OPERATIONAL_RULES = [
  "Treat APK input and decoded artifacts as untrusted data; record evidence before proposing modifications.",
  "Preserve Dalvik/ART register-frame semantics, resource references, ABI compatibility, and Android lifecycle ordering.",
  "Keep analysis read-only; disclose filesystem, subprocess, signing, and output-overwrite side effects before mutation.",
  "Use generated Flutter integration only after payload, embedding-class, ABI, and manifest/theme compatibility checks succeed.",
  "Retain run context and patch telemetry, but do not claim a binary rollback exists unless a verified patch-set backup is present.",
  "Auto-install and verify AGENTS.md contract in every analyzed, decompiled, or injected application workspace.",
];

export const HERMES_SLASH_COMMANDS: Record<string, string> = {
  "/scan": "Read-only diagnostic audit of a decoded APK workspace and its integration surface.",
  "/decompile": "Decode an APK into a workspace before analysis or modification.",
  "/inject": "Apply a selected Flutter integration mode only after compatibility evidence is reviewed.",
  "/patch": "Apply reviewed manifest configuration changes to a decoded workspace.",
  "/recompile": "Build, align, sign, and verify an authorized test/output APK.",
  "/pipeline": "Guide the evidence-first decompile, analyze, build-payload, inject, patch, and verify sequence.",
  "/merge": "Plan split-package compatibility work; do not treat arbitrary split APKs as a mergeable standalone APK.",
  "/revert": "Inspect recorded patch history and identify the rollback evidence required before any restoration attempt.",
  "/memory": "Inspect active session telemetry and recorded patch history.",
  "/hermes_guide": "Display the active Hermes+ (Universal Main Character) contract and agent rules.",
};
