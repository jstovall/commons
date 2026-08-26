// Shared item-filtering logic for Browse — used by both the initial page
// load and the "load more" server action, so search/category/status
// filtering can never drift out of sync between the two.
export async function buildBrowseQuery(
  supabase: any,
  {
    neighborhoodId,
    userId,
    q,
    category,
    filter,
  }: {
    neighborhoodId: string;
    userId: string;
    q?: string;
    category?: string;
    filter?: string;
  }
) {
  const safeQ = q ? q.replace(/[,()]/g, " ").trim() : "";

  // If searching, also match items owned by a neighbor whose name matches —
  // requires a separate lookup since PostgREST can't cleanly OR a local
  // column match against a joined table's column in one query.
  let ownerIds: string[] = [];
  if (safeQ) {
    const { data: matchingOwners } = await supabase
      .from("neighborhood_members")
      .select("user_id, profile:profiles!inner(display_name)")
      .eq("neighborhood_id", neighborhoodId)
      .eq("status", "active")
      .ilike("profile.display_name", `%${safeQ}%`);
    ownerIds = (matchingOwners ?? []).map((m: { user_id: string }) => m.user_id);
  }

  let query = supabase
    .from("items")
    .select(
      `id, name, description, image_url, status, content_flag, created_at, favorite_count, owner_id,
       category:categories(name),
       owner:profiles!items_owner_id_fkey(display_name)`
    )
    .eq("is_active", true)
    .eq("content_flag", false)
    .eq("listing_type", "loan")
    .eq("neighborhood_id", neighborhoodId);

  if (safeQ) {
    const orParts = [`name.ilike.%${safeQ}%`, `description.ilike.%${safeQ}%`];
    if (ownerIds.length > 0) orParts.push(`owner_id.in.(${ownerIds.join(",")})`);
    query = query.or(orParts.join(","));
  }
  if (category) query = query.eq("category_id", category);

  const selectedFilter = filter ?? "available";
  if (selectedFilter === "available" || selectedFilter === "most_popular") {
    query = query.eq("status", "available").neq("owner_id", userId);
  } else if (selectedFilter === "checked_out") {
    query = query.in("status", ["checked_out", "requested"]).neq("owner_id", userId);
  } else if (selectedFilter === "my_items") {
    query = query.eq("owner_id", userId);
  }
  // "favorites" is handled by the caller, since it needs its own lookup first.

  if (selectedFilter === "most_popular") {
    query = query.order("favorite_count", { ascending: false }).order("created_at", { ascending: false });
  } else {
    query = query.order("created_at", { ascending: false });
  }

  return { query };
}