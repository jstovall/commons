"use client";

import { useEffect, useState } from "react";

const DISMISS_KEY = "commons_a2hs_dismissed_until";
const COOLDOWN_DAYS = 14;

export default function AddToHomeScreenBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const isIOS = /iPad|iPhone|iPod/.test(window.navigator.userAgent) && !("MSStream" in window);
    const isStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true;

    if (!isIOS || isStandalone) return;

    const dismissedUntil = Number(localStorage.getItem(DISMISS_KEY) ?? 0);
    if (Date.now() < dismissedUntil) return;

    setVisible(true);
  }, []);

  function handleDismiss() {
    const until = Date.now() + COOLDOWN_DAYS * 24 * 60 * 60 * 1000;
    localStorage.setItem(DISMISS_KEY, String(until));
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div className="mx-4 mt-4 flex items-start justify-between gap-3 rounded-lg border-2 border-commons-ink bg-commons-ochre px-3 py-2">
      <p className="text-sm">
        <strong>Add Commons to your home screen</strong> to get notifications
        for new requests and messages. Tap the Share icon{" "}
        <strong>⬆️</strong> in Safari, then{" "}
        <strong>&ldquo;Add to Home Screen.&rdquo;</strong>
      </p>
      <button
        onClick={handleDismiss}
        aria-label="Dismiss"
        className="font-mono text-xs font-bold"
      >
        ✕
      </button>
    </div>
  );
}