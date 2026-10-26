import test from "node:test";
import assert from "node:assert/strict";
import { buildGoogleCatalogItems, buildMetaCatalogItems, validateGoogleCatalogItem, validateMetaCatalogItem } from "../src/data/channel-catalog.ts";
import { buildProductView, categories, filterProducts, formatMoney, getCategoryChildren, getCategoryDescendants, getCategoryPath, getComparisonValue, getOffersForVariant, getProductBySlug, getProductsByCategory, isCategoryIndexable, offers, products, rootCategories, searchProducts, variants } from "../src/data/catalog.ts";
import { siteConfig } from "../src/config/site.ts";
import { resolvePublicOrigin } from "../src/config/public-origin.ts";
import { validateCategoryTaxonomy } from "../src/data/category-taxonomy.ts";

test("formatMoney converts integer minor units to USD display", () => {
  assert.equal(formatMoney({ amountMinor: 12999, currency: "USD" }), "$129.99");
});

test("PostCat branding and canonical domain are centralized", () => {
  assert.equal(siteConfig.name, "PostCat");
  assert.equal(siteConfig.url, "https://postcat.io");
  assert.match(siteConfig.description, /product/i);
});

test("popular departments have a useful demo product foundation", () => {
  assert.ok(products.length >= 24);
  assert.ok(getProductsByCategory("electronics").length >= 5);
  assert.ok(getProductsByCategory("home").length >= 5);
  assert.ok(getProductsByCategory("health-beauty").length >= 3);
  assert.ok(getProductsByCategory("fashion").length >= 2);
  assert.ok(getProductsByCategory("sports-outdoors").length >= 3);
});

test("catalog filters combine query, category, price, stock and sorting", () => {
  const filtered = filterProducts({ category: "electronics", maxPriceMinor: 20000, inStockOnly: true, sort: "price-asc" });
  assert.ok(filtered.length >= 2);
  assert.ok(filtered.every((item) => getCategoryPath(item.category.slug)[0]?.slug === "electronics"));
  assert.ok(filtered.every((item) => (item.startingPrice?.amountMinor ?? Infinity) <= 20000));
  assert.deepEqual(filtered.map((item) => item.startingPrice?.amountMinor), [...filtered].map((item) => item.startingPrice?.amountMinor).sort((a, b) => (a ?? 0) - (b ?? 0)));
  assert.ok(filterProducts({ query: "wireless", sort: "relevance" }).length > 0);
});

test("catalog queries preserve product and merchant-offer boundaries", () => {
  const product = getProductBySlug("aero-brew-coffee-maker");
  assert.ok(product);
  assert.ok(product.variants.length > 0);
  assert.ok(product.offers.length > 1);
  assert.equal((product.offers[0] as unknown as { productId?: string }).productId, undefined);
  assert.ok(product.offers.every((offer) => offer.variantId));
});

test("category and search queries return relevant products", () => {
  assert.ok(getProductsByCategory("home").every((item) => getCategoryPath(item.category.slug)[0]?.slug === "home"));
  assert.ok(searchProducts("coffee").some((item) => item.product.slug === "aero-brew-coffee-maker"));
  assert.deepEqual(searchProducts("no-match-for-demo"), []);
});

test("search matches all normalized query tokens across product fields", () => {
  assert.ok(searchProducts("  wireless   headphones ").some((item) => item.product.slug === "arc-one-headphones"));
  assert.ok(searchProducts("portable laptop").some((item) => item.product.slug === "northline-air-laptop"));
});

test("starting price ignores unavailable offers", () => {
  const product = products.find((item) => item.id === "p-coffee");
  assert.ok(product);
  const fixture = { id: "test-unavailable-offer", variantId: "p-coffee-v1", merchantId: "merchant-three", price: { amountMinor: 1, currency: "USD" as const }, availability: "out_of_stock" as const, shippingLabel: "Unavailable", observedAt: "2026-10-25T00:00:00Z" };
  offers.push(fixture);
  try { assert.notEqual(buildProductView(product).startingPrice?.amountMinor, 1); }
  finally { offers.pop(); }
});

test("taxonomy exposes broad departments with nested high-intent subcategories", () => {
  assert.ok(rootCategories.length >= 12);
  assert.ok(categories.length - rootCategories.length >= 40);
  assert.ok(rootCategories.every((category) => category.parentId === undefined));
  assert.ok(getCategoryChildren("electronics").some((category) => category.slug === "audio"));
  assert.ok(getCategoryChildren("home").some((category) => category.slug === "kitchen-appliances"));
});

