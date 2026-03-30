import { XMLParser } from "fast-xml-parser";
import type { TextBlock, BlockStyle, EpubStyles } from "../types.js";

const xml = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
  textNodeName: "#text",
  preserveOrder: false,
  trimValues: false,
});

const DEFAULT_STYLE: BlockStyle = {
  fontFamily: "serif",
  fontSize: 16,
  fontWeight: 400,
  fontStyle: "normal",
  lineHeight: 1.5,
  marginTop: 0,
  marginBottom: 8,
  textIndent: 0,
  textAlign: "left",
};

const HEADING_SIZES: Record<number, number> = {
  1: 32,
  2: 28,
  3: 24,
  4: 20,
  5: 18,
  6: 16,
};

/**
 * Parse XHTML content into an array of TextBlocks with resolved styles.
 */
export function parseContent(
  rawHtml: string,
  styles: EpubStyles
): TextBlock[] {
  const blocks: TextBlock[] = [];

  try {
    const parsed = xml.parse(rawHtml);
    const html = parsed.html || parsed["xhtml:html"] || parsed;
    const body = html?.body || html?.["xhtml:body"];

    if (!body) return blocks;

    walkNode(body, blocks, styles);
  } catch {
    // Fallback: strip tags and treat as single paragraph
    const text = rawHtml.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
    if (text) {
      blocks.push({
        type: "paragraph",
        text,
        style: { ...DEFAULT_STYLE, fontFamily: styles.baseFontFamily },
      });
    }
  }

  return blocks;
}

function walkNode(
  node: unknown,
  blocks: TextBlock[],
  styles: EpubStyles
): void {
  if (node === null || node === undefined) return;

  if (typeof node === "string" || typeof node === "number") {
    const text = String(node).trim();
    if (text) {
      blocks.push({
        type: "paragraph",
        text,
        style: { ...DEFAULT_STYLE, fontFamily: styles.baseFontFamily },
      });
    }
    return;
  }

  if (typeof node !== "object") return;

  const obj = node as Record<string, unknown>;

  for (const [tag, value] of Object.entries(obj)) {
    if (tag.startsWith("@_") || tag === "#text") {
      if (tag === "#text") {
        const text = String(value).trim();
        if (text) {
          blocks.push({
            type: "paragraph",
            text,
            style: { ...DEFAULT_STYLE, fontFamily: styles.baseFontFamily },
          });
        }
      }
      continue;
    }

    const lowerTag = tag.toLowerCase();

    // Headings
    const headingMatch = lowerTag.match(/^h([1-6])$/);
    if (headingMatch) {
      const level = parseInt(headingMatch[1], 10);
      const text = extractTextContent(value);
      if (text) {
        blocks.push({
          type: "heading",
          text,
          level,
          style: {
            ...DEFAULT_STYLE,
            fontFamily: styles.baseFontFamily,
            fontSize: HEADING_SIZES[level] || 16,
            fontWeight: 700,
            marginTop: 16,
            marginBottom: 12,
          },
        });
      }
      continue;
    }

    // Paragraphs
    if (lowerTag === "p") {
      const items = ensureArray(value);
      for (const item of items) {
        const text = extractTextContent(item);
        if (text) {
          blocks.push({
            type: "paragraph",
            text,
            style: {
              ...DEFAULT_STYLE,
              fontFamily: styles.baseFontFamily,
              textIndent: 24,
            },
          });
        }
      }
      continue;
    }

    // Block quotes
    if (lowerTag === "blockquote") {
      const text = extractTextContent(value);
      if (text) {
        blocks.push({
          type: "blockquote",
          text,
          style: {
            ...DEFAULT_STYLE,
            fontFamily: styles.baseFontFamily,
            fontStyle: "italic",
            marginTop: 12,
            marginBottom: 12,
          },
        });
      }
      continue;
    }

    // Lists
    if (lowerTag === "ul" || lowerTag === "ol") {
      const items = extractListItems(value);
      for (const itemText of items) {
        blocks.push({
          type: "list",
          text: itemText,
          style: {
            ...DEFAULT_STYLE,
            fontFamily: styles.baseFontFamily,
            textIndent: 16,
          },
        });
      }
      continue;
    }

    // Images
    if (lowerTag === "img" || lowerTag === "image") {
      blocks.push({
        type: "image",
        style: { ...DEFAULT_STYLE, marginTop: 8, marginBottom: 8 },
      });
      continue;
    }

    // Horizontal rules
    if (lowerTag === "hr") {
      blocks.push({
        type: "break",
        style: { ...DEFAULT_STYLE, marginTop: 16, marginBottom: 16 },
      });
      continue;
    }

    // Divs, sections, etc: recurse
    if (
      lowerTag === "div" ||
      lowerTag === "section" ||
      lowerTag === "article" ||
      lowerTag === "main" ||
      lowerTag === "aside" ||
      lowerTag === "nav" ||
      lowerTag === "header" ||
      lowerTag === "footer" ||
      lowerTag === "figure" ||
      lowerTag === "figcaption"
    ) {
      const items = ensureArray(value);
      for (const item of items) {
        walkNode(item, blocks, styles);
      }
      continue;
    }

    // Skip style, script, link, meta tags
    if (
      lowerTag === "style" ||
      lowerTag === "script" ||
      lowerTag === "link" ||
      lowerTag === "meta" ||
      lowerTag === "head" ||
      lowerTag === "title"
    ) {
      continue;
    }

    // Everything else: try to extract text
    const items = ensureArray(value);
    for (const item of items) {
      if (typeof item === "object" && item !== null) {
        walkNode(item, blocks, styles);
      } else {
        const text = String(item).trim();
        if (text) {
          blocks.push({
            type: "paragraph",
            text,
            style: { ...DEFAULT_STYLE, fontFamily: styles.baseFontFamily },
          });
        }
      }
    }
  }
}

function extractTextContent(node: unknown): string {
  if (node === null || node === undefined) return "";
  if (typeof node === "string") return node.trim();
  if (typeof node === "number") return String(node);
  if (typeof node !== "object") return "";

  const parts: string[] = [];

  if (Array.isArray(node)) {
    for (const item of node) {
      parts.push(extractTextContent(item));
    }
  } else {
    const obj = node as Record<string, unknown>;
    for (const [key, val] of Object.entries(obj)) {
      if (key.startsWith("@_")) continue;
      if (key === "#text") {
        parts.push(String(val));
      } else {
        parts.push(extractTextContent(val));
      }
    }
  }

  return parts.join(" ").replace(/\s+/g, " ").trim();
}

function extractListItems(node: unknown): string[] {
  const items: string[] = [];
  if (!node || typeof node !== "object") return items;

  const obj = node as Record<string, unknown>;
  const liNodes = obj["li"] || obj["LI"];
  if (!liNodes) return items;

  for (const li of ensureArray(liNodes)) {
    const text = extractTextContent(li);
    if (text) items.push(text);
  }

  return items;
}

function ensureArray<T>(val: T | T[] | undefined): T[] {
  if (val === undefined || val === null) return [];
  return Array.isArray(val) ? val : [val];
}
