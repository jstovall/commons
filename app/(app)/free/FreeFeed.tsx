"use client";

import { useState, useTransition } from "react";
import {
  updateFreePileStatus,
  startGiveawayThread,
  flagContent,
  loadMoreFree,
} from "@/app/actions";
import { formatDateTime } from "@/lib/format";

export default function FreeFeed({
  initialPiles,
  initialPilesHasMore,
  initialItems,
  initialItemsHasMore,
  currentUserId,
  threadCountByItem,
  myThreadByItem,
}: {
  initialPiles: any[];
  initialPilesHasMore: boolean;
  initialItems: any[];
  initialItemsHasMore: boolean;
  currentUserId: string;
  threadCountByItem: readonly (readonly [string, number])[];
  myThreadByItem: readonly (readonly [string, string])[];
}) {
  const [piles, setPiles] = useState(initialPiles);
  const [pilesHasMore, setPilesHasMore] = useState(initialPilesHasMore);
  const [items, setItems] = useState(initialItems);
  const [itemsHasMore, setItemsHasMore] = useState(initialItemsHasMore);
  const [isPending, startTransition] = useTransition();

  const threadCountMap = new Map(threadCountByItem);
  const myThreadMap = new Map(myThreadByItem);

  function handleLoadMore() {
    startTransition(async () => {
      const result = await loadMoreFree({ pileOffset: piles.length, itemOffset: items.length });
      setPiles((prev) => [...prev, ...result.piles]);
      setPilesHasMore(result.pilesHasMore);
      setItems((prev) => [...prev, ...result.items]);
      setItemsHasMore(result.itemsHasMore);
    });
  }

  const activePiles = piles.filter((p) => p.status !== "gone");
  const gonePiles = piles.filter((p) => p.status === "gone");
  const activeItems = items.filter((i) => i.status === "available");
  const goneItems = items.filter((i) => i.status !== "available");
  const hasMore = pilesHasMore || itemsHasMore;

  return (
    <>
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {activePiles.map((pile) => (
          <div key={pile.id} className="commons-card p-4">
            <div className="commons-tape" />
            <div className="flex items-start justify-between">
              <div>
                <h3 className="commons-heading text-2xl leading-tight">{pile.title}</h3>
                <p className="font-mono text-xs text-commons-ink/70">
                  posted by {pile.poster?.display_name} · updated {formatDateTime(pile.last_confirmed_at)}
                </p>
              </div>
              <span className="commons-stamp commons-stamp-olive">free pile</span>
            </div>

            {pile.image_url && (
              <div className="commons-shipwindow mt-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={pile.image_url} alt={pile.title} />
              </div>
            )}
            {pile.description && <p className="mt-2 text-sm">{pile.description}</p>}
            {pile.location && (
              <p className="mt-1 font-mono text-xs text-commons-teal">📍 {pile.location}</p>
            )}

            <span
              className={`commons-stamp mt-2 inline-block ${
                pile.status === "claimed_pending" ? "commons-stamp-brick" : "commons-stamp-teal"
              }`}
            >
              {pile.status === "claimed_pending" ? "claimed — awaiting confirmation" : "still there"}
            </span>

            <div className="mt-3 flex flex-wrap gap-2">
              {pile.status === "still_there" && (
                <>
                  <form action={updateFreePileStatus}>
                    <input type="hidden" name="pile_id" value={pile.id} />
                    <input type="hidden" name="new_status" value="still_there" />
                    <button className="commons-button commons-button-secondary text-xs">
                      Still there
                    </button>
                  </form>
                  <form action={updateFreePileStatus}>
                    <input type="hidden" name="pile_id" value={pile.id} />
                    <input type="hidden" name="new_status" value="claimed_pending" />
                    <button className="commons-button text-xs">Mark claimed</button>
                  </form>
                </>
              )}
              {pile.status === "claimed_pending" && (
                <>
                  <form action={updateFreePileStatus}>
                    <input type="hidden" name="pile_id" value={pile.id} />
                    <input type="hidden" name="new_status" value="still_there" />
                    <button className="commons-button commons-button-secondary text-xs">
                      Actually, still here
                    </button>
                  </form>
                  {pile.claimed_by !== currentUserId && (
                    <form action={updateFreePileStatus}>
                      <input type="hidden" name="pile_id" value={pile.id} />
                      <input type="hidden" name="new_status" value="gone" />
                      <button className="commons-button text-xs">Confirm it&apos;s gone</button>
                    </form>
                  )}
                </>
              )}
            </div>

            {pile.posted_by !== currentUserId && (
              <details className="mt-2">
                <summary className="cursor-pointer font-mono text-[10px] text-commons-ink/50">
                  🚩 report
                </summary>
                <form action={flagContent} className="mt-1 flex gap-2">
                  <input type="hidden" name="target_type" value="free_pile" />
                  <input type="hidden" name="target_id" value={pile.id} />
                  <input
                    name="reason"
                    required
                    placeholder="Why report this?"
                    className="commons-input flex-1 text-xs"
                  />
                  <button className="commons-button commons-button-secondary text-xs">Submit</button>
                </form>
              </details>
            )}
          </div>
        ))}

        {activeItems.map((item) => {
          const isOwner = item.owner_id === currentUserId;
          const threadCount = threadCountMap.get(item.id) ?? 0;
          const myThreadId = myThreadMap.get(item.id);
          return (
            <div key={item.id} className="commons-card p-4">
              <div className="commons-tape" />
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="commons-heading text-2xl leading-tight">{item.name}</h3>
                  <p className="font-mono text-xs text-commons-ink/70">
                    shared by {item.owner?.display_name}
                  </p>
                </div>
                <span className="commons-stamp commons-stamp-teal">giveaway</span>
              </div>

              {item.image_url && (
                <div className="commons-shipwindow mt-3">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={item.image_url} alt={item.name} />
                </div>
              )}
              {item.description && <p className="mt-2 text-sm">{item.description}</p>}
              {threadCount > 0 && (
                <p className="mt-2 font-mono text-xs text-commons-brick">
                  {threadCount} neighbor{threadCount === 1 ? "" : "s"} already asked
                </p>
              )}

              {!isOwner &&
                (myThreadId ? (
                  <a
                    href={`/free/threads/${myThreadId}`}
                    className="mt-3 inline-block font-mono text-xs font-bold underline"
                  >
                    💬 continue conversation →
                  </a>
                ) : (
                  <form action={startGiveawayThread} className="mt-3">
                    <input type="hidden" name="item_id" value={item.id} />
                    <button className="commons-button text-sm">Message owner</button>
                  </form>
                ))}

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
            </div>
          );
        })}

        {activePiles.length === 0 && activeItems.length === 0 && (
          <p className="font-mono text-sm">Nothing free right now — check back later!</p>
        )}
      </div>

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

      {gonePiles.length + goneItems.length > 0 && (
        <details className="mt-8">
          <summary className="cursor-pointer font-mono text-sm font-bold uppercase">
            {gonePiles.length + goneItems.length} gone
          </summary>
          <div className="mt-3 flex flex-col gap-2">
            {gonePiles.map((pile) => (
              <div key={pile.id} className="commons-card-flat flex items-center justify-between gap-3 p-3">
                <p className="text-sm font-bold">{pile.title}</p>
                <span className="commons-stamp">gone</span>
              </div>
            ))}
            {goneItems.map((item) => (
              <div key={item.id} className="commons-card-flat flex items-center justify-between gap-3 p-3">
                <p className="text-sm font-bold">{item.name}</p>
                <span className="commons-stamp">unavailable</span>
              </div>
            ))}
          </div>
        </details>
      )}
    </>
  );
}