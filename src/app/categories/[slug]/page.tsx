import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { categories, getCategoryChildren, getCategoryPath, getProductsByCategory, isCategoryIndexable } from "@/data/catalog";
import { Breadcrumbs, PageShell } from "@/components/site-shell";
import { EmptyState, ProductGrid } from "@/components/catalog-ui";
import { JsonLd, breadcrumbJsonLd } from "@/components/structured-data";
import { getPublicOrigin } from "@/config/public-origin";


export function generateStaticParams() {
  return categories.map(({ slug }) => ({ slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const category = categories.find((item) => item.slug === slug);
  if (!category) return {};
  return {
    title: `${category.name} products`,
    description: `${category.description} Browse relevant subcategories and compare available demo products.`,
    alternates: { canonical: `/categories/${category.slug}` },
    openGraph: { title: `${category.name} products · PostCat`, description: category.description, url: `/categories/${category.slug}` },
    robots: isCategoryIndexable(category.slug) ? { index: true, follow: true } : { index: false, follow: true },
  };
}

export default async function CategoryPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const category = categories.find((item) => item.slug === slug);
  if (!category) notFound();

  const items = getProductsByCategory(slug);
  const children = getCategoryChildren(slug);
  const path = getCategoryPath(slug);
  const breadcrumbs = [
    { label: "Home", href: "/" },
    { label: "Categories", href: "/categories" },
    ...path.map((item, index) => ({
      label: item.name,
      href: index < path.length - 1 ? `/categories/${item.slug}` : undefined,
    })),
  ];

  const origin = getPublicOrigin();
  const collectionJsonLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: `${category.name} products`,
    url: new URL(`/categories/${category.slug}`, origin).toString(),
    description: category.description,
    mainEntity: { "@type": "ItemList", numberOfItems: items.length, itemListElement: items.slice(0, 24).map((item, index) => ({ "@type": "ListItem", position: index + 1, name: item.product.title, url: new URL(`/products/${item.product.slug}`, origin).toString() })) },
  };

  return <PageShell><div className="shell page-top">
    <JsonLd data={[breadcrumbJsonLd(breadcrumbs, origin), collectionJsonLd]} />
    <Breadcrumbs items={breadcrumbs}/>
    <div className="listing-title">
      <div><p className="kicker">Product department</p><h1>{category.name}</h1><p>{category.description}</p></div>
      <div className="result-count"><strong>{items.length}</strong><span>demo products</span></div>
    </div>

    {children.length > 0 && <section className="subcategory-section" aria-labelledby="subcategory-heading">
      <div className="section-heading compact"><div><p className="kicker">Narrow your search</p><h2 id="subcategory-heading">Shop subcategories</h2></div><Link className="text-link" href="/categories">All departments →</Link></div>
      <div className="subcategory-grid">{children.map((child) => <Link key={child.id} href={`/categories/${child.slug}`} className="subcategory-card" style={{ "--accent": child.accent } as React.CSSProperties}>
        <span className="category-icon">{child.icon}</span><div><h3>{child.name}</h3><p>{child.description}</p></div><span aria-hidden>→</span>
      </Link>)}</div>
    </section>}

    <div className="listing-toolbar"><p>Showing products in {category.name} and its subcategories.</p><Link className="button button-secondary" href={`/search?category=${category.slug}`}>Filter and sort →</Link></div>
    <section className="category-products" aria-label={`${category.name} products`}>
      {items.length ? <ProductGrid items={items}/> : <EmptyState title="Products are coming next" text="This category structure is ready for approved catalog imports. Browse a related subcategory or return to all departments."/>}
    </section>
  </div></PageShell>;
}
