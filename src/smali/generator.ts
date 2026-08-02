import path from "node:path";
import { ensureDir, writeText } from "../core/fileUtils.js";
import { logger } from "../core/logger.js";
import {
  INJECTED_CLASS_APPLICATION,
  INJECTED_CLASS_BOOTSTRAP,
  INJECTED_CLASS_CHANNEL_HANDLER,
  INJECTED_CLASS_OVERLAY_ACTIVITY,
  buildFlutterOverlayActivity,
  buildInjectedApplication,
  buildInjectedChannelHandler,
  buildInjectedFlutterBootstrap,
  type InjectionTemplateConfig,
} from "./templates.js";
import { classToDescriptor } from "./descriptors.js";
import type { MethodChannelBridgeConfig } from "../types.js";

export interface GeneratedClass {
  className: string;
  descriptor: string;
  relativePath: string;
  absolutePath: string;
}

export interface SmaliGenerationResult {
  classes: GeneratedClass[];
  applicationDescriptor: string;
  overlayActivityDescriptor: string;
  bootstrapDescriptor: string;
  channelHandlerDescriptor: string;
}

export interface SmaliGenerationOptions {
  packageName: string;
  smaliRoot: string;
  engineId: string;
  applicationSuperClass?: string | null;
  injectionModes: Array<"activity_overlay" | "view_tree_injection" | "headless_engine">;
  channel?: MethodChannelBridgeConfig;
  classNamePrefix?: string;
}

/**
 * Generate all injected Smali classes into the target smali tree.
 * Always generates the Application + Bootstrap; the overlay activity is
 * generated only when activity_overlay mode is active.
 */
export async function generateSmaliClasses(options: SmaliGenerationOptions): Promise<SmaliGenerationResult> {
  const prefix = options.classNamePrefix ?? "";
  const appClass = `${options.packageName}.${prefix}${INJECTED_CLASS_APPLICATION}`;
  const bootstrapClass = `${options.packageName}.${prefix}${INJECTED_CLASS_BOOTSTRAP}`;
  const handlerClass = `${options.packageName}.${prefix}${INJECTED_CLASS_CHANNEL_HANDLER}`;
  const overlayClass = `${options.packageName}.${prefix}${INJECTED_CLASS_OVERLAY_ACTIVITY}`;

  const superClass = options.applicationSuperClass ?? "android.app.Application";

  const cfg: InjectionTemplateConfig = {
    applicationClass: appClass,
    applicationSuper: superClass,
    overlayActivityClass: overlayClass,
    bootstrapClass,
    channelHandlerClass: handlerClass,
    engineId: options.engineId,
    channel: options.channel,
  };

  const generated: GeneratedClass[] = [];

  const writeClass = async (className: string, source: string): Promise<GeneratedClass> => {
    const rel = path.join(...className.split(".")) + ".smali";
    const abs = path.join(options.smaliRoot, rel);
    await ensureDir(path.dirname(abs));
    await writeText(abs, source);
    const entry: GeneratedClass = {
      className,
      descriptor: classToDescriptor(className),
      relativePath: rel.split(path.sep).join("/"),
      absolutePath: abs,
    };
    generated.push(entry);
    logger.info("generated smali class", { className, path: abs });
    return entry;
  };

  await writeClass(appClass, buildInjectedApplication(cfg));
  await writeClass(bootstrapClass, buildInjectedFlutterBootstrap(cfg));
  await writeClass(handlerClass, buildInjectedChannelHandler(cfg));

  if (options.injectionModes.includes("activity_overlay")) {
    await writeClass(overlayClass, buildFlutterOverlayActivity(cfg));
  }

  return {
    classes: generated,
    applicationDescriptor: classToDescriptor(appClass),
    overlayActivityDescriptor: classToDescriptor(overlayClass),
    bootstrapDescriptor: classToDescriptor(bootstrapClass),
    channelHandlerDescriptor: classToDescriptor(handlerClass),
  };
}
