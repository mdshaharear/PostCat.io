import type { MetadataRoute } from "next";
import { categories, isCategoryIndexable } from "@/data/catalog";

import { getPublicOrigin } from "@/config/public-origin";

const origin = getPublicOrigin();

export default function sitemap(): MetadataRoute.Sitemap {
  const staticRoutes = ["", "/categories", "/about", "/affiliate-disclosure", "/privacy", "/terms", "/accessibility", "/contact"];
  return [
    ...staticRoutes.map((path) => ({ url: new URL(path || "/", origin).toString() })),
    ...categories.filter((category) => isCategoryIndexable(category.slug)).map((category) => ({ url: new URL(`/categories/${category.slug}`, origin).toString() })),
  ];
}
