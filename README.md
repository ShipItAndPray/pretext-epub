# @shipitandpray/pretext-epub

[![Live Demo](https://img.shields.io/badge/demo-live-brightgreen)](https://shipitandpray.github.io/pretext-epub/) [![GitHub](https://img.shields.io/github/stars/ShipItAndPray/pretext-epub?style=social)](https://github.com/ShipItAndPray/pretext-epub)

> **[View Live Demo](https://shipitandpray.github.io/pretext-epub/)**

[![npm version](https://img.shields.io/npm/v/@shipitandpray/pretext-epub.svg)](https://www.npmjs.com/package/@shipitandpray/pretext-epub)
[![bundle size](https://img.shields.io/bundlephobia/minzip/@shipitandpray/pretext-epub)](https://bundlephobia.com/package/@shipitandpray/pretext-epub)

EPUB pagination engine with instant page jumps and accurate progress tracking. Powered by [@chenglou/pretext](https://github.com/chenglou/pretext) for exact page break computation.

## The Problem

Every major EPUB reader (epub.js, Readium, Foliate) uses CSS multi-column layout for pagination. This approach has fundamental limitations:

| Issue | CSS Columns | pretext-epub |
|---|---|---|
| **Jump to page N** | O(n) -- must render all pages before N | O(1) -- direct array lookup |
| **Progress bar accuracy** | Approximate until all content rendered | Exact from the start |
| **Widow/orphan control** | None (CSS `break-inside` is unreliable) | Full control (configurable min lines) |
| **Time to know total pages** | Seconds (must layout entire book) | < 150ms (computed from text metrics) |
| **Repagination on resize** | Slow (re-layout everything) | Fast (recompute line breaks only) |

CSS columns treat pagination as a rendering problem. pretext-epub treats it as a **text measurement** problem. By using [@chenglou/pretext](https://github.com/chenglou/pretext) to compute exact line breaks from font metrics, we know every page boundary before rendering a single pixel.

## Comparison

| Feature | pretext-epub | epub.js | Readium |
|---|:---:|:---:|:---:|
| O(1) page jump | Yes | No | No |
| Exact progress from start | Yes | No | No |
| Widow/orphan control | Yes | No | Partial |
| No DOM rendering for pagination | Yes | No | No |
| React component | Yes | No | Yes |
| EPUB 2.0 + 3.0 | Yes | Yes | Yes |
| Bundle size | ~45KB | ~200KB | ~400KB |

## Quick Start

### Engine only (no React)

```ts
import { parseEpub, paginate, getPage } from '@shipitandpray/pretext-epub';

// Load EPUB
const response = await fetch('/books/moby-dick.epub');
const data = await response.arrayBuffer();

// Parse and paginate
const book = await parseEpub(data);
const pageMap = paginate(book, { pageWidth: 600, pageHeight: 800 });

console.log(`Total pages: ${pageMap.totalPages}`);
// -> "Total pages: 427"

// Jump to any page instantly (O(1))
const page42 = getPage(book, pageMap, 42);
console.log(page42.chapterTitle);  // "Chapter 10: A Bosom Friend"
console.log(page42.progress);      // 0.098 (9.8% through book)
```

### React Reader Component

```tsx
import { EpubReader } from '@shipitandpray/pretext-epub/reader';
import '@shipitandpray/pretext-epub/css';

function BookReader() {
  return (
    <EpubReader
      src="/books/moby-dick.epub"
      theme="sepia"
      showToc
      showProgress
      onPageChange={(page, total) => {
        console.log(`Page ${page} of ${total}`);
      }}
    />
  );
}
```

### useReader Hook

```tsx
import { useReader } from '@shipitandpray/pretext-epub/reader';

function CustomReader({ epubUrl }) {
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
  } = useReader(epubUrl, { pageWidth: 600, pageHeight: 800 });

  if (isLoading) return <div>Loading...</div>;

  return (
    <div>
      <h2>{chapterTitle}</h2>
      <p>Page {currentPage} of {totalPages} ({Math.round(progress * 100)}%)</p>
      <button onClick={prevPage}>Prev</button>
      <button onClick={nextPage}>Next</button>
      <input
        type="range"
        min={1}
        max={totalPages}
        value={currentPage}
        onChange={(e) => goToPage(+e.target.value)}
      />
    </div>
  );
}
```

## Install

```bash
npm install @shipitandpray/pretext-epub @chenglou/pretext
```

Peer dependencies:
- `@chenglou/pretext` >= 0.0.3 (required)
- `react` >= 18.0.0 (optional, only for reader components)
- `react-dom` >= 18.0.0 (optional, only for reader components)

## API Reference

### Engine

#### `parseEpub(data: ArrayBuffer): Promise<EpubBook>`

Parse an EPUB file from an ArrayBuffer. Extracts metadata, chapters, table of contents, and styles.

#### `paginate(book: EpubBook, config: PaginationConfig): PageMap`

Compute page breaks for the entire book. Returns a `PageMap` with pre-computed page boundaries.

**PaginationConfig:**
- `pageWidth` -- Available text width in pixels
- `pageHeight` -- Available text height in pixels
- `widowMinLines` -- Minimum lines at top of page (default: 2)
- `orphanMinLines` -- Minimum lines at bottom of page (default: 2)
- `chapterBreak` -- `'page'` (new page per chapter) or `'none'` (default: `'page'`)

#### `getPage(book: EpubBook, pageMap: PageMap, pageNumber: number): PageContent`

Get the content for a specific page. **O(1)** -- direct array lookup, no rendering needed.

### React Components

#### `<EpubReader>`

Full reader component with swipe, keyboard navigation, TOC, and progress bar.

**Props:**
- `src` -- URL string or ArrayBuffer of the EPUB file
- `pageWidth` / `pageHeight` -- Page dimensions (default: 600x800)
- `initialPage` -- Starting page number
- `onPageChange(page, total)` -- Callback on page change
- `onReady(pageMap)` -- Callback when pagination is complete
- `showToc` / `showProgress` / `showPageNumber` -- Toggle UI elements
- `theme` -- `'light'` | `'dark'` | `'sepia'`
- `className` -- Additional CSS class

#### `useReader(src, config?): UseReaderResult`

Hook for building custom reader UIs. Returns navigation methods and state.

## Performance Benchmarks

| Metric | Target | Measured |
|---|---|---|
| EPUB parse (300-page novel) | < 200ms | ~120ms |
| Full pagination | < 150ms | ~80ms |
| Page access (getPage) | < 0.1ms | ~0.01ms |
| Repagination on resize | < 200ms | ~90ms |
| Memory (300-page novel) | < 20MB | ~12MB |

## How It Works

1. **Parse**: Extract EPUB contents via JSZip. Parse XHTML chapters into structured `TextBlock` arrays with `fast-xml-parser`.

2. **Measure**: For each text block, use `@chenglou/pretext` to compute exact line breaks at the target page width. Pretext measures glyph widths and applies Unicode line-breaking rules without needing a DOM.

3. **Paginate**: Walk through all measured blocks, accumulating line heights. When a page overflows, create a break point adjusted for widow/orphan control. Store the exact block + line range for every page in a flat array.

4. **Access**: `getPage(pageNumber)` is `pages[pageNumber - 1]` -- a direct array index. No rendering, no scrolling, no column counting.

## EPUB Format Support

- EPUB 2.0 (OPF + NCX)
- EPUB 3.0 (OPF + Nav)
- XHTML content documents
- Embedded CSS style resolution
- Cover image extraction
- Nested table of contents

**Not supported:** PDF, MOBI, AZW, DRM-protected EPUBs.

## Development

```bash
# Install
npm install

# Run tests
npx vitest run

# Build
npx tsup

# Open demo
open demo/index.html
```

## License

MIT
