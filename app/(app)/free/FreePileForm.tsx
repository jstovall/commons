"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createFreePile } from "@/app/actions";
import ImageFileInput from "../my-items/ImageFileInput";

export default function FreePileForm() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [formKey, setFormKey] = useState(0);
  const formRef = useRef<HTMLFormElement>(null);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    startTransition(async () => {
      await createFreePile(formData);
      formRef.current?.reset();
      setFormKey((k) => k + 1);
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
        + post a free pile
      </summary>
      <form ref={formRef} onSubmit={handleSubmit} className="mt-3 flex flex-col gap-3">
        <input name="title" required placeholder="What's out there?" className="commons-input text-sm" />
        <textarea name="description" placeholder="Any details…" className="commons-input text-sm" />
        <input
          name="location"
          placeholder="Where (e.g. curb at 5th & Oak)"
          className="commons-input text-sm"
        />
        <ImageFileInput key={formKey} name="image_file" label="Photo (optional)" />
        <button disabled={isPending} className="commons-button self-start text-sm disabled:opacity-50">
          {isPending ? "Posting…" : "Post pile"}
        </button>
      </form>
    </details>
  );
}