test("electronics taxonomy is a deep gadget catalog foundation", () => {
  const electronics = getCategoryDescendants("electronics");
  const slugs = new Set(electronics.map((category) => category.slug));
  assert.ok(electronics.length >= 180);
  for (const slug of ["phone-accessories", "phone-cases", "tablet-accessories", "computer-components", "processors-cpus", "graphics-cards-gpus", "motherboards", "memory-ram", "internal-ssds", "power-supplies", "cpu-coolers", "computer-peripherals", "keyboards", "mice-trackballs", "networking", "wearables", "cameras-drones", "gaming-consoles", "power-charging", "cables-adapters"]) assert.ok(slugs.has(slug), `missing ${slug}`);
  assert.deepEqual(getCategoryPath("cpu-coolers").map((category) => category.slug), ["electronics", "computer-components", "computer-cooling", "cpu-coolers"]);
});

test("production taxonomy has unique IDs, slugs, valid parents and no cycles", () => {
  assert.deepEqual(validateCategoryTaxonomy(categories), []);
  assert.equal(new Set(categories.map((category) => category.id)).size, categories.length);
  assert.equal(new Set(categories.map((category) => category.slug)).size, categories.length);
});

test("products are assigned to specific leaf categories", () => {
  assert.ok(products.every((product) => {
    const category = categories.find((item) => item.id === product.categoryId);
    return category && category.isAssignable !== false && !categories.some((item) => item.parentId === category.id);
  }));
});

test("empty gadget placeholders stay out of the index while populated ancestors remain indexable", () => {
  assert.equal(isCategoryIndexable("processors-cpus"), false);
  assert.equal(isCategoryIndexable("phone-cases"), false);
  assert.equal(isCategoryIndexable("electronics"), true);
  assert.equal(isCategoryIndexable("computer-components"), false);
  assert.equal(isCategoryIndexable("phones"), true);
});

test("parent categories include products assigned to descendant subcategories", () => {
  const electronics = getProductsByCategory("electronics");
  assert.ok(electronics.some((item) => item.product.slug === "arc-one-headphones"));
  assert.ok(electronics.some((item) => item.product.slug === "pocket-tone-speaker"));
  assert.ok(getProductsByCategory("headphones-audio").some((item) => item.product.slug === "arc-one-headphones"));
});

test("category paths and search include taxonomy terms", () => {
  assert.deepEqual(getCategoryPath("coffee-makers").map((category) => category.slug), ["home", "kitchen-appliances", "coffee-makers"]);
  assert.ok(searchProducts("audio").some((item) => item.product.slug === "arc-one-headphones"));
});


test("variant offer query never returns offers from another variant", () => {
  const product = getProductBySlug("aero-brew-coffee-maker");
  assert.ok(product);
  const secondVariant = product.variants[1];
  const matching = getOffersForVariant(secondVariant.id);
  assert.ok(matching.length > 0);
  assert.ok(matching.every((offer) => offer.variantId === secondVariant.id));
});

test("comparison values use explicit comparable facts", () => {
  const headphones = getProductBySlug("arc-one-headphones");
  assert.ok(headphones);
  assert.equal(getComparisonValue(headphones, "materialOrWeight"), "245 g");
  assert.equal(getComparisonValue(headphones, "primaryAdvantage"), "Comfort-led shape");
});

test("Google and Meta catalog mappings create one validated item per product variant", () => {
  const googleItems = buildGoogleCatalogItems("https://postcat.io");
  const metaItems = buildMetaCatalogItems("https://postcat.io");
  assert.equal(googleItems.length, variants.length);
  assert.equal(metaItems.length, variants.length);
  assert.equal(new Set(googleItems.map((item) => `${item.item_group_id}:${item.color}`)).size, googleItems.length);
  assert.ok(googleItems.every((item) => validateGoogleCatalogItem(item).length === 0));
  assert.ok(metaItems.every((item) => validateMetaCatalogItem(item).length === 0));
  assert.ok(googleItems.every((item) => item.google_product_category.includes(" > ")));
  const googleCoffee = googleItems.find((item) => item.item_group_id === "p-coffee");
  const metaCoffee = metaItems.find((item) => item.item_group_id === "p-coffee");
  assert.ok(googleCoffee);
  assert.ok(metaCoffee);
  assert.equal(googleCoffee.availability, "in_stock");
  assert.equal(metaCoffee.availability, "in stock");
  assert.equal(googleCoffee.condition, "new");
  assert.match(googleCoffee.google_product_category, /Coffee Makers/);
  assert.match(metaCoffee.link, /^https:\/\/postcat\.io\/products\//);
});

test("category directory traversal includes nested descendants", () => {
  const homeDescendants = getCategoryDescendants("home");
  assert.ok(homeDescendants.some((category) => category.slug === "coffee-makers"));
  assert.equal(rootCategories.reduce((count, category) => count + getCategoryDescendants(category.slug).length, 0), categories.length - rootCategories.length);
});

test("production public origin is explicit and normalized", () => {
  assert.throws(() => resolvePublicOrigin(undefined, "production"), /NEXT_PUBLIC_SITE_URL/);
  assert.equal(resolvePublicOrigin("https://postcat.io/shop", "production"), "https://postcat.io");
  assert.equal(resolvePublicOrigin(undefined, "development"), "http://localhost:3000");
});
