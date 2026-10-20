// All content lives in src/data/*.json and is bundled at build time, so the
// presentation never fetches anything at runtime (works offline and from any folder).
const files = import.meta.glob('../data/*.json', { eager: true, import: 'default' }) as Record<string, unknown>;

export function hasData(name: string): boolean {
  return `../data/${name}` in files;
}

export function getData<T = unknown>(name: string): T {
  const key = `../data/${name}`;
  if (!(key in files)) throw new Error(`Data file not found: src/data/${name}`);
  return files[key] as T;
}

export function listData(): string[] {
  return Object.keys(files).map((k) => k.replace('../data/', '')).sort();
}
