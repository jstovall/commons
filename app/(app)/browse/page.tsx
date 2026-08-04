import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { toggleFavorite, addComment, requestLoan, flagContent } from "@/app/actions";

const statusStampClass: Record<string, string> = {
  available: "commons-stamp commons-stamp-teal",
  requested: "commons-stamp commons-stamp-brick",
  checked_out: "commons-stamp commons-stamp-brick",
  unavailable: "commons-stamp",
};


function formatDateTime(dateString: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "2-digit",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(dateString));
}
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
     comments(id, comment, created_at, content_flag, user_id, user:profiles(display_name))`
  )
  .eq("is_active", true)
  .eq("content_flag", false)
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
  .eq("borrower_id", user.id)
  .in("status", ["requested", "approved", "checked_out"]);
  const myLoanMap = new Map(
    ((myLoans ?? []) as { id: string; item_id: string; status: string }[]).map(
      (l) => [l.item_id, { id: l.id, status: l.status }]
    )
  );

  return (
    <div>
      <h2 className="commons-heading mb-4 text-3xl">Available to borrow</h2>

      <form className="mb-6 flex flex-wrap gap-2" action="/browse">
        <input
          type="text"
          name="q"
          defaultValue={q}
          placeholder="Search items…"
          className="commons-input flex-1 text-sm"
        />
        <select
          name="category"
          defaultValue={category ?? ""}
          className="commons-input text-sm"
        >
          <option value="">All categories</option>
          {categories?.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <button className="commons-button text-sm">Search</button>
      </form>

      <div className="flex flex-col gap-8">
        {items?.map((item) => {
          const isOwner = item.owner_id === user.id;
          const isFavorited = favoriteIds.has(item.id);
          const myLoan = myLoanMap.get(item.id);

          return (
            <div key={item.id} className="commons-card p-4">
              <div className="commons-tape" />

              <div className="flex items-start justify-between">
                <div>
                  <h3 className="commons-heading text-2xl leading-tight">
                    {item.name}
                  </h3>
                  <p className="font-mono text-xs text-commons-ink/70">
                    shared by {item.owner?.display_name}
                  </p>
                </div>
                <form action={toggleFavorite}>
                  <input type="hidden" name="item_id" value={item.id} />
                  <button type="submit" aria-label="Favorite" className="text-2xl">
                    {isFavorited ? "♥" : "♡"}
                  </button>
                </form>
              </div>

              {item.image_url && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={item.image_url}
                  alt={item.name}
                  className="mt-2 h-40 w-full rounded-md border-2 border-commons-ink object-cover"
                />
              )}

              {item.description && (
                <p className="mt-2 text-sm">{item.description}</p>
              )}

              <div className="mt-3 flex flex-wrap gap-2">
                <span className="commons-stamp commons-stamp-olive">
                  {item.category?.name ?? "uncategorized"}
                </span>
                <span className={statusStampClass[item.status] ?? "commons-stamp"}>
                  {item.status.replace("_", " ")}
                </span>
              </div>
{!isOwner && (
  <details className="mt-2">
    <summary className="cursor-pointer font-mono text-[10px] text-commons-ink/50">
      🚩 report this item
    </summary>
    <form action={flagContent} className="mt-1 flex gap-2">
      <input type="hidden" name="target_type" value="item" />
      <input type="hidden" name="target_id" value={item.id} />
      <input
        name="reason"
        required
        placeholder="Why report this item?"
        className="commons-input flex-1 text-xs"
      />
      <button className="commons-button commons-button-secondary text-xs">
        Submit
      </button>
    </form>
  </details>
)}
              {!isOwner && item.status === "available" && !myLoan && (
                <form action={requestLoan} className="mt-4 flex gap-2">
                  <input type="hidden" name="item_id" value={item.id} />
                  <input
                    type="text"
                    name="message"
                    placeholder="Optional note to owner…"
                    className="commons-input flex-1 text-sm"
                  />
                  <button className="commons-button text-sm">Request</button>
                </form>
              )}

              {myLoan && (
                <div className="mt-3 flex items-center gap-3">
                  <span className="commons-stamp commons-stamp-brick">
                    {myLoan.status.replace("_", " ")}
                  </span>
                  <a
                    href={`/loans/${myLoan.id}`}
                    className="font-mono text-xs font-bold underline"
                  >
                    view &amp; message →
                  </a>
                </div>
              )}

              <details className="mt-4">
                <summary className="cursor-pointer font-mono text-xs font-bold">
                  {item.comments?.length ?? 0} comment
                  {item.comments?.length === 1 ? "" : "s"}
                </summary>
                <div className="mt-2 flex flex-col gap-2 border-t-2 border-dashed border-commons-ink/40 pt-2">
{item.comments
  ?.filter((c) => !c.content_flag)
  .map((c) => (
    <div key={c.id}>
      <p className="text-sm">
        <span className="font-mono text-xs font-bold">
          {c.user?.display_name}:
        </span>{" "}
        {c.comment}{" "}
        <span className="font-mono text-[10px] text-commons-ink/50">
          · {formatDateTime(c.created_at)}
        </span>
      </p>
      {c.user_id !== user.id && (
        <details className="mt-0.5">
          <summary className="cursor-pointer font-mono text-[10px] text-commons-ink/50">
            🚩 report
          </summary>
          <form action={flagContent} className="mt-1 flex gap-2">
            <input type="hidden" name="target_type" value="comment" />
            <input type="hidden" name="target_id" value={c.id} />
            <input
              name="reason"
              required
              placeholder="Why report this comment?"
              className="commons-input flex-1 text-xs"
            />
            <button className="commons-button commons-button-secondary text-xs">
              Submit
            </button>
          </form>
        </details>
      )}
    </div>
  ))}
                  <form action={addComment} className="mt-1 flex gap-2">
                    <input type="hidden" name="item_id" value={item.id} />
                    <input
                      type="text"
                      name="comment"
                      placeholder="Add a comment…"
                      className="commons-input flex-1 text-sm"
                    />
                    <button className="commons-button commons-button-secondary text-sm">
                      Post
                    </button>
                  </form>
                </div>
              </details>
            </div>
          );
        })}

        {items?.length === 0 && (
          <p className="font-mono text-sm">No items match your search yet.</p>
        )}
      </div>
    </div>
  );
}