import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/browse";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
    console.error("Auth callback exchange error:", error);
  }

  // Exchange can fail if the confirmation link opened in a different
  // browser/app context than the one used to sign up (common on mobile —
  // e.g. an in-app browser inside a Mail app). The account is confirmed
  // on Supabase's side either way, and their neighborhood membership was
  // already created at signup time — so a plain login here is a complete
  // fallback, not a dead end.
  const loginUrl = new URL("/login", origin);
  loginUrl.searchParams.set("confirmed", "1");
  return NextResponse.redirect(loginUrl);
}