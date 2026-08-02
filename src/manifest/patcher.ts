import path from "node:path";
import { readText, writeText, assertDirExists } from "../core/fileUtils.js";
import { parseManifestFile, type ParsedManifest } from "../decompiler/manifestParser.js";
import { logger } from "../core/logger.js";
import type { ManifestPatchResult } from "../types.js";

export interface ManifestPatchOptions {
  workspaceDir: string;
  customApplicationClass: string;
  engineId: string;
  overlayActivityClass?: string | null;
  addLauncherForOverlay?: boolean;
  additionalPermissions?: string[];
  usesCleartextTraffic?: boolean;
}

const DEFAULT_PERMISSIONS = ["android.permission.INTERNET", "android.permission.WAKE_LOCK"];

/**
 * Patch the decoded AndroidManifest.xml with Flutter runtime requirements.
 * Performed with text surgery so namespace declarations and formatting survive
 * apktool round-trips.
 */
export async function patchManifest(options: ManifestPatchOptions): Promise<ManifestPatchResult> {
  const abs = await assertDirExists(options.workspaceDir);
  const manifestPath = path.join(abs, "AndroidManifest.xml");
  let xml = await readText(manifestPath);

  const messages: string[] = [];
  const patchedPermissions: string[] = [];
  const addedActivities: string[] = [];
  const addedMetadata: string[] = [];

  // 1. Permissions -------------------------------------------------------
  const requested = [
    ...DEFAULT_PERMISSIONS,
    ...(options.additionalPermissions ?? []),
  ];
  const parsed = await parseManifestFile(manifestPath);
  for (const permission of requested) {
    if (!parsed.permissions.includes(permission)) {
      xml = xml.replace(
        /<\/manifest\s*>/,
        `    <uses-permission android:name="${permission}" />\n</manifest>`,
      );
      patchedPermissions.push(permission);
    }
  }

  // 2. Application class --------------------------------------------------
  const appTag = findOpeningTag(xml, "application");
  if (!appTag) {
    throw new Error("AndroidManifest.xml has no <application> element; cannot patch.");
  }
  const { start, end } = appTag;
  const applicationBlock = xml.slice(start, end);
  let newApplicationBlock = setAndroidAttribute(
    applicationBlock,
    "name",
    options.customApplicationClass,
  );
  if (options.usesCleartextTraffic) {
    newApplicationBlock = setAndroidAttribute(newApplicationBlock, "usesCleartextTraffic", "true");
  }
  xml = xml.slice(0, start) + newApplicationBlock + xml.slice(end);

  // 3. Activity + engine-id metadata --------------------------------------
  if (options.overlayActivityClass) {
    const intentFilter = options.addLauncherForOverlay
      ? `
        <intent-filter>
            <action android:name="android.intent.action.MAIN" />
            <category android:name="android.intent.category.LAUNCHER" />
        </intent-filter>`
      : "";
    const activityEntry = `
        <activity
            android:name="${options.overlayActivityClass}"
            android:exported="true"
            android:configChanges="orientation|keyboardHidden|keyboard|screenSize|smallestScreenSize|screenLayout|density|uiMode"
            android:theme="@style/LaunchTheme">${intentFilter}
        </activity>`;
    if (!xml.includes(`android:name="${options.overlayActivityClass}"`)) {
      const m = /<\/application\s*>/.exec(xml);
      if (!m) throw new Error("Cannot insert activity: no closing </application> tag");
      xml = xml.slice(0, m.index) + activityEntry + "\n    " + xml.slice(m.index);
      addedActivities.push(options.overlayActivityClass);
    }
  }

  // Add engine-id metadata to the application element (informational).
  const metaKey = "io.flutter.embedding.engine-id";
  if (!xml.includes(`android:name="${metaKey}"`)) {
    const m = /<\/application\s*>/.exec(xml);
    if (m) {
      const meta = `        <meta-data android:name="${metaKey}" android:value="${options.engineId}" />`;
      xml = xml.slice(0, m.index) + meta + "\n    " + xml.slice(m.index);
      addedMetadata.push(metaKey);
    }
  }

  await writeText(manifestPath, xml);

  // 4. Validate ------------------------------------------------------------
  const finalParsed = await parseManifestFile(manifestPath);
  const appName = finalParsed.application.name;
  if (appName !== options.customApplicationClass) {
    messages.push(
      `Application class patch failed: expected ${options.customApplicationClass}, found ${appName}`,
    );
  } else {
    messages.push(`Application class set to ${options.customApplicationClass}`);
  }

  const status = messages.some((m) => m.includes("failed")) ? "error" : "ok";
  logger.info("manifest patched", { status, permissions: patchedPermissions.length });

  return {
    workspaceDir: abs,
    patchedPermissions,
    addedApplicationMetadata: addedMetadata,
    addedActivities,
    applicationClass: finalParsed.application.name,
    usesCleartextTraffic: Boolean(options.usesCleartextTraffic),
    validation: { status: status === "error" ? "error" : "ok", messages },
  };
}

export interface TagSpan {
  start: number;
  end: number;
  tag: string;
}

/** Find the opening tag span of an element (up to the first '>' not part of a quoted value). */
export function findOpeningTag(xml: string, tagName: string): TagSpan | null {
  const re = new RegExp(`<${tagName}\\b`, "i");
  const match = re.exec(xml);
  if (!match) return null;
  const start = match.index;
  let inQuote: string | null = null;
  for (let i = start + 1; i < xml.length; i++) {
    const ch = xml[i]!;
    if (inQuote) {
      if (ch === inQuote) inQuote = null;
    } else if (ch === '"' || ch === "'") {
      inQuote = ch;
    } else if (ch === ">") {
      return { start, end: i + 1, tag: tagName };
    }
  }
  return null;
}

/**
 * Set an `android:` attribute inside an opening tag block. If the attribute
 * exists, its value is replaced; otherwise it is inserted after the tag name.
 */
export function setAndroidAttribute(block: string, attrName: string, value: string): string {
  const attrRe = new RegExp(`(android:${attrName}\\s*=\\s*["'])[^"']*(["'\\s])`);
  if (attrRe.test(block)) {
    return block.replace(attrRe, (_m, p1: string, p2: string) => `${p1}${value}${p2}`);
  }
  // Insert after the tag name (e.g. "<application" or "<application ").
  const tagRe = new RegExp(`^(<application)(\\s|>)`);
  return block.replace(tagRe, (_m, p1: string, p2: string) => {
    const attr = ` android:${attrName}="${value}"`;
    return p2 === ">" ? `${p1}${attr}>` : `${p1}${attr}${p2}`;
  });
}

export { parseManifestFile, type ParsedManifest };
