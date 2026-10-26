import { expect, test } from "@playwright/test";

test("mobile hero card keeps readable text and full-size controls", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 740 });
  await page.goto("/");
  const caption = page.locator(".hero-product-caption");
  const heading = caption.getByRole("heading", { level: 2 });
  const cta = caption.getByRole("link");
  const orbit = page.locator(".hero-orbit");
  await expect(caption).toBeVisible();
  await expect(orbit).toBeVisible();
  const contrast = await heading.evaluate((element) => {
    const parse = (value: string) => value.match(/[\d.]+/g)?.slice(0, 3).map(Number) ?? [0, 0, 0];
    const luminance = (rgb: number[]) => {
      const channels = rgb.map((value) => {
        const channel = value / 255;
        return channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
      });
      return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
    };
    const foreground = luminance(parse(getComputedStyle(element).color));
    const background = luminance(parse(getComputedStyle(element.parentElement!.parentElement!).backgroundColor));
    return (Math.max(foreground, background) + 0.05) / (Math.min(foreground, background) + 0.05);
  });
  expect(contrast).toBeGreaterThanOrEqual(4.5);
  const ctaBox = await cta.boundingBox();
  expect(ctaBox?.width ?? 0).toBeGreaterThanOrEqual(44);
  expect(ctaBox?.height ?? 0).toBeGreaterThanOrEqual(44);
  const featureBox = await page.locator(".hero-feature").boundingBox();
  const orbitBox = await orbit.boundingBox();
  expect(orbitBox?.x ?? -1).toBeGreaterThanOrEqual(featureBox?.x ?? 0);
  expect((orbitBox?.x ?? 0) + (orbitBox?.width ?? 0)).toBeLessThanOrEqual((featureBox?.x ?? 0) + (featureBox?.width ?? 0));
});

test("mobile comparison exposes a scroll hint and keeps row labels visible", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 740 });
  await page.goto("/compare");
  await expect(page.getByText("Swipe horizontally to compare products")).toBeVisible();
  const wrapper = page.locator(".comparison-wrap");
  const rowLabel = page.locator(".comparison-table tbody th").first();
  const initial = await rowLabel.boundingBox();
  await wrapper.evaluate((element) => { element.scrollLeft = 420; });
  await expect.poll(() => wrapper.evaluate((element) => element.scrollLeft)).toBeGreaterThan(0);
  const scrolled = await rowLabel.boundingBox();
  expect(Math.abs((scrolled?.x ?? 0) - (initial?.x ?? 0))).toBeLessThanOrEqual(1);
});

test("homepage search reaches relevant results without horizontal overflow", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  const search = page.getByRole("textbox", { name: "Search the product catalog" });
  await search.fill("coffee");
  await search.press("Enter");
  await expect(page).toHaveURL(/\/search\?q=coffee/);
  await expect(page.getByRole("heading", { level: 1 })).toContainText("coffee");
  await expect(page.getByRole("link", { name: /Aero Brew Coffee Maker/ }).first()).toBeVisible();
});

test("product gallery and disclosure navigation work", async ({ page }) => {
  await page.goto("/products/aero-brew-coffee-maker");
  const mainImage = page.locator(".gallery-main img");
  await expect(mainImage).toHaveAttribute("src", /product-1\.svg/);
  await page.getByRole("button", { name: "Show alternate demo view" }).click();
  await expect(mainImage).toHaveAttribute("src", /product-1-alt\.svg/);
  await expect(page.getByRole("button", { name: "Show alternate demo view" })).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("link", { name: "Offer details" }).first().click();
  await expect(page).toHaveURL(/#affiliate-disclosure$/);
  await expect(page.locator("#affiliate-disclosure")).toBeVisible();
});

test("search filters have unique IDs and preserve query state", async ({ page }) => {
  await page.goto("/search?q=wireless&category=electronics");
  const ids = await page.locator("[id]").evaluateAll((elements) => elements.map((element) => element.id));
  expect(new Set(ids).size).toBe(ids.length);
  await expect(page.locator("#category-filter-desktop")).toHaveValue("electronics");
  await expect(page.locator("input[name=q]").last()).toHaveValue("wireless");
});

test("homepage prioritizes only its LCP image and keeps catalog images lazy", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator(".hero-feature img")).toHaveAttribute("fetchpriority", "high");
  const catalogImages = page.locator(".product-grid img");
  await expect(catalogImages.first()).toHaveAttribute("loading", "lazy");
  await expect(catalogImages.nth(1)).toHaveAttribute("loading", "lazy");
  await expect.poll(() => page.locator('img[fetchpriority="high"]').count()).toBe(1);
});

