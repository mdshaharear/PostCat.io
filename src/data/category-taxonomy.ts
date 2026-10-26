import type { Category } from "@/types/catalog";

export interface CategoryGraph {
  byId: ReadonlyMap<string, Category>;
  bySlug: ReadonlyMap<string, Category>;
  childrenByParentId: ReadonlyMap<string, readonly Category[]>;
  getBySlug(slug: string): Category | undefined;
  getChildren(slug: string): Category[];
  getDescendants(slug: string): Category[];
  getDescendantIds(categoryId: string): Set<string>;
  getPath(slug: string): Category[];
}

export function validateCategoryTaxonomy(categories: readonly Category[]): string[] {
  const errors: string[] = [];
  const byId = new Map<string, Category>();
  const slugs = new Map<string, string>();
  for (const category of categories) {
    if (!category.id.trim()) errors.push("Category ID cannot be blank");
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(category.slug)) errors.push(`Invalid category slug: ${category.slug}`);
    if (byId.has(category.id)) errors.push(`Duplicate category ID: ${category.id}`);
    byId.set(category.id, category);
    const normalizedSlug = category.slug.toLowerCase();
    if (slugs.has(normalizedSlug)) errors.push(`Duplicate category slug: ${category.slug}`);
    slugs.set(normalizedSlug, category.id);
  }
  for (const category of categories) {
    if (category.parentId === category.id) errors.push(`Category cannot parent itself: ${category.id}`);
    if (category.parentId && !byId.has(category.parentId)) errors.push(`Unknown parent ${category.parentId} for ${category.id}`);
  }
  const state = new Map<string, 0 | 1 | 2>();
  const visit = (id: string, trail: string[]) => {
    const currentState = state.get(id) ?? 0;
    if (currentState === 1) {
      const cycleStart = trail.indexOf(id);
      errors.push(`Category cycle: ${[...trail.slice(cycleStart), id].join(" -> ")}`);
      return;
    }
    if (currentState === 2) return;
    state.set(id, 1);
    const parentId = byId.get(id)?.parentId;
    if (parentId && byId.has(parentId)) visit(parentId, [...trail, id]);
    state.set(id, 2);
  };
  for (const category of categories) visit(category.id, []);
  return [...new Set(errors)];
}

export function createCategoryGraph(categories: readonly Category[]): CategoryGraph {
  const errors = validateCategoryTaxonomy(categories);
  if (errors.length) throw new Error(`Invalid category taxonomy:\n${errors.join("\n")}`);
  const byId = new Map(categories.map((category) => [category.id, category]));
  const bySlug = new Map(categories.map((category) => [category.slug, category]));
  const childrenByParentId = new Map<string, Category[]>();
  for (const category of categories) {
    if (!category.parentId) continue;
    const children = childrenByParentId.get(category.parentId) ?? [];
    children.push(category);
    childrenByParentId.set(category.parentId, children);
  }
  for (const children of childrenByParentId.values()) children.sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0) || a.name.localeCompare(b.name));
  const getBySlug = (slug: string) => bySlug.get(slug);
  const getChildren = (slug: string) => {
    const category = getBySlug(slug);
    return category ? [...(childrenByParentId.get(category.id) ?? [])] : [];
  };
  const getDescendants = (slug: string) => {
    const category = getBySlug(slug);
    if (!category) return [];
    const descendants: Category[] = [];
    const stack = [...(childrenByParentId.get(category.id) ?? [])].reverse();
    const visited = new Set<string>();
    while (stack.length) {
      const current = stack.pop()!;
      if (visited.has(current.id)) continue;
      visited.add(current.id);
      descendants.push(current);
      const children = childrenByParentId.get(current.id) ?? [];
      for (let index = children.length - 1; index >= 0; index -= 1) stack.push(children[index]);
    }
    return descendants;
  };
  const getDescendantIds = (categoryId: string) => {
    const ids = new Set<string>([categoryId]);
    const stack = [...(childrenByParentId.get(categoryId) ?? [])];
    while (stack.length) {
      const current = stack.pop()!;
      if (ids.has(current.id)) continue;
      ids.add(current.id);
      stack.push(...(childrenByParentId.get(current.id) ?? []));
    }
    return ids;
  };
  const getPath = (slug: string) => {
    const path: Category[] = [];
    let current = getBySlug(slug);
    const visited = new Set<string>();
    while (current) {
      if (visited.has(current.id)) throw new Error(`Category cycle while resolving ${slug}`);
      visited.add(current.id);
      path.unshift(current);
      current = current.parentId ? byId.get(current.parentId) : undefined;
    }
    return path;
  };
  return { byId, bySlug, childrenByParentId, getBySlug, getChildren, getDescendants, getDescendantIds, getPath };
}
