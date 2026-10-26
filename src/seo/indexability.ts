export interface ProductIndexabilityInput {
  status: "draft" | "active" | "archived";
  verified: boolean;
  publishable: boolean;
  hasUsefulContent: boolean;
  activeOfferCount: number;
}

export interface CategoryIndexabilityInput {
  status: "draft" | "active" | "retired";
  isLeaf: boolean;
  ownProducts: readonly ProductIndexabilityInput[];
  qualifyingDescendantProductCount: number;
  verifiedEditorialValue?: boolean;
  minimumLeafProducts?: number;
}

export function isProductIndexable(product: ProductIndexabilityInput): boolean {
  return product.status === "active"
    && product.verified
    && product.publishable
    && product.hasUsefulContent
    && Number.isInteger(product.activeOfferCount)
    && product.activeOfferCount > 0;
}

export function isCategoryIndexable(input: CategoryIndexabilityInput): boolean {
  if (input.status !== "active") return false;
  if (!Number.isInteger(input.qualifyingDescendantProductCount) || input.qualifyingDescendantProductCount < 0) return false;
  if (input.isLeaf) {
    const minimum = input.minimumLeafProducts ?? 10;
    if (!Number.isInteger(minimum) || minimum < 1) return false;
    return input.ownProducts.filter(isProductIndexable).length >= minimum;
  }
  return input.qualifyingDescendantProductCount > 0 || input.verifiedEditorialValue === true;
}
