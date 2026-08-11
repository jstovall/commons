import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { getCurrentMembership } from "@/lib/current-neighborhood";
import { respondToFeedback } from "@/app/actions";

const TOPIC_LABELS: Record<string, string> = {
  asks: "Asks",
  browse: "Browse / borrowing",
  my_items: "My items / sharing",
  profile: "Profile",
  sign_in: "Sign-in / install",
  other: "Something else",
};

function formatDateTime(dateString: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "2-digit",
    year: "numeric",
  }).format(new Date(dateString));
}

export default async function AdminFeedbackPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { current: myMembership } = await getCurrentMembership(user.id);
  if (!myMembership) redirect("/browse");

const { data: feedback, error } = await supabase
  .from("feedback")
  .select(
    "id, topic, message, status, created_at, admin_response, responded_at, submitter:profiles!feedback_user_id_fkey(display_name)"
  )
  .eq("neighborhood_id", myMembership.neighborhood_id)
  .order("status", { ascending: true })
  .order("created_at", { ascending: false });
  if (error) console.error("Admin feedback query error:", error);

  return (
    <div>
      <h2 className="commons-heading mb-4 text-3xl">Feedback</h2>

      <div className="flex flex-col gap-4">
        {feedback?.map((f) => (
          <div key={f.id} className="commons-card-flat p-4">
            <div className="flex items-center justify-between">
              <span className="commons-stamp commons-stamp-olive">
                {TOPIC_LABELS[f.topic] ?? f.topic}
              </span>
              <span
                className={`commons-stamp ${
                  f.status === "reviewed" ? "commons-stamp-teal" : "commons-stamp-brick"
                }`}
              >
                {f.status}
              </span>
            </div>
            <p className="mt-2 text-sm">{f.message}</p>
            <p className="mt-2 font-mono text-xs text-commons-ink/70">
              from {f.submitter?.display_name} · {formatDateTime(f.created_at)}
            </p>
<form action={respondToFeedback} className="mt-3 flex flex-col gap-2">
  <input type="hidden" name="feedback_id" value={f.id} />
  <textarea
    name="response"
    defaultValue={f.admin_response ?? ""}
    rows={2}
    placeholder="Optional reply to the person who sent this…"
    className="commons-input text-sm"
  />
  <button className="commons-button self-start text-xs">
    {f.status === "reviewed" ? "Update reply" : "Reply & mark reviewed"}
  </button>
</form>
          </div>
        ))}

        {feedback?.length === 0 && (
          <p className="font-mono text-sm">No feedback yet.</p>
        )}
      </div>
    </div>
  );
}