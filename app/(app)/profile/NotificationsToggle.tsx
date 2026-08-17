"use client";

import { useEffect, useState } from "react";
import { subscribeToPush, unsubscribeFromPush } from "@/lib/push";
import { savePushSubscription, deletePushSubscription } from "@/app/actions";

export default function NotificationsToggle() {
  const [supported, setSupported] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission | null>(null);
  const [subscribed, setSubscribed] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const ua = window.navigator.userAgent;
    setIsIOS(/iPad|iPhone|iPod/.test(ua) && !("MSStream" in window));
    setIsStandalone(
      window.matchMedia("(display-mode: standalone)").matches ||
        (window.navigator as unknown as { standalone?: boolean }).standalone === true
    );
    setSupported("serviceWorker" in navigator && "PushManager" in window);
    if ("Notification" in window) setPermission(Notification.permission);

    navigator.serviceWorker?.ready.then(async (reg) => {
      const sub = await reg.pushManager.getSubscription();
      setSubscribed(Boolean(sub));
    });
  }, []);

async function handleEnable() {
  setLoading(true);
  try {
    const sub = await subscribeToPush();
    await savePushSubscription(
      sub.toJSON() as { endpoint: string; keys: { p256dh: string; auth: string } }
    );
    setSubscribed(true);
    setPermission("granted");
  } catch (err) {
    console.error("Push subscribe failed:", err);
    if ("Notification" in window) setPermission(Notification.permission);
  }
  setLoading(false);
}

async function handleDisable() {
  setLoading(true);
  try {
    // Delete server-side first — this is the source of truth. Do it
    // regardless of whether the browser can locate a local subscription
    // object, since that lookup can silently fail after a service worker
    // update, reinstall, or browser restart.
    await deletePushSubscription();
    setSubscribed(false);
  } catch (err) {
    console.error("Push unsubscribe failed:", err);
    setLoading(false);
    return;
  }

  // Best-effort local cleanup — failing here shouldn't undo the fact that
  // the server-side subscription was genuinely removed.
  try {
    await unsubscribeFromPush();
  } catch (err) {
    console.error("Local unsubscribe cleanup failed (non-fatal):", err);
  }
  setLoading(false);
}

  if (!supported) return null;

  if (isIOS && !isStandalone) {
    return (
      <div className="commons-card-flat p-4">
        <p className="text-sm">
          Notifications require adding Commons to your home screen first —
          tap the Share icon in Safari, then &ldquo;Add to Home Screen.&rdquo;
        </p>
      </div>
    );
  }

  if (permission === "denied") {
    return (
      <div className="commons-card-flat p-4">
        <p className="text-sm">
          Notifications are blocked in your browser settings. You&apos;ll
          need to re-enable them for this site manually to receive updates.
        </p>
      </div>
    );
  }

  return (
    <div className="commons-card-flat flex items-center justify-between p-4">
      <p className="text-sm">
        {subscribed
          ? "You'll get notified about new requests, messages, and replies."
          : "Get notified about new requests, messages, and replies."}
      </p>
      <button
        onClick={subscribed ? handleDisable : handleEnable}
        disabled={loading}
        className="commons-button commons-button-secondary shrink-0 text-xs disabled:opacity-50"
      >
        {loading ? "…" : subscribed ? "Disable" : "Enable"}
      </button>
    </div>
  );
}