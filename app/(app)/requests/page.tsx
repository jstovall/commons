import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import {
  createItemRequest,
  respondToItemRequest,
  updateItemRequestStatus,
} from "@/app/actions";

export default async function RequestsPage() {
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

  const { data: requests, error: requestsError } = await supabase
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
  if (requestsError) console.error("Requests query error:", requestsError);

  return (
    <div>
      <h2 className="mb-4 text-xl font-semibold text-commons-dark">
        Requests
      </h2>
      <p className="mb-4 text-sm text-gray-500">
        Looking for something nobody&apos;s listed yet? Post a request and see
        if a neighbor can help.
      </p>

      <details className="mb-6 rounded-xl border border-gray-200 p-4">
        <summary className="cursor-pointer font-medium text-commons">
          + Post a request
        </summary>
        <form action={createItemRequest} className="mt-3 flex flex-col gap-3">
          <input
            name="title"
            required
            placeholder="What are you looking for?"
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
          />
          <select
            name="category_id"
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
          >
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
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
          />
          <button className="self-start rounded-lg bg-commons px-4 py-2 text-sm font-medium text-white">
            Post request
          </button>
        </form>
      </details>

      <div className="flex flex-col gap-4">
        {requests?.map((req) => {
          const isMine = req.requester_id === user.id;
          return (
            <div key={req.id} className="rounded-xl border border-gray-200 p-4">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-medium text-commons-dark">{req.title}</h3>
                  <p className="text-xs text-gray-500">
                    {req.category?.name ?? "Uncategorized"} · asked by{" "}
                    {req.requester?.display_name}
                  </p>
                </div>
                <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs capitalize text-gray-600">
                  {req.status}
                </span>
              </div>

              {req.description && (
                <p className="mt-2 text-sm text-gray-600">{req.description}</p>
              )}

              {isMine && req.status === "open" && (
                <div className="mt-2 flex gap-2">
                  <form action={updateItemRequestStatus}>
                    <input type="hidden" name="request_id" value={req.id} />
                    <input type="hidden" name="status" value="fulfilled" />
                    <button className="rounded-lg bg-commons px-3 py-1 text-xs font-medium text-white">
                      Mark fulfilled
                    </button>
                  </form>
                  <form action={updateItemRequestStatus}>
                    <input type="hidden" name="request_id" value={req.id} />
                    <input type="hidden" name="status" value="cancelled" />
                    <button className="rounded-lg border border-gray-300 px-3 py-1 text-xs">
                      Cancel
                    </button>
                  </form>
                </div>
              )}

              <div className="mt-3 flex flex-col gap-2">
                {req.item_request_responses?.map((r) => (
                  <div key={r.id} className="rounded-lg bg-gray-50 p-2 text-sm">
                    <span className="font-medium">{r.responder?.display_name}:</span>{" "}
                    {r.message}
                    {r.item && (
                      <span className="ml-1 text-xs text-commons">
                        (linked to their item: {r.item.name})
                      </span>
                    )}
                  </div>
                ))}

                {!isMine && req.status === "open" && (
                  <form action={respondToItemRequest} className="mt-1 flex flex-col gap-2">
                    <input type="hidden" name="request_id" value={req.id} />
                    <textarea
                      name="message"
                      required
                      placeholder="I have one, or here's what I know…"
                      className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
                    />
                    {myItems && myItems.length > 0 && (
                      <select
                        name="item_id"
                        className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
                      >
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
                    <button className="self-start rounded-lg border border-gray-300 px-3 py-1.5 text-xs">
                      Reply
                    </button>
                  </form>
                )}
              </div>
            </div>
          );
        })}

        {requests?.length === 0 && (
          <p className="text-sm text-gray-500">No requests yet — be the first!</p>
        )}
      </div>
    </div>
  );
}