test("product media ships explicit dimensions and cache-friendly delivery", async ({ page }) => {
  await page.goto("/");
  const heroImage = page.locator(".hero-feature img");
  await expect(heroImage).toHaveAttribute("width", "800");
  await expect(heroImage).toHaveAttribute("height", "800");
  const response = await page.request.get("/products/product-1.svg");
  expect(response.headers()["cache-control"]).toContain("max-age=86400");
  const productPage = await page.request.get("/products/aero-brew-coffee-maker");
  expect(productPage.headers()["cache-control"] ?? "").not.toContain("max-age=86400");
});

test("desktop category menu exposes native expanded state", async ({ page, isMobile }) => {
  test.skip(isMobile, "desktop-only navigation");
  await page.goto("/");
  const categories = page.getByRole("group").filter({ hasText: "Categories" }).first();
  await expect(categories).not.toHaveAttribute("open", "");
  await categories.locator("summary").click();
  await expect(categories).toHaveAttribute("open", "");
  await expect(page.locator(".mega-menu")).toBeVisible();
});

test("navigation links remain available without JavaScript", async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false, viewport: { width: 390, height: 844 }, isMobile: true });
  const page = await context.newPage();
  await page.goto("/");
  await expect(page.getByRole("navigation", { name: "Navigation fallback" })).toBeVisible();
  await expect(page.getByRole("navigation", { name: "Navigation fallback" }).getByRole("link", { name: "Categories" })).toBeVisible();
  await context.close();
});

test("desktop header and footer expose compact discovery paths", async ({ page, isMobile }) => {
  test.skip(isMobile, "desktop-only navigation");
  await page.goto("/");
  await expect(page.getByRole("navigation", { name: "Primary navigation" })).toBeVisible();
  await expect(page.getByRole("search", { name: "Site search" })).toBeVisible();
  await expect(page.getByRole("contentinfo")).toContainText("Browse 347 categories");
  await expect(page.getByRole("contentinfo").getByRole("link", { name: "All categories", exact: true })).toBeVisible();
});

test("trust pages and machine-readable discovery are reachable", async ({ page, request }) => {
  for (const route of ["/about", "/affiliate-disclosure", "/privacy", "/terms", "/accessibility", "/contact"]) {
    const response = await request.get(route);
    expect(response.status()).toBe(200);
  }
  await page.goto("/privacy");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Privacy");
  const llms = await request.get("/llms.txt");
  expect(await llms.text()).toContain("/privacy");
  const sitemap = await request.get("/sitemap.xml");
  const sitemapXml = await sitemap.text();
  expect(sitemapXml).toContain("https://postcat.io/privacy");
  const locations = [...sitemapXml.matchAll(/<loc>(.*?)<\/loc>/g)].map((match) => match[1]);
  expect(locations.length).toBeGreaterThan(0);
  expect(locations.every((url) => url.startsWith("https://postcat.io/"))).toBe(true);
  expect(sitemapXml).not.toContain("localhost");
  expect(sitemapXml).not.toContain("192.168.");

  const robots = await (await request.get("/robots.txt")).text();
  expect(robots).toContain("Sitemap: https://postcat.io/sitemap.xml");

  await page.goto("/");
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", "https://postcat.io");
  await expect(page.getByRole("contentinfo").getByRole("link", { name: /postcat\.io/ })).toHaveAttribute("href", "https://postcat.io");
});

test("fictional product and comparison pages stay out of the index", async ({ page, request }) => {
  for (const route of ["/products/aero-brew-coffee-maker", "/compare"]) {
    await page.goto(route);
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
  }
  const sitemap = await request.get("/sitemap.xml");
  const xml = await sitemap.text();
  expect(xml).not.toContain("/products/aero-brew-coffee-maker");
  expect(xml).not.toContain("/compare");
});

