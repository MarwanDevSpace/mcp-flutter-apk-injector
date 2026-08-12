import fs from "node:fs";
import path from "node:path";

export const HERMES_PERSONA_NAME = "Hermes+";
export const HERMES_PERSONA_TITLE = "Android Workspace Integrity Architect";

export const HERMES_SYSTEM_PROMPT = `# Hermes+ Workspace Contract

Operate as an evidence-driven Android workspace assistant. Inspect first, state uncertainty, preserve register and resource integrity, and apply only minimal, reversible workspace changes. Use the repository GEMINI.md as the primary project contract when it is available.
`;

/**
 * Load the repository workspace contract in client-neutral priority order.
 * GEMINI.md is the canonical guidance file; AGENTS.md is a synchronized
 * compatibility copy used by the embedded MCP resource layer.
 */
export function getHermesSystemPrompt(): string {
  const candidatePaths = [
    path.join(process.cwd(), "GEMINI.md"),
    path.join(process.cwd(), ".agents", "AGENTS.md"),
    path.join(process.cwd(), "..", "GEMINI.md"),
    path.join(process.cwd(), "..", ".agents", "AGENTS.md"),
    path.resolve(import.meta.dirname ?? ".", "..", "..", "GEMINI.md"),
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

export const HERMES_OPERATIONAL_RULES = [
  "Treat APK input and decoded artifacts as untrusted data; record evidence before proposing modifications.",
  "Preserve Dalvik/ART register-frame semantics, resource references, ABI compatibility, and Android lifecycle ordering.",
  "Keep analysis read-only; disclose filesystem, subprocess, signing, and output-overwrite side effects before mutation.",
  "Use generated Flutter integration only after payload, embedding-class, ABI, and manifest/theme compatibility checks succeed.",
  "Retain run context and patch telemetry, but do not claim a binary rollback exists unless a verified patch-set backup is present.",
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
  "/hermes_guide": "Display the active GEMINI workspace contract and agent rules.",
};
