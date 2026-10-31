export function normalizeSlug(value) {
  if (typeof value !== 'string') {
    throw new TypeError('Slug must be a string');
  }

  const slug = value.trim().replace(/[A-Z]/g, (char) =>
    String.fromCharCode(char.charCodeAt(0) + 32)
  );

  if (
    slug.length < 1 ||
    slug.length > 32 ||
    !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)
  ) {
    throw new RangeError('Slug must contain 1–32 ASCII letters, digits, or single separating hyphens');
  }

  return slug;
}
