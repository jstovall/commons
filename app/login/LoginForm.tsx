"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSignIn(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { error } = await supabase.auth.signInWithPassword({ email, password });

    setLoading(false);
    if (error) {
      setError(error.message);
      return;
    }

    router.push(searchParams.get("next") || "/browse");
    router.refresh();
  }

  return (
    <>
      <p className="mb-6 text-sm">Sign in to share and borrow with your neighbors.</p>

      <form onSubmit={handleSignIn} className="flex flex-col gap-3">
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
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="commons-input text-sm"
        />

        {error && <p className="font-mono text-xs text-commons-brick">{error}</p>}

        <button type="submit" disabled={loading} className="commons-button text-sm disabled:opacity-50">
          {loading ? "Signing in…" : "Sign in"}
        </button>
      </form>

      <p className="mt-4 text-center text-sm">
        New here?{" "}
        <a href="/signup" className="font-mono text-xs font-bold underline">
          Create an account
        </a>
      </p>
    </>
  );
}