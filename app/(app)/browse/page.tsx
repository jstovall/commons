import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { getCurrentMembership } from "@/lib/current-neighborhood";
import { buildBrowseQuery } from "@/lib/browse-query";
import SearchBar from "./SearchBar";
import ItemGrid from "./ItemGrid";

const PAGE_SIZE = 12;

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
  const favoriteIds = (favorites ?? []).map((f) => f.item_id);

  const { data: myLoans } = await supabase
    .from("loans")
    .select("id, item_id, status")
    .eq("borrower_id", user.id)
    .in("status", ["requested", "approved", "checked_out", "overdue"]);
  const myLoanEntries = (myLoans ?? []).map(
    (l) => [l.item_id, { id: l.id, status: l.status }] as const
  );

  const selectedFilter = filter ?? "available";

  let items: any[] = [];
  let hasMore = false;

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
  } else if (selectedFilter === "favorites" && favoriteIds.length === 0) {
    items = [];
  } else {
    let query = buildBrowseQuery(supabase, {
      neighborhoodId: membership.neighborhood_id,
      userId: user.id,
      q,
      category,
      filter: selectedFilter,
    });
    if (selectedFilter === "favorites") {
      query = query.in("id", favoriteIds);
    }
    const { data, error } = await query.range(0, PAGE_SIZE);
    if (error) console.error("Browse query error:", error);
    hasMore = (data?.length ?? 0) > PAGE_SIZE;
    items = (data ?? []).slice(0, PAGE_SIZE);
  }

  return (
    <div>
      <h2 className="commons-heading mb-4 text-3xl">Available to borrow</h2>

      {itemParam && items[0]?.content_flag && (
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

      <ItemGrid
        initialItems={items}
        initialHasMore={hasMore}
        favoriteIds={favoriteIds}
        myLoanEntries={myLoanEntries}
        currentUserId={user.id}
        queryParams={{ q, category, filter: selectedFilter }}
        isDeepLink={Boolean(itemParam)}
        emptyMessage={itemParam ? "That item couldn't be found." : "No items match your search yet."}
      />
    </div>
  );
}