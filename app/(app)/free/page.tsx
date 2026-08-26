import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { getCurrentMembership } from "@/lib/current-neighborhood";
import { buildFreePilesQuery, buildGiveawayItemsQuery } from "@/lib/free-query";
import { createFreePile } from "@/app/actions";
import ImageFileInput from "../my-items/ImageFileInput";
import FreeFeed from "./FreeFeed";
import FreePileForm from "./FreePileForm";

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

  const itemIds = items.map((i: { id: string }) => i.id);
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

<FreePileForm />

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