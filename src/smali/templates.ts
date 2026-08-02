import type { MethodChannelBridgeConfig } from "../types.js";
import { classToDescriptor } from "./descriptors.js";

/**
 * Smali source generators. All generated classes are standalone, verifiable
 * Dalvik bytecode sources that assemble with `apktool b` or `smali`.
 *
 * The injection strategy (aligned with the official Flutter "add to app" v2
 * embedding):
 *
 *  1. `InjectedApplication.onCreate()`:
 *     - loads `libflutter.so` and `libapp.so`
 *     - constructs a `FlutterEngine` against the application Context
 *     - executes the default Dart entrypoint
 *     - stores the engine in `FlutterEngineCache`
 *     - (optional) wires a `MethodChannel` handler + host->Dart bridge
 *
 *  2. `FlutterOverlayActivity` (activity_overlay mode):
 *     - extends `io.flutter.embedding.android.FlutterActivity`
 *     - overrides `getCachedEngineId()` so the activity reuses the cached,
 *       already-running engine (the delegate does NOT re-execute Dart for
 *       cached engines, per FlutterActivityAndFragmentDelegate#doInitialFlutterViewRun).
 *
 *  3. `InjectedFlutterBootstrap.attachToActivity(Activity)` (view_tree mode):
 *     - resolves the cached engine and attaches a programmatic `FlutterView`
 *       over the decor view of the host Activity.
 */

export const INJECTED_CLASS_APPLICATION = "InjectedApplication";
export const INJECTED_CLASS_OVERLAY_ACTIVITY = "FlutterOverlayActivity";
export const INJECTED_CLASS_BOOTSTRAP = "InjectedFlutterBootstrap";
export const INJECTED_CLASS_CHANNEL_HANDLER = "InjectedChannelHandler";

const FLUTTER_ENGINE = "Lio/flutter/embedding/engine/FlutterEngine;";
const FLUTTER_ENGINE_CACHE = "Lio/flutter/embedding/engine/FlutterEngineCache;";
const DART_EXECUTOR = "Lio/flutter/embedding/engine/dart/DartExecutor;";
const DART_ENTRYPOINT = "Lio/flutter/embedding/engine/dart/DartExecutor$DartEntrypoint;";
const BINARY_MESSENGER = "Lio/flutter/plugin/common/BinaryMessenger;";
const METHOD_CHANNEL = "Lio/flutter/plugin/common/MethodChannel;";
const METHOD_CALL_HANDLER = "Lio/flutter/plugin/common/MethodChannel$MethodCallHandler;";
const METHOD_CALL = "Lio/flutter/plugin/common/MethodCall;";
const RESULT = "Lio/flutter/plugin/common/MethodChannel$Result;";
const CONTEXT = "Landroid/content/Context;";
const ACTIVITY = "Landroid/app/Activity;";

export interface InjectionTemplateConfig {
  /** Full class name of the generated application class. */
  applicationClass: string;
  /** Super class descriptor for the application (original app or android.app.Application). */
  applicationSuper: string;
  /** Full class name of the overlay activity. */
  overlayActivityClass: string;
  /** Full class name of the bootstrap helper. */
  bootstrapClass: string;
  /** Full class name of the method channel handler. */
  channelHandlerClass: string;
  /** ID used to store the engine in FlutterEngineCache. */
  engineId: string;
  /** Optional two-way method channel bridge config. */
  channel?: MethodChannelBridgeConfig;
}

