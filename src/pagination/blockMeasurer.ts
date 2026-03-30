import type { TextBlock, BlockStyle } from "../types.js";

/**
 * Result of measuring a text block: how many lines it takes and
 * the per-line text content for rendering.
 */
export interface MeasuredBlock {
  block: TextBlock;
  blockIndex: number;
  lineCount: number;
  /** Height of the block content in pixels (lines * lineHeight) */
  contentHeight: number;
  /** Total height including margins */
  totalHeight: number;
  /** Individual line texts (for rendering and page splitting) */
  lines: MeasuredLine[];
}

export interface MeasuredLine {
  text: string;
  width: number;
}

/**
 * Measure a text block to determine how many lines it occupies at a given width.
 *
 * Uses @chenglou/pretext for exact line break computation. The `prepare` function
 * computes glyph widths, and `layoutWithLines` determines exact line breaks.
 * This gives us the same results as actual rendering without needing a DOM.
 */
export function measureBlock(
  block: TextBlock,
  blockIndex: number,
  pageWidth: number,
  prepare: (text: string, font: string) => unknown,
  layoutWithLines: (
    prepared: unknown,
    maxWidth: number,
    lineHeight: number
  ) => { lineCount: number; height: number; lines: Array<{ text: string; width: number }> }
): MeasuredBlock {
  if (block.type === "break") {
    return {
      block,
      blockIndex,
      lineCount: 0,
      contentHeight: 0,
      totalHeight: block.style.marginTop + block.style.marginBottom,
      lines: [],
    };
  }

  if (block.type === "image") {
    // Images: approximate as a fixed-height block
    const imageHeight = 200;
    return {
      block,
      blockIndex,
      lineCount: 1,
      contentHeight: imageHeight,
      totalHeight: imageHeight + block.style.marginTop + block.style.marginBottom,
      lines: [{ text: "[image]", width: pageWidth }],
    };
  }

  const text = block.text || "";
  if (!text) {
    return {
      block,
      blockIndex,
      lineCount: 0,
      contentHeight: 0,
      totalHeight: 0,
      lines: [],
    };
  }

  const font = buildFontString(block.style);
  const effectiveWidth = pageWidth - block.style.textIndent;
  const lineHeightPx = block.style.fontSize * block.style.lineHeight;

  const prepared = prepare(text, font);
  const result = layoutWithLines(prepared, effectiveWidth, lineHeightPx);

  return {
    block,
    blockIndex,
    lineCount: result.lineCount,
    contentHeight: result.height,
    totalHeight: result.height + block.style.marginTop + block.style.marginBottom,
    lines: result.lines.map((l) => ({ text: l.text, width: l.width })),
  };
}

/**
 * Build a CSS font string from a BlockStyle for use with @chenglou/pretext.
 */
export function buildFontString(style: BlockStyle): string {
  const parts: string[] = [];
  if (style.fontStyle === "italic") parts.push("italic");
  if (style.fontWeight !== 400) parts.push(String(style.fontWeight));
  parts.push(`${style.fontSize}px`);
  parts.push(style.fontFamily);
  return parts.join(" ");
}
