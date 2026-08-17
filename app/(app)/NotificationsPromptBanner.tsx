"use client";

import { useEffect, useState } from "react";
import { subscribeToPush } from "@/lib/push";
import { savePushSubscription } from "@/app/actions";

const DISMISS_KEY = "commons_notif_prompt_dismissed_until";
const COOLDOWN_DAYS = 14;

export default function NotificationsPromptBanner() {
  const [visible, setVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isReenable, setIsReenable] = useState(false);

  useEffect(() => {
    async function check() {
      if (!("serviceWorker" in navigator) || !("PushManager" in window)) return;
      if (!("Notification" in window)) return;

      const ua = window.navigator.userAgent;
      const isIOS = /iPad|iPhone|iPod/.test(ua) && !("MSStream" in window);
      const isStandalone =
        window.matchMedia("(display-mode: standalone)").matches ||
        (window.navigator as unknown as { standalone?: boolean }).standalone === true;

      // Push only works on iOS once installed to the home screen —
      // AddToHomeScreenBanner already covers getting them there first.
      if (isIOS && !isStandalone) return;

      // Explicitly denied at the OS level — no way for JS to re-prompt this,
      // only the person's own phone Settings can undo it. Nagging here
      // would just be noise with no possible action behind it.
      if (Notification.permission === "denied") return;

      const dismissedUntil = Number(localStorage.getItem(DISMISS_KEY) ?? 0);
      if (Date.now() < dismissedUntil) return;

      const reg = await navigator.serviceWorker.ready;
      const existingSub = await reg.pushManager.getSubscription();
      if (existingSub) return;

      // Permission is granted but there's no active subscription — this is
      // the "disabled from Profile" case. Re-subscribing here won't show a
      // new OS prompt (permission's already decided), it'll just work.
      setIsReenable(Notification.permission === "granted");
      setVisible(true);
    }
    check();
  }, []);

  function handleDismiss() {
    const until = Date.now() + COOLDOWN_DAYS * 24 * 60 * 60 * 1000;
    localStorage.setItem(DISMISS_KEY, String(until));
    setVisible(false);
  }

  async function handleEnable() {
    setLoading(true);
    try {
      const sub = await subscribeToPush();
      await savePushSubscription(
        sub.toJSON() as { endpoint: string; keys: { p256dh: string; auth: string } }
      );
      setVisible(false);
    } catch (err) {
      console.error("Push subscribe failed:", err);
      handleDismiss();
    }
    setLoading(false);
  }

  if (!visible) return null;

  return (
    <div className="mx-4 mt-4 flex items-start justify-between gap-3 rounded-lg border-2 border-commons-ink bg-commons-teal px-3 py-2 text-commons-cream">
      <p className="text-sm">
        <strong>
          {isReenable ? "Turn notifications back on" : "Turn on notifications"}
        </strong>{" "}
        so you don&apos;t miss borrow requests, messages, or replies.
      </p>
      <div className="flex shrink-0 gap-2">
        <button
          onClick={handleEnable}
          disabled={loading}
          className="commons-button text-xs disabled:opacity-50"
        >
          {loading ? "…" : "Enable"}
        </button>
        <button
          onClick={handleDismiss}
          aria-label="Dismiss"
          className="font-mono text-xs font-bold"
        >
          ✕
        </button>
      </div>
    </div>
  );
}