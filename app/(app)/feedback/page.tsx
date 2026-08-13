import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { getCurrentMembership } from "@/lib/current-neighborhood";
import { submitFeedback } from "@/app/actions";
import { formatDateTime } from "@/lib/format";

const TOPIC_LABELS: Record<string, string> = {
  asks: "Asks",
  browse: "Browse / borrowing",
  my_items: "My items / sharing",
  profile: "Profile",
  sign_in: "Sign-in / install",
  other: "Something else",
};


export default async function FeedbackPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { current: membership } = await getCurrentMembership(user.id);
  if (!membership) redirect("/join");

const { data: myFeedback, error } = await supabase
  .from("feedback")
  .select("id, topic, message, status, created_at, admin_response, responded_at")
  .eq("user_id", user.id)
  .order("created_at", { ascending: false });
  if (error) console.error("Feedback query error:", error);

  return (
    <div>
      <h2 className="commons-heading mb-1 text-3xl">Feedback</h2>
      <p className="mb-4 text-sm">
        Got an idea, a bug, or something that felt off? Let us know.
      </p>

      <form action={submitFeedback} className="commons-card-flat mb-8 flex flex-col gap-3 p-4">
        <label className="font-mono text-xs font-bold uppercase">
          Topic
          <select name="topic" required className="commons-input mt-1 w-full text-sm normal-case">
            {Object.entries(TOPIC_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <label className="font-mono text-xs font-bold uppercase">
          What&apos;s on your mind?
          <textarea
            name="message"
            required
            rows={4}
            placeholder="Tell us what happened, or what you'd like to see…"
            className="commons-input mt-1 w-full text-sm normal-case"
          />
        </label>
        <button className="commons-button self-start text-sm">Send feedback</button>
      </form>

      {myFeedback && myFeedback.length > 0 && (
        <>
          <h3 className="mb-3 font-mono text-sm font-bold uppercase">
            Your past feedback
          </h3>
          <div className="flex flex-col gap-3">
            {myFeedback.map((f) => (
              <div key={f.id} className="commons-card-flat p-3">
                <div className="flex items-center justify-between">
                  <span className="commons-stamp commons-stamp-olive">
                    {TOPIC_LABELS[f.topic] ?? f.topic}
                  </span>
                  <span
                    className={`commons-stamp ${
                      f.status === "reviewed" ? "commons-stamp-teal" : ""
                    }`}
                  >
                    {f.status}
                  </span>
                </div>
                <p className="mt-2 text-sm">{f.message}</p>
                <p className="mt-1 font-mono text-[10px] text-commons-ink/50">
                  {formatDateTime(f.created_at)}
                </p>
                {f.admin_response && (
  <div className="mt-3 border-t-2 border-dashed border-commons-ink/40 pt-2">
    <p className="font-mono text-[10px] font-bold uppercase text-commons-teal">
      Admin reply
    </p>
    <p className="mt-1 text-sm">{f.admin_response}</p>
  </div>
)}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}