import Image from "next/image";
import type { ProductImage } from "@/types/catalog";
export function ProductVisual({ image, className="", eager=false }: { image: ProductImage; className?: string; eager?: boolean }) {
  return <div className={`product-visual ${className}`}><Image src={image.src} alt={image.alt} width={image.width} height={image.height} fetchPriority={eager ? "high" : "auto"} loading={eager ? "eager" : "lazy"} decoding="async" sizes="(max-width: 520px) calc(100vw - 24px), (max-width: 800px) 46vw, (max-width: 1100px) 31vw, 300px" /></div>;
}
