"use client";

export function ListSearchBar({
  value,
  onChange,
  placeholder = "Search…",
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <input
      type="search"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full rounded-lg border border-violet-300 dark:border-slate-600 px-3 py-2.5 text-sm shadow-sm dark:shadow-slate-950/50"
      autoComplete="off"
    />
  );
}
