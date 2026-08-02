import { describe, it, expect } from "vitest";
import { createServer } from "../../src/server.js";
import { ToolNotFoundError, ProcessExecutionError, MCPFlutterError, ToolErrorCode } from "../../src/core/errors.js";

const EXPECTED_TOOLS = [
  "decompile_apk",
  "analyze_injection_surface",
  "synthesize_flutter_payload",
  "inject_flutter_runtime_and_smali",
  "patch_manifest_and_config",
  "recompile_align_and_sign",
];

interface RegisteredToolLike {
  title?: string;
  description?: string;
  inputSchema?: unknown;
  handler?: unknown;
  enabled?: boolean;
}

describe("server", () => {
  it("registers exactly the six injection tools", () => {
    const server = createServer() as unknown as { _registeredTools: Record<string, RegisteredToolLike> };
    const names = Object.keys(server._registeredTools);
    expect(names).toHaveLength(6);
    for (const expected of EXPECTED_TOOLS) {
      expect(names).toContain(expected);
    }
  });

  it("exposes descriptions and input schemas for every tool", () => {
    const server = createServer() as unknown as { _registeredTools: Record<string, RegisteredToolLike> };
    for (const [name, tool] of Object.entries(server._registeredTools)) {
      expect(tool, `tool ${name}`).toBeTruthy();
      expect(tool.description).toBeTruthy();
      expect(tool.inputSchema).toBeDefined();
      expect(typeof tool.inputSchema).toBe("object");
    }
  });

  it("refuses to re-register an existing tool name", () => {
    const server = createServer();
    expect(() => {
      const registered = server as unknown as {
        registerTool(name: string, config: Record<string, unknown>): void;
      };
      registered.registerTool("decompile_apk", { title: "dup", description: "dup" }, () => ({}));
    }).toThrow(/already registered/i);
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