test("category and product pages publish matching breadcrumb structured data", async ({ page }) => {
  for (const route of ["/categories/electronics", "/products/aero-brew-coffee-maker"]) {
    await page.goto(route);
    const blocks = await page.locator('script[type="application/ld+json"]').allTextContents();
    const nodes = blocks.flatMap((block) => { const value = JSON.parse(block); return Array.isArray(value) ? value : [value]; });
    expect(nodes.some((node) => node["@type"] === "BreadcrumbList")).toBe(true);
  }
});

test("global metadata includes branded social images and defensive headers", async ({ page, request }) => {
  await page.goto("/");
  await expect(page.locator('meta[property="og:image"]')).toHaveAttribute("content", /opengraph-image/);
  const og = await request.get("/opengraph-image");
  expect(og.status()).toBe(200);
  expect(og.headers()["content-type"]).toContain("image/png");
  const home = await request.get("/");
  expect(home.headers()["x-content-type-options"]).toBe("nosniff");
  expect(home.headers()["x-frame-options"]).toBe("DENY");
  expect(home.headers()["referrer-policy"]).toContain("strict-origin");
  expect(home.headers()["permissions-policy"]).toContain("camera=()");
  expect(home.headers()["content-security-policy"]).toContain("object-src 'none'");
  expect(home.headers()["content-security-policy"]).not.toContain("upgrade-insecure-requests");
  expect(home.headers()["strict-transport-security"]).toContain("max-age=");
});

test("search stays crawlable for noindex and matches the SearchAction policy", async ({ page, request }) => {
  const robots = await (await request.get("/robots.txt")).text();
  expect(robots).not.toContain("Disallow: /search");
  await page.goto("/search?q=coffee");
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
  await page.goto("/");
  const blocks = await page.locator('script[type="application/ld+json"]').allTextContents();
  const serialized = blocks.join("\n");
  expect(serialized).toContain("https://postcat.io/search?q={search_term_string}");
});

test("unknown routes render the custom 404", async ({ page }) => {
  const response = await page.goto("/this-route-does-not-exist");
  expect(response?.status()).toBe(404);
  await expect(page.getByRole("heading", { level: 1 })).toContainText("not in the edit");
});

test("mobile menu and filter sheet stay inside the viewport", async ({ page, isMobile }) => {
  test.skip(!isMobile, "mobile-only interaction");
  await page.goto("/");
  const menuTrigger = page.getByRole("button", { name: "Open navigation" });
  await menuTrigger.click();
  const mobileMenu = page.getByRole("dialog", { name: "Site navigation" });
  await expect(mobileMenu).toBeVisible();
  await expect(page.locator("#main-content")).toHaveAttribute("inert", "");
  await expect(page.getByRole("contentinfo", { includeHidden: true })).toHaveAttribute("aria-hidden", "true");
  await expect(page.getByRole("button", { name: "Close navigation" })).toBeFocused();
  const menuBox = await mobileMenu.boundingBox();
  const menuViewport = page.viewportSize();
  expect(menuBox).not.toBeNull();
  expect(menuViewport).not.toBeNull();
  expect(menuBox!.x).toBeGreaterThanOrEqual(0);
  expect(menuBox!.y).toBe(0);
  expect(menuBox!.x + menuBox!.width).toBeLessThanOrEqual(menuViewport!.width);
  expect(menuBox!.y + menuBox!.height).toBeLessThanOrEqual(menuViewport!.height);
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.keyboard.press("Escape");
  await expect(mobileMenu).toBeHidden();
  await expect(page.locator("#main-content")).not.toHaveAttribute("inert", "");
  await expect(menuTrigger).toBeFocused();
  await page.goto("/search?q=coffee");
  await page.getByRole("button", { name: /Filters/ }).click();
  const sheet = page.getByRole("dialog", { name: "Product filters" });
  await expect(sheet).toBeVisible();
  await expect(page.getByRole("button", { name: "Close filters" })).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(sheet).toBeHidden();
  await expect(page.getByRole("button", { name: /Filters/ })).toBeFocused();
  await page.getByRole("button", { name: /Filters/ }).click();
  await expect(sheet).toBeVisible();
  const box = await sheet.boundingBox();
  const viewport = page.viewportSize();
  expect(box).not.toBeNull();
  expect(viewport).not.toBeNull();
  expect(box!.x).toBeGreaterThanOrEqual(0);
  expect(box!.x + box!.width).toBeLessThanOrEqual(viewport!.width);
  expect(box!.y + box!.height).toBeLessThanOrEqual(viewport!.height);
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});
