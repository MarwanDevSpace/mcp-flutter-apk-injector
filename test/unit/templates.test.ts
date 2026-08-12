import { describe, it, expect } from "vitest";
import {
  buildInjectedApplication,
  buildFlutterOverlayActivity,
  buildInjectedFlutterBootstrap,
  buildInjectedChannelHandler,
  type InjectionTemplateConfig,
} from "../../src/smali/templates.js";

const cfg: InjectionTemplateConfig = {
  applicationClass: "com.target.app.InjectedApplication",
  applicationSuper: "android.app.Application",
  overlayActivityClass: "com.target.app.FlutterOverlayActivity",
  bootstrapClass: "com.target.app.InjectedFlutterBootstrap",
  channelHandlerClass: "com.target.app.InjectedChannelHandler",
  engineId: "injected_flutter_engine",
  channel: {
    channelName: "injected_bridge",
    methodWhitelist: ["ping", "health"],
  },
};

function structureErrors(smali: string): string[] {
  const errors: string[] = [];
  let depth = 0;
  let sawClass = false;
  for (const raw of smali.split("\n")) {
    const line = raw.trim();
    if (line.startsWith(".class")) sawClass = true;
    if (line.startsWith(".method")) depth++;
    if (line === ".end method") {
      depth--;
      if (depth < 0) errors.push("orphan .end method");
    }
  }
  if (depth !== 0) errors.push(`unbalanced methods (depth=${depth})`);
  if (!sawClass) errors.push("missing .class");
  return errors;
}

describe("smali templates", () => {
  it("produces a structurally valid InjectedApplication", () => {
    const src = buildInjectedApplication(cfg);
    expect(structureErrors(src)).toEqual([]);
    expect(src).toContain(".super Landroid/app/Application;");
    expect(src).toContain('System;->loadLibrary(Ljava/lang/String;)V');
    expect(src).toContain("FlutterEngine;-><init>(Landroid/content/Context;)V");
    expect(src).toContain("FlutterEngineCache;->put(Ljava/lang/String;Lio/flutter/embedding/engine/FlutterEngine;)V");
    expect(src).toContain("DartExecutor$DartEntrypoint;->createDefault()");
    expect(src).toContain("configureMethodChannel(Lio/flutter/embedding/engine/FlutterEngine;)V");
    // onCreate must declare exactly 3 locals.
    const m = /\.method public onCreate\(\)V([\s\S]*?)\.end method/.exec(src)!;
    expect(m[1]).toContain(".locals 3");
  });

  it("emits a defensive native-library fallback only when requested", () => {
    const src = buildInjectedApplication({ ...cfg, nativeLibraryFallback: true });
    expect(structureErrors(src)).toEqual([]);
    expect(src).toContain(":try_start_libs");
    expect(src).toContain(".catch Ljava/lang/Throwable; {:try_start_libs .. :try_end_libs} :catch_libs");
    expect(src).toContain(":catch_libs");
    expect(src).toContain("return-void");
  });

  it("produces a structurally valid FlutterOverlayActivity reusing the cached engine", () => {
    const src = buildFlutterOverlayActivity(cfg);
    expect(structureErrors(src)).toEqual([]);
    expect(src).toContain(".super Lio/flutter/embedding/android/FlutterActivity;");
    expect(src).toContain('getCachedEngineId()Ljava/lang/String;');
    expect(src).toContain('const-string v0, "injected_flutter_engine"');
  });

  it("produces a structurally valid InjectedFlutterBootstrap", () => {
    const src = buildInjectedFlutterBootstrap(cfg);
    expect(structureErrors(src)).toEqual([]);
    expect(src).toContain("attachToActivity(Landroid/app/Activity;)V");
    expect(src).toContain("FlutterView;->attachToFlutterEngine(Lio/flutter/embedding/engine/FlutterEngine;)V");
    expect(src).toContain("FrameLayout$LayoutParams;-><init>(II)V");
    expect(src).toContain("configureMethodChannel(Lio/flutter/embedding/engine/FlutterEngine;)V");
    expect(src).toContain("sendEvent(Lio/flutter/embedding/engine/FlutterEngine;Ljava/lang/String;Ljava/lang/Object;)V");
    expect(src).toContain('const-string v2, "injected_bridge"');
  });

  it("produces a structurally valid InjectedChannelHandler with method routing", () => {
    const src = buildInjectedChannelHandler(cfg);
    expect(structureErrors(src)).toEqual([]);
    expect(src).toContain(".implements Lio/flutter/plugin/common/MethodChannel$MethodCallHandler;");
    expect(src).toContain('MethodCall;->method:Ljava/lang/String;');
    expect(src).toContain(":cond_m_ping");
    expect(src).toContain(":cond_m_health");
    expect(src).toContain("MethodChannel$Result;->success(Ljava/lang/Object;)V");
    expect(src).toContain("MethodChannel$Result;->notImplemented()V");
  });

  it("generates a handler without whitelist that answers ping + notImplemented", () => {
    const noList = buildInjectedChannelHandler({ ...cfg, channel: { channelName: "x" } });
    expect(noList).toContain(':cond_default');
    expect(noList).toContain('const-string v1, "ping"');
  });

  it("embeds register counts compatible with smali syntax", () => {
    for (const src of [
      buildInjectedApplication(cfg),
      buildFlutterOverlayActivity(cfg),
      buildInjectedFlutterBootstrap(cfg),
      buildInjectedChannelHandler(cfg),
    ]) {
      for (const line of src.split("\n")) {
        const t = line.trim();
        if (t === ".locals 0" || /^\.locals [1-9]/.test(t)) continue;
        if (t.startsWith(".locals")) {
          throw new Error(`unexpected locals declaration: ${t}`);
        }
      }
    }
  });
});
