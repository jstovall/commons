"use client";

import { useEffect, useState } from "react";

const DISMISS_KEY = "commons_a2hs_dismissed_until";
const COOLDOWN_DAYS = 14;

function ShareIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="inline-block h-4 w-4 align-text-bottom"
      aria-hidden="true"
    >
      <path d="M12 2v13" />
      <path d="M8 6l4-4 4 4" />
      <path d="M5 11v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-7" />
    </svg>
  );
}

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
  <strong>Add Commons to your home screen </strong> to get notifications
  for new requests and messages. In Safari, tap the Share button{" "}
  <ShareIcon /> at the bottom of the screen, scroll down, and select{" "}
  <strong>&ldquo;Add to Home Screen,&rdquo;</strong> then tap{" "}
  <strong>Add</strong>.
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