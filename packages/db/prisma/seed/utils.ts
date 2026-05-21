/**
 * Converts text to a URL-safe slug; strips diacritics and non-ASCII letters.
 */
export function slugify(text: string): string {
  return text
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** ltree labels: only A-Za-z0-9_ */
export function slugToLtreeLabel(slug: string): string {
  return slug.replace(/-/g, "_");
}

export function randomFromArray<T>(arr: readonly T[]): T {
  const item = arr[Math.floor(Math.random() * arr.length)];
  if (item === undefined) {
    throw new Error("randomFromArray: empty array");
  }
  return item;
}

export function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export function chunk<T>(arr: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size));
  }
  return chunks;
}

export function progress(
  current: number,
  total: number,
  label: string,
): void {
  const pct = total > 0 ? Math.round((current / total) * 100) : 0;
  process.stdout.write(`\r[${label}] ${current}/${total} (${pct}%)`);
  if (current >= total) {
    process.stdout.write("\n");
  }
}

export function measureTime(label: string): () => void {
  const start = Date.now();
  return () => {
    const elapsed = ((Date.now() - start) / 1000).toFixed(1);
    console.log(`  ⏱ ${label}: ${elapsed}s`);
  };
}
