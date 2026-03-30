import { describe, it, expect, vi } from "vitest";
import { breakIntoPages } from "../../src/pagination/pageBreaker.js";
import type { MeasuredBlock } from "../../src/pagination/blockMeasurer.js";
import type { TextBlock, BlockStyle } from "../../src/types.js";

const defaultStyle: BlockStyle = {
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

function makeBlock(text: string, style?: Partial<BlockStyle>): TextBlock {
  return {
    type: "paragraph",
    text,
    style: { ...defaultStyle, ...style },
  };
}

function makeMeasured(
  blockIndex: number,
  lineCount: number,
  style?: Partial<BlockStyle>
): MeasuredBlock {
  const block = makeBlock("x".repeat(100), style);
  const lineHeightPx = block.style.fontSize * block.style.lineHeight;
  const contentHeight = lineCount * lineHeightPx;
  return {
    block,
    blockIndex,
    lineCount,
    contentHeight,
    totalHeight: contentHeight + block.style.marginTop + block.style.marginBottom,
    lines: Array.from({ length: lineCount }, (_, i) => ({
      text: `line ${i}`,
      width: 400,
    })),
  };
}

describe("breakIntoPages", () => {
  const lineHeight = 16 * 1.5; // 24px

  it("fits blocks on a single page", () => {
    // 5 lines * 24px = 120px + 8px margin = 128px. Page is 800px.
    const blocks = [makeMeasured(0, 5)];
    const { pages } = breakIntoPages(blocks, "ch1", 800, 2, 2);

    expect(pages.length).toBe(1);
    expect(pages[0].blocks[0].startLine).toBe(0);
    expect(pages[0].blocks[0].endLine).toBe(5);
  });

  it("splits a long block across pages", () => {
    // 50 lines * 24px = 1200px. Page is 800px (~33 lines per page).
    const blocks = [makeMeasured(0, 50)];
    const { pages } = breakIntoPages(blocks, "ch1", 800, 2, 2);

    expect(pages.length).toBeGreaterThan(1);

    // All lines should be covered across pages
    let totalLines = 0;
    for (const page of pages) {
      for (const ref of page.blocks) {
        totalLines += ref.endLine - ref.startLine;
      }
    }
    expect(totalLines).toBe(50);
  });

  it("creates multiple pages for many blocks", () => {
    // 10 blocks of 10 lines = 100 lines * 24px = 2400px. Page is 800px.
    const blocks = Array.from({ length: 10 }, (_, i) => makeMeasured(i, 10));
    const { pages } = breakIntoPages(blocks, "ch1", 800, 2, 2);

    expect(pages.length).toBeGreaterThan(1);

    // Verify all blocks are accounted for
    const blocksSeen = new Set<number>();
    for (const page of pages) {
      for (const ref of page.blocks) {
        blocksSeen.add(ref.blockIndex);
      }
    }
    expect(blocksSeen.size).toBe(10);
  });

  it("handles empty blocks", () => {
    const blocks = [
      {
        block: makeBlock(""),
        blockIndex: 0,
        lineCount: 0,
        contentHeight: 0,
        totalHeight: 0,
        lines: [],
      } satisfies MeasuredBlock,
    ];
    const { pages } = breakIntoPages(blocks, "ch1", 800, 2, 2);
    expect(pages.length).toBe(0);
  });

  it("enforces widow control", () => {
    // Create a scenario where a long block must split across pages.
    // 40 lines * 24px = 960px on an 800px page -> ~33 lines fit.
    // The remaining 7 lines go to the next page, which is >= widowMinLines.
    // With a single huge block of 35 lines on a 816px page (34 lines),
    // 1 line would be widowed. The breaker should pull back to give 2+ lines.
    const blocks = [makeMeasured(0, 35)];
    // 34 lines * 24px = 816px exactly fits. That leaves 1 line on next page.
    // Widow control should adjust so next page gets >= 2 lines.
    const { pages } = breakIntoPages(blocks, "ch1", 816, 2, 2);

    // Verify: any continuation block on a page has >= 2 lines
    for (const page of pages) {
      for (const ref of page.blocks) {
        const linesOnThisPage = ref.endLine - ref.startLine;
        if (linesOnThisPage > 0 && ref.startLine > 0) {
          // This is a continuation from a previous page
          expect(linesOnThisPage).toBeGreaterThanOrEqual(2);
        }
      }
    }
  });

  it("enforces orphan control", () => {
    const blocks = [
      makeMeasured(0, 32), // fills page exactly
      makeMeasured(1, 10), // next block
    ];
    const { pages } = breakIntoPages(blocks, "ch1", 800, 2, 2);

    // Verify no page ends with just 1 line of a new block
    for (const page of pages) {
      const lastRef = page.blocks[page.blocks.length - 1];
      if (lastRef.endLine < 10 && lastRef.startLine === 0) {
        // This block was split - check orphan lines
        const linesOnThisPage = lastRef.endLine - lastRef.startLine;
        expect(linesOnThisPage).toBeGreaterThanOrEqual(2);
      }
    }
  });

  it("page access is O(1) via array index", () => {
    const blocks = Array.from({ length: 20 }, (_, i) => makeMeasured(i, 15));
    const { pages } = breakIntoPages(blocks, "ch1", 800, 2, 2);

    // Direct access by index
    const page1 = pages[0];
    const lastPage = pages[pages.length - 1];

    expect(page1.blocks.length).toBeGreaterThan(0);
    expect(lastPage.blocks.length).toBeGreaterThan(0);

    // Measure access time
    const start = performance.now();
    for (let i = 0; i < 10000; i++) {
      const _page = pages[i % pages.length];
    }
    const elapsed = performance.now() - start;

    // 10000 accesses should be well under 10ms (O(1))
    expect(elapsed).toBeLessThan(10);
  });
});

describe("page break positions", () => {
  const lineHeight = 16 * 1.5; // 24px

  it("first page starts at line 0", () => {
    const blocks = [makeMeasured(0, 50)];
    const { pages } = breakIntoPages(blocks, "ch1", 800, 2, 2);

    expect(pages[0].blocks[0].startLine).toBe(0);
  });

  it("page breaks are contiguous (no gaps or overlaps)", () => {
    const blocks = [makeMeasured(0, 100)];
    const { pages } = breakIntoPages(blocks, "ch1", 800, 2, 2);

    for (let i = 1; i < pages.length; i++) {
      const prevRef = pages[i - 1].blocks[pages[i - 1].blocks.length - 1];
      const currRef = pages[i].blocks[0];

      if (prevRef.blockIndex === currRef.blockIndex) {
        // Same block split across pages: end of prev = start of next
        expect(prevRef.endLine).toBe(currRef.startLine);
      }
    }
  });

  it("last page ends at the last line", () => {
    const blocks = [makeMeasured(0, 50)];
    const { pages } = breakIntoPages(blocks, "ch1", 800, 2, 2);

    const lastPage = pages[pages.length - 1];
    const lastRef = lastPage.blocks[lastPage.blocks.length - 1];
    expect(lastRef.endLine).toBe(50);
  });
});

describe("jump-to-page", () => {
  it("returns correct page via direct index", () => {
    const blocks = Array.from({ length: 30 }, (_, i) => makeMeasured(i, 8));
    const { pages } = breakIntoPages(blocks, "ch1", 800, 2, 2);

    // Jump to page 3 (index 2) directly
    const page3 = pages[2];
    expect(page3).toBeDefined();
    expect(page3.blocks.length).toBeGreaterThan(0);

    // Jump to last page
    const lastPage = pages[pages.length - 1];
    expect(lastPage).toBeDefined();
    expect(lastPage.blocks.length).toBeGreaterThan(0);
  });

  it("page jumps take constant time regardless of page number", () => {
    const blocks = Array.from({ length: 100 }, (_, i) => makeMeasured(i, 10));
    const { pages } = breakIntoPages(blocks, "ch1", 800, 2, 2);

    // Time accessing first page vs last page
    const iterations = 50000;

    const startFirst = performance.now();
    for (let i = 0; i < iterations; i++) {
      const _p = pages[0];
    }
    const timeFirst = performance.now() - startFirst;

    const startLast = performance.now();
    for (let i = 0; i < iterations; i++) {
      const _p = pages[pages.length - 1];
    }
    const timeLast = performance.now() - startLast;

    // Both should be near-instant; ratio should be close to 1
    const ratio = Math.max(timeFirst, timeLast) / Math.max(Math.min(timeFirst, timeLast), 0.001);
    expect(ratio).toBeLessThan(5); // generous margin for GC jitter
  });
});
