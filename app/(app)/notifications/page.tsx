import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { markNotificationRead, markAllNotificationsRead } from "@/app/actions";

function formatDateTime(dateString: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "2-digit",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(dateString));
}

export default async function NotificationsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: notifications, error } = await supabase
    .from("notifications")
    .select("id, title, body, link_url, read_at, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });
  if (error) console.error("Notifications query error:", error);

  const unreadCount = notifications?.filter((n) => !n.read_at).length ?? 0;

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="commons-heading text-3xl">Notifications</h2>
        {unreadCount > 0 && (
          <form action={markAllNotificationsRead}>
            <button className="commons-button commons-button-secondary text-xs">
              Mark all read
            </button>
          </form>
        )}
      </div>

      <div className="flex flex-col gap-3">
        {notifications?.map((n) => (
          <form key={n.id} action={markNotificationRead}>
            <input type="hidden" name="notification_id" value={n.id} />
            <input type="hidden" name="link_url" value={n.link_url ?? "/notifications"} />
            <button
              type="submit"
              className={`commons-card-flat w-full p-3 text-left ${
                n.read_at ? "opacity-60" : "border-commons-brick"
              }`}
            >
              <p className="text-sm font-bold">{n.title}</p>
              <p className="mt-0.5 text-sm">{n.body}</p>
              <p className="mt-1 font-mono text-[10px] text-commons-ink/50">
                {formatDateTime(n.created_at)}
              </p>
            </button>
          </form>
        ))}

        {notifications?.length === 0 && (
          <p className="font-mono text-sm">You&apos;re all caught up.</p>
        )}
      </div>
    </div>
  );
}