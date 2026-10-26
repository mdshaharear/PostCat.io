import test from "node:test";
import assert from "node:assert/strict";
import { isCategoryIndexable, isProductIndexable } from "../src/seo/indexability.ts";
import { buildSitemapShards } from "../src/seo/sitemap-shards.ts";

const product = (overrides: Partial<Parameters<typeof isProductIndexable>[0]> = {}) => ({
  status: "active" as const,
  verified: true,
  publishable: true,
  hasUsefulContent: true,
  activeOfferCount: 1,
  ...overrides,
});

test("only active verified products with useful content and an active offer are indexable", () => {
  assert.equal(isProductIndexable(product()), true);
  assert.equal(isProductIndexable(product({ verified: false })), false);
  assert.equal(isProductIndexable(product({ status: "draft" })), false);
  assert.equal(isProductIndexable(product({ status: "archived" })), false);
  assert.equal(isProductIndexable(product({ publishable: false })), false);
  assert.equal(isProductIndexable(product({ hasUsefulContent: false })), false);
  assert.equal(isProductIndexable(product({ activeOfferCount: 0 })), false);
});

test("leaf category requires ten verified indexable products", () => {
  assert.equal(isCategoryIndexable({ status: "active", isLeaf: true, ownProducts: Array.from({ length: 9 }, () => product()), qualifyingDescendantProductCount: 0 }), false);
  assert.equal(isCategoryIndexable({ status: "active", isLeaf: true, ownProducts: Array.from({ length: 10 }, () => product()), qualifyingDescendantProductCount: 0 }), true);
  assert.equal(isCategoryIndexable({ status: "active", isLeaf: true, ownProducts: Array.from({ length: 10 }, (_, index) => product({ verified: index !== 0 })), qualifyingDescendantProductCount: 0 }), false);
});

test("parent category requires qualifying descendant inventory or verified editorial value", () => {
  assert.equal(isCategoryIndexable({ status: "active", isLeaf: false, ownProducts: [], qualifyingDescendantProductCount: 0 }), false);
  assert.equal(isCategoryIndexable({ status: "active", isLeaf: false, ownProducts: [], qualifyingDescendantProductCount: 10 }), true);
  assert.equal(isCategoryIndexable({ status: "active", isLeaf: false, ownProducts: [], qualifyingDescendantProductCount: 0, verifiedEditorialValue: true }), true);
  assert.equal(isCategoryIndexable({ status: "retired", isLeaf: false, ownProducts: [], qualifyingDescendantProductCount: 10 }), false);
});

test("sitemap shards are stable, unique and never exceed fifty thousand URLs", () => {
  const entries = Array.from({ length: 100_005 }, (_, index) => ({ url: `https://postcat.io/products/product-${String(index).padStart(6, "0")}`, lastModified: new Date("2026-10-26T00:00:00.000Z") }));
  entries.push(entries[0]);
  const shards = buildSitemapShards(entries);
  assert.deepEqual(shards.map((shard) => shard.length), [50_000, 50_000, 5]);
  assert.equal(new Set(shards.flat().map((entry) => entry.url)).size, 100_005);
  assert.equal(shards.flat()[0]?.url, "https://postcat.io/products/product-000000");
});

test("sitemap shards reject foreign origins and credential-bearing URLs", () => {
  assert.throws(() => buildSitemapShards([{ url: "https://example.com/products/1", lastModified: new Date() }]));
  assert.throws(() => buildSitemapShards([{ url: "https://user:pass@postcat.io/products/1", lastModified: new Date() }]));
});
