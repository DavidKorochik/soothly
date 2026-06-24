export type SavedBook = {
  name: string;
  url: string;
  title?: string;
  age?: string;
  createdAt: number;
};

// A personal library can grow across a lifetime of interviews (different phases at different ages);
// cap it so localStorage stays bounded.
const MAX_BOOKS = 50;

// Prepend the new book (newest first), dropping any existing entry with the same url so a retry that
// re-stores the same key can't duplicate it.
export function addBook(list: SavedBook[], entry: SavedBook): SavedBook[] {
  return [entry, ...list.filter((b) => b.url !== entry.url)].slice(0, MAX_BOOKS);
}

// Parse the persisted library, tolerating corrupt or legacy values by returning an empty list.
export function parseBooks(raw: string | null): SavedBook[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (b): b is SavedBook => !!b && typeof b.url === "string" && typeof b.name === "string",
    );
  } catch {
    return [];
  }
}
