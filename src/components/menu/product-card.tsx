"use client";

import { ArrowUpRight } from "lucide-react";

import { ProductImage } from "@/components/menu/product-image";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { formatCurrency } from "@/lib/formatters/currency";
import type { MenuProduct } from "@/types/menu";

type ProductCardProps = {
  onSelect: (product: MenuProduct) => void;
  product: MenuProduct;
};

export function ProductCard({ onSelect, product }: ProductCardProps) {
  const isSoldOut = product.stock_quantity === 0;

  return (
    <Card className="group/card h-full gap-0 py-0 shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-lg">
      <button
        type="button"
        onClick={() => onSelect(product)}
        className="flex h-full cursor-pointer flex-col text-left outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
        aria-label={`Ver detalhes de ${product.name}`}
      >
        <div className="relative aspect-[16/10] w-full overflow-hidden bg-muted">
          <ProductImage imageUrl={product.image_url} name={product.name} />
          {isSoldOut && (
            <Badge variant="secondary" className="absolute left-3 top-3 shadow-sm">
              Esgotado
            </Badge>
          )}
        </div>
        <CardContent className="flex flex-1 flex-col p-5">
          <div className="flex items-start justify-between gap-4">
            <h3 className="text-lg font-bold tracking-tight">{product.name}</h3>
            <ArrowUpRight className="mt-0.5 size-4 shrink-0 text-muted-foreground transition group-hover/card:text-primary" aria-hidden="true" />
          </div>
          <p className="mt-2 line-clamp-2 min-h-10 text-sm leading-5 text-muted-foreground">
            {product.description || "Preparado com ingredientes selecionados."}
          </p>
          <p className="mt-5 text-lg font-bold text-primary">
            {formatCurrency(product.price)}
          </p>
        </CardContent>
      </button>
    </Card>
  );
}
