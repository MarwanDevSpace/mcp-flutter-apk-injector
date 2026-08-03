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
    version: options.version ?? "0.2.0",
  });

  register(server, decompileApkTitle, decompileApkDescription, DecompileApkSchema, decompileApk);
  register(server, analyzeSurfaceTitle, analyzeSurfaceDescription, AnalyzeSurfaceSchema, analyzeSurface);
  register(server, synthesizePayloadTitle, synthesizePayloadDescription, SynthesizePayloadSchema, synthesizePayload);
  register(server, injectFlutterTitle, injectFlutterDescription, InjectFlutterSchema, injectFlutter);
  register(server, patchManifestTitle, patchManifestDescription, PatchManifestSchema, patchManifest);
  register(server, recompileSignTitle, recompileSignDescription, RecompileSignSchema, recompileAlignSign);

  // Register MCP Prompts for agent slash command triggers (/scan, /decompile, /inject, /patch, /recompile, /pipeline)
  server.registerPrompt(
    "scan",
    {
      title: "scan",
      description: "Perform a detailed injection surface diagnostic audit of a decompiled APK workspace",
    },
    async (extra) => {
      const args = (extra as { params?: { arguments?: Record<string, string> } })?.params?.arguments ?? {};
      const target = args["workspaceDir"] ?? "the active workspace directory";
      return {
        messages: [
          {
            role: "user",
            content: {
              type: "text",
              text: `🔍 [MCP /scan Triggered]
Please locate the decompiled APK workspace directory (target: ${target}), invoke the \`analyze_injection_surface\` tool, and provide a comprehensive diagnostic audit report covering:
1. Package identity, application class presence, and launcher Activity.
2. Smali register frame bounds and bytecode structure.
3. Native JNI loading hooks and ABI compatibility.
4. Recommended injection strategy points.`,
            },
          },
        ],
      };
    },
  );

  server.registerPrompt(
    "decompile",
    {
      title: "decompile",
      description: "Disassemble an Android APK file into Smali bytecode and decoded resources",
    },
    async (extra) => {
      const args = (extra as { params?: { arguments?: Record<string, string> } })?.params?.arguments ?? {};
      const apk = args["apkPath"] ? `file "${args["apkPath"]}"` : "the target .apk file in the workspace";
      const out = args["outputDir"] ? `into "${args["outputDir"]}"` : "into a designated workspace directory";
      return {
        messages: [
          {
            role: "user",
            content: {
              type: "text",
              text: `🛠️ [MCP /decompile Triggered]
Please locate ${apk} and disassemble it ${out} using the \`decompile_apk\` tool with source decompilation enabled. Report package metadata, entry points, and directory layout when complete.`,
            },
          },
        ],
      };
    },
  );

  server.registerPrompt(
    "inject",
    {
      title: "inject",
      description: "Execute Flutter engine and Smali glue code injection into a target APK workspace",
    },
    async (extra) => {
      const args = (extra as { params?: { arguments?: Record<string, string> } })?.params?.arguments ?? {};
      const ws = args["workspaceDir"] ? `workspace: "${args["workspaceDir"]}"` : "the decompiled APK workspace";
      const payload = args["payloadDir"] ? `payload: "${args["payloadDir"]}"` : "the synthesized Flutter payload";
      const mode = args["injectionMode"] ?? "activity_overlay / direct_application_hook";
      return {
        messages: [
          {
            role: "user",
            content: {
              type: "text",
              text: `🚀 [MCP /inject Triggered]
Please execute the \`inject_flutter_runtime_and_smali\` tool using ${ws} and ${payload} with mode: ${mode}. Verify that all Smali classes, native libraries, and assets are cleanly deployed.`,
            },
          },
        ],
      };
    },
  );

  server.registerPrompt(
    "patch",
    {
      title: "patch",
      description: "Patch AndroidManifest.xml and Smali structures with Flutter requirements",
    },
    async (extra) => {
      const args = (extra as { params?: { arguments?: Record<string, string> } })?.params?.arguments ?? {};
      const ws = args["workspaceDir"] ? `workspace "${args["workspaceDir"]}"` : "the decompiled APK workspace";
      return {
        messages: [
          {
            role: "user",
            content: {
              type: "text",
              text: `🔧 [MCP /patch Triggered]
Please invoke the \`patch_manifest_and_config\` tool on ${ws} to insert required permissions, Application class configuration, cleartext traffic allowance, and activity registrations.`,
            },
          },
        ],
      };
    },
  );

  server.registerPrompt(
    "recompile",
    {
      title: "recompile",
      description: "Rebuild, align, and sign the modified APK workspace",
    },
    async (extra) => {
      const args = (extra as { params?: { arguments?: Record<string, string> } })?.params?.arguments ?? {};
      const ws = args["workspaceDir"] ? `workspace "${args["workspaceDir"]}"` : "the modified APK workspace";
      const out = args["outputApkPath"] ? `to "${args["outputApkPath"]}"` : "to an aligned, signed output APK path";
      return {
        messages: [
          {
            role: "user",
            content: {
              type: "text",
              text: `📦 [MCP /recompile Triggered]
Please invoke the \`recompile_align_and_sign\` tool to rebuild ${ws} ${out}. Ensure apktool assembly, zipalign 4-byte alignment, and apksigner signing complete cleanly.`,
            },
          },
        ],
      };
    },
  );

  server.registerPrompt(
    "pipeline",
    {
      title: "pipeline",
      description: "Execute full end-to-end automated reverse engineering & Flutter injection pipeline",
    },
    async (extra) => {
      const args = (extra as { params?: { arguments?: Record<string, string> } })?.params?.arguments ?? {};
      const apk = args["apkPath"] ? `target APK "${args["apkPath"]}"` : "the target .apk file in the workspace";
      return {
        messages: [
          {
            role: "user",
            content: {
              type: "text",
              text: `⚡ [MCP /pipeline Triggered]
Please execute the full automated end-to-end injection pipeline on ${apk}:
1. \`decompile_apk\`: Disassemble the target APK.
2. \`analyze_injection_surface\`: Audit entry points, Application class, and native ABIs.
3. \`synthesize_flutter_payload\`: Build or extract Flutter engine runtime artifacts.
4. \`inject_flutter_runtime_and_smali\`: Deploy Smali classes, native libraries, and Flutter assets.
5. \`patch_manifest_and_config\`: Update AndroidManifest.xml for permissions and application setup.
6. \`recompile_align_and_sign\`: Rebuild, align, and sign the final APK.`,
            },
          },
        ],
      };
    },
  );

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
