"use client";

import { useEffect } from "react";
import { recordStandaloneVisit } from "@/app/actions";
import RefreshOnFocus from "./RefreshOnFocus";

export default function StandaloneTracker() {
  useEffect(() => {
    const isStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true;

    if (!isStandalone) return;
    if (sessionStorage.getItem("commons_standalone_recorded")) return;
    sessionStorage.setItem("commons_standalone_recorded", "1");

    const ua = window.navigator.userAgent;
    const platform = /iPad|iPhone|iPod/.test(ua)
      ? "ios"
      : /Android/.test(ua)
        ? "android"
        : "other";

    recordStandaloneVisit(platform);
  }, []);

  return null;
}
<RefreshOnFocus />