import { getCategoryPath, productViews } from "./catalog.ts";

interface SharedCatalogItem {
  id: string;
  item_group_id: string;
  title: string;
  description: string;
  condition: "new";
  price: string;
  link: string;
  image_link: string;
  brand: string;
  google_product_category: string;
  product_type: string;
  color: string;
  identifier_exists: "no";
  custom_label_0: string;
  custom_label_1: string;
}

export interface GoogleCatalogItem extends SharedCatalogItem {
  availability: "in_stock" | "out_of_stock" | "preorder" | "backorder";
}

export interface MetaCatalogItem extends SharedCatalogItem {
  availability: "in stock" | "out of stock";
}

function absoluteUrl(origin: string, path: string): string {
  return new URL(path, origin.endsWith("/") ? origin : `${origin}/`).toString();
}

function priceForFeed(amountMinor: number, currency: string): string {
  return `${(amountMinor / 100).toFixed(2)} ${currency}`;
}

function sharedCatalogItems(origin: string): Array<SharedCatalogItem & { sourceAvailability: "in_stock" | "limited" | "out_of_stock" }> {
  return productViews.flatMap((view) => {
    const categoryPath = getCategoryPath(view.category.slug);
    const productType = categoryPath.map((category) => category.name).join(" > ");
    const googleCategory = view.category.googleProductCategory;
    if (!googleCategory) throw new Error(`Missing verified Google product category for ${view.category.slug}`);

    return view.variants.flatMap((variant) => {
      const offer = view.offers
        .filter((candidate) => candidate.variantId === variant.id && candidate.availability !== "unknown")
        .sort((a, b) => {
          const availabilityRank = (value: typeof a.availability) => value === "in_stock" ? 0 : value === "limited" ? 1 : 2;
          return availabilityRank(a.availability) - availabilityRank(b.availability) || a.price.amountMinor - b.price.amountMinor;
        })[0];
      if (!offer || offer.availability === "unknown") return [];
      return [{
        id: variant.id,
        item_group_id: view.product.id,
        title: `${view.product.title} — ${variant.label}`,
        description: view.product.description,
        condition: "new" as const,
        price: priceForFeed(offer.price.amountMinor, offer.price.currency),
        link: absoluteUrl(origin, `/products/${view.product.slug}`),
        image_link: absoluteUrl(origin, view.images.find((image) => image.variantId === variant.id)?.src ?? view.images[0]?.src ?? "/products/placeholder.svg"),
        brand: view.brand.name,
        google_product_category: googleCategory,
        product_type: productType,
        color: variant.attributes.Color ?? variant.label,
        identifier_exists: "no" as const,
        custom_label_0: categoryPath[0]?.slug ?? "uncategorized",
        custom_label_1: view.category.slug,
        sourceAvailability: offer.availability,
      }];
    });
  });
}

export function buildGoogleCatalogItems(origin: string): GoogleCatalogItem[] {
  return sharedCatalogItems(origin).map(({ sourceAvailability, ...item }) => ({
    ...item,
    availability: sourceAvailability === "out_of_stock" ? "out_of_stock" : "in_stock",
  }));
}

export function buildMetaCatalogItems(origin: string): MetaCatalogItem[] {
  return sharedCatalogItems(origin).map(({ sourceAvailability, ...item }) => ({
    ...item,
    availability: sourceAvailability === "out_of_stock" ? "out of stock" : "in stock",
  }));
}

function validateSharedItem(item: SharedCatalogItem): string[] {
  const errors: string[] = [];
  const required: Array<keyof SharedCatalogItem> = [
    "id", "item_group_id", "title", "description", "condition", "price", "link", "image_link",
    "brand", "google_product_category", "product_type", "color",
  ];
  for (const field of required) {
    if (!String(item[field] ?? "").trim()) errors.push(`${String(field)} is required`);
  }
  if (!/^https:\/\//.test(item.link)) errors.push("link must use HTTPS");
  if (!/^https:\/\//.test(item.image_link)) errors.push("image_link must use HTTPS");
  if (!/^\d+\.\d{2} [A-Z]{3}$/.test(item.price)) errors.push("price must use amount and ISO currency");
  return errors;
}

export function validateGoogleCatalogItem(item: GoogleCatalogItem): string[] {
  const errors = validateSharedItem(item);
  if (!["in_stock", "out_of_stock", "preorder", "backorder"].includes(item.availability)) errors.push("unsupported Google availability");
  return errors;
}

export function validateMetaCatalogItem(item: MetaCatalogItem): string[] {
  const errors = validateSharedItem(item);
  if (!["in stock", "out of stock"].includes(item.availability)) errors.push("unsupported Meta availability");
  return errors;
}