export function buildInjectedApplication(cfg: InjectionTemplateConfig): string {
  const app = classToDescriptor(cfg.applicationClass);
  const superDesc = cfg.applicationSuper.startsWith("L")
    ? cfg.applicationSuper
    : classToDescriptor(cfg.applicationSuper);
  const engineId = cfg.engineId;
  const bootstrap = classToDescriptor(cfg.bootstrapClass);
  const hasChannel = Boolean(cfg.channel);

  const lines: string[] = [
    `.class public L${app.slice(1)}`,
    `.super ${superDesc}`,
    `.source "InjectedApplication.java"`,
    ``,
    `# field: public static final FLUTTER_ENGINE_ID`,
    `.field public static final FLUTTER_ENGINE_ID:Ljava/lang/String; = "${engineId}"`,
    ``,
    `.method public constructor <init>()V`,
    `    .locals 0`,
    ``,
    `    invoke-direct {p0}, ${superDesc}-><init>()V`,
    ``,
    `    return-void`,
    `.end method`,
    ``,
    `.method public onCreate()V`,
    `    .locals 3`,
    ``,
    `    invoke-super {p0}, ${superDesc}->onCreate()V`,
    ``,
    `    # Load native libraries (flutter runtime + Dart AOT snapshot loader)`,
    `    const-string v0, "flutter"`,
    ``,
    `    invoke-static {v0}, Ljava/lang/System;->loadLibrary(Ljava/lang/String;)V`,
    ``,
    `    const-string v0, "app"`,
    ``,
    `    invoke-static {v0}, Ljava/lang/System;->loadLibrary(Ljava/lang/String;)V`,
    ``,
    `    # FlutterEngine engine = new FlutterEngine(this)`,
    `    new-instance v0, Lio/flutter/embedding/engine/FlutterEngine;`,
    ``,
    `    invoke-direct {v0, p0}, Lio/flutter/embedding/engine/FlutterEngine;-><init>(${CONTEXT})V`,
    ``,
    `    # engine.getDartExecutor().executeDartEntrypoint(DartEntrypoint.createDefault())`,
    `    invoke-virtual {v0}, ${FLUTTER_ENGINE}->getDartExecutor()${DART_EXECUTOR}`,
    ``,
    `    move-result-object v1`,
    ``,
    `    invoke-static {}, ${DART_ENTRYPOINT}->createDefault()${DART_ENTRYPOINT}`,
    ``,
    `    move-result-object v2`,
    ``,
    `    invoke-virtual {v1, v2}, ${DART_EXECUTOR}->executeDartEntrypoint(${DART_ENTRYPOINT})V`,
    ``,
    `    # FlutterEngineCache.getInstance().put(FLUTTER_ENGINE_ID, engine)`,
    `    invoke-static {}, ${FLUTTER_ENGINE_CACHE}->getInstance()${FLUTTER_ENGINE_CACHE}`,
    ``,
    `    move-result-object v1`,
    ``,
    `    sget-object v2, L${app.slice(1)}->FLUTTER_ENGINE_ID:Ljava/lang/String;`,
    ``,
    `    invoke-virtual {v1, v2, v0}, ${FLUTTER_ENGINE_CACHE}->put(Ljava/lang/String;${FLUTTER_ENGINE})V`,
    ``,
  ];

  if (hasChannel) {
    lines.push(
      `    # ${bootstrap}->configureMethodChannel(engine)`,
      `    invoke-static {v0}, ${bootstrap}->configureMethodChannel(${FLUTTER_ENGINE})V`,
      ``,
    );
  }

  lines.push(`    return-void`, `.end method`, `.end class`, ``);
  return lines.join("\n");
}

export function buildFlutterOverlayActivity(cfg: InjectionTemplateConfig): string {
  const overlay = classToDescriptor(cfg.overlayActivityClass);
  const flutterActivity = "Lio/flutter/embedding/android/FlutterActivity;";
  const engineId = cfg.engineId;

  const lines: string[] = [
    `.class public L${overlay.slice(1)}`,
    `.super ${flutterActivity}`,
    `.source "FlutterOverlayActivity.java"`,
    ``,
    `.method public constructor <init>()V`,
    `    .locals 0`,
    ``,
    `    invoke-direct {p0}, ${flutterActivity}-><init>()V`,
    ``,
    `    return-void`,
    `.end method`,
    ``,
    `# The FlutterActivity delegate reuses the cached, already-running engine.`,
    `.method public getCachedEngineId()Ljava/lang/String;`,
    `    .locals 1`,
    ``,
    `    const-string v0, "${engineId}"`,
    ``,
    `    return-object v0`,
    `.end method`,
    ``,
    `.end class`,
    ``,
  ];
  return lines.join("\n");
}

