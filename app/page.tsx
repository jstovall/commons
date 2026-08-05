import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function RootPage() {
  const cookieStore = await cookies();
  const acceptedTerms = cookieStore.get("commons_terms_accepted")?.value === "true";

  if (!acceptedTerms) redirect("/welcome");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  redirect(user ? "/browse" : "/login");
}