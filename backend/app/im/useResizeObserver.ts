import { useEffect, type RefObject } from "react";

/**
 * Observe an element's size via ResizeObserver.
 * `onResize` receives the contentRect on every change.
 */
export function useResizeObserver(
  ref: RefObject<HTMLElement | null>,
  onResize: (rect: DOMRectReadOnly) => void,
): void {
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) onResize(entry.contentRect);
    });
    observer.observe(el);
    return () => observer.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}