export function buildInjectedFlutterBootstrap(cfg: InjectionTemplateConfig): string {
  const bootstrap = classToDescriptor(cfg.bootstrapClass);
  const handlerDesc = classToDescriptor(cfg.channelHandlerClass);
  const channelName = cfg.channel?.channelName ?? "injected_bridge";
  const hasChannel = Boolean(cfg.channel);

  const lines: string[] = [
    `.class public final L${bootstrap.slice(1)}`,
    `.super Ljava/lang/Object;`,
    `.source "InjectedFlutterBootstrap.java"`,
    ``,
    `# view_tree_injection / direct_hook: attach a FlutterView to an existing Activity.`,
    `.method public static attachToActivity(${ACTIVITY})V`,
    `    .locals 4`,
    ``,
    `    # Ensure engine is initialized first`,
    `    invoke-static {p0}, L${bootstrap.slice(1)}->initEngineFromContext(${CONTEXT})V`,
    ``,
    `    # FlutterEngine engine = FlutterEngineCache.getInstance().get(FLUTTER_ENGINE_ID)`,
    `    invoke-static {}, ${FLUTTER_ENGINE_CACHE}->getInstance()${FLUTTER_ENGINE_CACHE}`,
    ``,
    `    move-result-object v0`,
    ``,
    `    sget-object v1, L${bootstrap.slice(1)}->FLUTTER_ENGINE_ID:Ljava/lang/String;`,
    ``,
    `    invoke-virtual {v0, v1}, ${FLUTTER_ENGINE_CACHE}->get(Ljava/lang/String;)${FLUTTER_ENGINE}`,
    ``,
    `    move-result-object v0`,
    ``,
    `    if-nez v0, :cond_have_engine`,
    ``,
    `    return-void`,
    ``,
    `    :cond_have_engine`,
    `    # FlutterView view = new FlutterView((Context) activity)`,
    `    new-instance v1, Lio/flutter/view/FlutterView;`,
    ``,
    `    invoke-direct {v1, p0}, Lio/flutter/view/FlutterView;-><init>(${CONTEXT})V`,
    ``,
    `    invoke-virtual {v1, v0}, Lio/flutter/view/FlutterView;->attachToFlutterEngine(${FLUTTER_ENGINE})V`,
    ``,
    `    # FrameLayout.LayoutParams lp = new FrameLayout.LayoutParams(MATCH_PARENT, MATCH_PARENT)`,
    `    new-instance v2, Landroid/widget/FrameLayout$LayoutParams;`,
    ``,
    `    const/16 v3, -0x1`,
    ``,
    `    invoke-direct {v2, v3, v3}, Landroid/widget/FrameLayout$LayoutParams;-><init>(II)V`,
    ``,
    `    # decor = activity.getWindow().getDecorView(); decor.addView(view, lp)`,
    `    invoke-virtual {p0}, ${ACTIVITY}->getWindow()Landroid/view/Window;`,
    ``,
    `    move-result-object v3`,
    ``,
    `    invoke-virtual {v3}, Landroid/view/Window;->getDecorView()Landroid/view/View;`,
    ``,
    `    move-result-object v3`,
    ``,
    `    check-cast v3, Landroid/view/ViewGroup;`,
    ``,
    `    invoke-virtual {v3, v1, v2}, Landroid/view/ViewGroup;->addView(Landroid/view/View;Landroid/view/ViewGroup$LayoutParams;)V`,
    ``,
    `    return-void`,
    `.end method`,
    ``,
    `# Initialize Flutter engine from any Context safely`,
    `.method public static initEngineFromContext(${CONTEXT})V`,
    `    .locals 3`,
    ``,
    `    if-nez p0, :cond_start_init`,
    `    return-void`,
    ``,
    `    :cond_start_init`,
    `    invoke-static {}, ${FLUTTER_ENGINE_CACHE}->getInstance()${FLUTTER_ENGINE_CACHE}`,
    `    move-result-object v0`,
    `    sget-object v1, L${bootstrap.slice(1)}->FLUTTER_ENGINE_ID:Ljava/lang/String;`,
    `    invoke-virtual {v0, v1}, ${FLUTTER_ENGINE_CACHE}->get(Ljava/lang/String;)${FLUTTER_ENGINE}`,
    `    move-result-object v0`,
    `    if-eqz v0, :cond_create_new`,
    `    return-void`,
    ``,
    `    :cond_create_new`,
    `    :try_start_libs`,
    `    const-string v0, "flutter"`,
    `    invoke-static {v0}, Ljava/lang/System;->loadLibrary(Ljava/lang/String;)V`,
    `    const-string v0, "app"`,
    `    invoke-static {v0}, Ljava/lang/System;->loadLibrary(Ljava/lang/String;)V`,
    `    :try_end_libs`,
    `    .catch Ljava/lang/Throwable; {:try_start_libs .. :try_end_libs} :catch_libs`,
    `    goto :libs_loaded`,
    `    :catch_libs`,
    `    move-exception v0`,
    ``,
    `    :libs_loaded`,
    `    new-instance v0, Lio/flutter/embedding/engine/FlutterEngine;`,
    `    invoke-direct {v0, p0}, Lio/flutter/embedding/engine/FlutterEngine;-><init>(${CONTEXT})V`,
    `    invoke-virtual {v0}, ${FLUTTER_ENGINE}->getDartExecutor()${DART_EXECUTOR}`,
    `    move-result-object v1`,
    `    invoke-static {}, ${DART_ENTRYPOINT}->createDefault()${DART_ENTRYPOINT}`,
    `    move-result-object v2`,
    `    invoke-virtual {v1, v2}, ${DART_EXECUTOR}->executeDartEntrypoint(${DART_ENTRYPOINT})V`,
    `    invoke-static {}, ${FLUTTER_ENGINE_CACHE}->getInstance()${FLUTTER_ENGINE_CACHE}`,
    `    move-result-object v1`,
    `    sget-object v2, L${bootstrap.slice(1)}->FLUTTER_ENGINE_ID:Ljava/lang/String;`,
    `    invoke-virtual {v1, v2, v0}, ${FLUTTER_ENGINE_CACHE}->put(Ljava/lang/String;${FLUTTER_ENGINE})V`,
    `    return-void`,
    `.end method`,
    ``,
  ];

  if (hasChannel) {
    lines.push(
      `# Two-way MethodChannel bridge: attach a handler for Dart->host calls.`,
      `.method public static configureMethodChannel(${FLUTTER_ENGINE})V`,
      `    .locals 3`,
      ``,
      `    # BinaryMessenger messenger = engine.getDartExecutor().getBinaryMessenger()`,
      `    invoke-virtual {p0}, ${FLUTTER_ENGINE}->getDartExecutor()${DART_EXECUTOR}`,
      ``,
      `    move-result-object v0`,
      ``,
      `    invoke-virtual {v0}, ${DART_EXECUTOR}->getBinaryMessenger()${BINARY_MESSENGER}`,
      ``,
      `    move-result-object v0`,
      ``,
      `    # MethodChannel channel = new MethodChannel(messenger, name)`,
      `    new-instance v1, Lio/flutter/plugin/common/MethodChannel;`,
      ``,
      `    const-string v2, "${channelName}"`,
      ``,
      `    invoke-direct {v1, v0, v2}, ${METHOD_CHANNEL}-><init>(${BINARY_MESSENGER}Ljava/lang/String;)V`,
      ``,
      `    # channel.setMethodCallHandler(new ${handlerDesc}())`,
      `    new-instance v0, L${handlerDesc.slice(1)}`,
      ``,
      `    invoke-direct {v0}, L${handlerDesc.slice(1)}-><init>()V`,
      ``,
      `    invoke-virtual {v1, v0}, ${METHOD_CHANNEL}->setMethodCallHandler(${METHOD_CALL_HANDLER})V`,
      ``,
      `    return-void`,
      `.end method`,
      ``,
      `# Host->Dart: invoke a method on the channel.`,
      `.method public static sendEvent(${FLUTTER_ENGINE}Ljava/lang/String;Ljava/lang/Object;)V`,
      `    .locals 3`,
      ``,
      `    invoke-virtual {p0}, ${FLUTTER_ENGINE}->getDartExecutor()${DART_EXECUTOR}`,
      ``,
      `    move-result-object v0`,
      ``,
      `    invoke-virtual {v0}, ${DART_EXECUTOR}->getBinaryMessenger()${BINARY_MESSENGER}`,
      ``,
      `    move-result-object v0`,
      ``,
      `    new-instance v1, Lio/flutter/plugin/common/MethodChannel;`,
      ``,
      `    const-string v2, "${channelName}"`,
      ``,
      `    invoke-direct {v1, v0, v2}, ${METHOD_CHANNEL}-><init>(${BINARY_MESSENGER}Ljava/lang/String;)V`,
      ``,
      `    invoke-virtual {v1, p1, p2}, ${METHOD_CHANNEL}->invokeMethod(Ljava/lang/String;Ljava/lang/Object;)V`,
      ``,
      `    return-void`,
      `.end method`,
      ``,
    );
  }

  lines.push(
    `.field public static final FLUTTER_ENGINE_ID:Ljava/lang/String; = "${cfg.engineId}"`,
    ``,
    `.end class`,
    ``,
  );
  return lines.join("\n");
}

