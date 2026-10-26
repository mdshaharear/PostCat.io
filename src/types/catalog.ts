export type CurrencyCode = "USD";
export interface Money { amountMinor: number; currency: CurrencyCode }
export type CategoryStatus = "active" | "draft" | "retired";
export interface Category { id: string; slug: string; name: string; description: string; accent: string; icon: string; parentId?: string; searchTerms: readonly string[]; googleProductCategory?: string; status?: CategoryStatus; isAssignable?: boolean; sortOrder?: number }
export interface Brand { id: string; name: string }
export interface CanonicalProduct { id: string; slug: string; title: string; brandId: string; categoryId: string; summary: string; description: string; highlights: readonly string[]; specifications: Readonly<Record<string, string>>; pros: readonly string[]; cons: readonly string[]; featured: boolean; trending: boolean; demoRating: number; demoReviewCount: number; comparison: { materialOrWeight: string; primaryAdvantage: string } }
export interface ProductVariant { id: string; productId: string; label: string; attributes: Readonly<Record<string, string>> }
export interface Merchant { id: string; name: string; trustLabel: string }
export interface Offer { id: string; variantId: string; merchantId: string; price: Money; previousPrice?: Money; availability: "in_stock" | "limited" | "out_of_stock" | "unknown"; shippingLabel: string; observedAt: string }
export interface ProductImage { id: string; productId: string; variantId?: string; src: string; alt: string; width: number; height: number; role: "hero" | "gallery" | "swatch" }
export interface ProductView { product: CanonicalProduct; brand: Brand; category: Category; variants: ProductVariant[]; images: ProductImage[]; offers: Offer[]; merchants: Merchant[]; startingPrice?: Money; merchantCount: number }
