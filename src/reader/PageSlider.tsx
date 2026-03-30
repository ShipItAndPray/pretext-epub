import React, { useCallback } from "react";

export interface PageSliderProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

/**
 * Scrubbing slider for page navigation. Allows jumping to any page
 * in O(1) time — no rendering delay regardless of book size.
 */
export const PageSlider: React.FC<PageSliderProps> = ({
  currentPage,
  totalPages,
  onPageChange,
}) => {
  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      onPageChange(parseInt(e.target.value, 10));
    },
    [onPageChange]
  );

  return (
    <div className="pretext-epub-slider">
      <input
        type="range"
        min={1}
        max={totalPages}
        value={currentPage}
        onChange={handleChange}
        className="pretext-epub-slider__input"
        aria-label="Page navigation"
      />
    </div>
  );
};
