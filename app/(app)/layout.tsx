import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import BottomNav from "./BottomNav";

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
    <div className="min-h-screen pb-24">
      <header className="flex items-center justify-between border-b-2 border-commons-ink bg-commons-teal px-5 py-3">
        <span className="commons-heading text-3xl leading-none text-commons-cream">
          Commons
        </span>
        <Link href="/notifications" className="relative text-2xl text-commons-cream">
          🔔
          {unreadCount != null && unreadCount > 0 && (
            <span className="absolute -right-2 -top-2 flex h-5 w-5 items-center justify-center rounded-full border border-commons-ink bg-commons-brick font-mono text-[10px] font-bold text-commons-cream">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </Link>
      </header>

      <main className="px-4 py-6">{children}</main>

<BottomNav />
    </div>
  );
}