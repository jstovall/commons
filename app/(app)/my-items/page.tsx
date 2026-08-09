import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { respondToLoan } from "@/app/actions";
import { getCurrentMembership } from "@/lib/current-neighborhood";
import ImageFileInput from "./ImageFileInput";
import NewItemForm from "./NewItemForm";
import EditItemForm from "./EditItemForm";

export default async function MyItemsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { current: membership } = await getCurrentMembership(user.id);
if (!membership) redirect("/join");

  const { data: categories } = await supabase
    .from("categories")
    .select("id, name")
    .order("name");

const { data: items, error: itemsError } = await supabase
  .from("items")
  .select(
    "id, name, description, image_url, category_id, status, category:categories(name)"
  )
  .eq("owner_id", user.id)
  .eq("is_active", true)
  .eq("neighborhood_id", membership.neighborhood_id)
  .order("created_at", { ascending: false });
if (itemsError) console.error("My-items query error:", itemsError);

const groupedItems = new Map<string, typeof items>();
for (const item of items ?? []) {
  const groupName = item.category?.name ?? "Uncategorized";
  if (!groupedItems.has(groupName)) groupedItems.set(groupName, []);
  groupedItems.get(groupName)!.push(item);
}
const sortedGroups = Array.from(groupedItems.entries()).sort(([a], [b]) =>
  a === "Uncategorized" ? 1 : b === "Uncategorized" ? -1 : a.localeCompare(b)
);

  const { data: incomingLoans, error: loansError } = await supabase
    .from("loans")
    .select(
      `id, status, borrower_message, requested_at,
       item:items(name),
       borrower:profiles!loans_borrower_id_fkey(display_name)`
    )
    .eq("owner_id", user.id)
    .in("status", ["requested", "approved", "checked_out"])
    .eq("neighborhood_id", membership.neighborhood_id)
    .order("requested_at", { ascending: false });
  if (loansError) console.error("Incoming loans query error:", loansError);

  return (
    <div>
      <h2 className="commons-heading mb-4 text-3xl">What I&apos;m sharing</h2>

<NewItemForm categories={categories ?? []} />

      {incomingLoans && incomingLoans.length > 0 && (
        <div className="mb-8">
          <h3 className="mb-3 font-mono text-sm font-bold uppercase">
            Requests on your items
          </h3>
          <div className="flex flex-col gap-6">
            {incomingLoans.map((loan) => (
              <div key={loan.id} className="commons-card p-4">
                <div className="commons-tape" />
                <p className="text-sm">
                  <span className="font-mono font-bold">
                    {loan.borrower?.display_name}
                  </span>{" "}
                  wants to borrow{" "}
                  <span className="font-mono font-bold">{loan.item?.name}</span>
                </p>
                {loan.borrower_message && (
                  <p className="mt-1 text-sm italic">
                    &ldquo;{loan.borrower_message}&rdquo;
                  </p>
                )}
                <div className="mt-3 flex flex-wrap gap-2">
                  {loan.status === "requested" && (
                    <>
                      <form action={respondToLoan}>
                        <input type="hidden" name="loan_id" value={loan.id} />
                        <input type="hidden" name="action" value="approve" />
                        <button className="commons-button text-xs">
                          Approve
                        </button>
                      </form>
                      <form action={respondToLoan}>
                        <input type="hidden" name="loan_id" value={loan.id} />
                        <input type="hidden" name="action" value="deny" />
                        <button className="commons-button commons-button-danger text-xs">
                          Deny
                        </button>
                      </form>
                    </>
                  )}
                  {loan.status === "approved" && (
                    <form action={respondToLoan}>
                      <input type="hidden" name="loan_id" value={loan.id} />
                      <input type="hidden" name="action" value="checkout" />
                      <button className="commons-button text-xs">
                        Mark checked out
                      </button>
                    </form>
                  )}
                  {loan.status === "checked_out" && (
                    <form action={respondToLoan}>
                      <input type="hidden" name="loan_id" value={loan.id} />
                      <input type="hidden" name="action" value="return" />
                      <button className="commons-button text-xs">
                        Mark returned
                      </button>
                    </form>
                  )}
                </div>
                <a
                  href={`/loans/${loan.id}`}
                  className="mt-2 inline-block font-mono text-xs font-bold underline"
                >
                  view &amp; message →
                </a>
              </div>
            ))}
          </div>
        </div>
      )}

<div className="flex flex-col gap-10">
  {sortedGroups.map(([groupName, groupItems]) => (
    <div key={groupName}>
      <h3 className="mb-4 border-b-2 border-dashed border-commons-ink/40 pb-1 font-mono text-sm font-bold uppercase tracking-wide">
        {groupName}
      </h3>
<div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {groupItems?.map((item) => (
          <div key={item.id} className="commons-card p-4">
            <div className="commons-tape" />
            <div className="flex items-center justify-between">
              <h3 className="commons-heading text-2xl leading-tight">
                {item.name}
              </h3>
              <span className="commons-stamp commons-stamp-teal">
                {item.status.replace("_", " ")}
              </span>
            </div>

<EditItemForm item={item} categories={categories ?? []} />
          </div>
        ))}
      </div>
    </div>
  ))}

  {items?.length === 0 && (
    <p className="font-mono text-sm">
      You haven&apos;t posted anything yet.
    </p>
  )}
</div>
    </div>
  );
}