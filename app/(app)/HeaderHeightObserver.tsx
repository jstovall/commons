"use client";

import { useEffect } from "react";

export default function HeaderHeightObserver() {
  useEffect(() => {
    const header = document.getElementById("app-header");
    if (!header) return;

    function updateHeight() {
      document.documentElement.style.setProperty(
        "--app-header-height",
        `${header!.getBoundingClientRect().height}px`
      );
    }

    updateHeight();
    const observer = new ResizeObserver(updateHeight);
    observer.observe(header);
    return () => observer.disconnect();
  }, []);

  return null;
}