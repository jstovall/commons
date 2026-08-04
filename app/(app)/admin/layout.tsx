import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: membership } = await supabase
    .from("neighborhood_members")
    .select("role")
    .eq("user_id", user.id)
    .eq("status", "active")
    .maybeSingle();

  if (!membership || (membership.role !== "admin" && membership.role !== "moderator")) {
    redirect("/browse");
  }

  return (
    <div>
      <div className="mb-6 flex gap-2">
  {membership.role === "admin" && (
    <Link href="/admin/members" className="commons-button commons-button-secondary text-xs">
      Members
    </Link>
  )}
  <Link href="/admin/reports" className="commons-button commons-button-secondary text-xs">
    Reports
  </Link>
</div>
      {children}
    </div>
  );
}