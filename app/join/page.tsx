"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

function JoinInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const urlCode = searchParams.get("code");
  const supabase = createClient();

  const [neighborhoodName, setNeighborhoodName] = useState<string | null>(null);
  const [code, setCode] = useState(urlCode ?? "");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!urlCode) return;
    supabase
      .rpc("neighborhood_by_invite_code", { _code: urlCode.toUpperCase() })
      .then(({ data, error }) => {
        if (error) {
          console.error("neighborhood_by_invite_code RPC error:", error);
          return;
        }
        setNeighborhoodName(data?.[0]?.name ?? null);
      });
  }, [urlCode, supabase]);

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
      .eq("invite_code", code.trim().toUpperCase())
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
        status: "active",
      });

    setLoading(false);

    if (insertError) {
      if (insertError.code === "23505") {
        setError("You've already joined this neighborhood.");
      } else {
        setError(insertError.message);
      }
      return;
    }

    router.push("/browse");
    router.refresh();
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center px-6">
      <span className="commons-heading mb-1 self-center text-4xl">
        {neighborhoodName ? `${neighborhoodName} Commons` : "commons"}
      </span>
      <div className="commons-card-flat mt-4 p-6">
        <p className="mb-6 text-sm">
          Enter the invite code shared by a neighbor or your community
          organizer.
        </p>

        <form onSubmit={handleJoin} className="flex flex-col gap-3">
          <input
            type="text"
            required
            placeholder="Invite code"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            className="commons-input text-sm uppercase"
          />

          {error && <p className="font-mono text-xs text-commons-brick">{error}</p>}

          <button type="submit" disabled={loading} className="commons-button text-sm disabled:opacity-50">
            {loading ? "Checking…" : "Request to join"}
          </button>
        </form>
      </div>
    </main>
  );
}

export default function JoinPage() {
  return (
    <Suspense fallback={null}>
      <JoinInner />
    </Suspense>
  );
}