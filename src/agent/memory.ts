import * as fs from "node:fs";
import * as path from "node:path";
import type {
  DecompileResult,
  InjectionSurface,
  SynthesizedPayload,
  InjectionReport,
  ManifestPatchResult,
  SigningResult,
} from "../types.js";
import { logger } from "../core/logger.js";

export interface PatchHistoryEntry {
  id: string;
  timestamp: string;
  patchType: string;
  details: string;
  verified: boolean;
}

export interface SessionMemoryState {
  sessionId: string;
  createdAt: string;
  updatedAt: string;
  lastStep: string | null;
  workspaceDir: string | null;
  sourceApk: string | null;
  packageName: string | null;
  entryActivity: string | null;
  applicationClass: string | null;
  targetAbis: string[];
  hasNativeLibs: boolean;
  existingFlutter: boolean;
  jniHooks: string[];
  luaMods: string[];
  smaliRegisterBounds: Record<string, number>;
  synthesizedPayloadDir: string | null;
  injectedClasses: string[];
  patchHistory: PatchHistoryEntry[];
  outputApkPath: string | null;
  signed: boolean;
  notes: string[];
}

export class SessionMemoryManager {
  private static instance: SessionMemoryManager | null = null;
  private state: SessionMemoryState;
  private storagePath: string | null = null;

  constructor(sessionId?: string, storagePath?: string) {
    this.storagePath = storagePath ?? null;
    this.state = {
      sessionId: sessionId ?? `session_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      lastStep: null,
      workspaceDir: null,
      sourceApk: null,
      packageName: null,
      entryActivity: null,
      applicationClass: null,
      targetAbis: [],
      hasNativeLibs: false,
      existingFlutter: false,
      jniHooks: [],
      luaMods: [],
      smaliRegisterBounds: {},
      synthesizedPayloadDir: null,
      injectedClasses: [],
      patchHistory: [],
      outputApkPath: null,
      signed: false,
      notes: [],
    };
  }

  public static getInstance(): SessionMemoryManager {
    if (!SessionMemoryManager.instance) {
      SessionMemoryManager.instance = new SessionMemoryManager();
    }
    return SessionMemoryManager.instance;
  }

  public getState(): Readonly<SessionMemoryState> {
    return { ...this.state };
  }

  public touch(stepName?: string): void {
    this.state.updatedAt = new Date().toISOString();
    if (stepName) {
      this.state.lastStep = stepName;
    }
    this.autoPersist();
  }

  public updateWorkspace(partial: Partial<SessionMemoryState>): void {
    if (partial.workspaceDir !== undefined) this.state.workspaceDir = partial.workspaceDir;
    if (partial.packageName !== undefined) this.state.packageName = partial.packageName;
    if (partial.entryActivity !== undefined) this.state.entryActivity = partial.entryActivity;
    if (partial.applicationClass !== undefined) this.state.applicationClass = partial.applicationClass;
    if (partial.sourceApk !== undefined) this.state.sourceApk = partial.sourceApk;
    if (partial.outputApkPath !== undefined) this.state.outputApkPath = partial.outputApkPath;
    this.touch();
  }

  public updateFromDecompile(res: DecompileResult): void {
    this.state.workspaceDir = res.workspaceDir;
    this.state.sourceApk = res.sourceApk;
    this.state.packageName = res.packageName;
    this.state.entryActivity = res.mainActivity;
    this.state.applicationClass = res.applicationClass;
    this.state.targetAbis = res.targetAbis;
    this.state.hasNativeLibs = res.hasNativeLibs;
    this.touch("decompile_apk");
  }

  public updateFromSurface(surface: InjectionSurface): void {
    this.state.workspaceDir = surface.workspaceDir;
    this.state.packageName = surface.packageName;
    this.state.applicationClass = surface.applicationClass;
    this.state.existingFlutter = surface.existingFlutter;
    this.state.jniHooks = surface.jniLoadingHooks;
    this.state.luaMods = surface.luaMods;
    if (surface.entryActivities.length > 0) {
      const launcher = surface.entryActivities.find((a) => a.launcher);
      if (launcher) {
        this.state.entryActivity = launcher.name;
      }
    }
    this.touch("analyze_injection_surface");
  }

  public updateFromPayload(payload: SynthesizedPayload): void {
    this.state.synthesizedPayloadDir = payload.payloadDir;
    this.touch("synthesize_flutter_payload");
  }

  public updateFromInjection(report: InjectionReport): void {
    this.state.workspaceDir = report.workspaceDir;
    this.state.injectedClasses = Array.from(new Set([...this.state.injectedClasses, ...report.generatedClasses]));
    for (const patch of report.modifiedFiles) {
      this.recordPatch(patch.patchType, `${patch.description} -> ${patch.filePath}`, patch.verified);
    }
    this.touch("inject_flutter_runtime_and_smali");
  }

  public updateFromManifest(manifest: ManifestPatchResult): void {
    this.state.workspaceDir = manifest.workspaceDir;
    if (manifest.applicationClass) {
      this.state.applicationClass = manifest.applicationClass;
    }
    this.recordPatch("manifest_edit", `Patched permissions: ${manifest.patchedPermissions.join(", ")}`, true);
    this.touch("patch_manifest_and_config");
  }

  public updateFromSigning(signing: SigningResult): void {
    this.state.outputApkPath = signing.outputApkPath;
    this.state.signed = signing.verified;
    this.touch("recompile_align_and_sign");
  }

  public recordPatch(patchType: string, details: string, verified = true): void {
    const entry: PatchHistoryEntry = {
      id: `patch_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      timestamp: new Date().toISOString(),
      patchType,
      details,
      verified,
    };
    this.state.patchHistory.push(entry);
    this.touch();
  }

