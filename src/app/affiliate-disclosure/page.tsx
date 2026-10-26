import { TrustPage, trustMetadata } from "@/components/trust-page";

export const metadata = trustMetadata("Affiliate disclosure", "Understand how future affiliate links may support PostCat and how commercial relationships are disclosed.", "/affiliate-disclosure");

export default function DisclosurePage() {
  return <TrustPage title="Affiliate disclosure" intro="PostCat is being designed as an affiliate product-discovery service. Transparency comes before monetization." sections={[
    { heading: "Current pre-launch status", paragraphs: ["The current catalog and merchant offers are fictional demonstrations. No live affiliate tracking or merchant checkout links are active in this preview."] },
    { heading: "How affiliate links will work", paragraphs: ["When approved affiliate links are introduced, PostCat may earn a commission after a qualifying action on a merchant website. The shopper's price should not increase because of that commission."], bullets: ["Commercial links will be visibly identified.", "Merchant offers will remain separate from product-level editorial information.", "Paid placement will not be presented as an independent ranking."] },
    { heading: "Price and availability", paragraphs: ["Merchants control their own price, availability, delivery, returns and checkout. Users should verify final terms on the merchant site before making a decision."] },
  ]} />;
}
