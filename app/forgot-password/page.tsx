"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

function ForgotPasswordInner() {
  const searchParams = useSearchParams();
  const linkFailed = searchParams.get("error") === "link_failed";
  const supabase = createClient();

  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent("/reset-password")}`,
    });

    setLoading(false);
    if (error) {
      setError(error.message);
      return;
    }
    setSent(true);
  }

  if (sent) {
    return (
      <div className="commons-card-flat mt-4 p-6 text-center">
        <p className="commons-heading text-xl">Check your email</p>
        <p className="mt-2 text-sm">
          If an account exists for <strong>{email}</strong>, we sent a link
          to reset your password.
        </p>
      </div>
    );
  }

  return (
    <div className="commons-card-flat mt-4 p-6">
      {linkFailed && (
        <p className="mb-3 font-mono text-xs text-commons-brick">
          That reset link didn&apos;t work — this can happen if it was
          opened in a different browser or app than the one you requested it
          from. Try again below.
        </p>
      )}
      <p className="mb-6 text-sm">
        Enter your email and we&apos;ll send you a link to reset your
        password.
      </p>
      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <input
          type="email"
          required
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="commons-input text-sm"
        />
        {error && <p className="font-mono text-xs text-commons-brick">{error}</p>}
        <button
          type="submit"
          disabled={loading}
          className="commons-button text-sm disabled:opacity-50"
        >
          {loading ? "Sending…" : "Send reset link"}
        </button>
      </form>
      <p className="mt-4 text-center text-sm">
        <a href="/login" className="font-mono text-xs font-bold underline">
          Back to sign in
        </a>
      </p>
    </div>
  );
}

export default function ForgotPasswordPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center px-6">
      <span className="commons-heading mb-1 self-center text-4xl">commons</span>
      <Suspense fallback={null}>
        <ForgotPasswordInner />
      </Suspense>
    </main>
  );
}