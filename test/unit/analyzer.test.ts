import { describe, it, expect, beforeEach, afterEach } from "vitest";
import path from "node:path";
import os from "node:os";
import { mkdir, rm, writeFile } from "node:fs/promises";
import {
  findSmaliRoots,
  findSmaliRoot,
  resolveClassSmaliPath,
  analyzeInjectionSurface,
} from "../../src/decompiler/analyzer.js";

describe("analyzer multidex and smali root resolution", () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = path.join(os.tmpdir(), `test-analyzer-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    await mkdir(tmpDir, { recursive: true });
  });

  afterEach(async () => {
    await rm(tmpDir, { recursive: true, force: true });
  });

  it("finds all smali_classesN roots in sorted order", async () => {
    await mkdir(path.join(tmpDir, "smali"), { recursive: true });
    await mkdir(path.join(tmpDir, "smali_classes2"), { recursive: true });
    await mkdir(path.join(tmpDir, "smali_classes3"), { recursive: true });

    const roots = await findSmaliRoots(tmpDir);
    expect(roots.map((r) => path.basename(r))).toEqual([
      "smali",
      "smali_classes2",
      "smali_classes3",
    ]);

    const primary = await findSmaliRoot(tmpDir);
    expect(primary ? path.basename(primary) : null).toBe("smali");
  });

  it("resolves class smali path across multidex roots", async () => {
    const smali1 = path.join(tmpDir, "smali");
    const smali2 = path.join(tmpDir, "smali_classes2");
    await mkdir(path.join(smali2, "com", "example", "multidex"), { recursive: true });
    const classFile = path.join(smali2, "com", "example", "multidex", "SecondaryActivity.smali");
    await writeFile(classFile, ".class public Lcom/example/multidex/SecondaryActivity;");

    const resolved = await resolveClassSmaliPath([smali1, smali2], "com.example.multidex.SecondaryActivity");
    expect(resolved).toBe(classFile);
  });

  it("analyzes injection surface and detects multidex roots and launcher activity", async () => {
    const smali2 = path.join(tmpDir, "smali_classes2");
    const libArm = path.join(tmpDir, "lib", "arm64-v8a");
    await mkdir(path.join(smali2, "com", "example", "app"), { recursive: true });
    await mkdir(libArm, { recursive: true });

    const launcherSmali = path.join(smali2, "com", "example", "app", "MainActivity.smali");
    await writeFile(
      launcherSmali,
      `.class public Lcom/example/app/MainActivity;\n.super Landroid/app/Activity;\n# android.intent.category.LAUNCHER\nSystem;->loadLibrary("native-lib")`,
    );

    const manifestXml = `<?xml version="1.0" encoding="utf-8"?>
<manifest xmlns:android="http://schemas.android.com/apk/res/android" package="com.example.app">
  <application android:name="com.example.app.CustomApp">
    <activity android:name="com.example.app.MainActivity" android:exported="true">
      <intent-filter>
        <action android:name="android.intent.action.MAIN" />
        <category android:name="android.intent.category.LAUNCHER" />
      </intent-filter>
    </activity>
  </application>
</manifest>`;

    await writeFile(path.join(tmpDir, "AndroidManifest.xml"), manifestXml);

    const surface = await analyzeInjectionSurface(tmpDir);
    expect(surface.packageName).toBe("com.example.app");
    expect(surface.existingApplication).toBe(true);
    expect(surface.existingNativeAbis).toContain("arm64-v8a");
    expect(surface.entryActivities[0]?.path).toBe(launcherSmali);
  });
});
