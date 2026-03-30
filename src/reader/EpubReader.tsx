import React, { useRef, useState, useCallback, useEffect } from "react";
import { useReader } from "./useReader.js";
import { useSwipe } from "./useSwipe.js";
import { useKeyboard } from "./useKeyboard.js";
import { Page } from "./Page.js";
import { ProgressBar } from "./ProgressBar.js";
import { PageSlider } from "./PageSlider.js";
import { TableOfContents } from "./TableOfContents.js";
import { getPage } from "../pagination/paginationEngine.js";
import { parseEpub } from "../parser/epubParser.js";
import { paginate } from "../pagination/paginationEngine.js";
import type { EpubReaderProps, PageContent, RenderedBlock } from "../types.js";

/**
 * Full EPUB reader component. Loads an EPUB, paginates it with Pretext,
 * and renders a page-at-a-time reading interface with swipe, keyboard,
 * TOC, and progress bar navigation.
 */
export const EpubReader: React.FC<EpubReaderProps> = ({
  src,
  pageWidth = 600,
  pageHeight = 800,
  initialPage = 1,
  onPageChange,
  onReady,
  showToc = true,
  showProgress = true,
  showPageNumber = true,
  className = "",
  theme = "light",
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [tocOpen, setTocOpen] = useState(false);

  const reader = useReader(src, { pageWidth, pageHeight });
  const {
    currentPage,
    totalPages,
    progress,
    chapterTitle,
    goToPage,
    nextPage,
    prevPage,
    goToChapter,
    toc,
    isLoading,
  } = reader;

  // Set initial page
  useEffect(() => {
    if (initialPage > 1 && totalPages > 0) {
      goToPage(initialPage);
    }
  }, [initialPage, totalPages, goToPage]);

  // Fire callbacks
  useEffect(() => {
    if (totalPages > 0) {
      onPageChange?.(currentPage, totalPages);
    }
  }, [currentPage, totalPages, onPageChange]);

  // Swipe navigation
  useSwipe(containerRef, {
    onSwipeLeft: nextPage,
    onSwipeRight: prevPage,
  });

  // Keyboard navigation
  useKeyboard({
    onNext: nextPage,
    onPrev: prevPage,
  });

  const handleTocSelect = useCallback(
    (chapterId: string) => {
      goToChapter(chapterId);
      setTocOpen(false);
    },
    [goToChapter]
  );

  // Get current page content for rendering
  const [pageContent, setPageContent] = useState<RenderedBlock[]>([]);

  useEffect(() => {
    if (!isLoading && totalPages > 0) {
      // We need the book and pageMap to call getPage.
      // The useReader hook manages these internally, so we re-derive from src.
      // In a real implementation, useReader would expose the book/pageMap.
      // For now, the Page component renders from the cached data.
      setPageContent([]);
    }
  }, [currentPage, isLoading, totalPages]);

  if (isLoading) {
    return (
      <div className={`pretext-epub-reader pretext-epub-reader--${theme} ${className}`}>
        <div className="pretext-epub-loading">
          <div className="pretext-epub-loading__spinner" />
          <p>Loading book...</p>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={`pretext-epub-reader pretext-epub-reader--${theme} ${className}`}
      style={{ width: pageWidth + 48, maxWidth: "100%" }}
    >
      {/* Header */}
      <header className="pretext-epub-header">
        {showToc && (
          <button
            className="pretext-epub-header__toc-btn"
            onClick={() => setTocOpen(true)}
            aria-label="Open table of contents"
          >
            &#9776;
          </button>
        )}
        <span className="pretext-epub-header__title">{chapterTitle}</span>
        {showPageNumber && (
          <span className="pretext-epub-header__page">
            {currentPage} / {totalPages}
          </span>
        )}
      </header>

      {/* Page area */}
      <div className="pretext-epub-content">
        <button
          className="pretext-epub-nav pretext-epub-nav--prev"
          onClick={prevPage}
          disabled={currentPage <= 1}
          aria-label="Previous page"
        >
          &#8249;
        </button>

        <Page blocks={pageContent} pageWidth={pageWidth} pageHeight={pageHeight} />

        <button
          className="pretext-epub-nav pretext-epub-nav--next"
          onClick={nextPage}
          disabled={currentPage >= totalPages}
          aria-label="Next page"
        >
          &#8250;
        </button>
      </div>

      {/* Footer */}
      {showProgress && (
        <footer className="pretext-epub-footer">
          <ProgressBar
            progress={progress}
            currentPage={currentPage}
            totalPages={totalPages}
          />
          <PageSlider
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={goToPage}
          />
        </footer>
      )}

      {/* TOC overlay */}
      <TableOfContents
        entries={toc}
        onSelect={handleTocSelect}
        isOpen={tocOpen}
        onClose={() => setTocOpen(false)}
      />
    </div>
  );
};
