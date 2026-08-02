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

export interface McpFlutterServerOptions {
  name?: string;
  version?: string;
  logLevel?: string;
}

export function createServer(options: McpFlutterServerOptions = {}): McpServer {
  const server = new McpServer({
    name: options.name ?? "mcp-flutter-apk-injector",
    version: options.version ?? "0.1.0",
  });

  register(server, decompileApkTitle, decompileApkDescription, DecompileApkSchema, decompileApk);
  register(server, analyzeSurfaceTitle, analyzeSurfaceDescription, AnalyzeSurfaceSchema, analyzeSurface);
  register(server, synthesizePayloadTitle, synthesizePayloadDescription, SynthesizePayloadSchema, synthesizePayload);
  register(server, injectFlutterTitle, injectFlutterDescription, InjectFlutterSchema, injectFlutter);
  register(server, patchManifestTitle, patchManifestDescription, PatchManifestSchema, patchManifest);
  register(server, recompileSignTitle, recompileSignDescription, RecompileSignSchema, recompileAlignSign);

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
  // args is parsed by the SDK against `inputSchema` before the callback runs.
  // The `as never` bridges a structural quirk in the SDK's exported callback
  // type vs. the method signature; the object shapes match the protocol.
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
