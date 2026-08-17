"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { recordActivity } from "@/app/actions";

export default function RefreshOnFocus() {
  const router = useRouter();

  useEffect(() => {
    recordActivity();
  }, []);

  useEffect(() => {
    function handleVisibilityChange() {
      if (document.visibilityState === "visible") {
        router.refresh();
        recordActivity();
      }
    }

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("focus", handleVisibilityChange);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("focus", handleVisibilityChange);
    };
  }, [router]);

  return null;
}