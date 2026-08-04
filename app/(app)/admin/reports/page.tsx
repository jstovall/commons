import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { resolveReport } from "@/app/actions";

export default async function AdminReportsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: myMembership } = await supabase
    .from("neighborhood_members")
    .select("neighborhood_id")
    .eq("user_id", user.id)
    .eq("status", "active")
    .maybeSingle();
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

  const previews: Record<string, string> = {};
  for (const r of reports ?? []) {
    if (r.target_type === "item") {
      const { data } = await supabase
        .from("items")
        .select("name, description")
        .eq("id", r.target_id)
        .maybeSingle();
      previews[r.id] = data ? `${data.name} — ${data.description ?? ""}` : "(item not found)";
    } else if (r.target_type === "comment") {
      const { data } = await supabase
        .from("comments")
        .select("comment")
        .eq("id", r.target_id)
        .maybeSingle();
      previews[r.id] = data?.comment ?? "(comment not found)";
    } else if (r.target_type === "loan_message") {
      const { data } = await supabase
        .from("loan_messages")
        .select("message")
        .eq("id", r.target_id)
        .maybeSingle();
      previews[r.id] = data?.message ?? "(message not found)";
    } else {
      previews[r.id] = "(unknown content)";
    }
  }

  return (
    <div>
      <h2 className="commons-heading mb-4 text-3xl">Reports</h2>

      <div className="flex flex-col gap-4">
        {reports?.map((r) => (
          <div key={r.id} className="commons-card-flat p-4">
            <span className="commons-stamp commons-stamp-brick">
              {r.target_type.replace("_", " ")}
            </span>
            <p className="mt-2 text-sm">{previews[r.id]}</p>
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
        ))}

        {reports?.length === 0 && (
          <p className="font-mono text-sm">No open reports. All clear.</p>
        )}
      </div>
    </div>
  );
}