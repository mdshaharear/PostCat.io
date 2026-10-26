import Link from "next/link";
import { siteConfig } from "@/config/site";

export default function Loading() {
  return <main className="shell skeleton-page" aria-busy="true" aria-live="polite" aria-label="Loading content">
    <nav className="loading-nav" aria-label="Navigation fallback">{siteConfig.nav.map((link) => <Link key={link.href} href={link.href}>{link.label}</Link>)}</nav>
    <div className="skeleton-line short" />
    <div className="skeleton-line title" />
    <div className="skeleton-grid">{[1, 2, 3, 4].map((item) => <div className="skeleton-card" key={item} />)}</div>
  </main>;
}
