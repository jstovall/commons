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

// A password-reset link failing (same cross-browser/scanner issue we hit
// with signup confirmation) needs a different fallback — there's no
// "just sign in normally" path here, since the whole point was they don't
// know their current password. Send them back to request a fresh link.
if (next.startsWith("/reset-password")) {
  const forgotUrl = new URL("/forgot-password", origin);
  forgotUrl.searchParams.set("error", "link_failed");
  return NextResponse.redirect(forgotUrl);
}

const loginUrl = new URL("/login", origin);
loginUrl.searchParams.set("confirmed", "1");
return NextResponse.redirect(loginUrl);
}