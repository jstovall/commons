"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

function SignupInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const code = searchParams.get("invite");
  const supabase = createClient();

  const [neighborhoodName, setNeighborhoodName] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [checkEmail, setCheckEmail] = useState(false);

  useEffect(() => {
    if (!code) return;
    supabase
      .rpc("neighborhood_by_invite_code", { _code: code.toUpperCase() })
      .then(({ data, error }) => {
        if (error) {
          console.error("neighborhood_by_invite_code RPC error:", error);
          return;
        }
        setNeighborhoodName(data?.[0]?.name ?? null);
      });
  }, [code, supabase]);

  async function handleSignUp(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

const { data, error } = await supabase.auth.signUp({
  email,
  password,
  options: {
    data: { display_name: name },
emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(
  code ? `/join?invite=${code}` : "/login"
)}`,
  },
});

    setLoading(false);
    if (error) {
      setError(error.message);
      return;
    }

    const joinUrl = code ? `/join?invite=${encodeURIComponent(code)}` : "/join";

    if (data.session) {
      router.push(joinUrl);
      router.refresh();
    } else {
      setCheckEmail(true);
    }
  }

  if (checkEmail) {
    return (
      <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center px-6">
        <span className="commons-heading mb-1 self-center text-4xl">
          {neighborhoodName ? `${neighborhoodName} Commons` : "commons"}
        </span>
        <div className="commons-card-flat mt-4 p-6 text-center">
          <p className="commons-heading text-xl">Check your email</p>
          <p className="mt-2 text-sm">
            We sent a confirmation link to <strong>{email}</strong>. Click it,
            then come back and sign in to join your neighborhood.
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center px-6">
      <span className="commons-heading mb-1 self-center text-4xl">
        {neighborhoodName ? `${neighborhoodName} Commons` : "commons"}
      </span>
      <div className="commons-card-flat mt-4 p-6">
        <p className="mb-6 text-sm">Join Commons to share and borrow with your neighbors.</p>

        <form onSubmit={handleSignUp} className="flex flex-col gap-3">
          <input
            type="text"
            required
            placeholder="Your name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="commons-input text-sm"
          />
          <input
            type="email"
            required
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="commons-input text-sm"
          />
          <input
            type="password"
            required
            minLength={6}
            placeholder="Password (6+ characters)"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="commons-input text-sm"
          />

          {error && <p className="font-mono text-xs text-commons-brick">{error}</p>}

          <button type="submit" disabled={loading} className="commons-button text-sm disabled:opacity-50">
            {loading ? "Creating account…" : "Create account"}
          </button>
        </form>

        <p className="mt-4 text-center text-sm">
          Already have an account?{" "}
          <a
            href={code ? `/login?invite=${encodeURIComponent(code)}` : "/login"}
            className="font-mono text-xs font-bold underline"
          >
            Sign in
          </a>
        </p>
      </div>
    </main>
  );
}

export default function SignupPage() {
  return (
    <Suspense fallback={null}>
      <SignupInner />
    </Suspense>
  );
}