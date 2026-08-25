export function buildAsksQuery(supabase: any, neighborhoodId: string) {
  return supabase
    .from("item_requests")
    .select(
      `id, title, description, status, created_at, requester_id, content_flag,
       category:categories(name),
       requester:profiles(display_name),
       item_request_responses(
         id, message, created_at, responder_id,
         responder:profiles(display_name),
         item:items(id, name)
       )`
    )
    .eq("content_flag", false)
    .eq("neighborhood_id", neighborhoodId)
    .order("status", { ascending: true })
    .order("created_at", { ascending: false });
}