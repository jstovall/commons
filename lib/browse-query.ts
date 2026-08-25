// Shared item-filtering logic for Browse — used by both the initial page
// load and the "load more" server action, so search/category/status
// filtering can never drift out of sync between the two.
export function buildBrowseQuery(
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
  let query = supabase
    .from("items")
    .select(
      `id, name, description, image_url, status, content_flag, created_at, owner_id,
       category:categories(name),
       owner:profiles!items_owner_id_fkey(display_name)`
    )
    .eq("is_active", true)
    .eq("content_flag", false)
    .eq("listing_type", "loan")
    .eq("neighborhood_id", neighborhoodId)
    .order("created_at", { ascending: false });

  if (q) {
    const safe = q.replace(/[,()]/g, " ").trim();
    if (safe) query = query.or(`name.ilike.%${safe}%,description.ilike.%${safe}%`);
  }
  if (category) query = query.eq("category_id", category);

  const selectedFilter = filter ?? "available";
  if (selectedFilter === "available") {
    query = query.eq("status", "available").neq("owner_id", userId);
  } else if (selectedFilter === "checked_out") {
    query = query.in("status", ["checked_out", "requested"]).neq("owner_id", userId);
  } else if (selectedFilter === "my_items") {
    query = query.eq("owner_id", userId);
  }
  // "favorites" is handled by the caller, since it needs its own lookup first.

  return query;
}