export function buildInjectedChannelHandler(cfg: InjectionTemplateConfig): string {
  const handler = classToDescriptor(cfg.channelHandlerClass);
  const whitelist = cfg.channel?.methodWhitelist ?? [];

  const lines: string[] = [
    `.class public L${handler.slice(1)}`,
    `.super Ljava/lang/Object;`,
    `.implements Lio/flutter/plugin/common/MethodChannel$MethodCallHandler;`,
    `.source "InjectedChannelHandler.java"`,
    ``,
    `.method public constructor <init>()V`,
    `    .locals 0`,
    ``,
    `    invoke-direct {p0}, Ljava/lang/Object;-><init>()V`,
    ``,
    `    return-void`,
    `.end method`,
    ``,
    `# Dart->host method dispatch.`,
    `.method public onMethodCall(${METHOD_CALL}${RESULT})V`,
    `    .locals 2`,
    ``,
  ];

  if (whitelist.length === 0) {
    lines.push(
      `    # String method = call.method`,
      `    iget-object v0, p1, Lio/flutter/plugin/common/MethodCall;->method:Ljava/lang/String;`,
      ``,
      `    const-string v1, "ping"`,
      ``,
      `    invoke-virtual {v0, v1}, Ljava/lang/String;->equals(Ljava/lang/Object;)Z`,
      ``,
      `    move-result v0`,
      ``,
      `    if-eqz v0, :cond_default`,
      ``,
      `    # result.success(1)`,
      `    const/4 v0, 0x1`,
      ``,
      `    invoke-static {v0}, Ljava/lang/Integer;->valueOf(I)Ljava/lang/Integer;`,
      ``,
      `    move-result-object v0`,
      ``,
      `    invoke-interface {p2}, Lio/flutter/plugin/common/MethodChannel$Result;->success(Ljava/lang/Object;)V`,
      ``,
      `    return-void`,
      ``,
      `    :cond_default`,
      `    invoke-interface {p2}, Lio/flutter/plugin/common/MethodChannel$Result;->notImplemented()V`,
      ``,
      `    return-void`,
      `.end method`,
      ``,
    );
  } else {
    // Multiple named methods: chain equals checks per whitelist entry.
    lines.push(
      `    iget-object v0, p1, Lio/flutter/plugin/common/MethodCall;->method:Ljava/lang/String;`,
      ``,
    );
    for (const method of whitelist) {
      const label = `:cond_m_${sanitize(method)}`;
      lines.push(
        `    const-string v1, "${method}"`,
        ``,
        `    invoke-virtual {v0, v1}, Ljava/lang/String;->equals(Ljava/lang/Object;)Z`,
        ``,
        `    move-result v1`,
        ``,
        `    if-nez v1, ${label}`,
        ``,
      );
    }
    lines.push(
      `    invoke-interface {p2}, Lio/flutter/plugin/common/MethodChannel$Result;->notImplemented()V`,
      ``,
      `    return-void`,
      ``,
    );
    for (const method of whitelist) {
      const label = `:cond_m_${sanitize(method)}`;
      lines.push(
        `    ${label}`,
        `    const/4 v1, 0x1`,
        ``,
        `    invoke-static {v1}, Ljava/lang/Integer;->valueOf(I)Ljava/lang/Integer;`,
        ``,
        `    move-result-object v1`,
        ``,
        `    invoke-interface {p2}, Lio/flutter/plugin/common/MethodChannel$Result;->success(Ljava/lang/Object;)V`,
        ``,
        `    return-void`,
        ``,
      );
    }
    lines.push(`.end method`, ``);
  }

  lines.push(`.end class`, ``);
  return lines.join("\n");
}

function sanitize(s: string): string {
  return s.replace(/[^A-Za-z0-9_]/g, "_");
}
