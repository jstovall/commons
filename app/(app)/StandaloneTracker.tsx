"use client";

import { useEffect } from "react";
import { recordStandaloneVisit } from "@/app/actions";

export default function StandaloneTracker() {
  useEffect(() => {
    const isStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true;

    if (!isStandalone) return;

    // Once per browser session is plenty — avoids a write on every navigation.
    if (sessionStorage.getItem("commons_standalone_recorded")) return;
    sessionStorage.setItem("commons_standalone_recorded", "1");

    recordStandaloneVisit();
  }, []);

  return null;
}