import { describe, it, expect } from "vitest";
import { findMethod, injectInstructions, planInjectedRegisters } from "../../src/smali/registerAllocator.js";

const SAMPLE = `.class public Lcom/example/app/MainActivity;
.super Landroid/app/Activity;

.method protected onCreate(Landroid/os/Bundle;)V
    .locals 2

    invoke-super {p0, p1}, Landroid/app/Activity;->onCreate(Landroid/os/Bundle;)V

    const/4 v0, 0x0

    invoke-virtual {p0, v0}, Lcom/example/app/MainActivity;->setResult(I)V

    return-void
.end method

.method public static helper()V
    .locals 1

    return-void
.end method
.end class
`;

describe("registerAllocator", () => {
  it("finds a method by name and signature", () => {
    const lines = SAMPLE.split(/\r?\n/);
    const method = findMethod(lines, "onCreate", "(Landroid/os/Bundle;)V");
    expect(method).not.toBeNull();
    expect(method!.isStatic).toBe(false);
    expect(method!.declaredRegisters).toBe(2);
  });

  it("plans injected registers above the declared maximum", () => {
    const method = findMethod(SAMPLE.split(/\r?\n/), "onCreate", "(Landroid/os/Bundle;)V")!;
    const plan = planInjectedRegisters(method, 2);
    expect(plan.newRegisters).toBe(4);
    expect(plan.tempStart).toBe(2);
  });

  it("injects instructions at the top of a method without breaking register allocation", () => {
    const { content } = injectInstructions(
      SAMPLE,
      "onCreate",
      "(Landroid/os/Bundle;)V",
      ["invoke-static {p0}, Lcom/example/app/InjectedFlutterBootstrap;->attachToActivity(Landroid/app/Activity;)V"],
      { atStart: true, tempRegistersNeeded: 0 },
    );
    expect(content).toContain("attachToActivity");
    expect(content).toContain(".locals 2");
    // The injected call must appear before the invoke-super.
    const callIdx = content.indexOf("attachToActivity");
    const superIdx = content.indexOf("invoke-super");
    expect(callIdx).toBeGreaterThan(0);
    expect(callIdx).toBeLessThan(superIdx);
  });

  it("bumps the register header when temp registers are requested", () => {
    const { content } = injectInstructions(
      SAMPLE,
      "helper",
      "()V",
      ["const-string v1, \"x\"", "const/16 v2, -0x1"],
      { atStart: true, tempRegistersNeeded: 2 },
    );
    expect(content).toContain(".locals 3");
    expect(content).toContain("const-string v1, \"x\"");
    expect(content).toContain("const/16 v2, -0x1");
  });

  it("throws when the target method does not exist", () => {
    expect(() =>
      injectInstructions(SAMPLE, "missing", "()V", ["nop"], { atStart: true }),
    ).toThrow();
  });
});
