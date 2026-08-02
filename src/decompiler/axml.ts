/**
 * Minimal, dependency-free parser for binary Android XML (AXML) resource
 * chunks as found in compiled AndroidManifest.xml files inside an APK.
 *
 * Based on the public Android resource binary format specification:
 *   - ResChunk_header (frameworks/base/include/utils/ResourceTypes.h)
 *   - ResStringPool_header
 *   - ResXMLTree_node / ResXMLTree_attrExt
 *
 * Converts a binary manifest into plain XML text so that manifests can be
 * analyzed even before (or without) running apktool.
 */

const CHUNK_TYPES = {
  RES_XML_TYPE_ROOT: 0x0003,
  RES_XML_TYPE_STRING_POOL: 0x0001,
  RES_XML_TYPE_RESOURCE_MAP: 0x0180,
  RES_XML_TYPE_START_NAMESPACE: 0x0100,
  RES_XML_TYPE_END_NAMESPACE: 0x0101,
  RES_XML_TYPE_START_ELEMENT: 0x0102,
  RES_XML_TYPE_END_ELEMENT: 0x0103,
  RES_XML_TYPE_CDATA: 0x0104,
} as const;

const VALUE_TYPES = {
  TYPE_STRING: 0x03,
  TYPE_INT_DEC: 0x10,
  TYPE_INT_HEX: 0x11,
  TYPE_INT_BOOLEAN: 0x12,
} as const;

export class AXmlError extends Error {
  constructor(message: string) {
    super(`AXML parse error: ${message}`);
    this.name = "AXmlError";
  }
}

class ByteReader {
  readonly data: Buffer;
  private offset: number;

  constructor(data: Buffer) {
    this.data = data;
    this.offset = 0;
  }

  u8(): number {
    if (this.offset + 1 > this.data.length) throw new AXmlError("unexpected EOF in u8");
    const v = this.data[this.offset] ?? 0;
    this.offset += 1;
    return v;
  }

  u16(): number {
    if (this.offset + 2 > this.data.length) throw new AXmlError("unexpected EOF in u16");
    const v = this.data.readUInt16LE(this.offset);
    this.offset += 2;
    return v;
  }

  u32(): number {
    if (this.offset + 4 > this.data.length) throw new AXmlError("unexpected EOF in u32");
    const v = this.data.readUInt32LE(this.offset);
    this.offset += 4;
    return v;
  }

  i32(): number {
    return this.u32() | 0;
  }

  get position(): number {
    return this.offset;
  }

  skip(n: number): void {
    this.offset += n;
  }

  sub(length: number): Buffer {
    if (this.offset + length > this.data.length) throw new AXmlError("unexpected EOF in sub");
    const b = this.data.subarray(this.offset, this.offset + length);
    this.offset += length;
    return b;
  }
}

interface StringPool {
  strings: string[];
  get(index: number): string;
}

/**
 * Read a length field. A single byte is used when the value fits in 7 bits;
 * otherwise the high bit of the first byte is set and the value is
 * ((first & 0x7f) << 8) | second.
 */
function readLength(reader: ByteReader): number {
  const first = reader.u8();
  if (first & 0x80) {
    const second = reader.u8();
    return ((first & 0x7f) << 8) | second;
  }
  return first;
}

function parseStringPool(reader: ByteReader, chunkSize: number): StringPool {
  const chunkStart = reader.position - 8;
  const chunkEnd = chunkStart + chunkSize;
  const stringCount = reader.u32();
  const _styleCount = reader.u32();
  const flags = reader.u32();
  const stringsStart = reader.u32();
  const _stylesStart = reader.u32();
  const isUtf8 = (flags & 0x00000100) !== 0;
  const stringDataBase = chunkStart + stringsStart;

  const strings: string[] = [];
  const data = reader.data;

  for (let i = 0; i < stringCount; i++) {
    const rel = reader.u32();
    const abs = stringDataBase + rel;
    if (abs + 1 >= chunkEnd || abs >= data.length) {
      strings.push("");
      continue;
    }
    const sr = new ByteReader(data);
    sr.skip(abs);
    try {
      if (isUtf8) {
        const _utf16Len = readLength(sr);
        const utf8Len = readLength(sr);
        const raw = sr.sub(utf8Len);
        const s = raw.toString("utf8");
        strings.push(s.endsWith("\u0000") ? s.slice(0, -1) : s);
      } else {
        const utf16Len = readLength(sr);
        const raw = sr.sub(utf16Len * 2);
        const s = raw.toString("utf16le");
        strings.push(s.endsWith("\u0000") ? s.slice(0, -1) : s);
      }
    } catch {
      strings.push("");
    }
  }

  return {
    strings,
    get(index: number): string {
      if (index < 0 || index >= strings.length) return "";
      return strings[index] ?? "";
    },
  };
}

interface RawAttr {
  ns: number;
  name: number;
  rawValue: number;
  dataType: number;
  data: number;
}

export interface ParsedElement {
  tag: string;
  attributes: Array<{ namespace: string; name: string; value: string }>;
  children: ParsedElement[];
  depth: number;
}

