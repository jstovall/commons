"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createItemRequest } from "@/app/actions";

export default function AskForm({
  categories,
}: {
  categories: { id: string; name: string }[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    startTransition(async () => {
      await createItemRequest(formData);
      formRef.current?.reset();
      setOpen(false);
      router.refresh();
    });
  }

  return (
    <details
      open={open}
      onToggle={(e) => setOpen(e.currentTarget.open)}
      className="commons-card mb-8 p-4"
    >
      <summary className="cursor-pointer font-mono text-sm font-bold">
        + post an ask
      </summary>
      <form ref={formRef} onSubmit={handleSubmit} className="mt-3 flex flex-col gap-3">
        <input
          name="title"
          required
          placeholder="What are you looking for?"
          className="commons-input text-sm"
        />
        <select name="category_id" className="commons-input text-sm">
          <option value="">Choose a category</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <textarea
          name="description"
          placeholder="Any details (how long you need it, etc.)"
          className="commons-input text-sm"
        />
        <button disabled={isPending} className="commons-button self-start text-sm disabled:opacity-50">
          {isPending ? "Posting…" : "Post ask"}
        </button>
      </form>
    </details>
  );
}