import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import {
  createItem,
  respondToLoan,
} from "@/app/actions";
import { getCurrentMembership } from "@/lib/current-neighborhood";
import { formatDate } from "@/lib/format";
import NewItemForm from "./NewItemForm";
import EditItemForm from "./EditItemForm";
import { respondToGiveawayRequest } from "@/app/actions";

const loanStatusStamp: Record<string, string> = {
  requested: "commons-stamp commons-stamp-brick",
  approved: "commons-stamp commons-stamp-teal",
  checked_out: "commons-stamp commons-stamp-brick",
  returned: "commons-stamp commons-stamp-olive",
  declined: "commons-stamp",
  cancelled: "commons-stamp",
  overdue: "commons-stamp commons-stamp-brick",
};

export default async function MyItemsPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string }>;
}) {
  const { view } = await searchParams;
  const activeView = view === "borrowing" ? "borrowing" : view === "giveaway" ? "giveaway" : "lending";

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { current: membership } = await getCurrentMembership(user.id);
  if (!membership) redirect("/join");

  const tabClass = (tab: string) =>
    activeView === tab
      ? "commons-button commons-button-salmon text-sm"
      : "commons-button commons-button-secondary text-sm";

  return (
    <div>
      <h2 className="commons-heading mb-4 text-3xl">My Items</h2>

      <div className="mb-6 flex gap-2">
        <a href="/my-items?view=borrowing" className={tabClass("borrowing")}>
          Borrowing
        </a>
        <a href="/my-items?view=lending" className={tabClass("lending")}>
          Lending
        </a>
      <a href="/my-items?view=giveaway" className={tabClass("giveaway")}>
        Giving Away
      </a>
      </div>

      {activeView === "lending" ? (
  <LendingView userId={user.id} neighborhoodId={membership.neighborhood_id} />
) : activeView === "giveaway" ? (
  <GivingAwayView userId={user.id} neighborhoodId={membership.neighborhood_id} />
) : (
  <BorrowingView userId={user.id} neighborhoodId={membership.neighborhood_id} />
)}
    </div>
  );
}




