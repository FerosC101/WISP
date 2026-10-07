"use client";

import { type ReactNode, useCallback, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";

const noop = () => () => {};

/**
 * A screen's primary actions. On mobile they are pinned just above the bottom
 * navigation (Shell's #sticky-actions slot) so they are always visible without
 * scrolling; a spacer of the same height keeps content from hiding behind them.
 * On wider screens they sit in the normal flow.
 */
export function StickyActions({ children }: { children: ReactNode }) {
  const client = useSyncExternalStore(noop, () => true, () => false);
  const [height, setHeight] = useState(0);
  const measure = useCallback((el: HTMLDivElement | null) => {
    if (!el) return;
    const ro = new ResizeObserver(() => setHeight(el.offsetHeight));
    ro.observe(el);
    setHeight(el.offsetHeight);
    return () => ro.disconnect();
  }, []);
  const slot = client ? document.getElementById("sticky-actions") : null;

  return (
    <>
      <div className="mt-6 hidden flex-col gap-3 md:flex">{children}</div>
      {slot &&
        createPortal(
          <div ref={measure} className="border-t border-line bg-ivory/95 px-4 py-3 backdrop-blur md:hidden">
            <div className="mx-auto flex max-w-xl flex-col gap-2">{children}</div>
          </div>,
          slot,
        )}
      <div aria-hidden className="md:hidden" style={{ height }} />
    </>
  );
}
