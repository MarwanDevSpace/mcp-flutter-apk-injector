import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { HERMES_SYSTEM_PROMPT, HERMES_OPERATIONAL_RULES } from "./persona.js";
import { EMBEDDED_SKILLS } from "./skills.js";
import { SessionMemoryManager } from "./memory.js";

export function registerAgentResources(server: McpServer): void {
  // Register Persona Resource
  server.resource(
    "agent-persona",
    "resource://agent/persona",
    async (uri) => ({
      contents: [
        {
          uri: uri.href,
          text: HERMES_SYSTEM_PROMPT,
          mimeType: "text/markdown",
        },
      ],
    })
  );

  // Register Operational Rules Resource
  server.resource(
    "agent-rules",
    "resource://agent/rules",
    async (uri) => ({
      contents: [
        {
          uri: uri.href,
          text: JSON.stringify(HERMES_OPERATIONAL_RULES, null, 2),
          mimeType: "application/json",
        },
      ],
    })
  );

  // Register Skills Resources
  for (const [skillKey, skill] of Object.entries(EMBEDDED_SKILLS)) {
    server.resource(
      `skill-${skillKey}`,
      `resource://agent/skills/${skillKey}`,
      async (uri) => ({
        contents: [
          {
            uri: uri.href,
            text: skill.markdownContent,
            mimeType: "text/markdown",
          },
        ],
      })
    );
  }

  // Register Live Session Memory Resource
  server.resource(
    "memory-session",
    "resource://memory/session",
    async (uri) => {
      const memory = SessionMemoryManager.getInstance().getState();
      return {
        contents: [
          {
            uri: uri.href,
            text: JSON.stringify(memory, null, 2),
            mimeType: "application/json",
          },
        ],
      };
    }
  );

  // Register Patch History Resource
  server.resource(
    "memory-patch-history",
    "resource://memory/patch_history",
    async (uri) => {
      const history = SessionMemoryManager.getInstance().getState().patchHistory;
      return {
        contents: [
          {
            uri: uri.href,
            text: JSON.stringify(history, null, 2),
            mimeType: "application/json",
          },
        ],
      };
    }
  );
}
