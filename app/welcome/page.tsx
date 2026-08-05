import { createClient } from "@/lib/supabase/server";
import WelcomeContent from "./WelcomeContent";

export default async function WelcomePage({
  searchParams,
}: {
  searchParams: Promise<{ code?: string }>;
}) {
  const { code } = await searchParams;
  let neighborhoodName: string | null = null;

  const supabase = await createClient();

  if (code) {
    const { data, error } = await supabase.rpc("neighborhood_by_invite_code", {
      _code: code,
    });
    if (error) console.error("neighborhood_by_invite_code RPC error:", error);
    neighborhoodName = data?.[0]?.name ?? null;
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <WelcomeContent
      code={code ?? null}
      neighborhoodName={neighborhoodName}
      isLoggedIn={Boolean(user)}
    />
  );
}