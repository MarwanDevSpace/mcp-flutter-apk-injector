import path from "node:path";
import { copyDirRecursive, ensureDir, listTree, rmTree } from "../core/fileUtils.js";
import { logger } from "../core/logger.js";

export interface PayloadDeployResult {
  copiedLibs: string[];
  copiedAssets: string[];
  libDestination: string;
  assetsDestination: string;
}

/**
 * Merge a synthesized payload into a decompiled APK workspace:
 *   - lib/<abi>/*.so -> <workspace>/lib/<abi>/
 *   - flutter_assets/** -> <workspace>/assets/flutter_assets/
 */
export async function deployPayloadIntoWorkspace(
  workspaceDir: string,
  payloadDir: string,
): Promise<PayloadDeployResult> {
  const libDest = path.join(workspaceDir, "lib");
  const assetsDest = path.join(workspaceDir, "assets", "flutter_assets");

  const payloadLibDir = path.join(payloadDir, "lib");
  const payloadAssetsDir = path.join(payloadDir, "flutter_assets");

  const copiedLibs: string[] = [];
  const copiedAssets: string[] = [];

  const libEntries = await listTree(payloadLibDir).catch(() => []);
  for (const entry of libEntries) {
    if (entry.kind !== "file") continue;
    const rel = entry.path; // e.g. arm64-v8a/libflutter.so
    const dest = path.join(libDest, rel);
    await ensureDir(path.dirname(dest));
    await copyDirRecursive(path.join(payloadLibDir, rel), dest);
    copiedLibs.push("lib/" + rel);
  }

  const assetEntries = await listTree(payloadAssetsDir).catch(() => []);
  for (const entry of assetEntries) {
    if (entry.kind !== "file") continue;
    const rel = entry.path;
    const dest = path.join(assetsDest, rel);
    await ensureDir(path.dirname(dest));
    await copyDirRecursive(path.join(payloadAssetsDir, rel), dest);
    copiedAssets.push("assets/flutter_assets/" + rel);
  }

  logger.info("payload deployed", {
    libs: copiedLibs.length,
    assets: copiedAssets.length,
  });

  return { copiedLibs, copiedAssets, libDestination: libDest, assetsDestination: assetsDest };
}

/** Remove previously injected Flutter artifacts (idempotency helper). */
export async function removePreviousFlutterArtifacts(workspaceDir: string): Promise<string[]> {
  const removed: string[] = [];
  for (const target of [
    path.join(workspaceDir, "assets", "flutter_assets"),
    path.join(workspaceDir, "lib"),
  ]) {
    try {
      const entries = await listTree(target);
      if (entries.length > 0) {
        await rmTree(target);
        removed.push(target);
      }
    } catch {
      // Ignore missing dirs.
    }
  }
  return removed;
}
