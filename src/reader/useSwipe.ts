import { useRef, useCallback, useEffect } from "react";

export interface UseSwipeOptions {
  onSwipeLeft: () => void;
  onSwipeRight: () => void;
  threshold?: number;
}

/**
 * Touch swipe navigation hook. Detects horizontal swipe gestures
 * and calls onSwipeLeft/onSwipeRight accordingly.
 */
export function useSwipe(
  elementRef: React.RefObject<HTMLElement | null>,
  options: UseSwipeOptions
) {
  const { onSwipeLeft, onSwipeRight, threshold = 50 } = options;
  const startX = useRef(0);
  const startY = useRef(0);

  const handleTouchStart = useCallback((e: TouchEvent) => {
    startX.current = e.touches[0].clientX;
    startY.current = e.touches[0].clientY;
  }, []);

  const handleTouchEnd = useCallback(
    (e: TouchEvent) => {
      const endX = e.changedTouches[0].clientX;
      const endY = e.changedTouches[0].clientY;
      const dx = endX - startX.current;
      const dy = endY - startY.current;

      // Only trigger if horizontal movement exceeds vertical
      if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > threshold) {
        if (dx < 0) {
          onSwipeLeft();
        } else {
          onSwipeRight();
        }
      }
    },
    [onSwipeLeft, onSwipeRight, threshold]
  );

  useEffect(() => {
    const el = elementRef.current;
    if (!el) return;

    el.addEventListener("touchstart", handleTouchStart, { passive: true });
    el.addEventListener("touchend", handleTouchEnd, { passive: true });

    return () => {
      el.removeEventListener("touchstart", handleTouchStart);
      el.removeEventListener("touchend", handleTouchEnd);
    };
  }, [elementRef, handleTouchStart, handleTouchEnd]);
}
