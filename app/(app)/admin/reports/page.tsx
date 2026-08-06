import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { resolveReport } from "@/app/actions";
import { getCurrentMembership } from "@/lib/current-neighborhood";

export default async function AdminReportsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

const { current: myMembership } = await getCurrentMembership(user.id);
if (!myMembership) redirect("/browse");

  const { data: reports, error } = await supabase
    .from("reports")
    .select(
      "id, target_type, target_id, reason, created_at, reporter:profiles!reports_reporter_id_fkey(display_name)"
    )
    .eq("neighborhood_id", myMembership.neighborhood_id)
    .eq("status", "open")
    .order("created_at", { ascending: false });
  if (error) console.error("Admin reports query error:", error);

  const details: Record <
    string,
    { text: string; authorName: string; contextUrl: string | null }
  > = {};

for (const r of reports ?? []) {
  if (r.target_type === "item") {
    const { data } = await supabase
      .from("items")
      .select("name, description, owner:profiles!items_owner_id_fkey(display_name)")
      .eq("id", r.target_id)
      .maybeSingle();
    details[r.id] = {
      text: data ? `${data.name} — ${data.description ?? ""}` : "(item not found)",
      authorName: data?.owner?.display_name ?? "unknown",
      contextUrl: "/browse",
    };
  } else if (r.target_type === "comment") {
    const { data } = await supabase
      .from("comments")
      .select("comment, user:profiles(display_name)")
      .eq("id", r.target_id)
      .maybeSingle();
    details[r.id] = {
      text: data?.comment ?? "(comment not found)",
      authorName: data?.user?.display_name ?? "unknown",
      contextUrl: "/browse",
    };
  } else if (r.target_type === "loan_message") {
    const { data } = await supabase
      .from("loan_messages")
      .select("message, loan_id, sender:profiles(display_name)")
      .eq("id", r.target_id)
      .maybeSingle();
    details[r.id] = {
      text: data?.message ?? "(message not found)",
      authorName: data?.sender?.display_name ?? "unknown",
      contextUrl: data?.loan_id ? `/loans/${data.loan_id}` : null,
    };
  } else if (r.target_type === "item_request") {
    const { data } = await supabase
      .from("item_requests")
      .select("title, description, requester:profiles(display_name)")
      .eq("id", r.target_id)
      .maybeSingle();
    details[r.id] = {
      text: data ? `${data.title} — ${data.description ?? ""}` : "(ask not found)",
      authorName: data?.requester?.display_name ?? "unknown",
      contextUrl: "/asks",
    };
  } else if (r.target_type === "item_request_response") {
    const { data } = await supabase
      .from("item_request_responses")
      .select("message, responder:profiles(display_name)")
      .eq("id", r.target_id)
      .maybeSingle();
    details[r.id] = {
      text: data?.message ?? "(reply not found)",
      authorName: data?.responder?.display_name ?? "unknown",
      contextUrl: "/asks",
    };
  } else {
    details[r.id] = { text: "(unknown content)", authorName: "unknown", contextUrl: null };
  }
}

  return (
    <div>
      <h2 className="commons-heading mb-4 text-3xl">Reports</h2>

      <div className="flex flex-col gap-4">
        {reports?.map((r) => {
          const d = details[r.id];
          return (
            <div key={r.id} className="commons-card-flat p-4">
              <span className="commons-stamp commons-stamp-brick">
                {r.target_type.replace("_", " ")}
              </span>
              <p className="mt-2 font-mono text-xs font-bold">
                said by {d.authorName}
              </p>
              <p className="mt-1 text-sm">{d.text}</p>
              {d.contextUrl && (
                <a
                  href={d.contextUrl}
                  className="mt-1 inline-block font-mono text-xs underline"
                >
                  view full conversation →
                </a>
              )}
              <p className="mt-2 font-mono text-xs text-commons-ink/70">
                flagged by {r.reporter?.display_name}: &ldquo;{r.reason}&rdquo;
              </p>
              <div className="mt-3 flex gap-2">
                <form action={resolveReport}>
                  <input type="hidden" name="report_id" value={r.id} />
                  <input type="hidden" name="target_type" value={r.target_type} />
                  <input type="hidden" name="target_id" value={r.target_id} />
                  <input type="hidden" name="action" value="hide" />
                  <button className="commons-button commons-button-danger text-xs">
                    Hide / remove content
                  </button>
                </form>
                <form action={resolveReport}>
                  <input type="hidden" name="report_id" value={r.id} />
                  <input type="hidden" name="target_type" value={r.target_type} />
                  <input type="hidden" name="target_id" value={r.target_id} />
                  <input type="hidden" name="action" value="dismiss" />
                  <button className="commons-button commons-button-secondary text-xs">
                    Dismiss
                  </button>
                </form>
              </div>
            </div>
          );
        })}

        {reports?.length === 0 && (
          <p className="font-mono text-sm">No open reports. All clear.</p>
        )}
      </div>
    </div>
  );
}