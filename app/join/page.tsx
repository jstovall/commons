"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function JoinPage() {
  const router = useRouter();
  const supabase = createClient();

  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleJoin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      router.push("/login");
      return;
    }

    const { data: neighborhood, error: lookupError } = await supabase
      .from("neighborhoods")
      .select("id, name")
      .eq("invite_code", code.trim())
      .maybeSingle();

    if (lookupError || !neighborhood) {
      setLoading(false);
      setError(
        "That invite code doesn't match a neighborhood. Double check with whoever invited you."
      );
      return;
    }

    const { error: insertError } = await supabase
      .from("neighborhood_members")
      .insert({
        neighborhood_id: neighborhood.id,
        user_id: user.id,
        status: "pending",
      });

    setLoading(false);

    if (insertError) {
      if (insertError.code === "23505") {
        setError("You've already requested to join this neighborhood.");
      } else {
        setError(insertError.message);
      }
      return;
    }

    router.push("/pending");
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center px-6">
      <h1 className="mb-1 text-2xl font-semibold text-commons-dark">
        Join your neighborhood
      </h1>
      <p className="mb-6 text-sm text-gray-500">
        Enter the invite code shared by a neighbor or your community
        organizer.
      </p>

      <form onSubmit={handleJoin} className="flex flex-col gap-4">
        <input
          type="text"
          required
          placeholder="Invite code"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm uppercase focus:border-commons focus:outline-none"
        />

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="rounded-lg bg-commons px-3 py-2 text-sm font-medium text-white transition hover:bg-commons-dark disabled:opacity-50"
        >
          {loading ? "Checking…" : "Request to join"}
        </button>
      </form>
    </main>
  );
}