"use client";

import { useEffect, useState } from "react";

export default function ShareInviteLink({
  code,
  neighborhoodName,
}: {
  code: string;
  neighborhoodName: string | null;
}) {
  const [url, setUrl] = useState("");
  const [copied, setCopied] = useState(false);
  const [canShare, setCanShare] = useState(false);

  useEffect(() => {
    setUrl(`${window.location.origin}/welcome?invite=${encodeURIComponent(code)}`);
    setCanShare(typeof navigator.share === "function");
  }, [code]);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Copy failed:", err);
    }
  }

  async function handleShare() {
    try {
      await navigator.share({
        title: neighborhoodName ? `${neighborhoodName} Commons` : "Commons",
        text: `Join us on ${neighborhoodName ? `${neighborhoodName} Commons` : "Commons"} — share and borrow with neighbors.`,
        url,
      });
    } catch {
      // User cancelled the share sheet — not an error, ignore.
    }
  }

  return (
    <div className="commons-card-flat p-4">
      <p className="font-mono text-xs font-bold uppercase">
        Invite a neighbor
      </p>
      <p className="mt-1 text-sm">
        Share this link — anyone who opens it can join{" "}
        {neighborhoodName ? `${neighborhoodName} Commons` : "your neighborhood"}{" "}
        right away.
      </p>

      <input
        type="text"
        readOnly
        value={url}
        onFocus={(e) => e.target.select()}
        className="commons-input mt-3 w-full text-xs"
      />

      <div className="mt-2 flex gap-2">
        <button onClick={handleCopy} className="commons-button text-xs">
          {copied ? "Copied!" : "Copy link"}
        </button>
        {canShare && (
          <button
            onClick={handleShare}
            className="commons-button commons-button-secondary text-xs"
          >
            Share…
          </button>
        )}
      </div>
    </div>
  );
}