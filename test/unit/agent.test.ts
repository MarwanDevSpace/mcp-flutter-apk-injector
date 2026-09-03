import { describe, it, expect, beforeEach } from "vitest";
import { SessionMemoryManager } from "../../src/agent/memory.js";
import {
  HERMES_PERSONA_NAME,
  HERMES_OPERATIONAL_RULES,
  generateWorkspaceAgentsMd,
  getHermesSystemPrompt,
} from "../../src/agent/persona.js";
import { getSkill, listSkills } from "../../src/agent/skills.js";
import { createServer } from "../../src/server.js";
import type { DecompileResult, InjectionReport, InjectionSurface } from "../../src/types.js";

describe("Hermes+ Persona & Embedded Skills", () => {
  it("exports Hermes+ identity and operational rules", () => {
    expect(HERMES_PERSONA_NAME).toBe("Hermes+ (Universal Main Character)");
    expect(HERMES_OPERATIONAL_RULES.length).toBeGreaterThan(0);
  });

  it("loads Hermes system prompt resolving HERMES.md or AGENTS.md", () => {
    const prompt = getHermesSystemPrompt();
    expect(prompt).toBeTruthy();
    expect(prompt).toContain("Hermes+");
  });

  it("generates tailored workspace AGENTS.md contract for application directories", () => {
    const contract = generateWorkspaceAgentsMd("com.test.secureapp");
    expect(contract).toContain("AGENTS.md — Hermes+ Workspace Contract");
    expect(contract).toContain("com.test.secureapp");
    expect(contract).toContain("decompile_apk");
    expect(contract).toContain("analyze_injection_surface");
    expect(contract).toContain("Smali Frame Integrity");
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

  it("records injection surface telemetry with security and native library indexing", () => {
    const memory = SessionMemoryManager.getInstance();
    const mockSurface: InjectionSurface = {
      workspaceDir: "/tmp/workspace",
      packageName: "com.example.securegame",
      applicationClass: "com.example.securegame.App",
      applicationClassPath: "/tmp/workspace/smali/com/example/securegame/App.smali",
      existingApplication: true,
      entryActivities: [{ name: "MainActivity", exported: true, launcher: true, path: null }],
      existingFlutter: false,
      existingFlutterClasses: [],
      existingNativeAbis: ["arm64-v8a"],
      nativeLibraries: {
        "arm64-v8a": ["libnative-game.so", "libflutter.so"],
      },
      securityAnalysis: {
        rootDetection: ["SU binary filesystem path check"],
        antiDebug: ["Debug.isDebuggerConnected() API query"],
        emulatorDetection: [],
        sslPinning: ["OkHttp CertificatePinner"],
        obfuscator: "ProGuard / R8",
      },
      manifestSecurity: {
        debuggable: false,
        allowBackup: true,
        usesCleartextTraffic: false,
        exportedComponentsCount: 1,
        dangerousPermissions: ["android.permission.RECORD_AUDIO"],
      },
      multiDex: {
        isMultiDex: true,
        smaliRoots: ["smali", "smali_classes2"],
      },
      jniLoadingHooks: ["MainActivity.smali:10: System;->loadLibrary"],
      assetScripts: ["assets/script.lua"],
      luaMods: ["assets/script.lua"],
      recommendedPatchPoints: ["Application.onCreate"],
      automatedChainSuggestions: ["1. Synthesize payload"],
      warnings: [],
    };

    memory.updateFromSurface(mockSurface);
    const state = memory.getState();

    expect(state.securityAnalysis?.obfuscator).toBe("ProGuard / R8");
    expect(state.nativeLibraries["arm64-v8a"]).toContain("libnative-game.so");
    expect(state.multiDex?.isMultiDex).toBe(true);

    // Query memory graph for security findings
    const secQuery = memory.queryMemoryGraph("CertificatePinner");
    expect(secQuery.length).toBeGreaterThan(0);
    expect(secQuery[0]?.category).toBe("Security (SSL Pinning)");

    // Query memory graph for native libraries
    const libQuery = memory.queryMemoryGraph("libnative-game.so");
    expect(libQuery.length).toBeGreaterThan(0);
    expect(libQuery[0]?.category).toBe("Native Library (arm64-v8a)");

    // Query memory graph for multiDex
    const multiDexQuery = memory.queryMemoryGraph("multidex");
    expect(multiDexQuery.length).toBeGreaterThan(0);
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

describe("Agent MCP Tools Execution", () => {
  beforeEach(() => {
    SessionMemoryManager.getInstance().clear();
  });

  it("get_agent_context returns dual content and structuredContent", async () => {
    const server = createServer() as unknown as {
      _registeredTools: Record<string, { handler: (args: unknown) => Promise<any> }>;
    };
    const tool = server._registeredTools["get_agent_context"];
    expect(tool).toBeDefined();

    const result = await tool!.handler({});
    expect(result.content).toBeDefined();
    expect(result.content[0].type).toBe("text");
    expect(result.structuredContent).toBeDefined();
    expect(result.structuredContent.persona.name).toBe(HERMES_PERSONA_NAME);
    expect(result.structuredContent.skills.length).toBeGreaterThanOrEqual(2);
    expect(result.structuredContent.sessionMemory).toBeDefined();
  });

  it("update_agent_memory mutates session and returns structuredContent", async () => {
    const server = createServer() as unknown as {
      _registeredTools: Record<string, { handler: (args: unknown) => Promise<any> }>;
    };
    const tool = server._registeredTools["update_agent_memory"];
    expect(tool).toBeDefined();

    const result = await tool!.handler({
      packageName: "com.test.updated",
      note: "Discovered encrypted asset bundle in assets/bin",
      patchType: "security_bypass",
      patchDetails: "Patched isDebuggerConnected check in MainActivity",
    });

    expect(result.structuredContent.status).toBe("success");
    expect(result.structuredContent.updatedMemory.packageName).toBe("com.test.updated");
    expect(result.structuredContent.updatedMemory.notes).toContain("Discovered encrypted asset bundle in assets/bin");
    expect(result.structuredContent.updatedMemory.patchHistory.length).toBeGreaterThan(0);
  });

  it("query_memory_graph queries keywords and returns ranked structuredContent", async () => {
    const server = createServer() as unknown as {
      _registeredTools: Record<string, { handler: (args: unknown) => Promise<any> }>;
    };
    const memory = SessionMemoryManager.getInstance();
    memory.addNote("Found unity il2cpp metadata in assets/bin/Data/Managed");

    const tool = server._registeredTools["query_memory_graph"];
    expect(tool).toBeDefined();

    const result = await tool!.handler({ query: "il2cpp" });
    expect(result.structuredContent.query).toBe("il2cpp");
    expect(result.structuredContent.matchesCount).toBeGreaterThan(0);
    expect(result.structuredContent.results[0].value).toContain("il2cpp");
  });
});
