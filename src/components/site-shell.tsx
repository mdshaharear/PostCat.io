import Link from "next/link";
import { MobileMenu } from "@/components/client-controls";
import { categories, rootCategories } from "@/data/catalog";
import { siteConfig } from "@/config/site";

export function Header() {
  return (
    <>
      <a className="skip-link" href="#main-content">Skip to content</a>
      <div className="announcement"><span>Structured product discovery</span><span aria-hidden>•</span><Link href="/affiliate-disclosure">How PostCat stays transparent</Link></div>
      <header className="site-header">
        <div className="shell header-inner">
          <Link className="brand-lockup" href="/" aria-label={`${siteConfig.name} home`}><span className="wordmark"><span aria-hidden>P</span>{siteConfig.name.slice(1)}</span><small>Find better, faster</small></Link>
          <nav className="desktop-nav" aria-label="Primary navigation">
            <details className="nav-catalog">
              <summary>Categories <span aria-hidden>⌄</span></summary>
              <div className="mega-menu">
                <div><p className="mega-kicker">Shop by department</p><h2>Everything worth finding, organized.</h2><Link className="mega-all" href="/categories">View all categories →</Link></div>
                <div className="mega-links">{rootCategories.slice(0, 8).map((category) => <Link key={category.id} href={`/categories/${category.slug}`}><span style={{ color: category.accent }}>{category.icon}</span><div><strong>{category.name}</strong><small>{category.description}</small></div></Link>)}</div>
              </div>
            </details>
            <Link href="/categories/electronics">Electronics</Link><Link href="/categories/home">Home</Link><Link href="/categories/health-beauty">Wellness</Link><Link href="/compare">Compare</Link>
          </nav>
          <div className="header-actions"><form className="header-search" role="search" aria-label="Site search" action="/search"><label className="sr-only" htmlFor="header-q">Search products</label><input id="header-q" name="q" type="search" autoComplete="off" placeholder="Search 347 categories" /><button aria-label="Submit search">⌕</button></form><MobileMenu links={siteConfig.nav} /></div>
          <noscript><nav className="fallback-nav" aria-label="Navigation fallback">{siteConfig.nav.map((link) => <Link key={link.href} href={link.href}>{link.label}</Link>)}</nav></noscript>
        </div>
      </header>
    </>
  );
}

export function Footer() {
  return (
    <footer className="site-footer">
      <div className="shell footer-lead"><div><p className="kicker">Browse {categories.length} categories</p><h2>Make the next choice with less noise.</h2><p>Explore focused departments, compare useful details and follow transparent merchant offers.</p></div><Link className="button button-lime" href="/categories">Explore all categories →</Link></div>
      <div className="shell footer-grid">
        <div className="footer-brand"><Link className="wordmark wordmark-light" href="/"><span aria-hidden>P</span>ostCat</Link><p>A fast, multi-category discovery platform built around useful comparisons and clearly separated merchant offers.</p><div className="footer-badges"><span>347 categories</span><span>Demo catalog</span><span>No checkout</span></div><a className="domain-link" href={siteConfig.url}>postcat.io ↗</a></div>
        <div><h3>Discover</h3><Link href="/categories">All categories</Link><Link href="/search">Search products</Link><Link href="/compare">Compare picks</Link></div>
        <div><h3>Popular</h3><Link href="/categories/electronics">Electronics</Link><Link href="/categories/home">Home & living</Link><Link href="/categories/health-beauty">Health & beauty</Link><Link href="/categories/sports-outdoors">Sports & outdoors</Link></div>
        <div><h3>Trust</h3><Link href="/about">About PostCat</Link><Link href="/affiliate-disclosure">Affiliate disclosure</Link><Link href="/privacy">Privacy</Link><Link href="/accessibility">Accessibility</Link><Link href="/contact">Contact</Link><Link href="/llms.txt">AI-readable site guide</Link></div>
      </div>
      <div className="shell footer-bottom"><span>© {new Date().getFullYear()} PostCat</span><nav aria-label="Legal"><Link href="/terms">Terms</Link><Link href="/privacy">Privacy</Link><span>Demo data only</span></nav></div>
    </footer>
  );
}

export function PageShell({ children }: { children: React.ReactNode }) { return <><Header /><main id="main-content">{children}</main><Footer /></>; }
export function Breadcrumbs({ items }: { items: { label: string; href?: string }[] }) { return <nav className="breadcrumbs" aria-label="Breadcrumb"><ol>{items.map((item, index) => <li key={`${item.href ?? "current"}:${index}`}>{item.href ? <Link href={item.href}>{item.label}</Link> : <span aria-current="page">{item.label}</span>}{index < items.length - 1 && <span aria-hidden> / </span>}</li>)}</ol></nav>; }