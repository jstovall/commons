"use client";

import { useEffect } from "react";

export default function ViewportFix() {
  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;

    let lastOffsetTop = vv.offsetTop;

    function handleResize() {
      const currentOffsetTop = vv!.offsetTop;

      // The keyboard just closed (offsetTop dropping) but didn't fully
      // reset to 0 — this is the iOS 26 bug. A tiny forced scroll nudges
      // WebKit into recalculating fixed-element positions correctly.
      if (currentOffsetTop > 0 && currentOffsetTop < lastOffsetTop) {
        requestAnimationFrame(() => {
          window.scrollBy(0, 1);
          window.scrollBy(0, -1);
        });
      }

      lastOffsetTop = currentOffsetTop;
    }

    vv.addEventListener("resize", handleResize);
    return () => vv.removeEventListener("resize", handleResize);
  }, []);

  return null;
}