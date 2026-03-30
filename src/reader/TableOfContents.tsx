import React from "react";
import type { TocEntry } from "../types.js";

export interface TableOfContentsProps {
  entries: TocEntry[];
  onSelect: (chapterId: string) => void;
  isOpen: boolean;
  onClose: () => void;
}

/**
 * Table of contents sidebar. Each entry shows the chapter title
 * and its exact page number (computed during pagination).
 */
export const TableOfContents: React.FC<TableOfContentsProps> = ({
  entries,
  onSelect,
  isOpen,
  onClose,
}) => {
  if (!isOpen) return null;

  return (
    <div className="pretext-epub-toc-overlay" onClick={onClose}>
      <nav
        className="pretext-epub-toc"
        onClick={(e) => e.stopPropagation()}
        role="navigation"
        aria-label="Table of Contents"
      >
        <header className="pretext-epub-toc__header">
          <h2>Table of Contents</h2>
          <button
            className="pretext-epub-toc__close"
            onClick={onClose}
            aria-label="Close table of contents"
          >
            &times;
          </button>
        </header>
        <ul className="pretext-epub-toc__list">
          {entries.map((entry, idx) => (
            <TocItem key={idx} entry={entry} onSelect={onSelect} depth={0} />
          ))}
        </ul>
      </nav>
    </div>
  );
};

const TocItem: React.FC<{
  entry: TocEntry;
  onSelect: (chapterId: string) => void;
  depth: number;
}> = ({ entry, onSelect, depth }) => {
  return (
    <li className="pretext-epub-toc__item" style={{ paddingLeft: depth * 16 }}>
      <button
        className="pretext-epub-toc__link"
        onClick={() => onSelect(entry.chapterId)}
      >
        <span className="pretext-epub-toc__title">{entry.title}</span>
        {entry.pageNumber > 0 && (
          <span className="pretext-epub-toc__page">p. {entry.pageNumber}</span>
        )}
      </button>
      {entry.children && entry.children.length > 0 && (
        <ul className="pretext-epub-toc__sublist">
          {entry.children.map((child, idx) => (
            <TocItem
              key={idx}
              entry={child}
              onSelect={onSelect}
              depth={depth + 1}
            />
          ))}
        </ul>
      )}
    </li>
  );
};
