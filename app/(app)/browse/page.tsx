import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { toggleFavorite, requestLoan, flagContent } from "@/app/actions";
import { getCurrentMembership } from "@/lib/current-neighborhood";
import SearchBar from "./SearchBar";

const statusStampClass: Record<string, string> = {
  available: "commons-stamp commons-stamp-teal",
  requested: "commons-stamp commons-stamp-brick",
  checked_out: "commons-stamp commons-stamp-brick",
  unavailable: "commons-stamp",
};

export default async function BrowsePage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    category?: string;
    filter?: string;
    item?: string;
  }>;
}) {
  const { q, category, filter, item: itemParam } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { current: membership } = await getCurrentMembership(user.id);
  if (!membership) redirect("/join");

  const isAdmin = membership.role === "admin" || membership.role === "moderator";

  const { data: categories } = await supabase
    .from("categories")
    .select("id, name")
    .order("name");

  const { data: favorites } = await supabase
    .from("favorites")
    .select("item_id")
    .eq("user_id", user.id);
  const favoriteIds = new Set(
    ((favorites ?? []) as { item_id: string }[]).map((f) => f.item_id)
  );

  const selectedFilter = filter ?? "available";

  let items: any[] | null = [];
  let itemsError: any = null;

  if (itemParam) {
    let query = supabase
      .from("items")
      .select(
        `id, name, description, image_url, status, content_flag, created_at, owner_id,
         category:categories(name),
         owner:profiles!items_owner_id_fkey(display_name)`
      )
      .eq("id", itemParam)
      .eq("neighborhood_id", membership.neighborhood_id);

    if (!isAdmin) {
      query = query.eq("content_flag", false).eq("is_active", true);
    }

    const result = await query.maybeSingle();
    items = result.data ? [result.data] : [];
    itemsError = result.error;
  } else if (selectedFilter === "favorites" && favoriteIds.size === 0) {
    items = [];
  } else {
    let query = supabase
      .from("items")
      .select(
        `id, name, description, image_url, status, content_flag, created_at, owner_id,
         category:categories(name),
         owner:profiles!items_owner_id_fkey(display_name)`
      )
      .eq("is_active", true)
      .eq("content_flag", false)
      .eq("neighborhood_id", membership.neighborhood_id)
      .order("created_at", { ascending: false });

    if (q) {
      const safe = q.replace(/[,()]/g, " ").trim();
      if (safe) query = query.or(`name.ilike.%${safe}%,description.ilike.%${safe}%`);
    }
    if (category) query = query.eq("category_id", category);

    if (selectedFilter === "available") {
      query = query.eq("status", "available").neq("owner_id", user.id);
    } else if (selectedFilter === "checked_out") {
      query = query.in("status", ["checked_out", "requested"]).neq("owner_id", user.id);
    } else if (selectedFilter === "my_items") {
      query = query.eq("owner_id", user.id);
    } else if (selectedFilter === "favorites") {
      query = query.in("id", Array.from(favoriteIds));
    }

    const result = await query;
    items = result.data;
    itemsError = result.error;
  }

  if (itemsError) console.error("Browse query error:", itemsError);

  const { data: myLoans } = await supabase
    .from("loans")
    .select("id, item_id, status")
    .eq("borrower_id", user.id)
    .in("status", ["requested", "approved", "checked_out", "overdue"]);
  const myLoanMap = new Map(
    ((myLoans ?? []) as { id: string; item_id: string; status: string }[]).map(
      (l) => [l.item_id, { id: l.id, status: l.status }]
    )
  );

  return (
    <div>
      <h2 className="commons-heading mb-4 text-3xl">Available to borrow</h2>

      {itemParam && items?.[0]?.content_flag && (
        <p className="mb-4 font-mono text-xs text-commons-brick">
          Viewing flagged content — normally hidden from Browse.
        </p>
      )}

      {!itemParam && (
        <SearchBar
          initialQuery={q ?? ""}
          initialCategory={category ?? ""}
          initialFilter={selectedFilter}
          categories={categories ?? []}
        />
      )}

      {itemParam && (
        <a href="/browse" className="mb-4 inline-block font-mono text-xs font-bold underline">
          ← back to Browse
        </a>
      )}

      <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
        {items?.map((item) => {
          const isOwner = item.owner_id === user.id;
          const isFavorited = favoriteIds.has(item.id);
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
                    className={`text-2xl ${
                      isFavorited ? "text-commons-brick" : "text-commons-ink/55"
                    }`}
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

        {items?.length === 0 && (
          <p className="font-mono text-sm">
            {itemParam ? "That item couldn't be found." : "No items match your search yet."}
          </p>
        )}
      </div>
    </div>
  );
}