import { respondToLoan, sendLoanMessage, flagContent } from "@/app/actions";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { formatDateTime } from "@/lib/format";


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
    .select(
      "id, message, created_at, sender_id, is_system, sender:profiles(display_name)"
    )
    .eq("loan_id", id)
    .order("created_at", { ascending: true });
  if (messagesError) console.error("Loan messages query error:", messagesError);

  return (
    <div>
      <a
        href={isOwner ? "/my-items" : "/browse"}
        className="font-mono text-xs font-bold underline"
      >
        ← back
      </a>

      <div className="commons-card-flat mt-3 p-4">
        <h2 className="commons-heading text-2xl leading-tight">
          {loan.item?.name}
        </h2>
        <p className="mt-1 font-mono text-xs text-commons-ink/70">
          {isOwner
            ? `requested by ${loan.borrower?.display_name}`
            : `owned by ${loan.owner?.display_name}`}{" "}
          · {formatDateTime(loan.requested_at)}
        </p>
        <span className="commons-stamp commons-stamp-teal mt-2 inline-block">
          {loan.status.replace("_", " ")}
        </span>

        {loan.borrower_message && (
          <p className="mt-2 text-sm italic">
            Original note: &ldquo;{loan.borrower_message}&rdquo;
          </p>
        )}

        {isOwner && (
          <div className="mt-4 flex flex-wrap gap-2">
            {loan.status === "requested" && (
              <>
                <form action={respondToLoan}>
                  <input type="hidden" name="loan_id" value={loan.id} />
                  <input type="hidden" name="action" value="approve" />
                  <button className="commons-button text-xs">Approve</button>
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
        )}

        {isBorrower && loan.status === "requested" && (
          <form action={respondToLoan} className="mt-4">
            <input type="hidden" name="loan_id" value={loan.id} />
            <input type="hidden" name="action" value="cancel" />
            <button className="commons-button commons-button-secondary text-xs">
              Cancel request
            </button>
          </form>
        )}
      </div>

      <h3 className="mb-3 mt-6 font-mono text-sm font-bold uppercase">
        Messages
      </h3>
      <div className="flex flex-col gap-3">
        {messages?.map((m) => {
          if (m.is_system) {
            return (
              <p
                key={m.id}
                className="my-1 text-center font-mono text-[10px] text-commons-ink/50"
              >
                — {m.message} · {formatDateTime(m.created_at)} —
              </p>
            );
          }

          const fromMe = m.sender_id === user.id;
          return (
            <div
              key={m.id}
              className={`max-w-[85%] rounded-lg px-3 py-2 text-sm shadow-md ${
                fromMe
                  ? "self-end bg-commons-teal text-commons-cream"
                  : "self-start bg-commons-card text-commons-ink"
              }`}
              style={{ alignSelf: fromMe ? "flex-end" : "flex-start" }}
            >
              {!fromMe && (
                <p className="mb-0.5 font-mono text-xs font-bold opacity-70">
                  {m.sender?.display_name}
                </p>
              )}
              <p>{m.message}</p>
              <p
                className={`mt-1 font-mono text-[10px] ${
                  fromMe ? "text-commons-cream/70" : "text-commons-ink/50"
                }`}
              >
                {formatDateTime(m.created_at)}
              </p>
            {!fromMe && (
  <details className="mt-1">
    <summary className="cursor-pointer font-mono text-[10px] opacity-60">
      🚩 report
    </summary>
    <form action={flagContent} className="mt-1 flex gap-1">
      <input type="hidden" name="target_type" value="loan_message" />
      <input type="hidden" name="target_id" value={m.id} />
      <input
        name="reason"
        required
        placeholder="Reason"
        className="commons-input flex-1 text-xs"
      />
      <button className="commons-button commons-button-secondary text-xs">
        Send
      </button>
    </form>
  </details>
)}
            </div>
          );
        })}

        {messages?.length === 0 && (
          <p className="font-mono text-sm">
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
          className="commons-input flex-1 text-sm"
        />
        <button className="commons-button text-sm">Send</button>
      </form>
    </div>
  );
}