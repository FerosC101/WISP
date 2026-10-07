"use client";

import { type ReactNode, useCallback, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";

const noop = () => () => {};

/**
 * A screen's primary actions. On mobile they are pinned just above the bottom
 * navigation (Shell's #sticky-actions slot) so they are always visible without
 * scrolling. The bar's height is published as `--sticky-h`, which Shell adds to
 * <main>'s bottom padding, so everything on the page (wherever it sits relative
 * to this component) can still be scrolled clear of the bar. On wider screens the
 * actions sit in the normal flow.
 */
export function StickyActions({ children }: { children: ReactNode }) {
  const client = useSyncExternalStore(noop, () => true, () => false);
  const measure = useCallback((el: HTMLDivElement | null) => {
    if (!el) return;
    const root = document.documentElement;
    const update = () => root.style.setProperty("--sticky-h", `${el.offsetHeight}px`);
    const ro = new ResizeObserver(update);
    ro.observe(el);
    update();
    return () => {
      ro.disconnect();
      root.style.setProperty("--sticky-h", "0px");
    };
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
    </>
  );
}
