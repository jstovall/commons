import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { markNotificationRead, markAllNotificationsRead } from "@/app/actions";

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
        <h2 className="text-xl font-semibold text-commons-dark">
          Notifications
        </h2>
        {unreadCount > 0 && (
          <form action={markAllNotificationsRead}>
            <button className="text-xs text-commons hover:underline">
              Mark all as read
            </button>
          </form>
        )}
      </div>

      <div className="flex flex-col gap-2">
        {notifications?.map((n) => (
          <form key={n.id} action={markNotificationRead}>
            <input type="hidden" name="notification_id" value={n.id} />
            <input
              type="hidden"
              name="link_url"
              value={n.link_url ?? "/notifications"}
            />
            <button
              type="submit"
              className={`w-full rounded-xl border px-4 py-3 text-left text-sm transition ${
                n.read_at
                  ? "border-gray-200 text-gray-500"
                  : "border-commons bg-commons/5 font-medium text-commons-dark"
              }`}
            >
              <p>{n.title}</p>
              <p className="mt-0.5 text-xs font-normal text-gray-500">
                {n.body}
              </p>
            </button>
          </form>
        ))}

        {notifications?.length === 0 && (
          <p className="text-sm text-gray-500">You&apos;re all caught up.</p>
        )}
      </div>
    </div>
  );
}