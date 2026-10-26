export interface SitemapEntry {
  url: string;
  lastModified: Date;
}

const MAX_SITEMAP_URLS = 50_000;
const CANONICAL_ORIGIN = "https://postcat.io";

export function buildSitemapShards(entries: readonly SitemapEntry[], shardSize = MAX_SITEMAP_URLS): SitemapEntry[][] {
  if (!Number.isInteger(shardSize) || shardSize < 1 || shardSize > MAX_SITEMAP_URLS) {
    throw new Error(`sitemap shard size must be between 1 and ${MAX_SITEMAP_URLS}`);
  }
  const unique = new Map<string, SitemapEntry>();
  for (const entry of entries) {
    const url = new URL(entry.url);
    if (url.origin !== CANONICAL_ORIGIN || url.username || url.password || url.search || url.hash) throw new Error(`invalid canonical sitemap URL: ${entry.url}`);
    if (Number.isNaN(entry.lastModified.getTime())) throw new Error(`invalid lastModified for ${entry.url}`);
    const normalized = url.toString();
    const previous = unique.get(normalized);
    if (!previous || entry.lastModified > previous.lastModified) unique.set(normalized, { url: normalized, lastModified: new Date(entry.lastModified) });
  }
  const sorted = [...unique.values()].sort((left, right) => left.url.localeCompare(right.url));
  const shards: SitemapEntry[][] = [];
  for (let index = 0; index < sorted.length; index += shardSize) shards.push(sorted.slice(index, index + shardSize));
  return shards;
}
