import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { ToolCallback } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import { HERMES_PERSONA_NAME, HERMES_PERSONA_TITLE, HERMES_OPERATIONAL_RULES } from "./persona.js";
import { listSkills } from "./skills.js";
import { SessionMemoryManager } from "./memory.js";

export const GetAgentContextSchema = {
  sessionId: z.string().optional().describe("Optional session ID to fetch context for"),
};

export const UpdateAgentMemorySchema = {
  workspaceDir: z.string().optional().describe("Decompiled APK workspace path"),
  packageName: z.string().optional().describe("Target Android package name"),
  entryActivity: z.string().optional().describe("Launcher/Entry Activity name"),
  applicationClass: z.string().optional().describe("Application class name"),
  note: z.string().optional().describe("Agent note to persist in session memory"),
  patchType: z.string().optional().describe("Type of patch applied (e.g., smali_insert, manifest_edit)"),
  patchDetails: z.string().optional().describe("Description of patch applied"),
};

export const QueryMemoryGraphSchema = {
  query: z.string().describe("Search term for patch history, packages, activities, or notes"),
};

type RawShape = Record<string, z.ZodTypeAny>;
type ShapeOutput<S extends RawShape> = { [K in keyof S]: z.output<S[K]> };

function textResult(json: unknown): CallToolResult {
  return { content: [{ type: "text", text: JSON.stringify(json, null, 2) }] };
}

export function registerAgentTools(server: McpServer): void {
  // 1. get_agent_context
  server.registerTool(
    "get_agent_context",
    {
      title: "get_agent_context",
      description: "Retrieve Hermes+ persona, loaded skills, live memory summary, and pipeline telemetry",
      inputSchema: GetAgentContextSchema,
    },
    (async (_args) => {
      const memoryManager = SessionMemoryManager.getInstance();
      const state = memoryManager.getState();
      const skills = listSkills().map((s) => ({ name: s.name, description: s.description }));

      return textResult({
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
      title: "update_agent_memory",
      description: "Update active session memory state with notes, identified targets, or patch logs",
      inputSchema: UpdateAgentMemorySchema,
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

      return textResult({
        status: "success",
        updatedMemory: memory.getState(),
      });
    }) as ToolCallback<typeof UpdateAgentMemorySchema> as never
  );

  // 3. query_memory_graph
  server.registerTool(
    "query_memory_graph",
    {
      title: "query_memory_graph",
      description: "Search and inspect historical patch logs, register allocations, and decompilation metadata",
      inputSchema: QueryMemoryGraphSchema,
    },
    (async (args) => {
      const params = args as ShapeOutput<typeof QueryMemoryGraphSchema>;
      const memory = SessionMemoryManager.getInstance();
      const results = memory.queryMemoryGraph(params.query);

      return textResult({
        query: params.query,
        matchesCount: results.length,
        results,
      });
    }) as ToolCallback<typeof QueryMemoryGraphSchema> as never
  );
}
