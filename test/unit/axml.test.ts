import { describe, it, expect } from "vitest";
import { parseBinaryXml, axmlToXml, AXmlError } from "../../src/decompiler/axml.js";

/**
 * Build a minimal, valid binary AXML buffer containing a single <manifest>
 * element with two attributes.
 */
function buildBinaryManifest(): Buffer {
  const strings = [
    "manifest",
    "com.example.target",
    "android",
    "http://schemas.android.com/apk/res/android",
    "minSdkVersion",
  ];
  const strIndex: Record<string, number> = {};
  strings.forEach((s, i) => (strIndex[s] = i));

  // --- String pool data (UTF-16LE with single-byte length prefix) ---
  const stringData: number[] = [];
  const offsets: number[] = [];
  for (const s of strings) {
    offsets.push(stringData.length);
    stringData.push(s.length);
    for (const ch of s) {
      const code = ch.charCodeAt(0);
      stringData.push(code & 0xff, (code >> 8) & 0xff);
    }
  }
  const stringCount = strings.length;
  const headerSize = 28;
  const stringsStart = headerSize + 4 * stringCount;

  const b: number[] = [];
  const pushU16 = (v: number) => {
    b.push(v & 0xff, (v >> 8) & 0xff);
  };
  const pushU32 = (v: number) => {
    b.push(v & 0xff, (v >> 8) & 0xff, (v >> 16) & 0xff, (v >>> 24) & 0xff);
  };

  // String pool chunk (type 0x0001).
  const poolChunkStart = b.length;
  pushU16(0x0001); // type
  pushU16(headerSize); // headerSize
  pushU32(0); // size (filled later)
  pushU32(stringCount);
  pushU32(0); // styleCount
  pushU32(0); // flags (UTF-16)
  pushU32(stringsStart);
  pushU32(0); // stylesStart
  for (const off of offsets) pushU32(off);
  b.push(...stringData);
  const poolSize = b.length - poolChunkStart;
  b.splice(poolChunkStart + 4, 4); // remove size placeholder
  b.splice(poolChunkStart + 4, 0, ...u32Bytes(poolSize));

  // Start element chunk (type 0x0102).
  const startChunkStart = b.length;
  const attrs = [
    // android:minSdkVersion="26" (int dec)
    { ns: strIndex["android"]!, name: strIndex["minSdkVersion"]!, rawValue: 0xffffffff, dataType: 0x10, data: 26 },
    // package="com.example.target" (string)
    { ns: 0xffffffff, name: strIndex["com.example.target"]!, rawValue: strIndex["com.example.target"]!, dataType: 0x03, data: strIndex["com.example.target"]! },
  ];
  pushU16(0x0102); // type
  pushU16(16); // headerSize
  pushU32(0); // size (filled later)
  pushU32(1); // lineNumber
  pushU32(0xffffffff); // comment
  pushU32(0xffffffff); // ns (-1)
  pushU32(strIndex["manifest"]!); // name
  pushU16(20); // attributeStart
  pushU16(20); // attributeSize
  pushU16(attrs.length); // attributeCount
  pushU16(0); // idIndex
  pushU16(0); // classIndex
  pushU16(0); // styleIndex
  for (const a of attrs) {
    pushU32(a.ns);
    pushU32(a.name);
    pushU32(a.rawValue);
    pushU16(8); // valueSize
    pushU16(0); // res0
    pushU16(a.dataType);
    pushU32(a.data);
  }
  const startSize = b.length - startChunkStart;
  b.splice(startChunkStart + 4, 4, ...u32Bytes(startSize));

  // End element chunk (type 0x0103).
  const endChunkStart = b.length;
  pushU16(0x0103);
  pushU16(16);
  pushU32(24);
  pushU32(2); // lineNumber
  pushU32(0xffffffff); // comment
  const endSize = b.length - endChunkStart;
  b.splice(endChunkStart + 4, 4, ...u32Bytes(endSize));

  // Root XML chunk header (type 0x0003) wrapping everything.
  const root: number[] = [];
  const rootChunkStart = root.length;
  pushU16At(root, 0x0003, 0);
  pushU16At(root, 8, 2);
  const total = b.length + 8;
  root.splice(4, 0, ...u32Bytes(total));
  void rootChunkStart;
  return Buffer.from([...root, ...b]);
}

function u32Bytes(v: number): number[] {
  return [v & 0xff, (v >> 8) & 0xff, (v >> 16) & 0xff, (v >>> 24) & 0xff];
}

function pushU16At(buf: number[], v: number, at: number): void {
  buf.splice(at, 0, v & 0xff, (v >> 8) & 0xff);
}

describe("axml", () => {
  it("parses a synthetic binary manifest into an element tree", () => {
    const buf = buildBinaryManifest();
    const tree = parseBinaryXml(buf);
    expect(tree).toHaveLength(1);
    const manifest = tree[0]!;
    expect(manifest.tag).toBe("manifest");
    expect(manifest.attributes).toContainEqual({
      namespace: "android",
      name: "minSdkVersion",
      value: "26",
    });
    expect(manifest.attributes).toContainEqual({
      namespace: "",
      name: "com.example.target",
      value: "com.example.target",
    });
  });

  it("serializes the tree to XML text", () => {
    const xml = axmlToXml(parseBinaryXml(buildBinaryManifest()));
    expect(xml).toContain('<manifest android:minSdkVersion="26"');
    expect(xml).toContain("com.example.target");
  });

  it("rejects truncated input", () => {
    // A string-pool chunk header (type 0x0001) with no payload: reading the
    // pool body runs past EOF.
    expect(() =>
      parseBinaryXml(Buffer.from([0x01, 0x00, 0x1c, 0x00, 0x1c, 0x00, 0x00, 0x00])),
    ).toThrow(AXmlError);
  });
});
