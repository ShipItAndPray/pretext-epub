import {
  prepareWithSegments,
  layoutWithLines,
} from "@chenglou/pretext";
import type {
  EpubBook,
  PaginationConfig,
  PageMap,
  PageInfo,
  PageContent,
  RenderedBlock,
  TextBlock,
} from "../types.js";
import { measureBlock, type MeasuredBlock } from "./blockMeasurer.js";
import { breakIntoPages } from "./pageBreaker.js";

/**
 * Paginate an entire book. Pre-computes every page break using @chenglou/pretext
 * for exact line-level text measurement. After this call, any page can be
 * accessed in O(1) via `getPage()`.
 */
export function paginate(book: EpubBook, config: PaginationConfig): PageMap {
  const {
    pageWidth,
    pageHeight,
    widowMinLines = 2,
    orphanMinLines = 2,
    chapterBreak = "page",
  } = config;

  const allPages: PageInfo[] = [];
  const chapterPageRanges: PageMap["chapterPageRanges"] = [];

  let pageNumber = 1;

  for (const chapter of book.chapters) {
    // Force chapter break
    if (chapterBreak === "page" && allPages.length > 0) {
      // Start new page for new chapter (already implied since we process per-chapter)
    }

    const startPage = pageNumber;

    // 1. Measure all blocks in this chapter
    const measuredBlocks: MeasuredBlock[] = chapter.content.map(
      (block, idx) =>
        measureBlock(
          block,
          idx,
          pageWidth,
          (text, font) => prepareWithSegments(text, font),
          (prepared, maxWidth, lineHeight) =>
            layoutWithLines(prepared as ReturnType<typeof prepareWithSegments>, maxWidth, lineHeight)
        )
    );

    // 2. Break into pages
    const { pages } = breakIntoPages(
      measuredBlocks,
      chapter.id,
      pageHeight,
      widowMinLines,
      orphanMinLines
    );

    // 3. Record pages
    for (const page of pages) {
      allPages.push({
        pageNumber,
        chapterId: chapter.id,
        blocks: page.blocks,
      });
      pageNumber++;
    }

    // Ensure at least one page per chapter
    if (pages.length === 0) {
      allPages.push({
        pageNumber,
        chapterId: chapter.id,
        blocks: [],
      });
      pageNumber++;
    }

    chapterPageRanges.push({
      chapterId: chapter.id,
      startPage,
      endPage: pageNumber - 1,
    });
  }

  return {
    totalPages: allPages.length,
    pages: allPages,
    chapterPageRanges,
  };
}

/**
 * Get the content for a specific page. O(1) array lookup.
 */
export function getPage(
  book: EpubBook,
  pageMap: PageMap,
  pageNumber: number
): PageContent {
  const idx = pageNumber - 1;
  if (idx < 0 || idx >= pageMap.pages.length) {
    throw new RangeError(
      `Page ${pageNumber} out of range (1-${pageMap.totalPages})`
    );
  }

  const pageInfo = pageMap.pages[idx];
  const chapter = book.chapters.find((c) => c.id === pageInfo.chapterId);
  if (!chapter) {
    throw new Error(`Chapter ${pageInfo.chapterId} not found`);
  }

  const blocks: RenderedBlock[] = pageInfo.blocks.map((ref) => {
    const textBlock = chapter.content[ref.blockIndex];
    if (!textBlock) {
      return {
        type: "paragraph" as const,
        lines: [],
        style: chapter.content[0]?.style || ({} as TextBlock["style"]),
      };
    }

    const lines = getBlockLines(textBlock, ref.startLine, ref.endLine, pageMap.pages[idx]);

    return {
      type: textBlock.type,
      lines,
      style: textBlock.style,
    };
  });

  return {
    pageNumber,
    chapterTitle: chapter.title,
    blocks,
    progress: pageNumber / pageMap.totalPages,
  };
}

/**
 * Extract specific lines from a text block for rendering.
 */
function getBlockLines(
  block: TextBlock,
  startLine: number,
  endLine: number,
  _pageInfo: PageInfo
): RenderedBlock["lines"] {
  if (!block.text) return [];

  const font = buildFont(block.style);
  const lineHeightPx = block.style.fontSize * block.style.lineHeight;

  try {
    const prepared = prepareWithSegments(block.text, font);
    const result = layoutWithLines(prepared, 600, lineHeightPx);

    const sliced = result.lines.slice(startLine, endLine);
    let y = 0;

    return sliced.map((line) => {
      const renderedLine = {
        text: line.text,
        x: startLine === 0 ? block.style.textIndent : 0,
        y,
        width: line.width,
      };
      y += lineHeightPx;
      return renderedLine;
    });
  } catch {
    // Fallback: just return the text as a single line
    return [
      {
        text: block.text || "",
        x: 0,
        y: 0,
        width: 0,
      },
    ];
  }
}

function buildFont(style: TextBlock["style"]): string {
  const parts: string[] = [];
  if (style.fontStyle === "italic") parts.push("italic");
  if (style.fontWeight !== 400) parts.push(String(style.fontWeight));
  parts.push(`${style.fontSize}px`);
  parts.push(style.fontFamily);
  return parts.join(" ");
}
