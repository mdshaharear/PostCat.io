import { TrustPage, trustMetadata } from "@/components/trust-page";

export const metadata = trustMetadata("About PostCat", "Learn how PostCat organizes product discovery and keeps merchant offers separate from editorial product information.", "/about");

export default function AboutPage() {
  return <TrustPage title="About PostCat" intro="PostCat is a product-discovery platform designed to make large catalogs easier to browse, compare and understand without running a checkout." sections={[
    { heading: "What we are building", paragraphs: ["PostCat organizes products into focused categories, separates canonical products from variants and merchant offers, and provides clear comparison paths. The current site is a pre-launch demonstration of that system."] },
    { heading: "What the current catalog means", bullets: ["Product names, prices, ratings, reviews, availability and merchant offers are fictional demo data.", "No checkout, order processing or payment occurs on PostCat.", "Future commercial data will come only from approved feeds, files or APIs with source and freshness records."] },
    { heading: "Our publishing standard", paragraphs: ["We aim to publish source-backed facts, visible qualifiers and useful navigation. We do not claim firsthand product testing, merchant relationships or live availability unless those claims are explicitly verified."] },
  ]} />;
}
