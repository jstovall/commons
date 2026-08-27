"use client";

import { useState } from "react";
import { respondToLoan } from "@/app/actions";

interface Loan {
  id: string;
  status: string;
  borrower_message: string | null;
  item: { name: string } | null;
  borrower: { display_name: string } | null;
}

export default function BorrowRequestCard({ loan: initialLoan }: { loan: Loan }) {
  const [loan, setLoan] = useState(initialLoan);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dueDate, setDueDate] = useState(
    new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
  );

  async function handleAction(action: string, extra?: Record<string, string>) {
    setBusy(true);
    setError(null);

    const formData = new FormData();
    formData.set("loan_id", loan.id);
    formData.set("action", action);
    if (extra) for (const [k, v] of Object.entries(extra)) formData.set(k, v);

    const result = await respondToLoan(formData);
    if (result.success) {
      const statusMap: Record<string, string> = {
        approve: "approved",
        decline: "declined",
        checkout: "checked_out",
        return: "returned",
        cancel: "cancelled",
      };
      setLoan((prev) => ({ ...prev, status: statusMap[action] ?? prev.status }));
    } else {
      setError(result.error);
    }
    setBusy(false);
  }

  return (
    <div className="commons-card-flat p-3">
      <p className="text-sm">
        <span className="font-mono font-bold">{loan.borrower?.display_name}</span>{" "}
        wants to borrow <span className="font-mono font-bold">{loan.item?.name}</span>
      </p>
      {loan.borrower_message && (
        <p className="mt-1 text-sm italic">&ldquo;{loan.borrower_message}&rdquo;</p>
      )}

      <div className="mt-2 flex flex-wrap items-end gap-2">
        {loan.status === "requested" && (
          <>
            <button
              onClick={() => handleAction("approve")}
              disabled={busy}
              className="commons-button text-xs disabled:opacity-50"
            >
              {busy ? "…" : "Approve"}
            </button>
            <button
              onClick={() => handleAction("decline")}
              disabled={busy}
              className="commons-button commons-button-danger text-xs disabled:opacity-50"
            >
              {busy ? "…" : "Decline"}
            </button>
          </>
        )}
        {loan.status === "approved" && (
          <>
            <label className="font-mono text-[10px] font-bold uppercase">
              Return-by (optional)
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="commons-input mt-1 block text-xs"
              />
            </label>
            <button
              onClick={() => handleAction("checkout", { due_date: dueDate })}
              disabled={busy}
              className="commons-button text-xs disabled:opacity-50"
            >
              {busy ? "…" : "Mark checked out"}
            </button>
          </>
        )}
        {(loan.status === "checked_out" || loan.status === "overdue") && (
          <button
            onClick={() => handleAction("return")}
            disabled={busy}
            className="commons-button text-xs disabled:opacity-50"
          >
            {busy ? "…" : "Mark returned"}
          </button>
        )}
        {["declined", "returned", "cancelled"].includes(loan.status) && (
          <span className="commons-stamp">{loan.status}</span>
        )}
      </div>

      {error && <p className="mt-2 font-mono text-xs text-commons-brick">{error}</p>}

      <a
        href={`/loans/${loan.id}`}
        className="mt-2 inline-block font-mono text-xs font-bold underline"
      >
        view &amp; message →
      </a>
    </div>
  );
}