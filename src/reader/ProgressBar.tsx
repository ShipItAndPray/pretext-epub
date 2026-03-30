import React from "react";

export interface ProgressBarProps {
  progress: number;
  currentPage: number;
  totalPages: number;
}

/**
 * Pixel-accurate progress bar. Unlike CSS-column-based readers,
 * progress is exact from the first render because total page count
 * is known after pagination.
 */
export const ProgressBar: React.FC<ProgressBarProps> = ({
  progress,
  currentPage,
  totalPages,
}) => {
  return (
    <div className="pretext-epub-progress">
      <div className="pretext-epub-progress__bar">
        <div
          className="pretext-epub-progress__fill"
          style={{ width: `${progress * 100}%` }}
        />
      </div>
      <span className="pretext-epub-progress__label">
        {currentPage} / {totalPages}
      </span>
    </div>
  );
};
