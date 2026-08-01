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
      </nav>
    </div>
  );
}
