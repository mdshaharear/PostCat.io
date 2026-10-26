import type { Metadata } from "next";
import Link from "next/link";
import { Breadcrumbs, PageShell } from "@/components/site-shell";

export type TrustSection = { heading: string; paragraphs?: string[]; bullets?: string[] };

export function trustMetadata(title: string, description: string, path: string): Metadata {
  return { title, description, alternates: { canonical: path }, openGraph: { title: `${title} · PostCat`, description, url: path } };
}

export function TrustPage({ eyebrow = "PostCat trust center", title, intro, sections }: { eyebrow?: string; title: string; intro: string; sections: TrustSection[] }) {
  return <PageShell><div className="shell page-top trust-page">
    <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: title }]} />
    <header className="trust-hero"><p className="kicker">{eyebrow}</p><h1>{title}</h1><p>{intro}</p><span>Pre-launch policy · Last reviewed October 26, 2026</span></header>
    <div className="trust-layout">
      <aside aria-label="Trust pages"><strong>Trust center</strong><Link href="/about">About</Link><Link href="/affiliate-disclosure">Affiliate disclosure</Link><Link href="/privacy">Privacy</Link><Link href="/terms">Terms</Link><Link href="/accessibility">Accessibility</Link><Link href="/contact">Contact</Link></aside>
      <article className="trust-content">{sections.map((section) => <section key={section.heading}><h2>{section.heading}</h2>{section.paragraphs?.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}{section.bullets && <ul>{section.bullets.map((bullet) => <li key={bullet}>{bullet}</li>)}</ul>}</section>)}</article>
    </div>
  </div></PageShell>;
}
