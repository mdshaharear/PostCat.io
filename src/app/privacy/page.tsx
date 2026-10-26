import { TrustPage, trustMetadata } from "@/components/trust-page";

export const metadata = trustMetadata("Privacy notice", "Read what data the current PostCat preview processes and what may change before public launch.", "/privacy");

export default function PrivacyPage() {
  return <TrustPage title="Privacy notice" intro="This notice describes the current pre-launch website, not a future production configuration that has not yet been deployed." sections={[
    { heading: "Current data processing", paragraphs: ["PostCat currently serves a public demo catalog. It has no user accounts, checkout, newsletter form or contact form, and the application code does not intentionally store search queries or create advertising profiles."] },
    { heading: "Hosting and technical logs", paragraphs: ["A hosting provider may process routine request information such as IP address, browser details, requested URL and timestamps for delivery, security and reliability. Retention and processor details will be finalized with the production host before public launch."] },
    { heading: "Cookies and analytics", paragraphs: ["The current application does not intentionally set analytics or advertising cookies. If analytics, consent controls or additional processors are added later, this notice must be updated before those features are enabled."] },
    { heading: "Your choices", paragraphs: ["Do not send personal or confidential information through product search. A verified privacy contact channel and applicable request process will be published before production data collection begins."] },
  ]} />;
}
