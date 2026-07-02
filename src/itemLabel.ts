// An accessible name for a cell. Objects that carry their own `alt`/`title`
// (e.g. the { src, alt } items the default renderer understands) reuse it;
// everything else — including bare-string URLs, whose text is not meaningful to
// a screen reader — falls back to a positional label.
export function itemLabel(item: unknown, index: number): string {
  if (item && typeof item === 'object') {
    const record = item as { alt?: unknown; title?: unknown };
    if (typeof record.alt === 'string' && record.alt.length > 0) return record.alt;
    if (typeof record.title === 'string' && record.title.length > 0) return record.title;
  }
  return `Item ${index + 1}`;
}
