import Link from "next/link";
import { Disclosure, ProductGrid } from "@/components/catalog-ui";
import { NewsletterForm } from "@/components/client-controls";
import { ProductVisual } from "@/components/product-visual";
import { PageShell } from "@/components/site-shell";
import { getFeaturedProducts, getTrendingProducts, products, rootCategories } from "@/data/catalog";

export default function Home() {
  const featured = getFeaturedProducts();
  const trending = getTrendingProducts();
  const heroProduct = featured[0];
  return <PageShell>
    <section className="hero-wrap">
      <div className="hero shell">
        <div className="hero-copy">
          <p className="kicker">Product discovery, without the clutter</p>
          <h1>Find what fits.<br /><em>Choose with clarity.</em></h1>
          <p className="hero-lede">Explore useful products across everyday categories, compare the details that matter and follow transparent merchant offers.</p>
          <form action="/search" className="hero-search"><label className="sr-only" htmlFor="hero-q">Search the product catalog</label><span aria-hidden>⌕</span><input id="hero-q" name="q" placeholder="What are you looking for?" /><button>Search PostCat</button></form>
          <div className="popular-searches"><span>Popular:</span><Link href="/search?q=wireless">Wireless</Link><Link href="/search?q=coffee">Coffee</Link><Link href="/search?q=storage">Storage</Link><Link href="/search?q=skincare">Skincare</Link></div>
          <dl className="hero-stats"><div><dt>{products.length}+</dt><dd>demo products</dd></div><div><dt>{rootCategories.length}</dt><dd>departments</dd></div><div><dt>0</dt><dd>paid placements</dd></div></dl>
        </div>
        <div className="hero-feature">
          <div className="hero-orbit">Featured discovery</div>
          <ProductVisual image={heroProduct.images[0]} eager />
          <div className="hero-product-caption"><div><span>{heroProduct.category.name}</span><h2>{heroProduct.product.title}</h2><small>From ${((heroProduct.startingPrice?.amountMinor ?? 0) / 100).toFixed(2)}</small></div><Link href={`/products/${heroProduct.product.slug}`} aria-label={`View ${heroProduct.product.title}`}>↗</Link></div>
        </div>
      </div>
    </section>

    <section className="category-section shell">
      <div className="section-heading"><div><p className="kicker">Browse departments</p><h2>Start with what you need.</h2></div><Link className="text-link" href="/categories">All categories <span>→</span></Link></div>
      <div className="category-grid">{rootCategories.map((category, index) => <Link href={`/categories/${category.slug}`} key={category.id} className="category-card" style={{ "--accent": category.accent } as React.CSSProperties}><span className="category-number">{String(index + 1).padStart(2, "0")}</span><span className="category-icon">{category.icon}</span><h3>{category.name}</h3><p>{category.description}</p><span className="category-arrow">Explore department →</span></Link>)}</div>
    </section>

    <section className="product-section shell">
      <div className="section-heading"><div><p className="kicker">The PostCat edit</p><h2>Useful picks, clearly presented.</h2></div><p>Fictional demo products showing how structured facts, variants and offers work together.</p></div>
      <ProductGrid items={featured.slice(0, 8)} />
      <div className="center-action"><Link className="button button-secondary" href="/search">Browse all {products.length} products →</Link></div>
    </section>

    <section className="value-band">
      <div className="shell value-grid"><div><span>01</span><h3>Structured facts</h3><p>Specifications and comparison fields stay separate from merchant offer data.</p></div><div><span>02</span><h3>Transparent offers</h3><p>Prices, stock states and merchant links are clearly labeled as demo content.</p></div><div><span>03</span><h3>Broad discovery</h3><p>Nested departments make useful products easier to find without noisy facets.</p></div></div>
    </section>

    <section className="product-section shell trending-section">
      <div className="section-heading"><div><p className="kicker">Trending across PostCat</p><h2>Fresh paths into the catalog.</h2></div><Link className="text-link" href="/search?sort=rating-desc">Sort by demo rating <span>↗</span></Link></div>
      <ProductGrid items={trending.slice(4, 12)} />
    </section>

    <section className="editorial-band shell">
      <div><p className="kicker">A calmer way to browse</p><h2>Not another endless product feed.</h2><p>PostCat is designed around useful category paths, readable product context and clear boundaries between product identity, variants and merchant offers.</p><Link className="button button-primary" href="/compare">Compare selected products</Link></div>
      <div className="editorial-quote"><span>“</span><p>Less noise. Better structure. More confidence in the next click.</p><small>PostCat product principle</small></div>
    </section>

    <Disclosure />
    <section className="newsletter"><div className="shell newsletter-inner"><div><p className="kicker">Occasional useful finds</p><h2>Get the next PostCat edit.</h2><p>This local demo form stores nothing. It only demonstrates the intended subscription experience.</p></div><NewsletterForm /></div></section>
  </PageShell>;
}