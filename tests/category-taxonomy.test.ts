import test from "node:test";
import assert from "node:assert/strict";
import type { Category } from "../src/types/catalog.ts";
import { createCategoryGraph, validateCategoryTaxonomy } from "../src/data/category-taxonomy.ts";

const category = (id: string, slug: string, parentId?: string): Category => ({
  id,
  slug,
  parentId,
  name: slug,
  description: `${slug} test category`,
  accent: "#000000",
  icon: "•",
  searchTerms: [slug],
});

test("taxonomy validation rejects duplicate IDs and case-insensitive slugs", () => {
  const errors = validateCategoryTaxonomy([
    category("cat-one", "one"),
    category("cat-one", "ONE"),
  ]);
  assert.ok(errors.some((error) => error.includes("Duplicate category ID")));
  assert.ok(errors.some((error) => error.includes("Duplicate category slug")));
});

test("taxonomy validation rejects missing parents", () => {
  const errors = validateCategoryTaxonomy([category("cat-child", "child", "cat-missing")]);
  assert.ok(errors.some((error) => error.includes("Unknown parent cat-missing")));
});

test("taxonomy validation reports multi-node cycles", () => {
  const errors = validateCategoryTaxonomy([
    category("cat-a", "a", "cat-c"),
    category("cat-b", "b", "cat-a"),
    category("cat-c", "c", "cat-b"),
  ]);
  assert.ok(errors.some((error) => error.includes("Category cycle")));
  assert.throws(() => createCategoryGraph([
    category("cat-a", "a", "cat-b"),
    category("cat-b", "b", "cat-a"),
  ]), /Invalid category taxonomy/);
});

test("graph returns deterministic deep descendants and complete paths", () => {
  const graph = createCategoryGraph([
    category("cat-root", "root"),
    category("cat-a", "a", "cat-root"),
    category("cat-b", "b", "cat-a"),
    category("cat-c", "c", "cat-b"),
    category("cat-d", "d", "cat-c"),
  ]);
  assert.deepEqual(graph.getDescendants("root").map((item) => item.slug), ["a", "b", "c", "d"]);
  assert.deepEqual(graph.getPath("d").map((item) => item.slug), ["root", "a", "b", "c", "d"]);
});
