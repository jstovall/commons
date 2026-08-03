import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { toggleFavorite, addComment, requestLoan } from "@/app/actions";

export default async function BrowsePage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; category?: string }>;
}) {
  const { q, category } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: categories } = await supabase
    .from("categories")
    .select("id, name")
    .order("name");

  let query = supabase
    .from("items")
    .select(
      `id, name, description, image_url, status, created_at, owner_id,
       category:categories(name),
       owner:profiles!items_owner_id_fkey(display_name),
       comments(id, comment, created_at, user:profiles(display_name))`
    )
    .eq("is_active", true)
    .order("created_at", { ascending: false });

  if (q) query = query.ilike("name", `%${q}%`);
  if (category) query = query.eq("category_id", category);

  const { data: items, error: itemsError } = await query;
  if (itemsError) console.error("Browse query error:", itemsError);

const { data: favorites } = await supabase
  .from("favorites")
  .select("item_id")
  .eq("user_id", user.id);

const favoriteIds = new Set(
  ((favorites ?? []) as { item_id: string }[]).map((f) => f.item_id)
);

const { data: myLoans } = await supabase
  .from("loans")
  .select("id, item_id, status")
  .eq("borrower_id", user.id);
const myLoanMap = new Map(
  (myLoans ?? []).map((l) => [l.item_id, { id: l.id, status: l.status }])
);

  return (
    <div>
      <h2 className="mb-4 text-xl font-semibold text-commons-dark">
        Available to Borrow
      </h2>

      <form className="mb-6 flex gap-2" action="/browse">
        <input
          type="text"
          name="q"
          defaultValue={q}
          placeholder="Search items…"
          className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm"
        />
        <select
          name="category"
          defaultValue={category ?? ""}
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
        >
          <option value="">All categories</option>
          {categories?.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <button className="rounded-lg bg-commons px-4 py-2 text-sm font-medium text-white">
          Search
        </button>
      </form>

      <div className="flex flex-col gap-4">
        {items?.map((item) => {
          const isOwner = item.owner_id === user.id;
          const isFavorited = favoriteIds.has(item.id);
          const myLoan = myLoanMap.get(item.id);

          return (
            <div key={item.id} className="rounded-xl border border-gray-200 p-4">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-medium text-commons-dark">{item.name}</h3>
                  <p className="text-xs text-gray-500">
                    {item.category?.name ?? "Uncategorized"} · shared by{" "}
                    {item.owner?.display_name}
                  </p>
                </div>
                <form action={toggleFavorite}>
                  <input type="hidden" name="item_id" value={item.id} />
                  <button type="submit" aria-label="Favorite" className="text-lg">
                    {isFavorited ? "♥" : "♡"}
                  </button>
                </form>
              </div>

              {item.image_url && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={item.image_url}
                  alt={item.name}
                  className="mt-2 h-40 w-full rounded-lg object-cover"
                />
              )}

              {item.description && (
                <p className="mt-2 text-sm text-gray-600">{item.description}</p>
              )}

              <span className="mt-2 inline-block rounded-full bg-gray-100 px-2 py-0.5 text-xs capitalize text-gray-600">
                {item.status.replace("_", " ")}
              </span>

              {!isOwner && item.status === "available" && !myLoan && (
                <form action={requestLoan} className="mt-3 flex gap-2">
                  <input type="hidden" name="item_id" value={item.id} />
                  <input
                    type="text"
                    name="message"
                    placeholder="Optional note to owner…"
                    className="flex-1 rounded-lg border border-gray-300 px-3 py-1.5 text-sm"
                  />
                  <button className="rounded-lg bg-commons px-3 py-1.5 text-sm font-medium text-white">
                    Request to borrow
                  </button>
                </form>
              )}

              {myLoan && (
                <>
                  <p className="mt-2 text-xs font-medium text-commons">
                      Your request: {myLoan.status.replace("_", " ")}
                  </p>
                  <a
                     href={`/loans/${myLoan.id}`}
                    className="text-xs text-commons hover:underline"
                  >
                    View & message →
                  </a>
                </>
              )}

              <details className="mt-3">
                <summary className="cursor-pointer text-xs text-gray-500">
                  {item.comments?.length ?? 0} comment
                  {item.comments?.length === 1 ? "" : "s"}
                </summary>
                <div className="mt-2 flex flex-col gap-2">
                  {item.comments?.map((c) => (
                    <p key={c.id} className="text-sm">
                      <span className="font-medium">{c.user?.display_name}:</span>{" "}
                      {c.comment}
                    </p>
                  ))}
                  <form action={addComment} className="mt-1 flex gap-2">
                    <input type="hidden" name="item_id" value={item.id} />
                    <input
                      type="text"
                      name="comment"
                      placeholder="Add a comment…"
                      className="flex-1 rounded-lg border border-gray-300 px-3 py-1.5 text-sm"
                    />
                    <button className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm">
                      Post
                    </button>
                  </form>
                </div>
              </details>
            </div>
          );
        })}

        {items?.length === 0 && (
          <p className="text-sm text-gray-500">No items match your search yet.</p>
        )}
      </div>
    </div>
  );
}