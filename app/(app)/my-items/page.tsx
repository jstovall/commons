import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import {
  createItem,
  updateItem,
  deleteItem,
  respondToLoan,
} from "@/app/actions";

export default async function MyItemsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: categories } = await supabase
    .from("categories")
    .select("id, name")
    .order("name");

  const { data: items, error: itemsError } = await supabase
    .from("items")
    .select("id, name, description, image_url, category_id, status")
    .eq("owner_id", user.id)
    .eq("is_active", true)
    .order("created_at", { ascending: false });
  if (itemsError) console.error("My-items query error:", itemsError);

  const { data: incomingLoans, error: loansError } = await supabase
    .from("loans")
    .select(
      `id, status, borrower_message, requested_at,
       item:items(name),
       borrower:profiles!loans_borrower_id_fkey(display_name)`
    )
    .eq("owner_id", user.id)
    .in("status", ["requested", "approved", "checked_out"])
    .order("requested_at", { ascending: false });
  if (loansError) console.error("Incoming loans query error:", loansError);

  return (
    <div>
      <h2 className="mb-4 text-xl font-semibold text-commons-dark">
        What I&apos;m Sharing
      </h2>

      <details className="mb-6 rounded-xl border border-gray-200 p-4">
        <summary className="cursor-pointer font-medium text-commons">
          + Post a new item
        </summary>
        <form action={createItem} className="mt-3 flex flex-col gap-3">
          <input
            name="name"
            required
            placeholder="Item name"
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
            placeholder="Description"
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
          />
          <input
            name="image_url"
            placeholder="Image URL (optional for now)"
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
          />
          <button className="self-start rounded-lg bg-commons px-4 py-2 text-sm font-medium text-white">
            Post item
          </button>
        </form>
      </details>

      {incomingLoans && incomingLoans.length > 0 && (
        <div className="mb-6">
          <h3 className="mb-2 text-sm font-semibold text-gray-700">
            Requests on your items
          </h3>
          <div className="flex flex-col gap-3">
        {incomingLoans.map((loan) => (
          <div key={loan.id} className="rounded-xl border border-gray-200 p-3">
            <p className="text-sm">
              <span className="font-medium">{loan.borrower?.display_name}</span>{" "}
              wants to borrow <span className="font-medium">{loan.item?.name}</span>
            </p>
            {loan.borrower_message && (
              <p className="mt-1 text-xs text-gray-500">
                &ldquo;{loan.borrower_message}&rdquo;
              </p>
            )}
            <div className="mt-2 flex gap-2">
              {loan.status === "requested" && (
                <>
                  <form action={respondToLoan}>
                    <input type="hidden" name="loan_id" value={loan.id} />
                    <input type="hidden" name="action" value="approve" />
                    <button className="rounded-lg bg-commons px-3 py-1 text-xs font-medium text-white">
                      Approve
                    </button>
                  </form>
                  <form action={respondToLoan}>
                    <input type="hidden" name="loan_id" value={loan.id} />
                    <input type="hidden" name="action" value="deny" />
                    <button className="rounded-lg border border-gray-300 px-3 py-1 text-xs">
                      Deny
                    </button>
                  </form>
                </>
              )}
              {loan.status === "approved" && (
                <form action={respondToLoan}>
                  <input type="hidden" name="loan_id" value={loan.id} />
                  <input type="hidden" name="action" value="checkout" />
                  <button className="rounded-lg bg-commons px-3 py-1 text-xs font-medium text-white">
                    Mark checked out
                  </button>
                </form>
              )}
              {loan.status === "checked_out" && (
                <form action={respondToLoan}>
                  <input type="hidden" name="loan_id" value={loan.id} />
                  <input type="hidden" name="action" value="return" />
                  <button className="rounded-lg bg-commons px-3 py-1 text-xs font-medium text-white">
                    Mark returned
                  </button>
                </form>
              )}
            </div>
            <a
              href={`/loans/${loan.id}`}
              className="mt-1 inline-block text-xs text-commons hover:underline"
            >
              View &amp; message →
            </a>
          </div>
        ))}
          </div>
        </div>
      )}

      <div className="flex flex-col gap-4">
        {items?.map((item) => (
          <div key={item.id} className="rounded-xl border border-gray-200 p-4">
            <div className="flex items-center justify-between">
              <h3 className="font-medium text-commons-dark">{item.name}</h3>
              <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs capitalize text-gray-600">
                {item.status.replace("_", " ")}
              </span>
            </div>

            <details className="mt-2">
              <summary className="cursor-pointer text-xs text-gray-500">
                Edit
              </summary>
              <form action={updateItem} className="mt-2 flex flex-col gap-2">
                <input type="hidden" name="item_id" value={item.id} />
                <input
                  name="name"
                  defaultValue={item.name}
                  className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
                />
                <select
                  name="category_id"
                  defaultValue={item.category_id ?? ""}
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
                  defaultValue={item.description ?? ""}
                  className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
                />
                <input
                  name="image_url"
                  defaultValue={item.image_url ?? ""}
                  className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
                />
                <div className="flex gap-2">
                  <button className="rounded-lg bg-commons px-3 py-1.5 text-xs font-medium text-white">
                    Save
                  </button>
                </div>
              </form>
              <form action={deleteItem} className="mt-2">
                <input type="hidden" name="item_id" value={item.id} />
                <button className="text-xs text-red-600 hover:underline">
                  Delete item
                </button>
              </form>
            </details>
          </div>
        ))}

        {items?.length === 0 && (
          <p className="text-sm text-gray-500">
            You haven&apos;t posted anything yet.
          </p>
        )}
      </div>
    </div>
  );
}