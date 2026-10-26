import { TrustPage, trustMetadata } from "@/components/trust-page";

export const metadata = trustMetadata("Contact", "Find the current contact and support status for the PostCat pre-launch project.", "/contact");

export default function ContactPage() {
  return <TrustPage title="Contact" intro="PostCat is currently in private pre-launch development, so a public support inbox and submission form are not active yet." sections={[
    { heading: "Before public launch", paragraphs: ["A verified general contact address, privacy channel and accessibility channel will be published here before production collection, affiliate activity or public support begins."] },
    { heading: "What not to send", bullets: ["Passwords, API keys or account credentials.", "Payment, health or identity information.", "Private merchant feeds or contractual data through public search fields."] },
    { heading: "Future support scope", paragraphs: ["The production contact process will distinguish catalog corrections, privacy requests, accessibility feedback, partnership inquiries and technical incidents so each request reaches the right owner."] },
  ]} />;
}
