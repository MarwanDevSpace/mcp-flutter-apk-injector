import { describe, it, expect } from "vitest";
import { createServer } from "../../src/server.js";
import { ToolNotFoundError, ProcessExecutionError, MCPFlutterError, ToolErrorCode } from "../../src/core/errors.js";

const EXPECTED_CORE_TOOLS = [
  "decompile_apk",
  "analyze_injection_surface",
  "synthesize_flutter_payload",
  "inject_flutter_runtime_and_smali",
  "patch_manifest_and_config",
  "recompile_align_and_sign",
];

const EXPECTED_AGENT_TOOLS = [
  "get_agent_context",
  "update_agent_memory",
  "query_memory_graph",
];

interface RegisteredToolLike {
  title?: string;
  description?: string;
  inputSchema?: unknown;
  outputSchema?: unknown;
  annotations?: {
    readOnlyHint?: boolean;
    destructiveHint?: boolean;
    idempotentHint?: boolean;
    openWorldHint?: boolean;
  };
  handler?: unknown;
  enabled?: boolean;
}

describe("server", () => {
  it("registers core injection tools and high-capability agent memory tools", () => {
    const server = createServer() as unknown as { _registeredTools: Record<string, RegisteredToolLike> };
    const names = Object.keys(server._registeredTools);
    expect(names).toHaveLength(9);
    for (const expected of EXPECTED_CORE_TOOLS) expect(names).toContain(expected);
    for (const expected of EXPECTED_AGENT_TOOLS) expect(names).toContain(expected);
  });

  it("exposes complete, agent-usable contracts for every primary pipeline tool", () => {
    const server = createServer() as unknown as { _registeredTools: Record<string, RegisteredToolLike> };
    for (const name of EXPECTED_CORE_TOOLS) {
      const tool = server._registeredTools[name];
      expect(tool, `tool ${name}`).toBeTruthy();
      expect(tool!.description).toBeTruthy();
      expect(tool!.title).toBeTruthy();
      expect(tool!.title).not.toBe(name);
      expect(tool!.inputSchema).toBeDefined();
      expect(typeof tool!.inputSchema).toBe("object");
      expect(tool!.outputSchema).toBeDefined();
      expect(typeof tool!.outputSchema).toBe("object");
      expect(tool!.annotations).toBeDefined();
      expect(typeof tool!.annotations!.readOnlyHint).toBe("boolean");
      expect(typeof tool!.annotations!.destructiveHint).toBe("boolean");
      expect(typeof tool!.annotations!.idempotentHint).toBe("boolean");
      expect(tool!.annotations!.openWorldHint).toBe(false);
    }
  });

  it("marks analysis as read-only and mutation tools as destructive", () => {
    const server = createServer() as unknown as { _registeredTools: Record<string, RegisteredToolLike> };
    expect(server._registeredTools.analyze_injection_surface!.annotations).toMatchObject({
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
    });
    for (const name of EXPECTED_CORE_TOOLS.filter((tool) => tool !== "analyze_injection_surface")) {
      expect(server._registeredTools[name]!.annotations).toMatchObject({
        readOnlyHint: false,
        destructiveHint: true,
      });
    }
  });

  it("registers agent prompts and handles zero-arg invocations cleanly", async () => {
    const server = createServer() as unknown as {
      _registeredPrompts: Record<
        string,
        {
          callback: (args: Record<string, unknown>) => Promise<{
            messages: Array<{ content: { text: string } }>;
          }>;
        }
      >;
    };
    const promptNames = Object.keys(server._registeredPrompts);
    for (const prompt of ["scan", "decompile", "inject", "patch", "recompile", "pipeline", "merge", "revert", "memory", "hermes_guide"]) {
      expect(promptNames).toContain(prompt);
    }

    for (const name of promptNames) {
      const promptObj = server._registeredPrompts[name];
      expect(promptObj).toBeTruthy();
      const res = await promptObj!.callback({});
      expect(res.messages[0]?.content.text).toBeTruthy();
    }
  });
});

describe("error hierarchy", () => {
  it("builds a ToolNotFoundError with TOOL_NOT_FOUND code", () => {
    const err = new ToolNotFoundError("apktool");
    expect(err).toBeInstanceOf(MCPFlutterError);
    expect(err.code).toBe(ToolErrorCode.TOOL_NOT_FOUND);
    expect(err.message).toContain("apktool");
  });

  it("builds a ProcessExecutionError carrying output", () => {
    const err = new ProcessExecutionError({
      code: ToolErrorCode.PACKAGING_ERROR,
      command: "apksigner sign --out out.apk in.apk",
      exitCode: 1,
      stdout: "",
      stderr: "signature mismatch",
    });
    expect(err.code).toBe(ToolErrorCode.PACKAGING_ERROR);
    expect(err.stderr).toBe("signature mismatch");
    expect(err.message).toContain("signature mismatch");
  });
});
