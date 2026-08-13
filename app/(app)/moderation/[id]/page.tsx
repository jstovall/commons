import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { sendModerationMessage } from "@/app/actions";
import { formatDateTime } from "@/lib/format";


export default async function ModerationThreadPage({
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

const { data: thread, error: threadError } = await supabase
  .from("moderation_threads")
  .select("id, content_owner_id, neighborhood_id, report_id")
  .eq("id", id)
  .maybeSingle();
  if (threadError) console.error("Moderation thread query error:", threadError);
  if (!thread) notFound();

  const { data: messages, error: messagesError } = await supabase
    .from("moderation_messages")
    .select("id, message, created_at, sender_id, is_system, sender:profiles(display_name)")
    .eq("thread_id", id)
    .order("created_at", { ascending: true });
  if (messagesError) console.error("Moderation messages query error:", messagesError);

  const isOwner = thread.content_owner_id === user.id;

  return (
    <div>
      <a href="/notifications" className="font-mono text-xs font-bold underline">
        ← back
      </a>

<h2 className="commons-heading mb-1 mt-3 text-3xl">
  {thread.report_id
    ? isOwner
      ? "About your removed content"
      : "Moderation conversation"
    : "Direct message"}
</h2>

      <div className="mt-4 flex flex-col gap-3">
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
                  {m.sender?.display_name ?? "Moderator"}
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
            </div>
          );
        })}
      </div>

      <form action={sendModerationMessage} className="mt-4 flex gap-2">
        <input type="hidden" name="thread_id" value={thread.id} />
        <input
          type="text"
          name="message"
          required
          placeholder="Reply…"
          className="commons-input flex-1 text-sm"
        />
        <button className="commons-button text-sm">Send</button>
      </form>
    </div>
  );
}