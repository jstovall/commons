import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";

export const CURRENT_NEIGHBORHOOD_COOKIE = "commons_current_neighborhood";

export async function getCurrentMembership(userId: string) {
  const supabase = await createClient();
  const cookieStore = await cookies();
  const preferredId = cookieStore.get(CURRENT_NEIGHBORHOOD_COOKIE)?.value;

  const { data: memberships } = await supabase
    .from("neighborhood_members")
    .select("neighborhood_id, role, neighborhood:neighborhoods(name)")
    .eq("user_id", userId)
    .eq("status", "active");

  if (!memberships || memberships.length === 0) {
    return { memberships: [], current: null };
  }

  const current =
    memberships.find((m) => m.neighborhood_id === preferredId) ?? memberships[0];

  return { memberships, current };
}