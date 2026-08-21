import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { sendGiveawayMessage } from "@/app/actions";
import { formatDateTime } from "@/lib/format";

export default async function GiveawayThreadPage({
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
    .from("giveaway_threads")
    .select(
      `id, owner_id, requester_id,
       item:items(name),
       owner:profiles!giveaway_threads_owner_id_fkey(display_name),
       requester:profiles!giveaway_threads_requester_id_fkey(display_name)`
    )
    .eq("id", id)
    .maybeSingle();
  if (threadError) console.error("Giveaway thread query error:", threadError);
  if (!thread) notFound();

  const isParticipant = thread.owner_id === user.id || thread.requester_id === user.id;
  if (!isParticipant) notFound();

  const otherName =
    thread.owner_id === user.id ? thread.requester?.display_name : thread.owner?.display_name;

  const { data: messages, error: messagesError } = await supabase
    .from("giveaway_messages")
    .select("id, message, created_at, sender_id, is_system")
    .eq("thread_id", id)
    .order("created_at", { ascending: true });
  if (messagesError) console.error("Giveaway messages query error:", messagesError);

  return (
    <div>
      <a href="/free" className="font-mono text-xs font-bold underline">
        ← back
      </a>

      <h2 className="commons-heading mb-1 mt-3 text-3xl">{thread.item?.name}</h2>
      <p className="mb-4 font-mono text-xs text-commons-ink/70">with {otherName}</p>

      <div className="flex flex-col gap-3">
        {messages?.map((m) => {
          if (m.is_system) {
            return (
              <p key={m.id} className="my-1 text-center font-mono text-[10px] text-commons-ink/50">
                — {m.message} · {formatDateTime(m.created_at)} —
              </p>
            );
          }
          const fromMe = m.sender_id === user.id;
          return (
            <div
              key={m.id}
              className={`max-w-[85%] rounded-lg px-3 py-2 text-sm shadow-md ${
                fromMe ? "self-end bg-commons-teal text-commons-cream" : "self-start bg-commons-card text-commons-ink"
              }`}
              style={{ alignSelf: fromMe ? "flex-end" : "flex-start" }}
            >
              <p>{m.message}</p>
              <p className={`mt-1 font-mono text-[10px] ${fromMe ? "text-commons-cream/70" : "text-commons-ink/50"}`}>
                {formatDateTime(m.created_at)}
              </p>
            </div>
          );
        })}
        {messages?.length === 0 && <p className="font-mono text-sm">No messages yet.</p>}
      </div>

      <form action={sendGiveawayMessage} className="mt-4 flex gap-2">
        <input type="hidden" name="thread_id" value={thread.id} />
        <input type="text" name="message" required placeholder="Message…" className="commons-input flex-1 text-sm" />
        <button className="commons-button text-sm">Send</button>
      </form>
    </div>
  );
}