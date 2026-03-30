// Engine-only exports (no React dependency)
export { parseEpub } from "./parser/epubParser.js";
export { paginate, getPage } from "./pagination/paginationEngine.js";

export type {
  EpubBook,
  EpubMetadata,
  EpubChapter,
  TextBlock,
  BlockStyle,
  EpubStyles,
  TocEntry,
  PaginationConfig,
  PageMap,
  PageInfo,
  PageBlockRef,
  PageContent,
  RenderedBlock,
  RenderedLine,
  ChapterPageRange,
} from "./types.js";
