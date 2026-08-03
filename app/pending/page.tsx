import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function PendingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: memberships } = await supabase
    .from("neighborhood_members")
    .select("status, neighborhood_id")
    .eq("user_id", user.id);

  const hasActive = memberships?.some((m) => m.status === "active");
  if (hasActive) redirect("/browse");

  const pending = memberships?.find((m) => m.status === "pending");

  let neighborhoodName: string | null = null;
  if (pending) {
    const { data: neighborhood } = await supabase
      .from("neighborhoods")
      .select("name")
      .eq("id", pending.neighborhood_id)
      .maybeSingle();
    neighborhoodName = neighborhood?.name ?? null;
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center px-6 text-center">
      <h1 className="mb-2 text-xl font-semibold text-commons-dark">
        Almost there
      </h1>
      {pending ? (
        <p className="text-sm text-gray-500">
          Your request to join <strong>{neighborhoodName} Commons </strong> is
          waiting for approval from a neighborhood admin. We&apos;ll let you
          in as soon as it&apos;s approved.
        </p>
      ) : (
        <>
          <p className="mb-4 text-sm text-gray-500">
            You haven&apos;t requested to join a neighborhood yet.
          </p>
          <a href="/join" className="font-medium text-commons hover:underline">
            Enter an invite code
          </a>
        </>
      )}
    </main>
  );
}