async function LendingView({
  userId,
  neighborhoodId,
}: {
  userId: string;
  neighborhoodId: string;
}) {
  const supabase = await createClient();

  const itemStatusStamp: Record<string, string> = {
    available: "commons-stamp commons-stamp-teal",
    requested: "commons-stamp commons-stamp-brick",
    checked_out: "commons-stamp commons-stamp-brick",
    overdue: "commons-stamp commons-stamp-brick",
    unavailable: "commons-stamp",
  };

  const { data: categories } = await supabase
    .from("categories")
    .select("id, name")
    .order("name");

  const { data: items, error: itemsError } = await supabase
    .from("items")
    .select(
      "id, name, description, image_url, category_id, status, listing_type, content_flag, category:categories(name)"
    )
    .eq("owner_id", userId)
    .eq("is_active", true)
    .eq("neighborhood_id", neighborhoodId)
    .eq("listing_type", "loan")
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

const { data: myFlaggedThreads } = await supabase.rpc("get_my_flagged_item_threads");
const flaggedThreadMap = new Map(
  (myFlaggedThreads ?? []).map((r) => [r.item_id, r.thread_id])
);


  const { data: incomingLoans, error: loansError } = await supabase
    .from("loans")
    .select(
      `id, status, borrower_message, requested_at,
       item:items(name),
       borrower:profiles!loans_borrower_id_fkey(display_name)`
    )
    .eq("owner_id", userId)
    .eq("neighborhood_id", neighborhoodId)
    .in("status", ["requested", "approved", "checked_out", "overdue"])
    .order("requested_at", { ascending: false });
  if (loansError) console.error("Incoming loans query error:", loansError);

  return (
    <>
      {incomingLoans && incomingLoans.length > 0 && (
        <div className="mb-8">
          <h3 className="mb-3 font-mono text-sm font-bold uppercase">
            Borrow requests
          </h3>
          <div className="flex flex-col gap-3">
            {incomingLoans.map((loan) => (
              <div key={loan.id} className="commons-card-flat p-3">
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
                <div className="mt-2 flex flex-wrap gap-2">
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
                        <input type="hidden" name="action" value="decline" />
                        <button className="commons-button commons-button-danger text-xs">
                          Decline
                        </button>
                      </form>
                    </>
                  )}
                  {loan.status === "approved" && (
                    <form action={respondToLoan} className="flex flex-wrap items-end gap-2">
                      <input type="hidden" name="loan_id" value={loan.id} />
                      <input type="hidden" name="action" value="checkout" />
                      <label className="font-mono text-[10px] font-bold uppercase">
                        Return-by (optional)
                        <input
                          type="date"
                          name="due_date"
                          defaultValue={
                            new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
                              .toISOString()
                              .slice(0, 10)
                          }
                          className="commons-input mt-1 block text-xs"
                        />
                      </label>
                      <button className="commons-button text-xs">
                        Mark checked out
                      </button>
                    </form>
                  )}
                  {(loan.status === "checked_out" || loan.status === "overdue") && (
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

      <NewItemForm categories={categories ?? []} />


      <div className="mt-8 flex flex-col gap-8">
        {sortedGroups.map(([groupName, groupItems]) => (
          <div key={groupName}>
           <h3 className="mb-3 border-b-2 border-commons-ink/60 pb-1 font-mono text-sm font-bold uppercase tracking-wide">
  {groupName}
</h3>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
{groupItems?.map((item) => (
  <div
    key={item.id}
    className={`commons-card-flat p-3 ${item.content_flag ? "border-4 border-commons-brick" : ""}`}
  >
    <div className="grid grid-cols-[1fr_auto] gap-3">
      <div>
        <h3 className="text-sm font-bold">{item.name}</h3>
        <span className={`${itemStatusStamp[item.status] ?? "commons-stamp"} mt-1 inline-block`}>
          {item.status.replace("_", " ")}
        </span>
      </div>

  {item.image_url && (
        <div className="commons-shipwindow" style={{ width: "6rem" }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={item.image_url} alt="" />
        </div>
      )}

      {item.content_flag && (
        <div className="col-span-2">
          <span className="commons-stamp commons-stamp-brick">🚩 removed by moderator</span>
          {flaggedThreadMap.get(item.id) && (
            <a
              href={`/moderation/${flaggedThreadMap.get(item.id)}`}
              className="ml-2 font-mono text-xs font-bold underline"
            >
              view conversation →
            </a>
          )}
        </div>
      )}



  <div className="col-span-2">
    <EditItemForm item={item} categories={categories ?? []} />
  </div>
</div>
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
    </>
  );
}
async function GivingAwayView({
  userId,
  neighborhoodId,
}: {
  userId: string;
  neighborhoodId: string;
}) {
  const supabase = await createClient();

  const { data: categories } = await supabase.from("categories").select("id, name").order("name");

  const { data: items, error } = await supabase
    .from("items")
    .select("id, name, description, content_flag, image_url, category_id, status, listing_type")
    .eq("owner_id", userId)
    .eq("neighborhood_id", neighborhoodId)
    .eq("listing_type", "giveaway")
    .eq("is_active", true)
    .order("created_at", { ascending: false });
  if (error) console.error("Giving away items query error:", error);

  const itemIds = (items ?? []).map((i) => i.id);
  const { data: threads } = itemIds.length
    ? await supabase.from("giveaway_threads").select("id, item_id").in("item_id", itemIds)
    : { data: [] };
  const threadCountByItem = new Map<string, number>();
  for (const t of threads ?? []) {
    threadCountByItem.set(t.item_id, (threadCountByItem.get(t.item_id) ?? 0) + 1);
  }
const { data: myFlaggedThreads } = await supabase.rpc("get_my_flagged_item_threads");
const flaggedThreadMap = new Map(
  (myFlaggedThreads ?? []).map((r) => [r.item_id, r.thread_id])
);

  const { data: pendingRequests, error: reqError } = await supabase
  .from("giveaway_threads")
  .select(
    `id, status, created_at,
     item:items(name),
     requester:profiles!giveaway_threads_requester_id_fkey(display_name)`
  )
  .eq("owner_id", userId)
  .eq("neighborhood_id", neighborhoodId)
  .eq("status", "pending")
  .order("created_at", { ascending: false });
if (reqError) console.error("Pending giveaway requests query error:", reqError);

  const available = (items ?? []).filter((i) => i.status === "available");
  const unavailable = (items ?? []).filter((i) => i.status !== "available");

  return (
    <>
      {pendingRequests && pendingRequests.length > 0 && (
  <div className="mb-8">
    <h3 className="mb-3 font-mono text-sm font-bold uppercase">
      Requests on your giveaway items
    </h3>
    <div className="flex flex-col gap-3">
      {pendingRequests.map((req) => (
        <div key={req.id} className="commons-card-flat p-3">
          <p className="text-sm">
            <span className="font-mono font-bold">
              {req.requester?.display_name}
            </span>{" "}
            wants{" "}
            <span className="font-mono font-bold">{req.item?.name}</span>
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            <form action={respondToGiveawayRequest}>
              <input type="hidden" name="thread_id" value={req.id} />
              <input type="hidden" name="action" value="approve" />
              <button className="commons-button text-xs">Approve</button>
            </form>
            <form action={respondToGiveawayRequest}>
  <input type="hidden" name="thread_id" value={req.id} />
  <input type="hidden" name="action" value="decline" />
  <button className="commons-button commons-button-danger text-xs">
    Decline
  </button>
</form>
          </div>
          <a
            href={`/free/threads/${req.id}`}
            className="mt-2 inline-block font-mono text-xs font-bold underline"
          >
            view &amp; message →
          </a>
        </div>
      ))}
    </div>
  </div>
)}
      <NewItemForm categories={categories ?? []} defaultListingType="giveaway" />

      <div className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {available.map((item) => (
  <div
    key={item.id}
    className={`commons-card-flat p-3 ${item.content_flag ? "border-4 border-commons-brick" : ""}`}
  >
            <div className="grid grid-cols-[1fr_auto] gap-3">
              <div>
                <h3 className="text-sm font-bold">{item.name}</h3>
                <span className="commons-stamp commons-stamp-teal mt-1 inline-block">available</span>
                {(threadCountByItem.get(item.id) ?? 0) > 0 && (
                  <p className="mt-1 font-mono text-[10px] text-commons-brick">
                    {threadCountByItem.get(item.id)} asked
                  </p>
                )}
              </div>
                    {item.image_url && (
        <div className="commons-shipwindow" style={{ width: "6rem" }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={item.image_url} alt="" />
        </div>
      )}

      {item.content_flag && (
        <div className="col-span-2">
          <span className="commons-stamp commons-stamp-brick">🚩 removed by moderator</span>
          {flaggedThreadMap.get(item.id) && (
            <a
              href={`/moderation/${flaggedThreadMap.get(item.id)}`}
              className="ml-2 font-mono text-xs font-bold underline"
            >
              view conversation →
            </a>
          )}
        </div>
      )}
              <div className="col-span-2">
                <EditItemForm item={item} categories={categories ?? []} />
              </div>
            </div>
          </div>
        ))}

        {available.length === 0 && (
          <p className="font-mono text-sm">Nothing marked as giving away yet.</p>
        )}
      </div>

      {unavailable.length > 0 && (
        <details className="mt-8">
          <summary className="cursor-pointer font-mono text-sm font-bold uppercase">
            {unavailable.length} given away
          </summary>
          <div className="mt-3 flex flex-col gap-2">
            {unavailable.map((item) => (
              <div key={item.id} className="commons-card-flat flex items-center justify-between gap-3 p-3">
                <p className="text-sm font-bold">{item.name}</p>
                <span className="commons-stamp">unavailable</span>
              </div>
            ))}
          </div>
        </details>
      )}
    </>
  );
}
async function BorrowingView({
  userId,
  neighborhoodId,
}: {
  userId: string;
  neighborhoodId: string;
}) {
  const supabase = await createClient();

  const { data: loans, error } = await supabase
    .from("loans")
    .select(
      `id, status, requested_at, due_date,
       item:items(name, image_url),
       owner:profiles!loans_owner_id_fkey(display_name)`
    )
    .eq("borrower_id", userId)
    .eq("neighborhood_id", neighborhoodId)
    .order("requested_at", { ascending: false });
  if (error) console.error("Borrowing loans query error:", error);

const openLoans = (loans ?? []).filter((l) =>
  ["requested", "approved", "checked_out", "overdue"].includes(l.status)
);
const closedLoans = (loans ?? []).filter(
  (l) => !["requested", "approved", "checked_out", "overdue"].includes(l.status)
);

  return (
    <>
      <div className="flex flex-col gap-6">
        {openLoans.map((loan) => (
          <div key={loan.id} className="commons-card p-4">
            <div className="commons-tape" />
            <div className="flex items-start justify-between">
              <div>
                <h3 className="commons-heading text-2xl leading-tight">
                  {loan.item?.name}
                </h3>
                <p className="font-mono text-xs text-commons-ink/70">
                  owned by {loan.owner?.display_name} ·{" "}
                  {formatDate(loan.requested_at)}
                </p>
              </div>
              <span className={loanStatusStamp[loan.status] ?? "commons-stamp"}>
                {loan.status.replace("_", " ")}
              </span>
            </div>
            <a
              href={`/loans/${loan.id}`}
              className="mt-3 inline-block font-mono text-xs font-bold underline"
            >
              view &amp; message →
            </a>
          </div>
        ))}

        {openLoans.length === 0 && (
          <p className="font-mono text-sm">
            You&apos;re not currently borrowing anything.
          </p>
        )}
      </div>

      {closedLoans.length > 0 && (
        <details className="mt-8">
          <summary className="cursor-pointer font-mono text-sm font-bold uppercase">
            {closedLoans.length} past borrow{closedLoans.length === 1 ? "" : "s"}
          </summary>
          <div className="mt-3 flex flex-col gap-2">
            {closedLoans.map((loan) => (
              <div
                key={loan.id}
                className="commons-card-flat flex items-center justify-between gap-3 p-3"
              >
                <div>
                  <p className="text-sm font-bold">{loan.item?.name}</p>
                  <p className="font-mono text-[10px] text-commons-ink/60">
                    from {loan.owner?.display_name} ·{" "}
                    {formatDate(loan.requested_at)}
                  </p>
                </div>
                <span className={loanStatusStamp[loan.status] ?? "commons-stamp"}>
                  {loan.status.replace("_", " ")}
                </span>
              </div>
            ))}
          </div>
        </details>
      )}
    </>
  );
}