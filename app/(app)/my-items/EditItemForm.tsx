"use client";

import { useState, useTransition } from "react";
import { updateItem, deleteItem, toggleItemAvailability } from "@/app/actions";
import ImageFileInput from "./ImageFileInput";

interface Item {
  id: string;
  name: string;
  description: string | null;
  image_url: string | null;
  category_id: string | null;
  status: string;
}

export default function EditItemForm({
  item,
  categories,
}: {
  item: Item;
  categories: { id: string; name: string }[];
}) {
  const [isPending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);
  const [isToggling, startToggleTransition] = useTransition();

  const canToggle = item.status === "available" || item.status === "unavailable";

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    setSaved(false);

    startTransition(async () => {
      await updateItem(formData);
      setSaved(true);
    });
  }

  function handleToggle() {
    const formData = new FormData();
    formData.set("item_id", item.id);
    startToggleTransition(async () => {
      await toggleItemAvailability(formData);
    });
  }

  return (
  <details className="mt-2">
    <summary className="cursor-pointer font-mono text-xs font-bold">
      edit
    </summary>
    <form onSubmit={handleSubmit} className="mt-2 flex flex-col gap-2">
      <input type="hidden" name="item_id" value={item.id} />
      <input type="hidden" name="existing_image_url" value={item.image_url ?? ""} />
      <input
        name="name"
        defaultValue={item.name}
        onChange={() => setSaved(false)}
        className="commons-input text-sm"
      />
      <select
        name="category_id"
        defaultValue={item.category_id ?? ""}
        onChange={() => setSaved(false)}
        className="commons-input text-sm"
      >
        <option value="">Choose a category</option>
        {categories.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name}
          </option>
        ))}
      </select>
      <textarea
        name="description"
        defaultValue={item.description ?? ""}
        onChange={() => setSaved(false)}
        className="commons-input text-sm"
      />
{item.image_url && (
  <div className="commons-shipwindow" style={{ maxWidth: "10rem" }}>
    {/* eslint-disable-next-line @next/next/no-img-element */}
    <img src={item.image_url} alt="" />
  </div>
)}
      <ImageFileInput name="image_file" label="Replace photo (optional)" />
      <div className="flex items-center gap-3">
        <button
          disabled={isPending}
          className="commons-button self-start text-xs disabled:opacity-50"
        >
          {isPending ? "Saving…" : "Save"}
        </button>
        {saved && !isPending && (
          <span className="font-mono text-xs font-bold text-commons-teal">
            ✓ Saved
          </span>
        )}
      </div>
    </form>

    {canToggle && (
      <button
        onClick={handleToggle}
        disabled={isToggling}
        className="commons-button commons-button-secondary mt-2 text-xs disabled:opacity-50"
      >
        {isToggling
          ? "…"
          : item.status === "available"
            ? "Mark unavailable"
            : "Mark available"}
      </button>
    )}

    <form action={deleteItem} className="mt-2">
      <input type="hidden" name="item_id" value={item.id} />
      <button className="font-mono text-xs font-bold text-commons-brick underline">
        Delete item
      </button>
    </form>
  </details>
);
}