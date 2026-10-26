import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { formatMoney, getCategoryPath, productViews, getProductBySlug } from "@/data/catalog";
import { Breadcrumbs, PageShell } from "@/components/site-shell";
import { Disclosure, ProductGrid } from "@/components/catalog-ui";
import { ProductGallery, VariantPicker } from "@/components/client-controls";
import { JsonLd, breadcrumbJsonLd } from "@/components/structured-data";
import { getPublicOrigin } from "@/config/public-origin";

export function generateStaticParams() { return productViews.map((view) => ({ slug: view.product.slug })); }
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const item = getProductBySlug(slug);
  if (!item) return {};
  const url = `/products/${item.product.slug}`;
  return { title: item.product.title, description: item.product.summary, alternates: { canonical: url }, robots: { index: false, follow: true }, openGraph: { title: item.product.title, description: item.product.summary, url, images: item.images[0] ? [item.images[0].src] : [] } };
}

export default async function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const item = getProductBySlug(slug);
  if (!item) notFound();
  const related = productViews.filter((view) => view.product.categoryId === item.product.categoryId && view.product.id !== item.product.id).slice(0, 3);
  const categoryPath = getCategoryPath(item.category.slug);
  const breadcrumbs = [{ label: "Home", href: "/" }, { label: "Categories", href: "/categories" }, ...categoryPath.map((category) => ({ label: category.name, href: `/categories/${category.slug}` })), { label: item.product.title }];
  const origin = getPublicOrigin();
  const webPageJsonLd = { "@context": "https://schema.org", "@type": "WebPage", name: item.product.title, url: new URL(`/products/${item.product.slug}`, origin).toString(), description: item.product.summary, isPartOf: { "@id": `${origin}/#website` }, about: { "@type": "Thing", name: item.product.title } };
  return <PageShell><div className="shell page-top">
    <JsonLd data={[breadcrumbJsonLd(breadcrumbs, origin), webPageJsonLd]} />
    <Breadcrumbs items={breadcrumbs} />
    <section className="product-detail">
      <ProductGallery images={item.images} />
      <div className="product-summary"><div className="eyebrow-row"><span>{item.brand.name} · {item.category.name}</span><span className="demo-badge">Demo product</span></div><h1>{item.product.title}</h1><div className="rating" aria-label={`Demo rating ${item.product.demoRating} out of 5 from ${item.product.demoReviewCount} mock reviews`}><span aria-hidden>★★★★★</span> <strong>{item.product.demoRating}</strong> <small>({item.product.demoReviewCount} mock reviews)</small></div><p className="summary-copy">{item.product.description}</p><ul className="highlights">{item.product.highlights.map((highlight) => <li key={highlight}>✓ {highlight}</li>)}</ul><VariantPicker variants={item.variants} /><div className="starting-price"><span>Available mock offers from</span><strong>{item.startingPrice ? formatMoney(item.startingPrice) : "Unavailable"}</strong><small>Observed Oct 23–24, 2026 · fictional freshness</small></div></div>
    </section>

    <section className="offer-section"><div className="section-heading"><div><p className="kicker">Choose a merchant</p><h2>{item.offers.length} demo offers, one product.</h2></div><p>Each offer identifies its variant. Checkout would happen on the merchant site.</p></div><div className="offer-list">{item.offers.map((offer) => { const merchant = item.merchants.find((entry) => entry.id === offer.merchantId)!; const variant = item.variants.find((entry) => entry.id === offer.variantId)!; return <article className="offer-card" key={offer.id}><div><span className="merchant-name">{merchant.name}</span><small>{merchant.trustLabel}</small></div><div><span className="offer-variant">Variant: {variant.label}</span><small>{offer.shippingLabel}</small></div><div><strong>{formatMoney(offer.price)}</strong>{offer.previousPrice && <small className="previous-price">Was {formatMoney(offer.previousPrice)}</small>}</div><div><span className={`availability availability-${offer.availability}`}>{offer.availability.replaceAll("_", " ")}</span><small>Demo status</small></div><a className="button button-secondary" href="#affiliate-disclosure">Offer details</a></article>; })}</div></section>

    <section className="facts-section"><div className="facts-grid"><div><p className="kicker">Product details</p><h2>Useful facts, separated from offers.</h2><dl className="spec-list">{Object.entries(item.product.specifications).map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl></div><div className="pros-cons"><div><h3>Potential strengths</h3><ul>{item.product.pros.map((value) => <li key={value}>+ {value}</li>)}</ul></div><div><h3>Clear limitations</h3><ul>{item.product.cons.map((value) => <li key={value}>− {value}</li>)}</ul></div></div></div></section>
    {related.length > 0 && <section className="product-section related-products"><div className="section-heading"><div><p className="kicker">Keep exploring</p><h2>Related demo products.</h2></div><Link className="text-link" href={`/categories/${item.category.slug}`}>View category →</Link></div><ProductGrid items={related} /></section>}
  </div><Disclosure /></PageShell>;
}