/**
 * Parse a buffer containing a binary AXML manifest into a tree of elements.
 */
export function parseBinaryXml(buffer: Buffer): ParsedElement[] {
  const reader = new ByteReader(buffer);
  const root: ParsedElement[] = [];
  const stack: ParsedElement[] = [];
  let stringPool: StringPool = { strings: [], get: () => "" };

  let guard = 0;
  while (reader.position + 8 <= buffer.length && guard++ < 100000) {
    const chunkType = reader.u16();
    const headerSize = reader.u16();
    const chunkSize = reader.u32();
    // The chunk spans [chunkStart, chunkStart + chunkSize); the reader is
    // positioned right after the common 8-byte chunk header.
    const chunkStart = reader.position - 8;
    const chunkEnd = chunkStart + chunkSize;

    if (chunkSize < headerSize || headerSize < 8) {
      throw new AXmlError(`invalid chunk header (type=0x${chunkType.toString(16)})`);
    }

    // The root chunk (type 0x0003) is a transparent container whose size spans
    // the whole file; the string pool and element chunks live inside it. Never
    // skip past it or nothing would ever be parsed.
    const isRoot = chunkType === CHUNK_TYPES.RES_XML_TYPE_ROOT;

    switch (chunkType) {
      case CHUNK_TYPES.RES_XML_TYPE_STRING_POOL:
        stringPool = parseStringPool(reader, chunkSize);
        break;
      case CHUNK_TYPES.RES_XML_TYPE_START_ELEMENT: {
        reader.skip(8); // lineNumber + comment
        reader.u32(); // ns
        const name = reader.u32();
        reader.skip(2); // attributeStart
        reader.u16(); // attributeSize
        const attributeCount = reader.u16();
        reader.skip(6); // idIndex, classIndex, styleIndex
        const attrs: RawAttr[] = [];
        for (let i = 0; i < attributeCount; i++) {
          const aNs = reader.u32();
          const aName = reader.u32();
          const aRawValue = reader.u32();
          const valueSize = reader.u16();
          reader.u16(); // res0
          const dataType = reader.u16();
          const data = reader.i32();
          if (valueSize > 8) reader.skip(valueSize - 8);
          attrs.push({ ns: aNs, name: aName, rawValue: aRawValue, dataType, data });
        }
        const el: ParsedElement = {
          tag: stringPool.get(name),
          attributes: attrs.map((a) => ({
            namespace: stringPool.get(a.ns),
            name: stringPool.get(a.name),
            value: resolveAttrValue(a, stringPool),
          })),
          children: [],
          depth: stack.length,
        };
        if (stack.length === 0) root.push(el);
        else stack[stack.length - 1]?.children.push(el);
        stack.push(el);
        break;
      }
      case CHUNK_TYPES.RES_XML_TYPE_END_ELEMENT:
        reader.skip(8); // lineNumber + comment
        stack.pop();
        break;
      case CHUNK_TYPES.RES_XML_TYPE_START_NAMESPACE:
        reader.skip(8); // lineNumber + comment
        break;
      case CHUNK_TYPES.RES_XML_TYPE_END_NAMESPACE:
        reader.skip(8);
        break;
      default:
        break;
    }
    if (!isRoot) reader.skip(Math.max(0, chunkEnd - reader.position));
  }

  return root;
}

function resolveAttrValue(attr: RawAttr, pool: StringPool): string {
  switch (attr.dataType) {
    case VALUE_TYPES.TYPE_STRING:
      return pool.get(attr.data);
    case VALUE_TYPES.TYPE_INT_BOOLEAN:
      return attr.data !== 0 ? "true" : "false";
    case VALUE_TYPES.TYPE_INT_HEX:
      return `0x${(attr.data >>> 0).toString(16)}`;
    case VALUE_TYPES.TYPE_INT_DEC:
      return String(attr.data);
    default:
      if (attr.rawValue >= 0) {
        const raw = pool.get(attr.rawValue);
        if (raw) return raw;
      }
      return String(attr.data);
  }
}

/** Serialize a parsed AXML tree back to human-readable XML text. */
export function axmlToXml(tree: ParsedElement[], indent = 2): string {
  const lines: string[] = ['<?xml version="1.0" encoding="utf-8"?>'];
  const walk = (els: ParsedElement[], depth: number): void => {
    for (const el of els) {
      const pad = " ".repeat(depth * indent);
      const attrs = el.attributes
        .map((a) => {
          const nsPrefix = a.namespace ? a.namespace.split("/").pop() + ":" : "";
          return `${nsPrefix}${a.name}="${escapeXml(a.value)}"`;
        })
        .join(" ");
      const attrStr = attrs ? ` ${attrs}` : "";
      if (el.children.length === 0) {
        lines.push(`${pad}<${el.tag}${attrStr}/>`);
      } else {
        lines.push(`${pad}<${el.tag}${attrStr}>`);
        walk(el.children, depth + 1);
        lines.push(`${pad}</${el.tag}>`);
      }
    }
  };
  walk(tree, 0);
  return lines.join("\n");
}

function escapeXml(s: string): string {
  return s
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}
