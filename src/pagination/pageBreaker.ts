import type { MeasuredBlock } from "./blockMeasurer.js";
import type { PageBlockRef } from "../types.js";

export interface PageBreak {
  blocks: PageBlockRef[];
  /** Actual filled height of this page */
  filledHeight: number;
}

/**
 * Break a sequence of measured blocks into pages with widow/orphan control.
 *
 * Algorithm:
 * - Accumulate block heights on the current page.
 * - When adding a block would exceed pageHeight, split the block at a line boundary.
 * - If the split would leave fewer than `orphanMinLines` on the current page
 *   or fewer than `widowMinLines` on the next page, adjust the break point.
 */
export function breakIntoPages(
  measuredBlocks: MeasuredBlock[],
  chapterId: string,
  pageHeight: number,
  widowMinLines: number,
  orphanMinLines: number,
  startingHeight: number = 0
): { pages: PageBreak[]; remainingHeight: number } {
  const pages: PageBreak[] = [];
  let currentBlocks: PageBlockRef[] = [];
  let currentHeight = startingHeight;

  for (const mb of measuredBlocks) {
    if (mb.lineCount === 0 && mb.totalHeight === 0) continue;

    const blockMarginTop = currentHeight === 0 ? 0 : mb.block.style.marginTop;
    const lineHeightPx = mb.block.style.fontSize * mb.block.style.lineHeight;

    // Can the entire block fit on the current page?
    const spaceLeft = pageHeight - currentHeight - blockMarginTop;

    if (mb.totalHeight - blockMarginTop <= spaceLeft + 0.1) {
      // Whole block fits
      currentBlocks.push({
        blockIndex: mb.blockIndex,
        startLine: 0,
        endLine: mb.lineCount,
      });
      currentHeight += blockMarginTop + mb.contentHeight + mb.block.style.marginBottom;
      continue;
    }

    // Block doesn't fit entirely. Need to split at a line boundary.
    if (mb.lineCount <= 1) {
      // Single-line block or image: push to next page
      if (currentBlocks.length > 0) {
        pages.push({ blocks: currentBlocks, filledHeight: currentHeight });
        currentBlocks = [];
        currentHeight = 0;
      }
      currentBlocks.push({
        blockIndex: mb.blockIndex,
        startLine: 0,
        endLine: mb.lineCount,
      });
      currentHeight = mb.contentHeight + mb.block.style.marginBottom;
      continue;
    }

    // Multi-line block: find the best split line
    let linesOnCurrentPage = Math.floor(spaceLeft / lineHeightPx);

    // Orphan control: don't leave fewer than orphanMinLines at bottom of page
    if (linesOnCurrentPage > 0 && linesOnCurrentPage < orphanMinLines) {
      linesOnCurrentPage = 0; // Push entire block to next page
    }

    // Widow control: don't leave fewer than widowMinLines at top of next page
    const linesOnNextPage = mb.lineCount - linesOnCurrentPage;
    if (linesOnNextPage > 0 && linesOnNextPage < widowMinLines) {
      // Pull lines back from current page to give next page enough
      linesOnCurrentPage = Math.max(0, mb.lineCount - widowMinLines);
      if (linesOnCurrentPage < orphanMinLines && linesOnCurrentPage > 0) {
        linesOnCurrentPage = 0;
      }
    }

    if (linesOnCurrentPage > 0) {
      // Split: some lines on current page
      currentBlocks.push({
        blockIndex: mb.blockIndex,
        startLine: 0,
        endLine: linesOnCurrentPage,
      });
      currentHeight += blockMarginTop + linesOnCurrentPage * lineHeightPx;
      pages.push({ blocks: currentBlocks, filledHeight: currentHeight });

      // Remaining lines on new page
      currentBlocks = [
        {
          blockIndex: mb.blockIndex,
          startLine: linesOnCurrentPage,
          endLine: mb.lineCount,
        },
      ];
      currentHeight =
        (mb.lineCount - linesOnCurrentPage) * lineHeightPx +
        mb.block.style.marginBottom;
    } else {
      // Entire block goes to next page
      if (currentBlocks.length > 0) {
        pages.push({ blocks: currentBlocks, filledHeight: currentHeight });
      }
      currentBlocks = [
        {
          blockIndex: mb.blockIndex,
          startLine: 0,
          endLine: mb.lineCount,
        },
      ];
      currentHeight = mb.contentHeight + mb.block.style.marginBottom;
    }

    // If the remaining lines still don't fit on a single page, keep splitting
    while (currentHeight > pageHeight + 0.1 && currentBlocks.length === 1) {
      const ref = currentBlocks[0];
      const remainingLines = ref.endLine - ref.startLine;
      const fittingLines = Math.max(1, Math.floor(pageHeight / lineHeightPx));

      if (fittingLines >= remainingLines) break;

      pages.push({
        blocks: [
          {
            blockIndex: ref.blockIndex,
            startLine: ref.startLine,
            endLine: ref.startLine + fittingLines,
          },
        ],
        filledHeight: fittingLines * lineHeightPx,
      });

      currentBlocks = [
        {
          blockIndex: ref.blockIndex,
          startLine: ref.startLine + fittingLines,
          endLine: ref.endLine,
        },
      ];
      currentHeight =
        (ref.endLine - ref.startLine - fittingLines) * lineHeightPx +
        mb.block.style.marginBottom;
    }
  }

  // Don't forget the last page
  if (currentBlocks.length > 0) {
    pages.push({ blocks: currentBlocks, filledHeight: currentHeight });
  }

  return {
    pages,
    remainingHeight: currentBlocks.length > 0 ? currentHeight : 0,
  };
}
