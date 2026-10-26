import type { MetadataRoute } from "next";

import { getPublicOrigin } from "@/config/public-origin";

const origin = getPublicOrigin();

export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/" },
    sitemap: new URL("/sitemap.xml", origin).toString(),
  };
}
