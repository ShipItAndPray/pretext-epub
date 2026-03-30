// React reader component exports
export { EpubReader } from "./reader/EpubReader.js";
export { useReader } from "./reader/useReader.js";
export { Page } from "./reader/Page.js";
export { ProgressBar } from "./reader/ProgressBar.js";
export { PageSlider } from "./reader/PageSlider.js";
export { TableOfContents } from "./reader/TableOfContents.js";
export { useSwipe } from "./reader/useSwipe.js";
export { useKeyboard } from "./reader/useKeyboard.js";

// Re-export types needed for reader usage
export type {
  EpubReaderProps,
  UseReaderResult,
  PageMap,
  TocEntry,
} from "./types.js";
