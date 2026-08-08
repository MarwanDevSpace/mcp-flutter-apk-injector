import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import type { ToolCallback } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import { logger, setLogLevel } from "./core/logger.js";
import { MCPFlutterError, JsonRpcErrorCode } from "./core/errors.js";

import {
  decompileApk,
  decompileApkTitle,
  decompileApkDescription,
} from "./tools/decompileApk.js";
import {
  analyzeSurface,
  analyzeSurfaceTitle,
  analyzeSurfaceDescription,
} from "./tools/analyzeSurface.js";
import {
  synthesizePayload,
  synthesizePayloadTitle,
  synthesizePayloadDescription,
} from "./tools/synthesizePayload.js";
import {
  injectFlutter,
  injectFlutterTitle,
  injectFlutterDescription,
} from "./tools/injectFlutter.js";
import {
  patchManifest,
  patchManifestTitle,
  patchManifestDescription,
} from "./tools/patchManifest.js";
import {
  recompileAlignSign,
  recompileSignTitle,
  recompileSignDescription,
} from "./tools/recompileSign.js";
import {
  DecompileApkSchema,
  AnalyzeSurfaceSchema,
  SynthesizePayloadSchema,
  InjectFlutterSchema,
  PatchManifestSchema,
  RecompileSignSchema,
} from "./tools/schemas.js";

import { SessionMemoryManager } from "./agent/memory.js";
import { registerAgentResources } from "./agent/resources.js";
import { registerAgentTools } from "./agent/tools.js";
import { registerAgentPrompts } from "./agent/prompts.js";
import type {
  DecompileResult,
  InjectionSurface,
  SynthesizedPayload,
  InjectionReport,
  ManifestPatchResult,
  SigningResult,
} from "./types.js";

export interface McpFlutterServerOptions {
  name?: string;
  version?: string;
  logLevel?: string;
}

export function createServer(options: McpFlutterServerOptions = {}): McpServer {
  const server = new McpServer({
    name: options.name ?? "mcp-flutter-apk-injector",
    version: options.version ?? "0.5.5",
  });

  const memory = SessionMemoryManager.getInstance();

  // Register Standard Engineering Tools with Automatic Memory Telemetry
  register(server, decompileApkTitle, decompileApkDescription, DecompileApkSchema, async (params) => {
    const res = await decompileApk(params);
    memory.updateFromDecompile(res as DecompileResult);
    return res;
  });

  register(server, analyzeSurfaceTitle, analyzeSurfaceDescription, AnalyzeSurfaceSchema, async (params) => {
    const res = await analyzeSurface(params);
    memory.updateFromSurface(res as InjectionSurface);
    return res;
  });

  register(server, synthesizePayloadTitle, synthesizePayloadDescription, SynthesizePayloadSchema, async (params) => {
    const res = await synthesizePayload(params);
    memory.updateFromPayload(res as SynthesizedPayload);
    return res;
  });

  register(server, injectFlutterTitle, injectFlutterDescription, InjectFlutterSchema, async (params) => {
    const res = await injectFlutter(params);
    memory.updateFromInjection(res as InjectionReport);
    return res;
  });

  register(server, patchManifestTitle, patchManifestDescription, PatchManifestSchema, async (params) => {
    const res = await patchManifest(params);
    memory.updateFromManifest(res as ManifestPatchResult);
    return res;
  });

  register(server, recompileSignTitle, recompileSignDescription, RecompileSignSchema, async (params) => {
    const res = await recompileAlignSign(params);
    memory.updateFromSigning(res as SigningResult);
    return res;
  });

  // Register Embedded Agent Resources, Tools, and Prompts
  registerAgentResources(server);
  registerAgentTools(server);
  registerAgentPrompts(server);

  return server;
}

type RawShape = Record<string, z.ZodTypeAny>;
type ShapeOutput<S extends RawShape> = { [K in keyof S]: z.output<S[K]> };

function textResult(json: unknown): CallToolResult {
  return { content: [{ type: "text", text: JSON.stringify(json, null, 2) }] };
}

function register<S extends RawShape>(
  server: McpServer,
  toolName: string,
  description: string,
  inputSchema: S,
  handler: (params: ShapeOutput<S>) => Promise<unknown>,
): void {
  const cb: ToolCallback<RawShape> = async (args, _extra) => {
    try {
      const params = args as ShapeOutput<S>;
      const result = await handler(params);
      return textResult(result);
    } catch (err) {
      return toErrorResult(err);
    }
  };
  server.registerTool(toolName, { title: toolName, description, inputSchema }, cb as never);
}

function toErrorResult(err: unknown): CallToolResult {
  if (err instanceof MCPFlutterError) {
    logger.error(err.message, { code: err.code });
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(
            {
              error: { code: err.code, message: err.message, details: err.details },
            },
            null,
            2,
          ),
        },
      ],
      isError: true,
    };
  }
  const message = err instanceof Error ? err.stack ?? err.message : String(err);
  logger.error(message);
  return {
    content: [
      {
        type: "text",
        text: JSON.stringify(
          { error: { code: JsonRpcErrorCode.INTERNAL_ERROR, message } },
          null,
          2,
        ),
      },
    ],
    isError: true,
  };
}

export async function runServer(options: McpFlutterServerOptions = {}): Promise<void> {
  if (options.logLevel) setLogLevel(options.logLevel as never);
  const server = createServer(options);
  const transport = new StdioServerTransport();
  logger.info(`Starting ${options.name ?? "mcp-flutter-apk-injector"} MCP server`);
  await server.connect(transport);
}

// Re-export for embedders.
export { MCPFlutterError, JsonRpcErrorCode };
