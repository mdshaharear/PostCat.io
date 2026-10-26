import type { Metadata } from "next";
import Link from "next/link";
import { categories, getCategoryChildren, getCategoryDescendants, getProductsByCategory, rootCategories } from "@/data/catalog";
import { Breadcrumbs, PageShell } from "@/components/site-shell";

export const metadata: Metadata = {
  title: "All product categories",
  description: "Browse PostCat's product departments and high-intent subcategories for shopping, comparison and catalog discovery.",
  alternates: { canonical: "/categories" },
};

export default function CategoriesPage() {
  return <PageShell><div className="shell page-top category-directory">
    <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "Categories" }]}/>
    <header className="directory-header"><p className="kicker">Product directory</p><h1>Browse every department.</h1><p>{rootCategories.length} broad departments and {categories.length - rootCategories.length} focused subcategories create clear paths from discovery to the most relevant products.</p></header>
    <div className="department-list">{rootCategories.map((department) => {
      const directChildren = getCategoryChildren(department.slug);
      const descendantCount = getCategoryDescendants(department.slug).length;
      const productCount = getProductsByCategory(department.slug).length;
      return <section className="department-block" key={department.id} style={{ "--accent": department.accent } as React.CSSProperties}>
        <div className="department-heading"><span className="category-icon">{department.icon}</span><div><h2><Link href={`/categories/${department.slug}`}>{department.name}</Link></h2><p>{department.description}</p><small>{productCount} current demo products · {descendantCount} subcategories</small></div></div>
        <nav className="department-links" aria-label={`${department.name} category branches`}>{directChildren.map((child) => {
          const nestedCount = getCategoryDescendants(child.slug).length;
          return <Link key={child.id} href={`/categories/${child.slug}`}><strong>{child.name}</strong><span>{nestedCount ? `${nestedCount} nested categories` : child.searchTerms.slice(0, 2).join(" · ")}</span></Link>;
        })}</nav>
      </section>;
    })}</div>
  </div></PageShell>;
}