  public addNote(note: string): void {
    if (!this.state.notes.includes(note)) {
      this.state.notes.push(note);
      this.touch();
    }
  }

  public setSmaliRegisterBounds(methodKey: string, registerCount: number): void {
    this.state.smaliRegisterBounds[methodKey] = registerCount;
    this.touch();
  }

  public queryMemoryGraph(query: string): Array<{ category: string; value: string; matchScore: number }> {
    const q = query.toLowerCase();
    const results: Array<{ category: string; value: string; matchScore: number }> = [];

    const searchField = (category: string, value: string | null | undefined) => {
      if (!value) return;
      const lower = value.toLowerCase();
      if (lower.includes(q)) {
        results.push({ category, value, matchScore: lower === q ? 100 : 50 });
      }
    };

    searchField("Package Name", this.state.packageName);
    searchField("Source APK", this.state.sourceApk);
    searchField("Workspace Directory", this.state.workspaceDir);
    searchField("Entry Activity", this.state.entryActivity);
    searchField("Application Class", this.state.applicationClass);
    searchField("Output APK Path", this.state.outputApkPath);
    searchField("Payload Directory", this.state.synthesizedPayloadDir);

    for (const patch of this.state.patchHistory) {
      if (patch.patchType.toLowerCase().includes(q) || patch.details.toLowerCase().includes(q)) {
        results.push({
          category: `Patch (${patch.patchType})`,
          value: patch.details,
          matchScore: 40,
        });
      }
    }

    for (const note of this.state.notes) {
      if (note.toLowerCase().includes(q)) {
        results.push({ category: "Agent Note", value: note, matchScore: 30 });
      }
    }

    return results.sort((a, b) => b.matchScore - a.matchScore);
  }

  public setStoragePath(customPath: string): void {
    this.storagePath = customPath;
  }

  private autoPersist(): void {
    if (!this.storagePath && this.state.workspaceDir) {
      this.storagePath = path.join(this.state.workspaceDir, ".mcp_memory", "session_state.json");
    }
    if (this.storagePath) {
      try {
        const dir = path.dirname(this.storagePath);
        if (!fs.existsSync(dir)) {
          fs.mkdirSync(dir, { recursive: true });
        }
        fs.writeFileSync(this.storagePath, JSON.stringify(this.state, null, 2), "utf-8");
      } catch (err) {
        logger.warn(`Failed to persist memory to ${this.storagePath}: ${String(err)}`);
      }
    }
  }

  public loadFromDisk(filePath?: string): boolean {
    const target = filePath ?? this.storagePath;
    if (!target || !fs.existsSync(target)) return false;
    try {
      const raw = fs.readFileSync(target, "utf-8");
      const loaded = JSON.parse(raw) as SessionMemoryState;
      this.state = loaded;
      this.storagePath = target;
      return true;
    } catch (err) {
      logger.warn(`Failed to load memory from ${target}: ${String(err)}`);
      return false;
    }
  }

  public clear(): void {
    this.state = {
      sessionId: `session_${Date.now()}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      lastStep: null,
      workspaceDir: null,
      sourceApk: null,
      packageName: null,
      entryActivity: null,
      applicationClass: null,
      targetAbis: [],
      hasNativeLibs: false,
      existingFlutter: false,
      jniHooks: [],
      luaMods: [],
      smaliRegisterBounds: {},
      synthesizedPayloadDir: null,
      injectedClasses: [],
      patchHistory: [],
      outputApkPath: null,
      signed: false,
      notes: [],
    };
  }
}
