import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { ToolCallback } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import { HERMES_PERSONA_NAME, HERMES_PERSONA_TITLE, HERMES_OPERATIONAL_RULES } from "./persona.js";
import { listSkills } from "./skills.js";
import { SessionMemoryManager } from "./memory.js";
import {
  GetAgentContextOutputSchema,
  UpdateAgentMemoryOutputSchema,
  QueryMemoryGraphOutputSchema,
} from "../tools/outputSchemas.js";

export const GetAgentContextSchema = {
  sessionId: z
    .string()
    .optional()
    .describe(
      "Optional session ID to fetch context for. If omitted, the default active singleton session state is retrieved",
    ),
};

export const UpdateAgentMemorySchema = {
  workspaceDir: z
    .string()
    .optional()
    .describe(
      "Absolute or relative path to target decompiled APK workspace directory containing AndroidManifest.xml and Smali files",
    ),
  packageName: z
    .string()
    .optional()
    .describe(
      "Target Android application package identifier (e.g. 'com.example.targetapp')",
    ),
  entryActivity: z
    .string()
    .optional()
    .describe(
      "Fully qualified class name of launcher/main entry Activity (e.g. 'com.example.targetapp.MainActivity')",
    ),
  applicationClass: z
    .string()
    .optional()
    .describe(
      "Fully qualified class name of Android Application subclass (e.g. 'com.example.targetapp.MainApplication')",
    ),
  note: z
    .string()
    .optional()
    .describe(
      "Engineer or agent observation note to append to the active session memory log (deduplicated automatically)",
    ),
  patchType: z
    .string()
    .optional()
    .describe(
      "Category of applied patch (e.g. 'smali_insert', 'smali_create', 'manifest_edit', 'asset_mod', 'security_bypass')",
    ),
  patchDetails: z
    .string()
    .optional()
    .describe(
      "Descriptive summary of the applied modification (paired with patchType to record a verified entry in patchHistory)",
    ),
};

export const QueryMemoryGraphSchema = {
  query: z
    .string()
    .min(1, "query is required")
    .describe(
      "Case-insensitive search string matching package names, launcher activities, patch history details, security markers, native libraries, or agent notes",
    ),
};

export const getAgentContextTitle = "Retrieve Hermes+ agent context and session memory";
export const getAgentContextDescription =
  "Retrieve the Hermes+ reverse-engineering persona, loaded skill sheets, pipeline telemetry, and complete active session memory snapshot. " +
  "This operation is read-only, non-mutating, and requires no authentication; omitting sessionId returns the active singleton session state without error. " +
  "Use it at the start of an engineering workflow or to inspect overall pipeline status; use query_memory_graph for targeted keyword lookups or update_agent_memory to persist modifications.";

export const updateAgentMemoryTitle = "Update session memory and patch telemetry";
export const updateAgentMemoryDescription =
  "Update the active reverse-engineering session memory with notes, target Android workspace metadata, or verified patch history records. " +
  "Mutates session state in-memory and automatically persists updates to .mcp_memory/session_state.json in workspaceDir; non-null fields merge into state, notes are appended, and patchType with patchDetails logs a verified entry. " +
  "Use after manual Smali edits, manifest changes, or decompiler discoveries to keep agent telemetry synchronized; use get_agent_context or query_memory_graph instead when inspecting memory without modification.";

export const queryMemoryGraphTitle = "Search reverse-engineering memory graph";
export const queryMemoryGraphDescription =
  "Search and inspect historical patch logs, register allocations, decompilation metadata, native libraries, and security findings in the active memory graph. " +
  "This operation is read-only, non-mutating, and idempotent; performs fuzzy substring matching on query and returns ranked results by match score. " +
  "Use query_memory_graph to locate specific patch records, hook locations, or components by keyword; use get_agent_context instead for a full session snapshot, and update_agent_memory to store new observations.";

type RawShape = Record<string, z.ZodTypeAny>;
type ShapeOutput<S extends RawShape> = { [K in keyof S]: z.output<S[K]> };

function structuredResult(json: Record<string, unknown>): CallToolResult {
  return {
    content: [{ type: "text", text: JSON.stringify(json, null, 2) }],
    structuredContent: json,
  };
}

export function registerAgentTools(server: McpServer): void {
  // 1. get_agent_context
  server.registerTool(
    "get_agent_context",
    {
      title: getAgentContextTitle,
      description: getAgentContextDescription,
      inputSchema: GetAgentContextSchema,
      outputSchema: GetAgentContextOutputSchema,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
    },
    (async (_args) => {
      const memoryManager = SessionMemoryManager.getInstance();
      const state = memoryManager.getState();
      const skills = listSkills().map((s) => ({ name: s.name, description: s.description }));

      return structuredResult({
        persona: {
          name: HERMES_PERSONA_NAME,
          title: HERMES_PERSONA_TITLE,
          operationalRules: HERMES_OPERATIONAL_RULES,
        },
        skills,
        sessionMemory: state,
      });
    }) as ToolCallback<typeof GetAgentContextSchema> as never
  );

  // 2. update_agent_memory
  server.registerTool(
    "update_agent_memory",
    {
      title: updateAgentMemoryTitle,
      description: updateAgentMemoryDescription,
      inputSchema: UpdateAgentMemorySchema,
      outputSchema: UpdateAgentMemoryOutputSchema,
      annotations: {
        readOnlyHint: false,
        destructiveHint: true,
        idempotentHint: false,
        openWorldHint: false,
      },
    },
    (async (args) => {
      const params = args as ShapeOutput<typeof UpdateAgentMemorySchema>;
      const memory = SessionMemoryManager.getInstance();

      if (params.note) memory.addNote(params.note);
      if (params.patchType && params.patchDetails) {
        memory.recordPatch(params.patchType, params.patchDetails, true);
      }
      memory.updateWorkspace({
        workspaceDir: params.workspaceDir,
        packageName: params.packageName,
        entryActivity: params.entryActivity,
        applicationClass: params.applicationClass,
      });

      return structuredResult({
        status: "success",
        updatedMemory: memory.getState(),
      });
    }) as ToolCallback<typeof UpdateAgentMemorySchema> as never
  );

  // 3. query_memory_graph
  server.registerTool(
    "query_memory_graph",
    {
      title: queryMemoryGraphTitle,
      description: queryMemoryGraphDescription,
      inputSchema: QueryMemoryGraphSchema,
      outputSchema: QueryMemoryGraphOutputSchema,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
    },
    (async (args) => {
      const params = args as ShapeOutput<typeof QueryMemoryGraphSchema>;
      const memory = SessionMemoryManager.getInstance();
      const results = memory.queryMemoryGraph(params.query);

      return structuredResult({
        query: params.query,
        matchesCount: results.length,
        results,
      });
    }) as ToolCallback<typeof QueryMemoryGraphSchema> as never
  );
}
