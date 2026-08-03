import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import {
  createItemRequest,
  respondToItemRequest,
  updateItemRequestStatus,
} from "@/app/actions";

const statusStampClass: Record<string, string> = {
  open: "commons-stamp commons-stamp-teal",
  fulfilled: "commons-stamp commons-stamp-olive",
  cancelled: "commons-stamp",
};

export default async function AsksPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: categories } = await supabase
    .from("categories")
    .select("id, name")
    .order("name");

  const { data: myItems } = await supabase
    .from("items")
    .select("id, name")
    .eq("owner_id", user.id)
    .eq("status", "available");

  const { data: asks, error: asksError } = await supabase
    .from("item_requests")
    .select(
      `id, title, description, status, created_at, requester_id,
       category:categories(name),
       requester:profiles(display_name),
       item_request_responses(
         id, message, created_at, responder_id,
         responder:profiles(display_name),
         item:items(id, name)
       )`
    )
    .order("created_at", { ascending: false });
  if (asksError) console.error("Asks query error:", asksError);

  return (
    <div>
      <h2 className="commons-heading mb-1 text-3xl">Asks</h2>
      <p className="mb-4 text-sm">
        Looking for something nobody&apos;s listed yet? Post an ask and see
        if a neighbor can help.
      </p>

      <details className="commons-card mb-8 p-4">
        <summary className="cursor-pointer font-mono text-sm font-bold">
          + post an ask
        </summary>
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
          <button className="commons-button self-start text-sm">
            Post ask
          </button>
        </form>
      </details>

      <div className="flex flex-col gap-6">
        {asks?.map((ask) => {
          const isMine = ask.requester_id === user.id;
          return (
            <div key={ask.id} className="commons-card p-4">
              <div className="commons-tape" />

              <div className="flex items-start justify-between">
                <div>
                  <h3 className="commons-heading text-2xl leading-tight">
                    {ask.title}
                  </h3>
                  <p className="font-mono text-xs text-commons-ink/70">
                    asked by {ask.requester?.display_name}
                  </p>
                </div>
                <span className={statusStampClass[ask.status] ?? "commons-stamp"}>
                  {ask.status}
                </span>
              </div>

              {ask.category?.name && (
                <span className="commons-stamp commons-stamp-olive mt-2 inline-block">
                  {ask.category.name}
                </span>
              )}

              {ask.description && (
                <p className="mt-2 text-sm">{ask.description}</p>
              )}

              {isMine && ask.status === "open" && (
                <div className="mt-3 flex gap-2">
                  <form action={updateItemRequestStatus}>
                    <input type="hidden" name="request_id" value={ask.id} />
                    <input type="hidden" name="status" value="fulfilled" />
                    <button className="commons-button text-xs">
                      Mark fulfilled
                    </button>
                  </form>
                  <form action={updateItemRequestStatus}>
                    <input type="hidden" name="request_id" value={ask.id} />
                    <input type="hidden" name="status" value="cancelled" />
                    <button className="commons-button commons-button-secondary text-xs">
                      Cancel
                    </button>
                  </form>
                </div>
              )}

              <div className="mt-4 flex flex-col gap-2 border-t-2 border-dashed border-commons-ink/40 pt-3">
                {ask.item_request_responses?.map((r) => (
                  <div key={r.id} className="text-sm">
                    <span className="font-mono text-xs font-bold">
                      {r.responder?.display_name}:
                    </span>{" "}
                    {r.message}
                    {r.item && (
                      <span className="ml-1 font-mono text-xs text-commons-teal">
                        (linked: {r.item.name})
                      </span>
                    )}
                  </div>
                ))}

                {!isMine && ask.status === "open" && (
                  <form
                    action={respondToItemRequest}
                    className="mt-1 flex flex-col gap-2"
                  >
                    <input type="hidden" name="request_id" value={ask.id} />
                    <textarea
                      name="message"
                      required
                      placeholder="I have one, or here's what I know…"
                      className="commons-input text-sm"
                    />
                    {myItems && myItems.length > 0 && (
                      <select name="item_id" className="commons-input text-sm">
                        <option value="">
                          (optional) Link one of your available items
                        </option>
                        {myItems.map((i) => (
                          <option key={i.id} value={i.id}>
                            {i.name}
                          </option>
                        ))}
                      </select>
                    )}
                    <button className="commons-button commons-button-secondary self-start text-xs">
                      Reply
                    </button>
                  </form>
                )}
              </div>
            </div>
          );
        })}

        {asks?.length === 0 && (
          <p className="font-mono text-sm">No asks yet — be the first!</p>
        )}
      </div>
    </div>
  );
}