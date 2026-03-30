// ─── EPUB Structure ───

export interface EpubBook {
  metadata: EpubMetadata;
  chapters: EpubChapter[];
  toc: TocEntry[];
  styles: EpubStyles;
}

export interface EpubMetadata {
  title: string;
  author: string;
  language: string;
  publisher?: string;
  date?: string;
  isbn?: string;
  cover?: ArrayBuffer;
}

export interface EpubChapter {
  id: string;
  title: string;
  content: TextBlock[];
  rawHtml: string;
}

export interface TextBlock {
  type: "paragraph" | "heading" | "image" | "list" | "blockquote" | "break";
  text?: string;
  level?: number;
  src?: ArrayBuffer;
  style: BlockStyle;
}

export interface BlockStyle {
  fontFamily: string;
  fontSize: number;
  fontWeight: number;
  fontStyle: "normal" | "italic";
  lineHeight: number;
  marginTop: number;
  marginBottom: number;
  textIndent: number;
  textAlign: "left" | "center" | "right" | "justify";
}

export interface EpubStyles {
  baseFontSize: number;
  baseFontFamily: string;
  baseLineHeight: number;
  stylesheets: string[];
}

export interface TocEntry {
  title: string;
  chapterId: string;
  pageNumber: number;
  children?: TocEntry[];
}

// ─── Pagination ───

export interface PaginationConfig {
  /** Available text width in pixels */
  pageWidth: number;
  /** Available text height in pixels */
  pageHeight: number;
  /** Minimum lines at top of page (default: 2) */
  widowMinLines?: number;
  /** Minimum lines at bottom of page (default: 2) */
  orphanMinLines?: number;
  /** Force new page for chapters (default: 'page') */
  chapterBreak?: "page" | "none";
  /** Font string for pretext (e.g. "16px serif") */
  font?: string;
}

export interface PageMap {
  totalPages: number;
  pages: PageInfo[];
  chapterPageRanges: ChapterPageRange[];
}

export interface ChapterPageRange {
  chapterId: string;
  startPage: number;
  endPage: number;
}

export interface PageInfo {
  /** 1-indexed page number */
  pageNumber: number;
  chapterId: string;
  blocks: PageBlockRef[];
}

export interface PageBlockRef {
  /** Index into chapter.content */
  blockIndex: number;
  /** First visible line of this block on this page */
  startLine: number;
  /** Last visible line of this block on this page (exclusive) */
  endLine: number;
}

export interface PageContent {
  pageNumber: number;
  chapterTitle: string;
  blocks: RenderedBlock[];
  /** 0-1 progress through entire book */
  progress: number;
}

export interface RenderedBlock {
  type: TextBlock["type"];
  lines: RenderedLine[];
  style: BlockStyle;
}

export interface RenderedLine {
  text: string;
  x: number;
  y: number;
  width: number;
}

// ─── React Reader ───

export interface EpubReaderProps {
  src: string | ArrayBuffer;
  pageWidth?: number;
  pageHeight?: number;
  initialPage?: number;
  onPageChange?: (page: number, total: number) => void;
  onReady?: (pageMap: PageMap) => void;
  showToc?: boolean;
  showProgress?: boolean;
  showPageNumber?: boolean;
  className?: string;
  theme?: "light" | "dark" | "sepia";
}

export interface UseReaderResult {
  currentPage: number;
  totalPages: number;
  progress: number;
  chapterTitle: string;
  goToPage: (page: number) => void;
  nextPage: () => void;
  prevPage: () => void;
  goToChapter: (chapterId: string) => void;
  toc: TocEntry[];
  isLoading: boolean;
}
