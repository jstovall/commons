"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

const FILTER_OPTIONS = [
  { value: "available", label: "Available" },
  { value: "most_popular", label: "Most Popular" },
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

  function navigate(overrides: { q?: string; category?: string; filter?: string } = {}) {
    const finalQ = overrides.q ?? q;
    const finalCategory = overrides.category ?? category;
    const finalFilter = overrides.filter ?? filter;

    const params = new URLSearchParams();
    if (finalQ.trim()) params.set("q", finalQ.trim());
    if (finalCategory) params.set("category", finalCategory);
    if (finalFilter) params.set("filter", finalFilter);
    router.push(`/browse${params.toString() ? `?${params.toString()}` : ""}`);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    navigate();
  }

  function handleCategoryChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const value = e.target.value;
    setCategory(value);
    navigate({ category: value });
  }

  function handleFilterChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const value = e.target.value;
    setFilter(value);
    navigate({ filter: value });
  }

  return (
    <div className="mb-6 flex flex-col gap-2">
      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          type="text"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search items or neighbors…"
          className="commons-input flex-1 text-sm"
        />
        <button type="submit" aria-label="Search" className="commons-button px-3 text-sm">
          🔍
        </button>
      </form>
      <div className="flex gap-2">
        <select
          value={category}
          onChange={handleCategoryChange}
          className="commons-input flex-1 text-sm"
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
          onChange={handleFilterChange}
          className="commons-input flex-1 text-sm"
        >
          {FILTER_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}