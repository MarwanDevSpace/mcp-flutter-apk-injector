import { readFile } from "node:fs/promises";
import { XMLParser } from "fast-xml-parser";
import { parseBinaryXml, axmlToXml } from "./axml.js";

export interface ManifestActivity {
  name: string;
  exported: boolean;
  launcher: boolean;
  permission?: string;
  parentActivity?: string;
}

export interface ManifestApplication {
  name: string | null;
  label?: string;
  icon?: string;
  allowBackup?: boolean;
  usesCleartextTraffic?: boolean;
}

export interface ParsedManifest {
  packageName: string;
  namespace: string;
  versionName: string | null;
  versionCode: string | null;
  minSdkVersion: number | null;
  targetSdkVersion: number | null;
  compileSdkVersion: number | null;
  permissions: string[];
  application: ManifestApplication;
  activities: ManifestActivity[];
  providers: string[];
  receivers: string[];
  services: string[];
  metaData: Array<{ name: string; value: string | null }>;
  raw: object;
}

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
  removeNSPrefix: true,
  parseTagValue: false,
  parseAttributeValue: false,
  allowBooleanAttributes: true,
  trimValues: true,
});

function toArray<T>(v: T | T[] | undefined | null): T[] {
  if (v == null) return [];
  return Array.isArray(v) ? v : [v];
}

function asNumber(v: unknown): number | null {
  if (typeof v === "number") return v;
  if (typeof v === "string") {
    const n = parseInt(v, 10);
    return Number.isNaN(n) ? null : n;
  }
  return null;
}

/** Parse a decoded (plain text) AndroidManifest.xml. */
export function parseManifestXml(xml: string): ParsedManifest {
  let doc: Record<string, any>;
  try {
    doc = parser.parse(xml) as Record<string, any>;
  } catch (err) {
    throw new Error(`Failed to parse AndroidManifest.xml: ${(err as Error).message}`);
  }
  const manifest = doc["manifest"] as Record<string, any> | undefined;
  if (!manifest) throw new Error("Invalid manifest: missing <manifest> root element");

  const appNode = manifest["application"] as Record<string, any> | undefined;
  const usesSdk = manifest["uses-sdk"] as Record<string, any> | undefined;

  const activities = toArray(appNode?.["activity"]).map((a: Record<string, any>) => {
    const intentFilters = toArray(a["intent-filter"]);
    const launcher = intentFilters.some((f) =>
      toArray(f?.["action"]).some(
        (act: Record<string, any>) =>
          act?.["@_name"] === "android.intent.action.MAIN" &&
          toArray(f?.["category"]).some(
            (c: Record<string, any>) => c?.["@_name"] === "android.intent.category.LAUNCHER",
          ),
      ),
    );
    return {
      name: a?.["@_name"] ?? "",
      exported: (a?.["@_exported"] ?? "false") === "true",
      launcher,
      permission: a?.["@_permission"],
      parentActivity: a?.["@_parentActivityName"],
    };
  });

  const permissions = toArray(manifest["uses-permission"]).map(
    (p: Record<string, any>) => p?.["@_name"] ?? "",
  );

  const metaData = toArray(appNode?.["meta-data"]).map((m: Record<string, any>) => ({
    name: m?.["@_name"] ?? "",
    value: m?.["@_value"] ?? m?.["@_resource"] ?? null,
  }));

  const parsed: ParsedManifest = {
    packageName:
      manifest["@_package"] ?? derivePackageFromNamespace(manifest["@_xmlns"] ?? "") ?? "",
    namespace: manifest["@_xmlns"] ?? "",
    versionName: manifest["@_versionName"] ?? null,
    versionCode: manifest["@_versionCode"] ?? null,
    minSdkVersion: asNumber(usesSdk?.["@_minSdkVersion"]),
    targetSdkVersion: asNumber(usesSdk?.["@_targetSdkVersion"]),
    compileSdkVersion: asNumber(usesSdk?.["@_compileSdkVersion"]),
    permissions,
    application: {
      name: appNode?.["@_name"] ?? null,
      label: appNode?.["@_label"],
      icon: appNode?.["@_icon"],
      allowBackup: (appNode?.["@_allowBackup"] ?? "true") === "true",
      usesCleartextTraffic: (appNode?.["@_usesCleartextTraffic"] ?? "false") === "true",
    },
    activities,
    providers: toArray(appNode?.["provider"]).map((p: Record<string, any>) => p?.["@_name"] ?? ""),
    receivers: toArray(appNode?.["receiver"]).map((r: Record<string, any>) => r?.["@_name"] ?? ""),
    services: toArray(appNode?.["service"]).map((s: Record<string, any>) => s?.["@_name"] ?? ""),
    metaData,
    raw: doc,
  };

  return parsed;
}

function derivePackageFromNamespace(xmlns: string): string | null {
  const match = /xmlns\s*:\s*\S+\s*=\s*"([^"]+)"/.exec(xmlns);
  return match?.[1] ?? null;
}

/** Heuristic: binary AXML manifests start with the type 0x0003 (string pool). */
function isBinaryManifest(buf: Buffer): boolean {
  if (buf.length < 4) return false;
  if (buf.subarray(0, 2).toString("ascii") === "<?" || buf.subarray(0, 1).toString() === "<") {
    return false;
  }
  const type = buf.readUInt16LE(0);
  return type === 0x0001 || type === 0x0003;
}

/** Detect whether a manifest file is binary AXML or plain text and parse it. */
export async function parseManifestFile(manifestPath: string): Promise<ParsedManifest> {
  const buf = await readFile(manifestPath);
  if (isBinaryManifest(buf)) {
    const tree = parseBinaryXml(buf);
    return parseManifestXml(axmlToXml(tree));
  }
  return parseManifestXml(buf.toString("utf8"));
}
