import { useEffect } from "react";

export interface UseKeyboardOptions {
  onNext: () => void;
  onPrev: () => void;
}

/**
 * Keyboard navigation hook. Handles arrow keys, space, page up/down.
 */
export function useKeyboard(options: UseKeyboardOptions) {
  const { onNext, onPrev } = options;

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      switch (e.key) {
        case "ArrowRight":
        case "ArrowDown":
        case " ":
        case "PageDown":
          e.preventDefault();
          onNext();
          break;
        case "ArrowLeft":
        case "ArrowUp":
        case "PageUp":
          e.preventDefault();
          onPrev();
          break;
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onNext, onPrev]);
}
