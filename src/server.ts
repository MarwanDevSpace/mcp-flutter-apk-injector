import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import type { ToolCallback } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { CallToolResult, ToolAnnotations } from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import { logger, setLogLevel } from "./core/logger.js";
import type { LogLevel } from "./core/logger.js";
import { MCPFlutterError, JsonRpcErrorCode } from "./core/errors.js";

import {
  decompileApk,
  decompileApkDescription,
} from "./tools/decompileApk.js";
import {
  analyzeSurface,
  analyzeSurfaceDescription,
} from "./tools/analyzeSurface.js";
import {
  synthesizePayload,
  synthesizePayloadDescription,
} from "./tools/synthesizePayload.js";
import {
  injectFlutter,
  injectFlutterDescription,
} from "./tools/injectFlutter.js";
import {
  patchManifest,
  patchManifestDescription,
} from "./tools/patchManifest.js";
import {
  recompileAlignSign,
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
import {
  AnalyzeSurfaceOutputSchema,
  DecompileApkOutputSchema,
  InjectFlutterOutputSchema,
  PatchManifestOutputSchema,
  RecompileSignOutputSchema,
  SynthesizePayloadOutputSchema,
  type OutputShape,
} from "./tools/outputSchemas.js";

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
  logLevel?: LogLevel;
}

export function createServer(options: McpFlutterServerOptions = {}): McpServer {
  const server = new McpServer({
    name: options.name ?? "mcp-flutter-apk-injector",
    version: options.version ?? "0.7.1",
  });

  const memory = SessionMemoryManager.getInstance();

  register(server, {
    name: "decompile_apk",
    title: "Decode Android APK into workspace",
    description: decompileApkDescription,
    inputSchema: DecompileApkSchema,
    outputSchema: DecompileApkOutputSchema,
    annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: false, openWorldHint: false },
  }, async (params) => {
    const res = await decompileApk(params);
    memory.updateFromDecompile(res as DecompileResult);
    return res;
  });

  register(server, {
    name: "analyze_injection_surface",
    title: "Analyze APK integration surface",
    description: analyzeSurfaceDescription,
    inputSchema: AnalyzeSurfaceSchema,
    outputSchema: AnalyzeSurfaceOutputSchema,
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
  }, async (params) => {
    const res = await analyzeSurface(params);
    memory.updateFromSurface(res as InjectionSurface);
    return res;
  });

  register(server, {
    name: "synthesize_flutter_payload",
    title: "Build Flutter runtime payload",
    description: synthesizePayloadDescription,
    inputSchema: SynthesizePayloadSchema,
    outputSchema: SynthesizePayloadOutputSchema,
    annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: false, openWorldHint: false },
  }, async (params) => {
    const res = await synthesizePayload(params);
    memory.updateFromPayload(res as SynthesizedPayload);
    return res;
  });

  register(server, {
    name: "inject_flutter_runtime_and_smali",
    title: "Inject Flutter runtime into APK workspace",
    description: injectFlutterDescription,
    inputSchema: InjectFlutterSchema,
    outputSchema: InjectFlutterOutputSchema,
    annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: false, openWorldHint: false },
  }, async (params) => {
    const res = await injectFlutter(params);
    memory.updateFromInjection(res as InjectionReport);
    return res;
  });

  register(server, {
    name: "patch_manifest_and_config",
    title: "Apply Android manifest configuration",
    description: patchManifestDescription,
    inputSchema: PatchManifestSchema,
    outputSchema: PatchManifestOutputSchema,
    annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: false, openWorldHint: false },
  }, async (params) => {
    const res = await patchManifest(params);
    memory.updateFromManifest(res as ManifestPatchResult);
    return res;
  });

  register(server, {
    name: "recompile_align_and_sign",
    title: "Build, align, and sign APK output",
    description: recompileSignDescription,
    inputSchema: RecompileSignSchema,
    outputSchema: RecompileSignOutputSchema,
    annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: false, openWorldHint: false },
  }, async (params) => {
    const res = await recompileAlignSign(params);
    memory.updateFromSigning(res as SigningResult);
    return res;
  });

  registerAgentResources(server);
  registerAgentTools(server);
  registerAgentPrompts(server);

  return server;
}

type RawShape = Record<string, z.ZodTypeAny>;
type ShapeOutput<S extends RawShape> = { [K in keyof S]: z.output<S[K]> };

interface ToolDefinition<S extends RawShape> {
  name: string;
  title: string;
  description: string;
  inputSchema: S;
  outputSchema: OutputShape;
  annotations: ToolAnnotations;
}

function textResult(json: unknown): CallToolResult {
  return {
    content: [{ type: "text", text: JSON.stringify(json, null, 2) }],
    structuredContent: json as Record<string, unknown>,
  };
}

function register<S extends RawShape>(
  server: McpServer,
  definition: ToolDefinition<S>,
  handler: (params: ShapeOutput<S>) => Promise<unknown>,
): void {
  const cb: ToolCallback<RawShape> = async (args, _extra) => {
    try {
      const params = args as ShapeOutput<S>;
      return textResult(await handler(params));
    } catch (err) {
      return toErrorResult(err);
    }
  };

  server.registerTool(definition.name, {
    title: definition.title,
    description: definition.description,
    inputSchema: definition.inputSchema,
    outputSchema: definition.outputSchema,
    annotations: definition.annotations,
  }, cb as never);
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
  if (options.logLevel) setLogLevel(options.logLevel);
  const server = createServer(options);
  const transport = new StdioServerTransport();
  await server.connect(transport);
}
