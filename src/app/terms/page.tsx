import { TrustPage, trustMetadata } from "@/components/trust-page";

export const metadata = trustMetadata("Terms of use", "Review the pre-launch terms and limitations for using the PostCat product-discovery demo.", "/terms");

export default function TermsPage() {
  return <TrustPage title="Terms of use" intro="These pre-launch terms explain the limits of the current demonstration. Production terms should receive appropriate legal review before commercial launch." sections={[
    { heading: "Demo information only", paragraphs: ["The current catalog is provided to demonstrate product organization, search, comparison and offer modeling. It is not purchasing, safety, financial, medical or professional advice."] },
    { heading: "No live transaction", bullets: ["Demo prices, ratings, reviews, specifications and availability may be fictional.", "PostCat does not currently sell products or process payments.", "Future purchases will be governed by the selected merchant's terms and policies."] },
    { heading: "Acceptable use", paragraphs: ["Do not attempt to disrupt the service, bypass access controls, extract secrets, misrepresent demo content as verified commercial data or use the site unlawfully."] },
    { heading: "Changes", paragraphs: ["Features and policies may change during development. Material production changes should be reflected in the visible policy pages before they take effect."] },
  ]} />;
}
