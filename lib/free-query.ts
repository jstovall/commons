export function buildFreePilesQuery(supabase: any, neighborhoodId: string) {
  return supabase
    .from("free_piles")
    .select(
      "id, title, description, image_url, location, latitude, longitude, status, claimed_by, last_confirmed_at, posted_by, poster:profiles!free_piles_posted_by_fkey(display_name)"
    )
    .eq("neighborhood_id", neighborhoodId)
    .eq("content_flag", false)
    .order("status", { ascending: false })
    .order("last_confirmed_at", { ascending: false })
    .order("id", { ascending: true });
}

export function buildGiveawayItemsQuery(supabase: any, neighborhoodId: string) {
  return supabase
    .from("items")
    .select(
      `id, name, description, image_url, status, owner_id,
       owner:profiles!items_owner_id_fkey(display_name)`
    )
    .eq("neighborhood_id", neighborhoodId)
    .eq("listing_type", "giveaway")
    .eq("is_active", true)
    .eq("content_flag", false)
    .order("status", { ascending: true })
    .order("updated_at", { ascending: false });
}