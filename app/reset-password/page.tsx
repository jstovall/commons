"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function ResetPasswordPage() {
  const router = useRouter();
  const supabase = createClient();

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords don't match.");
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);

    if (error) {
      setError(
        error.message.toLowerCase().includes("session")
          ? "Your reset link has expired. Please request a new one."
          : error.message
      );
      return;
    }
    setDone(true);
    setTimeout(() => {
      router.push("/browse");
      router.refresh();
    }, 1500);
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center px-6">
      <span className="commons-heading mb-1 self-center text-4xl">commons</span>
      <div className="commons-card-flat mt-4 p-6">
        {done ? (
          <p className="text-center text-sm">
            <span className="commons-heading block text-xl">Password updated!</span>
            Taking you to Commons…
          </p>
        ) : (
          <>
            <p className="mb-6 text-sm">Choose a new password for your account.</p>
            <form onSubmit={handleSubmit} className="flex flex-col gap-3">
              <input
                type="password"
                required
                minLength={6}
                placeholder="New password (6+ characters)"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="commons-input text-sm"
              />
              <input
                type="password"
                required
                placeholder="Confirm new password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="commons-input text-sm"
              />
              {error && <p className="font-mono text-xs text-commons-brick">{error}</p>}
              <button
                type="submit"
                disabled={loading}
                className="commons-button text-sm disabled:opacity-50"
              >
                {loading ? "Updating…" : "Update password"}
              </button>
            </form>
          </>
        )}
      </div>
    </main>
  );
}