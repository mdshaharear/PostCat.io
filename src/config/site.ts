export const siteConfig = {
  name: "PostCat",
  url: "https://postcat.io",
  tagline: "Find better products, faster.",
  description: "A modern multi-category product discovery and comparison platform with transparent merchant offers.",
  nav: [
    { label: "Discover", href: "/" },
    { label: "Categories", href: "/categories" },
    { label: "Electronics", href: "/categories/electronics" },
    { label: "Home", href: "/categories/home" },
    { label: "Health & beauty", href: "/categories/health-beauty" },
    { label: "Compare", href: "/compare" },
  ],
} as const;
