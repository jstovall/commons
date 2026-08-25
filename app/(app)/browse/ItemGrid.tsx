"use client";

import { useState, useTransition } from "react";
import { toggleFavorite, requestLoan, flagContent, loadMoreItems } from "@/app/actions";

const statusStampClass: Record<string, string> = {
  available: "commons-stamp commons-stamp-teal",
  requested: "commons-stamp commons-stamp-brick",
  checked_out: "commons-stamp commons-stamp-brick",
  unavailable: "commons-stamp",
};

interface ItemRow {
  id: string;
  name: string;
  description: string | null;
  image_url: string | null;
  status: string;
  content_flag: boolean;
  owner_id: string;
  category: { name: string } | null;
  owner: { display_name: string } | null;
}

export default function ItemGrid({
  initialItems,
  initialHasMore,
  favoriteIds,
  myLoanEntries,
  currentUserId,
  queryParams,
  isDeepLink,
  emptyMessage,
}: {
  initialItems: ItemRow[];
  initialHasMore: boolean;
  favoriteIds: string[];
  myLoanEntries: readonly (readonly [string, { id: string; status: string }])[];
  currentUserId: string;
  queryParams: { q?: string; category?: string; filter?: string };
  isDeepLink: boolean;
  emptyMessage: string;
}) {
  const [items, setItems] = useState(initialItems);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [isPending, startTransition] = useTransition();

  // Recomputed fresh every render from props — so favoriting/requesting
  // updates correctly across the whole loaded list, even items beyond the
  // first batch, without disturbing how many items are currently shown.
  const favoriteSet = new Set(favoriteIds);
  const myLoanMap = new Map(myLoanEntries);

  function handleLoadMore() {
    startTransition(async () => {
      const result = await loadMoreItems({
        offset: items.length,
        q: queryParams.q,
        category: queryParams.category,
        filter: queryParams.filter,
      });
      setItems((prev) => [...prev, ...result.items]);
      setHasMore(result.hasMore);
    });
  }

  return (
    <>
      <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((item) => {
          const isOwner = item.owner_id === currentUserId;
          const isFavorited = favoriteSet.has(item.id);
          const myLoan = myLoanMap.get(item.id);

          return (
            <div key={item.id} className="commons-card p-4">
              <div className="commons-tape" />

              <div className="flex items-start justify-between">
                <div>
                  <h3 className="commons-heading text-2xl leading-tight">
                    {item.name}
                  </h3>
                  <p className="font-mono text-xs text-commons-ink/70">
                    shared by {item.owner?.display_name}
                  </p>
                </div>
                <form action={toggleFavorite}>
                  <input type="hidden" name="item_id" value={item.id} />
                  <button
                    type="submit"
                    aria-label="Favorite"
                    className={`text-2xl ${isFavorited ? "text-commons-brick" : "text-commons-ink/55"}`}
                  >
                    {isFavorited ? "♥" : "♡"}
                  </button>
                </form>
              </div>

              {item.image_url && (
                <div className="commons-shipwindow mt-3">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={item.image_url} alt={item.name} />
                </div>
              )}

              {item.description && (
                <p className="mt-2 text-sm">{item.description}</p>
              )}

              <div className="mt-3 flex flex-wrap gap-2">
                <span className="commons-stamp commons-stamp-olive">
                  {item.category?.name ?? "uncategorized"}
                </span>
                <span className={statusStampClass[item.status] ?? "commons-stamp"}>
                  {item.status.replace("_", " ")}
                </span>
              </div>

              {!isOwner && (
                <details className="mt-2">
                  <summary className="cursor-pointer font-mono text-[10px] text-commons-ink/50">
                    🚩 report this item
                  </summary>
                  <form action={flagContent} className="mt-1 flex gap-2">
                    <input type="hidden" name="target_type" value="item" />
                    <input type="hidden" name="target_id" value={item.id} />
                    <input
                      name="reason"
                      required
                      placeholder="Why report this item?"
                      className="commons-input flex-1 text-xs"
                    />
                    <button className="commons-button commons-button-secondary text-xs">
                      Submit
                    </button>
                  </form>
                </details>
              )}

              {!isOwner && item.status === "available" && !myLoan && (
                <form action={requestLoan} className="mt-4 flex gap-2">
                  <input type="hidden" name="item_id" value={item.id} />
                  <input
                    type="text"
                    name="message"
                    placeholder="Optional note to owner…"
                    className="commons-input flex-1 text-sm"
                  />
                  <button className="commons-button text-sm">Request</button>
                </form>
              )}

              {myLoan && (
                <div className="mt-3 flex items-center gap-3">
                  <span className="commons-stamp commons-stamp-brick">
                    {myLoan.status.replace("_", " ")}
                  </span>
                  <a
                    href={`/loans/${myLoan.id}`}
                    className="font-mono text-xs font-bold underline"
                  >
                    view &amp; message →
                  </a>
                </div>
              )}
            </div>
          );
        })}

        {items.length === 0 && (
          <p className="font-mono text-sm">{emptyMessage}</p>
        )}
      </div>

      {!isDeepLink && hasMore && (
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
    </>
  );
}