import { describe, it, expect, beforeEach } from "vitest";
import { SessionMemoryManager } from "../../src/agent/memory.js";
import { HERMES_PERSONA_NAME, HERMES_OPERATIONAL_RULES } from "../../src/agent/persona.js";
import { getSkill, listSkills } from "../../src/agent/skills.js";
import type { DecompileResult, InjectionReport } from "../../src/types.js";

describe("Hermes+ Persona & Embedded Skills", () => {
  it("exports Hermes+ identity and operational rules", () => {
    expect(HERMES_PERSONA_NAME).toBe("Hermes+");
    expect(HERMES_OPERATIONAL_RULES.length).toBeGreaterThan(0);
  });

  it("loads embedded skills correctly", () => {
    const skills = listSkills();
    expect(skills.length).toBeGreaterThanOrEqual(2);

    const hermesSkill = getSkill("hermes-apk-reverse-engineering");
    expect(hermesSkill).toBeDefined();
    expect(hermesSkill?.markdownContent).toContain("Hermes+ Android Workspace Integrity Skill");

    const orchSkill = getSkill("mcp-toolchain-orchestrator");
    expect(orchSkill).toBeDefined();
    expect(orchSkill?.markdownContent).toContain("MCP Toolchain Orchestrator Skill");
  });
});

describe("SessionMemoryManager", () => {
  beforeEach(() => {
    SessionMemoryManager.getInstance().clear();
  });

  it("records decompilation state automatically", () => {
    const memory = SessionMemoryManager.getInstance();
    const mockDecompile: DecompileResult = {
      workspaceDir: "/tmp/decompiled_app",
      sourceApk: "/tmp/app.apk",
      packageName: "com.example.game",
      mainActivity: "com.example.game.MainActivity",
      applicationClass: "com.example.game.MainApplication",
      minSdkVersion: 21,
      targetSdkVersion: 33,
      targetAbis: ["arm64-v8a"],
      fileCount: 1500,
      hasNativeLibs: true,
      manifestPath: "/tmp/decompiled_app/AndroidManifest.xml",
      smaliRoot: "/tmp/decompiled_app/smali",
    };

    memory.updateFromDecompile(mockDecompile);
    const state = memory.getState();

    expect(state.workspaceDir).toBe("/tmp/decompiled_app");
    expect(state.packageName).toBe("com.example.game");
    expect(state.entryActivity).toBe("com.example.game.MainActivity");
    expect(state.hasNativeLibs).toBe(true);
    expect(state.lastStep).toBe("decompile_apk");
  });

  it("records patch history and enables memory graph queries", () => {
    const memory = SessionMemoryManager.getInstance();
    memory.addNote("Target application uses Lua script bindings in assets/mods");
    memory.recordPatch("smali_insert", "Injected FlutterOverlayActivity launch hook into onCreate", true);

    const notesQuery = memory.queryMemoryGraph("Lua script");
    expect(notesQuery.length).toBeGreaterThan(0);
    expect(notesQuery[0]?.value).toContain("assets/mods");

    const patchQuery = memory.queryMemoryGraph("FlutterOverlayActivity");
    expect(patchQuery.length).toBeGreaterThan(0);
    expect(patchQuery[0]?.category).toContain("Patch");
  });

  it("handles injection telemetry updates", () => {
    const memory = SessionMemoryManager.getInstance();
    const mockReport: InjectionReport = {
      workspaceDir: "/tmp/workspace",
      injectionMode: "activity_overlay",
      generatedClasses: ["com/flutter/FlutterOverlayActivity"],
      modifiedFiles: [
        {
          filePath: "smali/com/example/MainActivity.smali",
          patchType: "smali_insert",
          description: "Hooked MainActivity onCreate method",
          verified: true,
        },
      ],
      copiedAssets: 12,
      copiedLibs: 2,
      engineId: "flutter_engine_main",
      launchActivityName: "com.flutter.FlutterOverlayActivity",
      warnings: [],
    };

    memory.updateFromInjection(mockReport);
    const state = memory.getState();

    expect(state.injectedClasses).toContain("com/flutter/FlutterOverlayActivity");
    expect(state.patchHistory.length).toBeGreaterThan(0);
    expect(state.patchHistory[0]?.details).toContain("Hooked MainActivity onCreate method");
  });
});
