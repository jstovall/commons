"use client";

export default function FreeError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="commons-card-flat p-4">
      <p className="commons-heading text-lg text-commons-brick">Something broke</p>
      <p className="mt-2 font-mono text-xs text-commons-ink/80">{error.message}</p>
      {error.digest && (
        <p className="mt-1 font-mono text-[10px] text-commons-ink/50">digest: {error.digest}</p>
      )}
      <button onClick={reset} className="commons-button mt-3 text-xs">
        Try again
      </button>
    </div>
  );
}