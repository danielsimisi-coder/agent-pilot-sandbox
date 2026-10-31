export function normalizeSlug(value) {
  if (typeof value !== "string") {
    throw new TypeError("Slug must be a string.");
  }

  const slug = value.trim().replace(/[A-Z]/g, char => char.toLowerCase());

  if (
    slug.length < 1 ||
    slug.length > 32 ||
    !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)
  ) {
    throw new RangeError("Invalid slug.");
  }

  return slug;
}
// Code changed after review; even harmless drift requires new evidence.
