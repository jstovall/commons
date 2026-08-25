import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { createItemRequest } from "@/app/actions";
import { getCurrentMembership } from "@/lib/current-neighborhood";
import { buildAsksQuery } from "@/lib/asks-query";
import AsksList from "./AsksList";

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

      <details className="commons-card mb-8 p-4">
        <summary className="cursor-pointer font-mono text-sm font-bold">+ post an ask</summary>
        <form action={createItemRequest} className="mt-3 flex flex-col gap-3">
          <input
            name="title"
            required
            placeholder="What are you looking for?"
            className="commons-input text-sm"
          />
          <select name="category_id" className="commons-input text-sm">
            <option value="">Choose a category</option>
            {categories?.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <textarea
            name="description"
            placeholder="Any details (how long you need it, etc.)"
            className="commons-input text-sm"
          />
          <button className="commons-button self-start text-sm">Post ask</button>
        </form>
      </details>

      <AsksList
        key="asks-list"
        initialAsks={asks}
        initialHasMore={hasMore}
        currentUserId={user.id}
        myItems={myItems ?? []}
        threadEntries={threadEntries}
      />
    </div>
  );
}