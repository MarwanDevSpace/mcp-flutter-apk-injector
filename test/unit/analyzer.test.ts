import { describe, it, expect, beforeEach, afterEach } from "vitest";
import path from "node:path";
import os from "node:os";
import { mkdir, rm, writeFile } from "node:fs/promises";
import {
  findSmaliRoots,
  findSmaliRoot,
  resolveClassSmaliPath,
  analyzeInjectionSurface,
  enumerateNativeLibraries,
  scanSecurityProtections,
  auditManifestSecurity,
} from "../../src/decompiler/analyzer.js";
import { parseManifestXml } from "../../src/decompiler/manifestParser.js";

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

  it("analyzes injection surface and detects multidex roots, native libraries, and security posture", async () => {
    const smali2 = path.join(tmpDir, "smali_classes2");
    const libArm = path.join(tmpDir, "lib", "arm64-v8a");
    await mkdir(path.join(smali2, "com", "example", "app"), { recursive: true });
    await mkdir(libArm, { recursive: true });
    await writeFile(path.join(libArm, "libnative-lib.so"), "ELF-mock-data");

    const launcherSmali = path.join(smali2, "com", "example", "app", "MainActivity.smali");
    await writeFile(
      launcherSmali,
      `.class public Lcom/example/app/MainActivity;\n.super Landroid/app/Activity;\n# android.intent.category.LAUNCHER\nSystem;->loadLibrary("native-lib")\ninvoke-static {}, Landroid/os/Debug;->isDebuggerConnected()Z`,
    );

    const manifestXml = `<?xml version="1.0" encoding="utf-8"?>
<manifest xmlns:android="http://schemas.android.com/apk/res/android" package="com.example.app">
  <uses-permission android:name="android.permission.CAMERA" />
  <uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />
  <application android:name="com.example.app.CustomApp" android:debuggable="true" android:allowBackup="false">
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
    expect(surface.nativeLibraries["arm64-v8a"]).toContain("libnative-lib.so");
    expect(surface.entryActivities[0]?.path).toBe(launcherSmali);

    // Verify securityAnalysis
    expect(surface.securityAnalysis).toBeDefined();
    expect(surface.securityAnalysis.antiDebug).toContain("Debug.isDebuggerConnected() API query");

    // Verify manifestSecurity
    expect(surface.manifestSecurity).toBeDefined();
    expect(surface.manifestSecurity.debuggable).toBe(true);
    expect(surface.manifestSecurity.allowBackup).toBe(false);
    expect(surface.manifestSecurity.dangerousPermissions).toContain("android.permission.CAMERA");
    expect(surface.manifestSecurity.dangerousPermissions).toContain("android.permission.ACCESS_FINE_LOCATION");

    // Verify multiDex
    expect(surface.multiDex.isMultiDex).toBe(false);
    expect(surface.multiDex.smaliRoots).toEqual(["smali_classes2"]);
  });

  it("scans security protections and detects root checks, packers, and ssl pinning", async () => {
    const smaliDir = path.join(tmpDir, "smali");
    await mkdir(path.join(smaliDir, "com", "sec"), { recursive: true });
    await writeFile(
      path.join(smaliDir, "com", "sec", "RootCheck.smali"),
      `.class public Lcom/sec/RootCheck;\nconst-string v0, "/system/bin/su"\nconst-string v1, "test-keys"\ninvoke-virtual {v0}, Lokhttp3/CertificatePinner;->check()V`,
    );

    const nativeLibs = {
      "arm64-v8a": ["libshella-2.1.so", "libapp.so"],
    };

    const sec = await scanSecurityProtections([smaliDir], nativeLibs);
    expect(sec.rootDetection).toContain("SU binary filesystem path check");
    expect(sec.rootDetection).toContain("Build.TAGS test-keys check");
    expect(sec.sslPinning).toContain("OkHttp CertificatePinner");
    expect(sec.obfuscator).toBe("Tencent Legu (Packer)");
  });

  it("enumerates native libraries across ABI directories", async () => {
    const libArm = path.join(tmpDir, "lib", "arm64-v8a");
    const libV7 = path.join(tmpDir, "lib", "armeabi-v7a");
    await mkdir(libArm, { recursive: true });
    await mkdir(libV7, { recursive: true });
    await writeFile(path.join(libArm, "libflutter.so"), "");
    await writeFile(path.join(libArm, "libapp.so"), "");
    await writeFile(path.join(libV7, "libflutter.so"), "");

    const libs = await enumerateNativeLibraries(tmpDir);
    expect(libs["arm64-v8a"]).toEqual(["libapp.so", "libflutter.so"]);
    expect(libs["armeabi-v7a"]).toEqual(["libflutter.so"]);
  });

  it("audits manifest security configuration properly", () => {
    const xml = `<?xml version="1.0" encoding="utf-8"?>
<manifest xmlns:android="http://schemas.android.com/apk/res/android" package="com.test">
  <uses-permission android:name="android.permission.INTERNET" />
  <uses-permission android:name="android.permission.RECORD_AUDIO" />
  <application android:name="com.test.App" android:debuggable="false" android:allowBackup="true" android:usesCleartextTraffic="true">
    <activity android:name=".Main" android:exported="true" />
    <activity android:name=".Secret" android:exported="false" />
  </application>
</manifest>`;
    const parsed = parseManifestXml(xml);
    const sec = auditManifestSecurity(parsed);
    expect(sec.debuggable).toBe(false);
    expect(sec.allowBackup).toBe(true);
    expect(sec.usesCleartextTraffic).toBe(true);
    expect(sec.exportedComponentsCount).toBe(1);
    expect(sec.dangerousPermissions).toContain("android.permission.RECORD_AUDIO");
    expect(sec.dangerousPermissions).not.toContain("android.permission.INTERNET");
  });
});
