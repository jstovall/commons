"use client";

import { useState, useTransition } from "react";
import {
  respondToItemRequest,
  updateItemRequestStatus,
  flagContent,
  startAskThread,
  loadMoreAsks,
} from "@/app/actions";
import { formatDate } from "@/lib/format";

const statusStampClass: Record<string, string> = {
  open: "commons-stamp commons-stamp-teal",
  fulfilled: "commons-stamp commons-stamp-olive",
  cancelled: "commons-stamp",
};

export default function AsksList({
  initialAsks,
  initialHasMore,
  currentUserId,
  myItems,
  threadEntries,
 }: {
  initialAsks: any[];
  initialHasMore: boolean;
  currentUserId: string;
  myItems: { id: string; name: string }[];
  threadEntries: readonly (readonly [string, string])[];
 }) {
  const [asks, setAsks] = useState(initialAsks);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [isPending, startTransition] = useTransition();
const [pendingAskIds, setPendingAskIds] = useState<Set<string>>(new Set());
const [askErrors, setAskErrors] = useState<Record<string, string>>({});

  const threadMap = new Map(threadEntries);

 function handleLoadMore() {
  startTransition(async () => {
    const result = await loadMoreAsks({ offset: asks.length });
    setAsks((prev) => {
      const existingIds = new Set(prev.map((a) => a.id));
      const newOnes = result.asks.filter((a: { id: string }) => !existingIds.has(a.id));
      return [...prev, ...newOnes];
    });
    setHasMore(result.hasMore);
  });
 }

 async function handleAskStatusChange(askId: string, newStatus: string) {
  setPendingAskIds((prev) => new Set(prev).add(askId));
  setAskErrors((prev) => {
    const next = { ...prev };
    delete next[askId];
    return next;
  });

  const formData = new FormData();
  formData.set("request_id", askId);
  formData.set("status", newStatus);

  const result = await updateItemRequestStatus(formData);
  if (result.success) {
    setAsks((prev) =>
      prev.map((a) => (a.id === askId ? { ...a, status: newStatus } : a))
    );
  } else {
    setAskErrors((prev) => ({ ...prev, [askId]: result.error }));
  }

  setPendingAskIds((prev) => {
    const next = new Set(prev);
    next.delete(askId);
    return next;
  });
}


  const openAsks = asks.filter((a) => a.status === "open");
  const closedAsks = asks.filter((a) => a.status !== "open");

  function renderAskCard(ask: any) {
    const isMine = ask.requester_id === currentUserId;
    return (
      <div key={ask.id} className="commons-card p-4">
        <div className="commons-tape" />

        <div className="flex items-start justify-between">
          <div>
            <h3 className="commons-heading text-2xl leading-tight">{ask.title}</h3>
            <p className="font-mono text-xs text-commons-ink/70">
              asked by {ask.requester?.display_name} · {formatDate(ask.created_at)}
            </p>
          </div>
          <span className={statusStampClass[ask.status] ?? "commons-stamp"}>{ask.status}</span>
        </div>

        {ask.category?.name && (
          <span className="commons-stamp commons-stamp-olive mt-2 inline-block">
            {ask.category.name}
          </span>
        )}

        {ask.description && <p className="mt-2 text-sm">{ask.description}</p>}

        {isMine && ask.status === "open" && (
  <div className="mt-3 flex flex-col gap-2">
    <div className="flex gap-2">
      <button
        onClick={() => handleAskStatusChange(ask.id, "fulfilled")}
        disabled={pendingAskIds.has(ask.id)}
        className="commons-button text-xs disabled:opacity-50"
      >
        {pendingAskIds.has(ask.id) ? "…" : "Mark fulfilled"}
      </button>
      <button
        onClick={() => handleAskStatusChange(ask.id, "cancelled")}
        disabled={pendingAskIds.has(ask.id)}
        className="commons-button commons-button-secondary text-xs disabled:opacity-50"
      >
        {pendingAskIds.has(ask.id) ? "…" : "Cancel"}
      </button>
    </div>
    {askErrors[ask.id] && (
      <p className="font-mono text-xs text-commons-brick">{askErrors[ask.id]}</p>
    )}
  </div>
)}

        {!isMine && (
          <details className="mt-2">
            <summary className="cursor-pointer font-mono text-[10px] text-commons-ink/50">
              🚩 report this ask
            </summary>
            <form action={flagContent} className="mt-1 flex gap-2">
              <input type="hidden" name="target_type" value="item_request" />
              <input type="hidden" name="target_id" value={ask.id} />
              <input
                name="reason"
                required
                placeholder="Why report this ask?"
                className="commons-input flex-1 text-xs"
              />
              <button className="commons-button commons-button-secondary text-xs">Submit</button>
            </form>
          </details>
        )}

        <div className="mt-4 flex flex-col gap-3 border-t-2 border-dashed border-commons-ink/40 pt-3">
          {ask.item_request_responses?.map((r: any) => {
            const existingThreadId = threadMap.get(`${ask.id}:${r.responder_id}`);
            return (
              <div key={r.id} className="text-sm">
                <span className="font-mono text-xs font-bold">{r.responder?.display_name}:</span>{" "}
                {r.message}
                {r.item && (
                  <span className="ml-1 font-mono text-xs text-commons-teal">
                    (linked: {r.item.name})
                  </span>
                )}
                <div className="mt-1 flex gap-3">
                  {isMine &&
                    r.responder_id !== currentUserId &&
                    (existingThreadId ? (
                      <a
                        href={`/asks/threads/${existingThreadId}`}
                        className="font-mono text-[10px] font-bold underline"
                      >
                        💬 continue conversation →
                      </a>
                    ) : (
                      <form action={startAskThread}>
                        <input type="hidden" name="request_id" value={ask.id} />
                        <input type="hidden" name="responder_id" value={r.responder_id} />
                        <button className="font-mono text-[10px] font-bold underline">
                          💬 message about this
                        </button>
                      </form>
                    ))}
                  {r.responder_id !== currentUserId && (
                    <details>
                      <summary className="cursor-pointer font-mono text-[10px] text-commons-ink/50">
                        🚩 report
                      </summary>
                      <form action={flagContent} className="mt-1 flex gap-2">
                        <input type="hidden" name="target_type" value="item_request_response" />
                        <input type="hidden" name="target_id" value={r.id} />
                        <input
                          name="reason"
                          required
                          placeholder="Why report this reply?"
                          className="commons-input flex-1 text-xs"
                        />
                        <button className="commons-button commons-button-secondary text-xs">
                          Submit
                        </button>
                      </form>
                    </details>
                  )}
                </div>
              </div>
            );
          })}

          {!isMine && ask.status === "open" && (
            <form action={respondToItemRequest} className="mt-1 flex flex-col gap-2">
              <input type="hidden" name="request_id" value={ask.id} />
              <textarea
                name="message"
                required
                placeholder="I have one, or here's what I know…"
                className="commons-input text-sm"
              />
              {myItems.length > 0 && (
                <select name="item_id" className="commons-input text-sm">
                  <option value="">(optional) Link one of your available items</option>
                  {myItems.map((i) => (
                    <option key={i.id} value={i.id}>
                      {i.name}
                    </option>
                  ))}
                </select>
              )}
              <button className="commons-button commons-button-secondary self-start text-xs">
                Reply
              </button>
            </form>
          )}
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {openAsks.map(renderAskCard)}
        {openAsks.length === 0 && closedAsks.length === 0 && (
          <p className="font-mono text-sm">No asks yet — be the first!</p>
        )}
      </div>

      {openAsks.length === 0 && closedAsks.length > 0 && (
        <p className="mt-4 font-mono text-sm">No open asks right now.</p>
      )}

      {hasMore && (
        <div className="mt-8 flex justify-center">
          <button
            onClick={handleLoadMore}
            disabled={isPending}
            className="commons-button disabled:opacity-50"
          >
            {isPending ? "Loading…" : "Load more"}
          </button>
        </div>
      )}

      {closedAsks.length > 0 && (
        <details className="mt-8">
          <summary className="cursor-pointer font-mono text-sm font-bold uppercase">
            {closedAsks.length} closed ask{closedAsks.length === 1 ? "" : "s"}
          </summary>
          <div className="mt-3 flex flex-col gap-2">
            {closedAsks.map((ask) => (
              <div key={ask.id} className="commons-card-flat flex items-center justify-between gap-3 p-3">
                <div>
                  <p className="text-sm font-bold">{ask.title}</p>
                  <p className="font-mono text-[10px] text-commons-ink/60">
                    asked by {ask.requester?.display_name} · {formatDate(ask.created_at)}
                  </p>
                </div>
                <span className={statusStampClass[ask.status] ?? "commons-stamp"}>{ask.status}</span>
              </div>
            ))}
          </div>
        </details>
      )}
    </>
  );
}