import { TrustPage, trustMetadata } from "@/components/trust-page";

export const metadata = trustMetadata("Accessibility", "Read PostCat's accessibility approach and current pre-launch support boundaries.", "/accessibility");

export default function AccessibilityPage() {
  return <TrustPage title="Accessibility" intro="PostCat aims to make product discovery usable across keyboard, touch and assistive-technology workflows." sections={[
    { heading: "Current approach", bullets: ["Semantic landmarks, headings and breadcrumb navigation.", "Keyboard-operable navigation with visible focus styles.", "Accessible names for search, menus, dialogs, images and comparison tables.", "Responsive layouts with reduced-motion support and mobile reflow."] },
    { heading: "Testing boundary", paragraphs: ["Automated checks and sampled manual browser tests support development, but they do not establish full WCAG conformance. Broader assistive-technology and production-content testing remains part of launch readiness."] },
    { heading: "Report a barrier", paragraphs: ["A verified accessibility contact channel will be published before public launch. Until then, this preview should not be treated as the final support process."] },
  ]} />;
}
