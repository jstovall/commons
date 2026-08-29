import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import BottomNav from "./BottomNav";
import { getCurrentMembership } from "@/lib/current-neighborhood";
import StandaloneTracker from "./StandaloneTracker";
import AddToHomeScreenBanner from "./AddToHomeScreenBanner";
import NotificationsPromptBanner from "./NotificationsPromptBanner";
import OceanWaves from "./OceanWaves";
import RefreshOnFocus from "./RefreshOnFocus";
import ViewportFix from "./ViewportFix";
import ProfileSun from "./ProfileSun";
import HeaderHeightObserver from "./HeaderHeightObserver";

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

const { current } = await getCurrentMembership(user.id);
if (!current) redirect("/join");

const { data: profile } = await supabase
  .from("profiles")
  .select("display_name")
  .eq("id", user.id)
  .maybeSingle();

const initials = (profile?.display_name ?? "?")
  .split(" ")
  .map((part) => part[0])
  .slice(0, 2)
  .join("")
  .toUpperCase();

const isAdmin = current.role === "admin" || current.role === "moderator";
const neighborhoodName = current.neighborhood?.name;

  const { count: unreadCount } = await supabase
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id)
    .is("read_at", null);

  return (
    <div className="min-h-screen pb-24">
        <StandaloneTracker />
        <RefreshOnFocus />
        <HeaderHeightObserver />
  <AddToHomeScreenBanner />
  <NotificationsPromptBanner />
<header id="app-header" className="relative overflow-hidden bg-commons-teal">
  <div className="relative px-5 pb-3 pt-4 text-center">
    <div className="absolute left-2 top-1/2 -translate-y-1/2">
      <ProfileSun initials={initials} />
    </div>
    <Link
      href="/notifications"
      className="absolute right-4 top-1/2 -translate-y-1/2 text-2xl text-commons-cream"
    >
      🔔
      {unreadCount != null && unreadCount > 0 && (
        <span className="absolute -right-2 -top-2 flex h-5 w-5 items-center justify-center rounded-full border border-commons-ink bg-commons-brick font-mono text-[10px] font-bold text-commons-cream">
          {unreadCount > 9 ? "9+" : unreadCount}
        </span>
      )}
    </Link>
    <span className="commons-heading block text-3xl leading-none text-commons-cream">
      {neighborhoodName ? `${neighborhoodName} Commons` : "commons"}
    </span>
  </div>
  <OceanWaves />
</header>
<main className="mx-auto w-full max-w-5xl px-4 py-6">{children}</main>

<BottomNav isAdmin={isAdmin} />
    </div>
  );
}