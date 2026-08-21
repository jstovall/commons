"use client";

import { useRef, useState, useTransition } from "react";
import { createItem } from "@/app/actions";
import ImageFileInput from "./ImageFileInput";



export default function NewItemForm({
  categories,
  defaultListingType = "loan",
}: {
  categories: { id: string; name: string }[];
  defaultListingType?: "loan" | "giveaway";
}) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [formKey, setFormKey] = useState(0);
  const formRef = useRef<HTMLFormElement>(null);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    startTransition(async () => {
      await createItem(formData);
      formRef.current?.reset();
      setFormKey((k) => k + 1);
      setOpen(false);
    });
  }

  return (
<details
  open={open}
  onToggle={(e) => setOpen(e.currentTarget.open)}
  className="commons-card-flat p-4"
>
      <summary className="cursor-pointer font-mono text-sm font-bold">
        + post a new item
      </summary>
      <label className="flex items-center gap-2 text-sm">
  <input
    type="checkbox"
    name="listing_type"
    value="giveaway"
    defaultChecked={defaultListingType === "giveaway"}
    className="h-4 w-4 border-2 border-commons-ink"
  />
  Giving away (not a loan)
</label>
      <form
        ref={formRef}
        onSubmit={handleSubmit}
        className="mt-3 flex flex-col gap-3"
      >
        <input
          name="name"
          required
          placeholder="Item name"
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
          placeholder="Description"
          className="commons-input text-sm"
        />
        <ImageFileInput key={formKey} name="image_file" label="Photo (optional)" />
        <button
          disabled={isPending}
          className="commons-button self-start text-sm disabled:opacity-50"
        >
          {isPending ? "Posting…" : "Post item"}
        </button>
      </form>
    </details>
  );
}