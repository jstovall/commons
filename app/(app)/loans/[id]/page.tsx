import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { respondToLoan, sendLoanMessage } from "@/app/actions";

export default async function LoanDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: loan, error: loanError } = await supabase
    .from("loans")
    .select(
      `id, status, borrower_message, requested_at, due_date,
       item:items(id, name, image_url),
       borrower:profiles!loans_borrower_id_fkey(id, display_name),
       owner:profiles!loans_owner_id_fkey(id, display_name)`
    )
    .eq("id", id)
    .maybeSingle();

  if (loanError) console.error("Loan detail query error:", loanError);
  if (!loan) notFound();

  const isBorrower = loan.borrower?.id === user.id;
  const isOwner = loan.owner?.id === user.id;

  const { data: messages, error: messagesError } = await supabase
    .from("loan_messages")
    .select("id, message, created_at, sender_id, sender:profiles(display_name)")
    .eq("loan_id", id)
    .order("created_at", { ascending: true });
  if (messagesError) console.error("Loan messages query error:", messagesError);

  return (
    <div>
      <a href={isOwner ? "/my-items" : "/browse"} className="text-xs text-commons">
        ← Back
      </a>

      <div className="mt-3 rounded-xl border border-gray-200 p-4">
        <h2 className="text-lg font-semibold text-commons-dark">
          {loan.item?.name}
        </h2>
        <p className="mt-1 text-sm text-gray-500">
          {isOwner
            ? `Requested by ${loan.borrower?.display_name}`
            : `Owned by ${loan.owner?.display_name}`}
        </p>
        <span className="mt-2 inline-block rounded-full bg-gray-100 px-2 py-0.5 text-xs capitalize text-gray-600">
          {loan.status.replace("_", " ")}
        </span>

        {loan.borrower_message && (
          <p className="mt-2 text-sm text-gray-600">
            Original note: &ldquo;{loan.borrower_message}&rdquo;
          </p>
        )}

        {isOwner && (
          <div className="mt-3 flex gap-2">
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
        )}

        {isBorrower && loan.status === "requested" && (
          <form action={respondToLoan} className="mt-3">
            <input type="hidden" name="loan_id" value={loan.id} />
            <input type="hidden" name="action" value="cancel" />
            <button className="rounded-lg border border-gray-300 px-3 py-1 text-xs">
              Cancel request
            </button>
          </form>
        )}
      </div>

      <h3 className="mb-2 mt-6 text-sm font-semibold text-gray-700">
        Messages
      </h3>
      <div className="flex flex-col gap-2">
        {messages?.map((m) => {
          const fromMe = m.sender_id === user.id;
          return (
            <div
              key={m.id}
              className={`max-w-[80%] rounded-lg px-3 py-2 text-sm ${
                fromMe
                  ? "self-end bg-commons text-white"
                  : "self-start bg-gray-100 text-gray-800"
              }`}
              style={{ alignSelf: fromMe ? "flex-end" : "flex-start" }}
            >
              {!fromMe && (
                <p className="mb-0.5 text-xs font-medium opacity-70">
                  {m.sender?.display_name}
                </p>
              )}
              {m.message}
            </div>
          );
        })}

        {messages?.length === 0 && (
          <p className="text-sm text-gray-500">
            No messages yet — coordinate pickup/return details here.
          </p>
        )}
      </div>

      <form action={sendLoanMessage} className="mt-4 flex gap-2">
        <input type="hidden" name="loan_id" value={loan.id} />
        <input
          type="text"
          name="message"
          required
          placeholder="Message about pickup, timing, etc…"
          className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm"
        />
        <button className="rounded-lg bg-commons px-4 py-2 text-sm font-medium text-white">
          Send
        </button>
      </form>
    </div>
  );
}