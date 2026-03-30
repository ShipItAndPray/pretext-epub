import { describe, it, expect } from "vitest";
import { breakIntoPages } from "../../src/pagination/pageBreaker.js";
import type { MeasuredBlock } from "../../src/pagination/blockMeasurer.js";
import type { BlockStyle } from "../../src/types.js";

const style: BlockStyle = {
  fontFamily: "serif",
  fontSize: 16,
  fontWeight: 400,
  fontStyle: "normal",
  lineHeight: 1.5,
  marginTop: 0,
  marginBottom: 0,
  textIndent: 0,
  textAlign: "left",
};

function mb(blockIndex: number, lineCount: number): MeasuredBlock {
  const lineHeightPx = 24; // 16 * 1.5
  return {
    block: { type: "paragraph", text: "x", style },
    blockIndex,
    lineCount,
    contentHeight: lineCount * lineHeightPx,
    totalHeight: lineCount * lineHeightPx,
    lines: Array.from({ length: lineCount }, () => ({ text: "x", width: 100 })),
  };
}

describe("pageBreaker edge cases", () => {
  it("single line per page when pageHeight equals lineHeight", () => {
    const blocks = [mb(0, 5)];
    const { pages } = breakIntoPages(blocks, "ch1", 24, 1, 1);

    expect(pages.length).toBe(5);
    for (let i = 0; i < 5; i++) {
      expect(pages[i].blocks[0].startLine).toBe(i);
      expect(pages[i].blocks[0].endLine).toBe(i + 1);
    }
  });

  it("multiple blocks that each fit on one page", () => {
    // Each block is 3 lines = 72px. Page is 200px. Two blocks fit per page.
    const blocks = [mb(0, 3), mb(1, 3), mb(2, 3), mb(3, 3)];
    const { pages } = breakIntoPages(blocks, "ch1", 200, 2, 2);

    // 4 blocks * 72px = 288px. Page is 200px. Should be 2 pages.
    expect(pages.length).toBe(2);
  });

  it("returns empty pages array for empty input", () => {
    const { pages } = breakIntoPages([], "ch1", 800, 2, 2);
    expect(pages).toEqual([]);
  });

  it("handles a single very long block", () => {
    const blocks = [mb(0, 200)];
    const { pages } = breakIntoPages(blocks, "ch1", 240, 2, 2);

    // 200 lines * 24px = 4800px. Page 240px = 10 lines/page = 20 pages.
    expect(pages.length).toBe(20);

    // Verify contiguity
    let prevEnd = 0;
    for (const page of pages) {
      expect(page.blocks[0].startLine).toBe(prevEnd);
      prevEnd = page.blocks[0].endLine;
    }
    expect(prevEnd).toBe(200);
  });
});
