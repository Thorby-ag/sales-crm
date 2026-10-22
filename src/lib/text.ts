/** Lowercase, trimmed and without accents, for comparisons. */
export function normalize(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim();
}

export function slugify(value: string): string {
  return normalize(value)
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** A slug for `value` that isn't taken yet: "acme", then "acme-2", "acme-3"… */
export function uniqueSlug(value: string, taken: ReadonlySet<string>, fallback: string): string {
  const base = slugify(value) || fallback;
  let slug = base;
  for (let n = 2; taken.has(slug); n++) slug = `${base}-${n}`;
  return slug;
}

/** Small, stable string hash for deterministic demo data. */
export function hashString(value: string): number {
  let h = 0;
  for (const char of value) h = (h * 31 + char.charCodeAt(0)) >>> 0;
  return h;
}
