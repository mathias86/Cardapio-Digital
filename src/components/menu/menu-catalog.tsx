"use client";

import { useState } from "react";
import { Sparkles } from "lucide-react";

import { ProductCard } from "@/components/menu/product-card";
import { ProductDetailDialog } from "@/components/menu/product-detail-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import type { MenuCategory, MenuProduct } from "@/types/menu";

type MenuCatalogProps = {
  categories: MenuCategory[];
  isStoreOpen: boolean;
};

function toAnchorId(name: string, id: string) {
  const slug = name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

  return `${slug || "categoria"}-${id.slice(0, 8)}`;
}

export function MenuCatalog({ categories, isStoreOpen }: MenuCatalogProps) {
  const [selectedProduct, setSelectedProduct] = useState<MenuProduct | null>(null);

  return (
    <>
      <nav
        className="sticky top-16 z-30 -mx-4 overflow-x-auto border-y bg-background/95 px-4 py-3 backdrop-blur-xl sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8"
        aria-label="Categorias do cardápio"
      >
        <div className="mx-auto flex w-max min-w-full max-w-7xl gap-2">
          {categories.map((category) => (
            <Button
              key={category.id}
              render={<a href={`#${toAnchorId(category.name, category.id)}`} />}
              variant="outline"
              className="rounded-full bg-card"
            >
              {category.name}
            </Button>
          ))}
        </div>
      </nav>

      <div className="mx-auto w-full max-w-7xl space-y-16 py-10 sm:py-14">
        {categories.map((category) => (
          <section key={category.id} id={toAnchorId(category.name, category.id)} className="scroll-mt-36">
            <div className="mb-6 flex items-end justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 text-primary">
                  <Sparkles className="size-4" aria-hidden="true" />
                  <span className="text-xs font-bold uppercase tracking-[0.18em]">Feito para você</span>
                </div>
                <h2 className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">{category.name}</h2>
                {category.description && <p className="mt-2 max-w-2xl text-muted-foreground">{category.description}</p>}
              </div>
              <Badge variant="secondary">
                {category.products.length} {category.products.length === 1 ? "item" : "itens"}
              </Badge>
            </div>

            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {category.products.map((product) => (
                <ProductCard key={product.id} product={product} onSelect={setSelectedProduct} />
              ))}
            </div>
          </section>
        ))}
      </div>

      <Dialog open={selectedProduct !== null} onOpenChange={(open) => !open && setSelectedProduct(null)}>
        {selectedProduct && (
          <ProductDetailDialog
            key={selectedProduct.id}
            product={selectedProduct}
            isStoreOpen={isStoreOpen}
            onAdded={() => setSelectedProduct(null)}
          />
        )}
      </Dialog>
    </>
  );
}
