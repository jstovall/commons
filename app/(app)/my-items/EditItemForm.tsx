"use client";

import { useState, useTransition } from "react";
import { updateItem, deleteItem } from "@/app/actions";
import ImageFileInput from "./ImageFileInput";

interface Item {
  id: string;
  name: string;
  description: string | null;
  image_url: string | null;
  category_id: string | null;
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

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    setSaved(false);

    startTransition(async () => {
      await updateItem(formData);
      setSaved(true);
    });
  }

  return (
    <details className="mt-3">
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
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={item.image_url}
            alt=""
            className="h-24 w-24 rounded-md border-2 border-commons-ink object-cover"
          />
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
      <form action={deleteItem} className="mt-2">
        <input type="hidden" name="item_id" value={item.id} />
        <button className="font-mono text-xs font-bold text-commons-brick underline">
          Delete item
        </button>
      </form>
    </details>
  );
}