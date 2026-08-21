import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { getCurrentMembership } from "@/lib/current-neighborhood";
import { formatDate } from "@/lib/format";
import {
  createFreePile,
  updateFreePileStatus,
  startGiveawayThread,
  flagContent,
} from "@/app/actions";

export default async function FreePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { current: membership } = await getCurrentMembership(user.id);
  if (!membership) redirect("/join");

  const { data: piles, error: pilesError } = await supabase
    .from("free_piles")
    .select(
      "id, title, description, image_url, location, status, claimed_by, last_confirmed_at, posted_by, poster:profiles!free_piles_posted_by_fkey(display_name)"
    )
    .eq("neighborhood_id", membership.neighborhood_id)
    .eq("content_flag", false)
    .order("last_confirmed_at", { ascending: false });
  if (pilesError) console.error("Free piles query error:", pilesError);

  const { data: giveawayItems, error: itemsError } = await supabase
    .from("items")
    .select(
      `id, name, description, image_url, status, owner_id,
       owner:profiles!items_owner_id_fkey(display_name)`
    )
    .eq("neighborhood_id", membership.neighborhood_id)
    .eq("listing_type", "giveaway")
    .eq("is_active", true)
    .eq("content_flag", false)
    .order("updated_at", { ascending: false });
  if (itemsError) console.error("Giveaway items query error:", itemsError);

  const itemIds = (giveawayItems ?? []).map((i) => i.id);
const { data: threads } = itemIds.length
  ? await supabase
      .from("giveaway_threads")
      .select("id, item_id, requester_id, status")
      .in("item_id", itemIds)
  : { data: [] };

const threadCountByItem = new Map<string, number>();
const myThreadByItem = new Map<string, string>();
for (const t of threads ?? []) {
  if (t.status === "pending") {
    threadCountByItem.set(t.item_id, (threadCountByItem.get(t.item_id) ?? 0) + 1);
  }
  if (t.requester_id === user.id) myThreadByItem.set(t.item_id, t.id);
}

  const activePiles = (piles ?? []).filter((p) => p.status !== "gone");
  const gonePiles = (piles ?? []).filter((p) => p.status === "gone");
  const activeItems = (giveawayItems ?? []).filter((i) => i.status === "available");
  const goneItems = (giveawayItems ?? []).filter((i) => i.status !== "available");

  return (
    <div>
      <h2 className="commons-heading mb-1 text-3xl">Free</h2>
      <p className="mb-4 text-sm">
        Curb piles and giveaway items from your neighbors — first come, first served.
      </p>

      <details className="commons-card mb-8 p-4">
        <summary className="cursor-pointer font-mono text-sm font-bold">
          + post a free pile
        </summary>
        <form action={createFreePile} className="mt-3 flex flex-col gap-3">
          <input name="title" required placeholder="What's out there?" className="commons-input text-sm" />
          <textarea name="description" placeholder="Any details…" className="commons-input text-sm" />
          <input name="location" placeholder="Where (e.g. curb at 5th & Oak)" className="commons-input text-sm" />
          <label className="font-mono text-xs font-bold uppercase">
            Photo (optional)
            <input
              type="file"
              name="image_file"
              accept="image/*"
              className="commons-input mt-1 w-full text-sm font-body normal-case"
            />
          </label>
          <button className="commons-button self-start text-sm">Post pile</button>
        </form>
      </details>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {activePiles.map((pile) => (
          <div key={pile.id} className="commons-card p-4">
            <div className="commons-tape" />
            <div className="flex items-start justify-between">
              <div>
                <h3 className="commons-heading text-2xl leading-tight">{pile.title}</h3>
                <p className="font-mono text-xs text-commons-ink/70">
                  posted by {pile.poster?.display_name} · updated {formatDate(pile.last_confirmed_at)}
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
                  {pile.claimed_by !== user.id && (
                    <form action={updateFreePileStatus}>
                      <input type="hidden" name="pile_id" value={pile.id} />
                      <input type="hidden" name="new_status" value="gone" />
                      <button className="commons-button text-xs">Confirm it&apos;s gone</button>
                    </form>
                  )}
                </>
              )}
            </div>

            {pile.posted_by !== user.id && (
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
                  <button className="commons-button commons-button-secondary text-xs">
                    Submit
                  </button>
                </form>
              </details>
            )}
          </div>
        ))}

        {activeItems.map((item) => {
          const isOwner = item.owner_id === user.id;
          const threadCount = threadCountByItem.get(item.id) ?? 0;
          const myThreadId = myThreadByItem.get(item.id);
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
            </div>
          );
        })}

        {activePiles.length === 0 && activeItems.length === 0 && (
          <p className="font-mono text-sm">Nothing free right now — check back later!</p>
        )}
      </div>

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
    </div>
  );
}