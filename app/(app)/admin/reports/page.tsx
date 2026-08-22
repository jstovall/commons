import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { resolveReport, relistContent } from "@/app/actions";
import { getCurrentMembership } from "@/lib/current-neighborhood";

interface ReportDetail {
  text: string;
  authorName: string;
  contextUrl: string | null;
  currentlyFlagged: boolean | null; // null = not a flaggable type (e.g. deleted messages)
}

async function getReportDetail(
  supabase: Awaited<ReturnType<typeof createClient>>,
  targetType: string,
  targetId: string
): Promise<ReportDetail> {
  if (targetType === "item") {
    const { data } = await supabase
      .from("items")
      .select("name, description, content_flag, owner:profiles!items_owner_id_fkey(display_name)")
      .eq("id", targetId)
      .maybeSingle();
    return {
      text: data ? `${data.name} — ${data.description ?? ""}` : "(item not found)",
      authorName: data?.owner?.display_name ?? "unknown",
      contextUrl: "/browse",
      currentlyFlagged: data?.content_flag ?? null,
    };
  }
  if (targetType === "comment") {
    return { text: "(comments feature removed)", authorName: "unknown", contextUrl: null, currentlyFlagged: null };
  }
  if (targetType === "loan_message") {
    const { data } = await supabase
      .from("loan_messages")
      .select("message, loan_id, sender:profiles(display_name)")
      .eq("id", targetId)
      .maybeSingle();
    return {
      text: data?.message ?? "(message not found)",
      authorName: data?.sender?.display_name ?? "unknown",
      contextUrl: data?.loan_id ? `/loans/${data.loan_id}` : null,
      currentlyFlagged: null,
    };
  }
  if (targetType === "item_request") {
    const { data } = await supabase
      .from("item_requests")
      .select("title, description, content_flag, requester:profiles(display_name)")
      .eq("id", targetId)
      .maybeSingle();
    return {
      text: data ? `${data.title} — ${data.description ?? ""}` : "(ask not found)",
      authorName: data?.requester?.display_name ?? "unknown",
      contextUrl: "/asks",
      currentlyFlagged: data?.content_flag ?? null,
    };
  }
  if (targetType === "item_request_response") {
    const { data } = await supabase
      .from("item_request_responses")
      .select("message, responder:profiles(display_name)")
      .eq("id", targetId)
      .maybeSingle();
    return {
      text: data?.message ?? "(reply not found)",
      authorName: data?.responder?.display_name ?? "unknown",
      contextUrl: "/asks",
      currentlyFlagged: null,
    };
  }
  if (targetType === "free_pile") {
    const { data } = await supabase
      .from("free_piles")
      .select("title, description, content_flag, poster:profiles!free_piles_posted_by_fkey(display_name)")
      .eq("id", targetId)
      .maybeSingle();
    return {
      text: data ? `${data.title} — ${data.description ?? ""}` : "(pile not found)",
      authorName: data?.poster?.display_name ?? "unknown",
      contextUrl: "/free",
      currentlyFlagged: data?.content_flag ?? null,
    };
  }
  if (targetType === "giveaway_message") {
    const { data } = await supabase
      .from("giveaway_messages")
      .select("message, thread_id, sender:profiles(display_name)")
      .eq("id", targetId)
      .maybeSingle();
    return {
      text: data?.message ?? "(message not found)",
      authorName: data?.sender?.display_name ?? "unknown",
      contextUrl: data?.thread_id ? `/free/threads/${data.thread_id}` : null,
      currentlyFlagged: null,
    };
  }
  return { text: "(unknown content)", authorName: "unknown", contextUrl: null, currentlyFlagged: null };
}

export default async function AdminReportsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

const { current: myMembership } = await getCurrentMembership(user.id);
if (!myMembership) redirect("/browse");

  const { data: openReports, error: openError } = await supabase
    .from("reports")
    .select(
      "id, target_type, target_id, reason, created_at, reporter:profiles!reports_reporter_id_fkey(display_name)"
    )
    .eq("neighborhood_id", myMembership.neighborhood_id)
    .eq("status", "open")
    .order("created_at", { ascending: false });
  if (openError) console.error("Open reports query error:", openError);

  const { data: closedReports, error: closedError } = await supabase
    .from("reports")
    .select(
      "id, target_type, target_id, reason, status, reviewed_at, reporter:profiles!reports_reporter_id_fkey(display_name)"
    )
    .eq("neighborhood_id", myMembership.neighborhood_id)
    .in("status", ["resolved", "dismissed"])
    .order("reviewed_at", { ascending: false })
    .limit(50);
  if (closedError) console.error("Closed reports query error:", closedError);

  const openDetails: Record<string, ReportDetail> = {};
  for (const r of openReports ?? []) {
    openDetails[r.id] = await getReportDetail(supabase, r.target_type, r.target_id);
  }

  const closedDetails: Record<string, ReportDetail> = {};
  const closedThreadIds: Record<string, string | null> = {};
  for (const r of closedReports ?? []) {
    closedDetails[r.id] = await getReportDetail(supabase, r.target_type, r.target_id);
    if (r.status === "resolved") {
      const { data: thread } = await supabase
        .from("moderation_threads")
        .select("id")
        .eq("report_id", r.id)
        .maybeSingle();
      closedThreadIds[r.id] = thread?.id ?? null;
    }
  }

  return (
    <div>
      <h2 className="commons-heading mb-4 text-3xl">Reports</h2>

      <div className="flex flex-col gap-4">
        {openReports?.map((r) => {
          const d = openDetails[r.id];
          return (
            <div key={r.id} className="commons-card-flat p-4">
              <span className="commons-stamp commons-stamp-brick">
                {r.target_type.replace("_", " ")}
              </span>
              <p className="mt-2 font-mono text-xs font-bold">said by {d.authorName}</p>
              <p className="mt-1 text-sm">{d.text}</p>
              {d.contextUrl && (
                <a href={d.contextUrl} className="mt-1 inline-block font-mono text-xs underline">
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

        {openReports?.length === 0 && (
          <p className="font-mono text-sm">No open reports. All clear.</p>
        )}
      </div>

      {closedReports && closedReports.length > 0 && (
        <details className="mt-8">
          <summary className="cursor-pointer font-mono text-sm font-bold uppercase">
            {closedReports.length} closed report{closedReports.length === 1 ? "" : "s"}
          </summary>
          <div className="mt-3 flex flex-col gap-2">
            {closedReports.map((r) => {
              const d = closedDetails[r.id];
              const threadId = closedThreadIds[r.id];
              const canRelist = r.status === "resolved" && d.currentlyFlagged === true;
              return (
                <div key={r.id} className="commons-card-flat p-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="commons-stamp">{r.target_type.replace("_", " ")}</span>
                    <span
                      className={`commons-stamp ${
                        r.status === "resolved" ? "commons-stamp-brick" : "commons-stamp-olive"
                      }`}
                    >
                      {r.status}
                    </span>
                  </div>
                  <p className="mt-1 text-sm">{d.text}</p>
                  <div className="mt-2 flex flex-wrap items-center gap-3">
                    {threadId && (
                      <a
                        href={`/moderation/${threadId}`}
                        className="font-mono text-xs font-bold underline"
                      >
                        view owner conversation →
                      </a>
                    )}
                    {canRelist && (
                      <form action={relistContent}>
                        <input type="hidden" name="report_id" value={r.id} />
                        <input type="hidden" name="target_type" value={r.target_type} />
                        <input type="hidden" name="target_id" value={r.target_id} />
                        <button className="commons-button text-xs">Re-list item</button>
                      </form>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </details>
      )}
    </div>
  );
}