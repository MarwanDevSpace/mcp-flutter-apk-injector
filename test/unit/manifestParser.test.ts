import { describe, it, expect } from "vitest";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parseManifestXml, parseManifestFile } from "../../src/decompiler/manifestParser.js";

const FIXTURE = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
  "fixtures",
  "AndroidManifest.xml",
);

describe("manifestParser", () => {
  it("parses package, sdk versions and permissions", async () => {
    const manifest = await parseManifestFile(FIXTURE);
    expect(manifest.packageName).toBe("com.example.target");
    expect(manifest.minSdkVersion).toBe(24);
    expect(manifest.targetSdkVersion).toBe(34);
    expect(manifest.permissions).toContain("android.permission.INTERNET");
    expect(manifest.permissions).toContain("android.permission.READ_PHONE_STATE");
  });

  it("parses application class and activities with launcher detection", async () => {
    const manifest = await parseManifestFile(FIXTURE);
    expect(manifest.application.name).toBe("com.example.target.TargetApp");
    expect(manifest.activities).toHaveLength(2);
    const launcher = manifest.activities.find((a) => a.launcher);
    expect(launcher?.name).toBe(".MainActivity");
    expect(launcher?.exported).toBe(true);
    const second = manifest.activities.find((a) => a.name === "com.example.target.SecondActivity");
    expect(second?.launcher).toBe(false);
    expect(second?.exported).toBe(false);
  });

  it("parses application meta-data", async () => {
    const manifest = await parseManifestFile(FIXTURE);
    expect(manifest.metaData).toContainEqual({ name: "some.key", value: "hello" });
  });

  it("handles relative activity names by qualification", () => {
    const manifest = parseManifestXml(
      `<manifest xmlns:android="http://schemas.android.com/apk/res/android" package="a.b">
        <application android:name=".App">
          <activity android:name=".Act" android:exported="true"/>
        </application>
      </manifest>`,
    );
    expect(manifest.application.name).toBe(".App");
    expect(manifest.activities[0]?.name).toBe(".Act");
  });
});
