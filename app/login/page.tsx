import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import LoginForm from "./LoginForm";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ invite?: string; next?: string }>;
}) {
  const { invite: code } = await searchParams;
  let neighborhoodName: string | null = null;

  if (code) {
    const supabase = await createClient();
    const { data, error } = await supabase.rpc("neighborhood_by_invite_code", {
      _code: code.toUpperCase(),
    });
    if (error) console.error("neighborhood_by_invite_code RPC error:", error);
    neighborhoodName = data?.[0]?.name ?? null;
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center px-6">
      <span className="commons-heading mb-1 self-center text-4xl">
        {neighborhoodName ? `${neighborhoodName} Commons` : "commons"}
      </span>
      <div className="commons-card-flat mt-4 p-6">
        <Suspense fallback={null}>
          <LoginForm />
        </Suspense>
      </div>
    </main>
  );
}