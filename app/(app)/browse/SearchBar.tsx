"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

const FILTER_OPTIONS = [
  { value: "available", label: "Available" },
  { value: "checked_out", label: "Checked Out" },
  { value: "my_items", label: "My Items" },
  { value: "favorites", label: "My Favorites" },
];

export default function SearchBar({
  initialQuery,
  initialCategory,
  initialFilter,
  categories,
}: {
  initialQuery: string;
  initialCategory: string;
  initialFilter: string;
  categories: { id: string; name: string }[];
}) {
  const router = useRouter();
  const [q, setQ] = useState(initialQuery);
  const [category, setCategory] = useState(initialCategory);
  const [filter, setFilter] = useState(initialFilter);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const params = new URLSearchParams();
    if (q.trim()) params.set("q", q.trim());
    if (category) params.set("category", category);
    if (filter) params.set("filter", filter);
    router.push(`/browse${params.toString() ? `?${params.toString()}` : ""}`);
  }

  return (
    <form onSubmit={handleSubmit} className="mb-6 flex flex-wrap gap-2">
      <input
        type="text"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Search items…"
        className="commons-input flex-1 text-sm"
      />
      <select
        value={category}
        onChange={(e) => setCategory(e.target.value)}
        className="commons-input text-sm"
      >
        <option value="">All categories</option>
        {categories.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name}
          </option>
        ))}
      </select>
      <select
        value={filter}
        onChange={(e) => setFilter(e.target.value)}
        className="commons-input text-sm"
      >
        {FILTER_OPTIONS.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      <button type="submit" className="commons-button text-sm">
        Search
      </button>
    </form>
  );
}