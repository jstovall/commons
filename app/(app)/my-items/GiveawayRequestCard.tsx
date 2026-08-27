"use client";

import { useState } from "react";
import { respondToGiveawayRequest } from "@/app/actions";

interface Req {
  id: string;
  status: string;
  item: { name: string } | null;
  requester: { display_name: string } | null;
}

export default function GiveawayRequestCard({ request: initialReq }: { request: Req }) {
  const [req, setReq] = useState(initialReq);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleAction(action: "approve" | "decline") {
    setBusy(true);
    setError(null);

    const formData = new FormData();
    formData.set("thread_id", req.id);
    formData.set("action", action);

    const result = await respondToGiveawayRequest(formData);
    if (result.success) {
      setReq((prev) => ({ ...prev, status: action === "approve" ? "approved" : "declined" }));
    } else {
      setError(result.error);
    }
    setBusy(false);
  }

  return (
    <div className="commons-card-flat p-3">
      <p className="text-sm">
        <span className="font-mono font-bold">{req.requester?.display_name}</span>{" "}
        wants <span className="font-mono font-bold">{req.item?.name}</span>
      </p>

      <div className="mt-2 flex flex-wrap gap-2">
        {req.status === "pending" ? (
          <>
            <button
              onClick={() => handleAction("approve")}
              disabled={busy}
              className="commons-button text-xs disabled:opacity-50"
            >
              {busy ? "…" : "Approve"}
            </button>
            <button
              onClick={() => handleAction("decline")}
              disabled={busy}
              className="commons-button commons-button-danger text-xs disabled:opacity-50"
            >
              {busy ? "…" : "Decline"}
            </button>
          </>
        ) : (
          <span className="commons-stamp">{req.status}</span>
        )}
      </div>

      {error && <p className="mt-2 font-mono text-xs text-commons-brick">{error}</p>}

      <a
        href={`/free/threads/${req.id}`}
        className="mt-2 inline-block font-mono text-xs font-bold underline"
      >
        view &amp; message →
      </a>
    </div>
  );
}