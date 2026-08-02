import { describe, it, expect } from "vitest";
import { exec, execSequence, resolveExecutable, resolveBuildToolsBinary } from "../../src/core/executor.js";
import { ToolNotFoundError, ProcessExecutionError } from "../../src/core/errors.js";

const NODE = process.execPath;

describe("executor", () => {
  it("captures stdout of a successful process", async () => {
    const r = await exec(NODE, ["-e", "console.log('hello-exec')"]);
    expect(r.exitCode).toBe(0);
    expect(r.stdout).toContain("hello-exec");
  });

  it("throws ProcessExecutionError with captured output on non-zero exit", async () => {
    const err = await exec(NODE, ["-e", "console.error('boom'); process.exit(3)"])
      .then(() => null)
      .catch((e) => e);
    expect(err).toBeInstanceOf(ProcessExecutionError);
    expect(err.exitCode).toBe(3);
    expect(err.stderr).toContain("boom");
  });

  it("honours timeoutMs and reports a timeout error", async () => {
    const err = await exec(NODE, ["-e", "setTimeout(() => {}, 60000)"], { timeoutMs: 300 })
      .then(() => null)
      .catch((e) => e);
    expect(err).toBeInstanceOf(ProcessExecutionError);
    expect(err.message).toContain("timed out");
  });

  it("runs steps sequentially and returns all results", async () => {
    const results = await execSequence([
      { command: NODE, args: ["-e", "console.log('step1')"] },
      { command: NODE, args: ["-e", "console.log('step2')"] },
    ]);
    expect(results).toHaveLength(2);
    expect(results[0]?.stdout).toContain("step1");
    expect(results[1]?.stdout).toContain("step2");
  });

  it("resolves a well-known executable from PATH", async () => {
    const resolved = await resolveExecutable("node");
    expect(resolved).toBeTruthy();
  });

  it("throws ToolNotFoundError for an unknown executable", async () => {
    const err = await resolveExecutable("this-tool-does-not-exist-9x7")
      .then(() => null)
      .catch((e) => e);
    expect(err).toBeInstanceOf(ToolNotFoundError);
  });

  it("falls back to ToolNotFoundError for an unknown build-tools binary", async () => {
    const err = await resolveBuildToolsBinary("this-tool-does-not-exist-9x7")
      .then(() => null)
      .catch((e) => e);
    expect(err).toBeInstanceOf(ToolNotFoundError);
  });
});
