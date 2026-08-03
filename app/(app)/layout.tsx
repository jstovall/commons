import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: memberships } = await supabase
  .from("neighborhood_members")
  .select("status")
  .eq("user_id", user.id);

const hasActive = memberships?.some((m) => m.status === "active");
const hasPending = memberships?.some((m) => m.status === "pending");

if (!hasActive) {
  redirect(hasPending ? "/pending" : "/join");
}
const { count: unreadCount } = await supabase
  .from("notifications")
  .select("id", { count: "exact", head: true })
  .eq("user_id", user.id)
  .is("read_at", null);

  return (
    <div className="min-h-screen pb-20">
      <header className="border-b border-gray-200 px-6 py-4">
        <h1 className="text-lg font-semibold text-commons-dark">Commons</h1>
      </header>

      <main className="px-6 py-6">{children}</main>

      <nav className="fixed inset-x-0 bottom-0 flex justify-around border-t border-gray-200 bg-white py-2">
        <Link href="/browse" className="text-sm text-gray-600 hover:text-commons">
          Borrow
        </Link>
        <Link href="/my-items" className="text-sm text-gray-600 hover:text-commons">
          My Items
        </Link>
        <Link href="/profile" className="text-sm text-gray-600 hover:text-commons">
          Profile
        </Link>
        <Link href="/requests" className="text-sm text-gray-600 hover:text-commons">
        Requests
        </Link>
        <Link href="/notifications" className="relative text-sm text-gray-600 hover:text-commons">
  🔔
  {unreadCount != null && unreadCount > 0 && (
    <span className="absolute -top-2 -right-3 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] text-white">
      {unreadCount > 9 ? "9+" : unreadCount}
    </span>
  )}
</Link>
      </nav>
    </div>
  );
}
