import { useState, useEffect, useCallback, useRef } from "react";
import { parseEpub } from "../parser/epubParser.js";
import { paginate, getPage } from "../pagination/paginationEngine.js";
import type {
  EpubBook,
  PaginationConfig,
  PageMap,
  PageContent,
  TocEntry,
  UseReaderResult,
} from "../types.js";

/**
 * Core reader state management hook. Loads an EPUB, paginates it,
 * and provides page navigation methods.
 */
export function useReader(
  src: string | ArrayBuffer,
  config?: Partial<PaginationConfig>
): UseReaderResult {
  const [book, setBook] = useState<EpubBook | null>(null);
  const [pageMap, setPageMap] = useState<PageMap | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const bookRef = useRef<EpubBook | null>(null);
  const pageMapRef = useRef<PageMap | null>(null);

  // Load and paginate
  useEffect(() => {
    let cancelled = false;

    async function load() {
      setIsLoading(true);

      let data: ArrayBuffer;
      if (typeof src === "string") {
        const response = await fetch(src);
        data = await response.arrayBuffer();
      } else {
        data = src;
      }

      if (cancelled) return;

      const parsedBook = await parseEpub(data);
      if (cancelled) return;

      const paginationConfig: PaginationConfig = {
        pageWidth: config?.pageWidth ?? 600,
        pageHeight: config?.pageHeight ?? 800,
        widowMinLines: config?.widowMinLines ?? 2,
        orphanMinLines: config?.orphanMinLines ?? 2,
        chapterBreak: config?.chapterBreak ?? "page",
      };

      const map = paginate(parsedBook, paginationConfig);

      if (cancelled) return;

      bookRef.current = parsedBook;
      pageMapRef.current = map;
      setBook(parsedBook);
      setPageMap(map);
      setIsLoading(false);
    }

    load().catch((err) => {
      console.error("Failed to load EPUB:", err);
      if (!cancelled) setIsLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [src, config?.pageWidth, config?.pageHeight]);

  const goToPage = useCallback(
    (page: number) => {
      if (!pageMapRef.current) return;
      const clamped = Math.max(1, Math.min(page, pageMapRef.current.totalPages));
      setCurrentPage(clamped);
    },
    []
  );

  const nextPage = useCallback(() => {
    setCurrentPage((p) => {
      if (!pageMapRef.current) return p;
      return Math.min(p + 1, pageMapRef.current.totalPages);
    });
  }, []);

  const prevPage = useCallback(() => {
    setCurrentPage((p) => Math.max(1, p - 1));
  }, []);

  const goToChapter = useCallback(
    (chapterId: string) => {
      if (!pageMapRef.current) return;
      const range = pageMapRef.current.chapterPageRanges.find(
        (r) => r.chapterId === chapterId
      );
      if (range) {
        setCurrentPage(range.startPage);
      }
    },
    []
  );

  // Get current page content
  let chapterTitle = "";
  let progress = 0;

  if (book && pageMap && currentPage >= 1 && currentPage <= pageMap.totalPages) {
    try {
      const content = getPage(book, pageMap, currentPage);
      chapterTitle = content.chapterTitle;
      progress = content.progress;
    } catch {
      // Silently handle
    }
  }

  // Build TOC with page numbers
  const toc: TocEntry[] = book?.toc ?? [];
  if (pageMap) {
    fillTocPageNumbers(toc, pageMap);
  }

  return {
    currentPage,
    totalPages: pageMap?.totalPages ?? 0,
    progress,
    chapterTitle,
    goToPage,
    nextPage,
    prevPage,
    goToChapter,
    toc,
    isLoading,
  };
}

function fillTocPageNumbers(entries: TocEntry[], pageMap: PageMap): void {
  for (const entry of entries) {
    const range = pageMap.chapterPageRanges.find(
      (r) => r.chapterId === entry.chapterId
    );
    if (range) {
      entry.pageNumber = range.startPage;
    }
    if (entry.children) {
      fillTocPageNumbers(entry.children, pageMap);
    }
  }
}
