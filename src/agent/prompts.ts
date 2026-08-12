import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { SessionMemoryManager } from "./memory.js";
import { HERMES_PERSONA_NAME, getHermesSystemPrompt } from "./persona.js";

export function registerAgentPrompts(server: McpServer): void {
  // /scan Prompt
  server.registerPrompt(
    "scan",
    {
      title: "scan",
      description: "Perform a detailed injection surface diagnostic audit of a decompiled APK workspace",
    },
    async (extra) => {
      const args = (extra as { params?: { arguments?: Record<string, string> } })?.params?.arguments ?? {};
      const memory = SessionMemoryManager.getInstance().getState();
      const target = args["workspaceDir"] ?? memory.workspaceDir ?? "the active workspace directory";

      return {
        messages: [
          {
            role: "user",
            content: {
              type: "text",
              text: `🔍 [${HERMES_PERSONA_NAME} /scan Triggered]
Please locate the decompiled APK workspace directory (target: ${target}), invoke the \`analyze_injection_surface\` tool, and provide a comprehensive diagnostic audit report covering:
1. Package identity (Current memory: ${memory.packageName ?? "unknown"}), application class presence, and launcher Activity.
2. Smali register frame bounds and bytecode structure.
3. Native JNI loading hooks and ABI compatibility (${memory.targetAbis.join(", ") || "auditing..."}).
4. Recommended injection strategy points based on injection surface evaluation.`,
            },
          },
        ],
      };
    }
  );

  // /decompile Prompt
  server.registerPrompt(
    "decompile",
    {
      title: "decompile",
      description: "Disassemble an Android APK file into Smali bytecode and decoded resources",
    },
    async (extra) => {
      const args = (extra as { params?: { arguments?: Record<string, string> } })?.params?.arguments ?? {};
      const memory = SessionMemoryManager.getInstance().getState();
      const apk = args["apkPath"]
        ? `file "${args["apkPath"]}"`
        : memory.sourceApk
        ? `file "${memory.sourceApk}"`
        : "the target .apk file in the workspace";
      const out = args["outputDir"]
        ? `into "${args["outputDir"]}"`
        : memory.workspaceDir
        ? `into "${memory.workspaceDir}"`
        : "into a designated workspace directory";

      return {
        messages: [
          {
            role: "user",
            content: {
              type: "text",
              text: `🛠️ [${HERMES_PERSONA_NAME} /decompile Triggered]
Please locate ${apk} and disassemble it ${out} using the \`decompile_apk\` tool with source decompilation enabled. Report package metadata, entry points, and directory layout when complete. Update session memory upon completion.`,
            },
          },
        ],
      };
    }
  );

  // /inject Prompt
  server.registerPrompt(
    "inject",
    {
      title: "inject",
      description: "Execute Flutter engine and Smali glue code injection into a target APK workspace",
    },
    async (extra) => {
      const args = (extra as { params?: { arguments?: Record<string, string> } })?.params?.arguments ?? {};
      const memory = SessionMemoryManager.getInstance().getState();
      const ws = args["workspaceDir"]
        ? `workspace: "${args["workspaceDir"]}"`
        : memory.workspaceDir
        ? `workspace: "${memory.workspaceDir}"`
        : "the decompiled APK workspace";
      const payload = args["payloadDir"]
        ? `payload: "${args["payloadDir"]}"`
        : memory.synthesizedPayloadDir
        ? `payload: "${memory.synthesizedPayloadDir}"`
        : "the synthesized Flutter payload";
      const mode = args["injectionMode"] ?? "activity_overlay / direct_application_hook";

      return {
        messages: [
          {
            role: "user",
            content: {
              type: "text",
              text: `🚀 [${HERMES_PERSONA_NAME} /inject Triggered]
Please execute the \`inject_flutter_runtime_and_smali\` tool using ${ws} and ${payload} with mode: ${mode}. Verify that all Smali classes, native libraries, and assets are cleanly deployed preserving Dalvik register stack bounds.`,
            },
          },
        ],
      };
    }
  );

  // /patch Prompt
  server.registerPrompt(
    "patch",
    {
      title: "patch",
      description: "Patch AndroidManifest.xml and Smali structures with Flutter requirements",
    },
    async (extra) => {
      const args = (extra as { params?: { arguments?: Record<string, string> } })?.params?.arguments ?? {};
      const memory = SessionMemoryManager.getInstance().getState();
      const ws = args["workspaceDir"]
        ? `workspace "${args["workspaceDir"]}"`
        : memory.workspaceDir
        ? `workspace "${memory.workspaceDir}"`
        : "the decompiled APK workspace";

      return {
        messages: [
          {
            role: "user",
            content: {
              type: "text",
              text: `🔧 [${HERMES_PERSONA_NAME} /patch Triggered]
Please invoke the \`patch_manifest_and_config\` tool on ${ws} to insert required permissions, Application class configuration, cleartext traffic allowance, and activity registrations.`,
            },
          },
        ],
      };
    }
  );

  // /recompile Prompt
  server.registerPrompt(
    "recompile",
    {
      title: "recompile",
      description: "Rebuild, align, and sign the modified APK workspace",
    },
    async (extra) => {
      const args = (extra as { params?: { arguments?: Record<string, string> } })?.params?.arguments ?? {};
      const memory = SessionMemoryManager.getInstance().getState();
      const ws = args["workspaceDir"]
        ? `workspace "${args["workspaceDir"]}"`
        : memory.workspaceDir
        ? `workspace "${memory.workspaceDir}"`
        : "the modified APK workspace";
      const out = args["outputApkPath"]
        ? `to "${args["outputApkPath"]}"`
        : memory.outputApkPath
        ? `to "${memory.outputApkPath}"`
        : "to an aligned, signed output APK path";

      return {
        messages: [
          {
            role: "user",
            content: {
              type: "text",
              text: `📦 [${HERMES_PERSONA_NAME} /recompile Triggered]
Please invoke the \`recompile_align_and_sign\` tool to rebuild ${ws} ${out}. Ensure apktool assembly, zipalign 4-byte alignment, and apksigner signing complete cleanly.`,
            },
          },
        ],
      };
    }
  );

  // /pipeline Prompt
  server.registerPrompt(
    "pipeline",
    {
      title: "pipeline",
      description: "Execute full end-to-end automated reverse engineering & Flutter injection pipeline",
    },
    async (extra) => {
      const args = (extra as { params?: { arguments?: Record<string, string> } })?.params?.arguments ?? {};
      const memory = SessionMemoryManager.getInstance().getState();
      const apk = args["apkPath"]
        ? `target APK "${args["apkPath"]}"`
        : memory.sourceApk
        ? `target APK "${memory.sourceApk}"`
        : "the target .apk file in the workspace";

      return {
        messages: [
          {
            role: "user",
            content: {
              type: "text",
              text: `⚡ [${HERMES_PERSONA_NAME} /pipeline Triggered]
Please execute the full automated end-to-end injection pipeline on ${apk}:
1. \`decompile_apk\`: Disassemble the target APK.
2. \`analyze_injection_surface\`: Audit entry points, Application class, and native ABIs.
3. \`synthesize_flutter_payload\`: Build or extract Flutter engine runtime artifacts.
4. \`inject_flutter_runtime_and_smali\`: Deploy Smali classes, native libraries, and Flutter assets.
5. \`patch_manifest_and_config\`: Update AndroidManifest.xml for permissions and application setup.
6. \`recompile_align_and_sign\`: Rebuild, align, and sign the final APK.
All intermediate steps must update session memory graph automatically.`,
            },
          },
        ],
      };
    }
  );

  // /merge Prompt
  server.registerPrompt(
    "merge",
    {
      title: "merge",
      description: "Plan and validate split-package compatibility without blindly merging APK directories",
    },
    async (extra) => {
      const args = (extra as { params?: { arguments?: Record<string, string> } })?.params?.arguments ?? {};
      const memory = SessionMemoryManager.getInstance().getState();
      const base = args["baseWorkspaceDir"] ?? memory.workspaceDir ?? "the decoded base APK workspace";
      const splits = args["splitSourceDir"] ?? "the extracted split/APKS source directory";
      return {
        messages: [
          {
            role: "user",
            content: {
              type: "text",
              text: `🔀 [${HERMES_PERSONA_NAME} /merge Planning Triggered]\nInspect base workspace "${base}" and split source "${splits}" without copying files yet. Establish package, version, signer, ABI, density/language, feature-module, and manifest dependency compatibility. Report a validated install-set plan, unresolved dependencies, and only then propose an authorized bundle-aware output path. Do not claim an arbitrary split APK set can be converted into a standalone APK by directory merging.`,
            },
          },
        ],
      };
    },
  );

  // /revert Prompt
  server.registerPrompt(
    "revert",
    {
      title: "revert",
      description: "Inspect patch history and determine whether verified rollback evidence exists",
    },
    async (extra) => {
      const args = (extra as { params?: { arguments?: Record<string, string> } })?.params?.arguments ?? {};
      const memory = SessionMemoryManager.getInstance().getState();
      const patchId = args["patchId"] ?? "the requested patch record";
      return {
        messages: [
          {
            role: "user",
            content: {
              type: "text",
              text: `↩️ [${HERMES_PERSONA_NAME} /revert Planning Triggered]\nInspect ${patchId} against the recorded patch history below. Confirm workspace identity, affected files, hashes, and the existence of original-file backups before proposing any restoration. If verified backups are absent, report that rollback cannot be guaranteed and provide a safe recovery plan instead.\n\nPatch history:\n\n\`\`\`json\n${JSON.stringify(memory.patchHistory, null, 2)}\n\`\`\``,
            },
          },
        ],
      };
    },
  );

  // /memory Prompt
  server.registerPrompt(
    "memory",
    {
      title: "memory",
      description: "Inspect active Hermes+ session memory state, historical patch logs, and telemetry",
    },
    async () => {
      const memory = SessionMemoryManager.getInstance().getState();
      return {
        messages: [
          {
            role: "user",
            content: {
              type: "text",
              text: `🧠 [${HERMES_PERSONA_NAME} Memory Audit Requested]
Active Session Memory State:
\`\`\`json
${JSON.stringify(memory, null, 2)}
\`\`\`
Please analyze current memory state, report any un-patched injection surface risks, and propose the next architectural step.`,
            },
          },
        ],
      };
    }
  );

  // /hermes_guide Prompt
  server.registerPrompt(
    "hermes_guide",
    {
      title: "hermes_guide",
      description: "Display Hermes+ system architecture rules and reverse engineering guidelines",
    },
    async () => {
      return {
        messages: [
          {
            role: "user",
            content: {
              type: "text",
              text: getHermesSystemPrompt(),
            },
          },
        ],
      };
    }
  );
}

