export interface SitemapEntry {
  url: string;
  lastModified: Date;
}

const MAX_SITEMAP_URLS = 50_000;
const MAX_SITEMAP_BYTES = 50 * 1024 * 1024;
const CANONICAL_ORIGIN = "https://postcat.io";

function entryBytes(entry: SitemapEntry): number {
  return new TextEncoder().encode(`<url><loc>${entry.url}</loc><lastmod>${entry.lastModified.toISOString()}</lastmod></url>`).byteLength;
}

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
  let shard: SitemapEntry[] = [];
  let shardBytes = 200;
  for (const entry of sorted) {
    const bytes = entryBytes(entry);
    if (bytes + 200 > MAX_SITEMAP_BYTES) throw new Error(`sitemap URL is too large: ${entry.url}`);
    if (shard.length && (shard.length >= shardSize || shardBytes + bytes > MAX_SITEMAP_BYTES)) {
      shards.push(shard);
      shard = [];
      shardBytes = 200;
    }
    shard.push(entry);
    shardBytes += bytes;
  }
  if (shard.length) shards.push(shard);
  return shards;
}
