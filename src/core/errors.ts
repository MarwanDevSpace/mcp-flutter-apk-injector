/**
 * Standard JSON-RPC 2.0 error codes as defined by the MCP specification.
 * https://modelcontextprotocol.io/specification/2025-06-18/basic/transports
 */
export const JsonRpcErrorCode = {
  /** Parse error: invalid JSON was received by the server. */
  PARSE_ERROR: -32700,
  /** Invalid Request: the JSON sent is not a valid Request object. */
  INVALID_REQUEST: -32600,
  /** Method not found: the method does not exist / is not available. */
  METHOD_NOT_FOUND: -32601,
  /** Invalid params: invalid method parameter(s). */
  INVALID_PARAMS: -32602,
  /** Internal error: internal JSON-RPC error. */
  INTERNAL_ERROR: -32603,
} as const;

export type JsonRpcErrorCodeValue = (typeof JsonRpcErrorCode)[keyof typeof JsonRpcErrorCode];

export const ToolErrorCode = {
  /** Invalid tool arguments supplied by the client. */
  INVALID_ARGUMENTS: 1000,
  /** Required external binary (apktool/zipalign/apksigner/...) not found. */
  TOOL_NOT_FOUND: 1100,
  /** A required input path does not exist or is not the expected type. */
  INPUT_NOT_FOUND: 1200,
  /** The target APK could not be parsed. */
  APK_PARSE_ERROR: 1300,
  /** A disassembly/assembly step failed. */
  DECOMPILE_ERROR: 1400,
  /** A Flutter build step failed. */
  FLUTTER_BUILD_ERROR: 1500,
  /** Smali transformation failed (invalid template / register overflow). */
  SMALI_TRANSFORM_ERROR: 1600,
  /** Manifest patch failed. */
  MANIFEST_PATCH_ERROR: 1700,
  /** Repackaging / alignment / signing failed. */
  PACKAGING_ERROR: 1800,
  /** The user lacks permissions for a required operation. */
  PERMISSION_DENIED: 1900,
} as const;

export type ToolErrorCodeValue = (typeof ToolErrorCode)[keyof typeof ToolErrorCode];

/** Base error carrying a structured, machine-readable code. */
export class MCPFlutterError extends Error {
  readonly code: ToolErrorCodeValue | JsonRpcErrorCodeValue;
  readonly details?: Record<string, unknown>;

  constructor(
    code: ToolErrorCodeValue | JsonRpcErrorCodeValue,
    message: string,
    details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = "MCPFlutterError";
    this.code = code;
    this.details = details;
  }
}

/** Thrown when a required third-party binary cannot be resolved. */
export class ToolNotFoundError extends MCPFlutterError {
  constructor(toolName: string, hint?: string) {
    super(
      ToolErrorCode.TOOL_NOT_FOUND,
      `Required external tool '${toolName}' could not be located. ${hint ?? "Install it and add it to PATH, or configure its path in the tool configuration."}`.trim(),
    );
    this.name = "ToolNotFoundError";
  }
}

/** Thrown when a child process exits with a non-zero status. */
export class ProcessExecutionError extends MCPFlutterError {
  readonly command: string;
  readonly stdout: string;
  readonly stderr: string;
  readonly exitCode: number | null;

  constructor(opts: {
    code: ToolErrorCodeValue;
    command: string;
    exitCode: number | null;
    stdout: string;
    stderr: string;
    message?: string;
  }) {
    const summary =
      opts.message ??
      `Command failed (exit ${opts.exitCode ?? "signal"}): ${opts.command}\n--- stdout ---\n${opts.stdout}\n--- stderr ---\n${opts.stderr}`;
    super(opts.code, summary, {
      exitCode: opts.exitCode,
      stdoutTail: opts.stdout.slice(-4000),
      stderrTail: opts.stderr.slice(-4000),
    });
    this.name = "ProcessExecutionError";
    this.command = opts.command;
    this.stdout = opts.stdout;
    this.stderr = opts.stderr;
    this.exitCode = opts.exitCode;
  }
}

/** Thrown when a path referenced by tool arguments does not exist. */
export class InputNotFoundError extends MCPFlutterError {
  constructor(path: string, expected: string) {
    super(ToolErrorCode.INPUT_NOT_FOUND, `Input not found: ${path} (expected ${expected})`);
    this.name = "InputNotFoundError";
  }
}
