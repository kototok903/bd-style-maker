import { useLayoutEffect, useRef } from "react";

const scrollers: Record<string, string> = {
  visual: '[data-slot="scroll-area-viewport"]',
  css: ".cm-scroller",
};
type Position = { top: number; left: number };

export function useEditorScroll(mode: string, documentId: string | undefined) {
  const ref = useRef<HTMLDivElement>(null);
  const saved = useRef<{
    documentId: string | undefined;
    positions: Record<string, Position>;
  }>({ documentId, positions: {} });
  function saveScroll() {
    const selector = scrollers[mode];
    const viewport =
      selector && ref.current?.querySelector<HTMLElement>(selector);
    if (viewport)
      saved.current.positions[mode] = {
        top: viewport.scrollTop,
        left: viewport.scrollLeft,
      };
  }
  useLayoutEffect(() => {
    if (saved.current.documentId !== documentId)
      saved.current = { documentId, positions: {} };
    const restore = () => {
      const position = saved.current.positions[mode] ?? { top: 0, left: 0 };
      const selector = scrollers[mode];
      const viewport =
        selector && ref.current?.querySelector<HTMLElement>(selector);
      if (viewport) {
        viewport.scrollTop = position.top;
        viewport.scrollLeft = position.left;
      }
    };
    restore();
    // Hidden panels have zero-size scroll bounds. Restore once more after the
    // browser and the editors have measured the newly visible panel.
    const frame = requestAnimationFrame(restore);
    return () => cancelAnimationFrame(frame);
  }, [mode, documentId]);
  return { ref, saveScroll };
}
