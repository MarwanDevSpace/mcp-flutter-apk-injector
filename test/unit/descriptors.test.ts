import { describe, it, expect } from "vitest";
import { classToDescriptor, descriptorToClassName, classNameToPath, paramSlotWidth, parseSignature } from "../../src/smali/descriptors.js";

describe("descriptors", () => {
  it("converts class names to descriptors", () => {
    expect(classToDescriptor("io.flutter.embedding.engine.FlutterEngine")).toBe(
      "Lio/flutter/embedding/engine/FlutterEngine;",
    );
    expect(classToDescriptor("Landroid/app/Application;")).toBe("Landroid/app/Application;");
  });

  it("converts descriptors to class names", () => {
    expect(descriptorToClassName("Lcom/example/Foo;")).toBe("com/example/Foo");
  });

  it("produces file path fragments", () => {
    expect(classNameToPath("com.example.Foo")).toBe("com/example/Foo");
  });

  it("computes parameter slot width (long/double take two)", () => {
    // I(1) + J(2) + Ljava/lang/String;(1) + D(2) = 6
    expect(paramSlotWidth(["I", "J", "Ljava/lang/String;", "D"])).toBe(6);
  });

  it("parses method signatures including arrays and nested types", () => {
    const sig = parseSignature("(Lio/flutter/plugin/common/MethodCall;Lio/flutter/plugin/common/MethodChannel$Result;)V");
    expect(sig.params).toEqual([
      "Lio/flutter/plugin/common/MethodCall;",
      "Lio/flutter/plugin/common/MethodChannel$Result;",
    ]);
    expect(sig.returnType).toBe("V");

    const arr = parseSignature("([Ljava/lang/String;[I)Ljava/util/List;");
    expect(arr.params).toEqual(["[Ljava/lang/String;", "[I"]);
  });
});
