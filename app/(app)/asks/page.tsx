import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { getCurrentMembership } from "@/lib/current-neighborhood";
import { buildAsksQuery } from "@/lib/asks-query";
import AsksList from "./AsksList";
import AskForm from "./AskForm";

const PAGE_SIZE = 9;

export default async function AsksPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { current: membership } = await getCurrentMembership(user.id);
  if (!membership) redirect("/join");

  const { data: categories } = await supabase.from("categories").select("id, name").order("name");

  const { data: myItems } = await supabase
    .from("items")
    .select("id, name")
    .eq("owner_id", user.id)
    .eq("status", "available");

  const { data: myThreads } = await supabase
    .from("ask_threads")
    .select("id, request_id, responder_id")
    .eq("requester_id", user.id);
  const threadEntries = (myThreads ?? []).map(
    (t) => [`${t.request_id}:${t.responder_id}`, t.id] as const
  );

  const { data, error } = await buildAsksQuery(supabase, membership.neighborhood_id).range(
    0,
    PAGE_SIZE
  );
  if (error) console.error("Asks query error:", error);
  const hasMore = (data?.length ?? 0) > PAGE_SIZE;
  const asks = (data ?? []).slice(0, PAGE_SIZE);

  return (
    <div>
      <h2 className="commons-heading mb-1 text-3xl">Asks</h2>
      <p className="mb-4 text-sm">
        Looking for something nobody&apos;s listed yet? Post an ask and see if a neighbor can help.
      </p>

      <AskForm categories={categories ?? []} />

      <AsksList
        key={`${asks.length}-${asks[0]?.id ?? "none"}`}
        initialAsks={asks}
        initialHasMore={hasMore}
        currentUserId={user.id}
        myItems={myItems ?? []}
        threadEntries={threadEntries}
      />
    </div>
  );
}