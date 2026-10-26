import type { Metadata } from "next";
import { Manrope, Newsreader } from "next/font/google";
import { JsonLd } from "@/components/structured-data";
import { getPublicOrigin } from "@/config/public-origin";
import "./globals.css";

const sans = Manrope({ subsets: ["latin"], variable: "--font-sans" });
const serif = Newsreader({ subsets: ["latin"], variable: "--font-serif" });
const origin = getPublicOrigin();

export const metadata: Metadata = {
  metadataBase: new URL(origin),
  title: { default: "PostCat — Find better products, faster", template: "%s · PostCat" },
  description: "Discover and compare useful products across electronics, home, wellness, fashion, outdoors and more.",
  alternates: { canonical: "/" },
  openGraph: { type: "website", siteName: "PostCat", url: origin, title: "PostCat — Find better products, faster", description: "A clear, multi-category product discovery and comparison platform.", images: [{ url: "/opengraph-image", width: 1200, height: 630, alt: "PostCat — Find better products, faster" }] },
  twitter: { card: "summary_large_image", title: "PostCat — Find better products, faster", description: "Clear product discovery across everyday categories.", images: ["/opengraph-image"] },
};

const websiteJsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    { "@type": "Organization", "@id": `${origin}/#organization`, name: "PostCat", url: origin, description: "A pre-launch product discovery and comparison platform." },
    { "@type": "WebSite", "@id": `${origin}/#website`, name: "PostCat", url: origin, description: "A multi-category product discovery and comparison platform.", publisher: { "@id": `${origin}/#organization` }, potentialAction: { "@type": "SearchAction", target: `${origin}/search?q={search_term_string}`, "query-input": "required name=search_term_string" } },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="en" data-scroll-behavior="smooth" className={`${sans.variable} ${serif.variable}`}><body><JsonLd data={websiteJsonLd} />{children}</body></html>;
}
