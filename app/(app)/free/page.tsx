import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { getCurrentMembership } from "@/lib/current-neighborhood";
import { buildFreePilesQuery, buildGiveawayItemsQuery } from "@/lib/free-query";
import { createFreePile } from "@/app/actions";
import ImageFileInput from "../my-items/ImageFileInput";
import FreeFeed from "./FreeFeed";

const PAGE_SIZE = 9;

export default async function FreePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { current: membership } = await getCurrentMembership(user.id);
  if (!membership) redirect("/join");

  const { data: pileData, error: pileError } = await buildFreePilesQuery(
    supabase,
    membership.neighborhood_id
  ).range(0, PAGE_SIZE);
  if (pileError) console.error("Free piles query error:", pileError);

  const { data: itemData, error: itemError } = await buildGiveawayItemsQuery(
    supabase,
    membership.neighborhood_id
  ).range(0, PAGE_SIZE);
  if (itemError) console.error("Giveaway items query error:", itemError);

  const piles = (pileData ?? []).slice(0, PAGE_SIZE);
  const items = (itemData ?? []).slice(0, PAGE_SIZE);

  const itemIds = items.map((i) => i.id);
  const { data: threads } = itemIds.length
    ? await supabase.from("giveaway_threads").select("id, item_id, requester_id, status").in("item_id", itemIds)
    : { data: [] };

  const threadCountMap = new Map<string, number>();
  const myThreadMap = new Map<string, string>();
  for (const t of threads ?? []) {
    if (t.status === "pending") {
      threadCountMap.set(t.item_id, (threadCountMap.get(t.item_id) ?? 0) + 1);
    }
    if (t.requester_id === user.id) myThreadMap.set(t.item_id, t.id);
  }

  return (
    <div>
      <h2 className="commons-heading mb-1 text-3xl">Free</h2>
      <p className="mb-4 text-sm">
        Curb piles and giveaway items from your neighbors — first come, first served.
      </p>

      <details className="commons-card mb-8 p-4">
        <summary className="cursor-pointer font-mono text-sm font-bold">+ post a free pile</summary>
        <form action={createFreePile} className="mt-3 flex flex-col gap-3">
          <input name="title" required placeholder="What's out there?" className="commons-input text-sm" />
          <textarea name="description" placeholder="Any details…" className="commons-input text-sm" />
          <input name="location" placeholder="Where (e.g. curb at 5th & Oak)" className="commons-input text-sm" />
          <ImageFileInput name="image_file" label="Photo (optional)" />
          <button className="commons-button self-start text-sm">Post pile</button>
        </form>
      </details>

      <FreeFeed
        key="free-feed"
        initialPiles={piles}
        initialPilesHasMore={(pileData?.length ?? 0) > PAGE_SIZE}
        initialItems={items}
        initialItemsHasMore={(itemData?.length ?? 0) > PAGE_SIZE}
        currentUserId={user.id}
        threadCountByItem={Array.from(threadCountMap.entries())}
        myThreadByItem={Array.from(myThreadMap.entries())}
      />
    </div>
  );
}