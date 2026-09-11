"use client";

import { useState } from "react";
import { ShoppingBag } from "lucide-react";
import { toast } from "sonner";

import { QuantityControl } from "@/components/cart/quantity-control";
import { ProductImage } from "@/components/menu/product-image";
import { Button } from "@/components/ui/button";
import {
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { formatCurrency } from "@/lib/formatters/currency";
import { useCartStore } from "@/stores/cart-store";
import type { MenuProduct } from "@/types/menu";

type ProductDetailDialogProps = {
  isStoreOpen: boolean;
  onAdded: () => void;
  product: MenuProduct;
};

export function ProductDetailDialog({
  isStoreOpen,
  onAdded,
  product,
}: ProductDetailDialogProps) {
  const [quantity, setQuantity] = useState(1);
  const [notes, setNotes] = useState("");
  const addItem = useCartStore((state) => state.addItem);
  const isSoldOut = product.stock_quantity === 0;

  function handleAddItem() {
    addItem({ product, quantity, notes });
    toast.success(`${product.name} foi adicionado ao carrinho.`);
    onAdded();
  }

  return (
    <DialogContent className="max-h-[calc(100vh-2rem)] overflow-y-auto p-0 sm:max-w-xl">
      <div className="relative aspect-[16/9] overflow-hidden rounded-t-xl bg-muted">
        <ProductImage imageUrl={product.image_url} name={product.name} />
      </div>
      <DialogHeader className="px-5 pt-2 sm:px-6">
        <div className="flex items-start justify-between gap-4 pr-8">
          <DialogTitle className="text-2xl font-bold leading-tight">
            {product.name}
          </DialogTitle>
          <p className="shrink-0 text-lg font-bold text-primary">
            {formatCurrency(product.price)}
          </p>
        </div>
        <DialogDescription className="text-base leading-6">
          {product.description || "Preparado com ingredientes selecionados."}
        </DialogDescription>
      </DialogHeader>
      <Separator />
      <div className="space-y-5 px-5 pb-2 sm:px-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="font-semibold">Quantidade</p>
            <p className="mt-1 text-xs text-muted-foreground">Escolha quantos você quer.</p>
          </div>
          <QuantityControl
            value={quantity}
            maximum={product.stock_quantity ?? 99}
            onChange={setQuantity}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor={`notes-${product.id}`}>Alguma observação?</Label>
          <Textarea
            id={`notes-${product.id}`}
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            maxLength={300}
            placeholder="Ex.: sem cebola, molho separado..."
            className="min-h-24 resize-none"
          />
          <p className="text-right text-xs text-muted-foreground">{notes.length}/300</p>
        </div>
      </div>
      <DialogFooter>
        <Button
          type="button"
          onClick={handleAddItem}
          disabled={!isStoreOpen || isSoldOut}
          className="w-full sm:w-auto"
        >
          <ShoppingBag aria-hidden="true" />
          {isSoldOut
            ? "Produto esgotado"
            : !isStoreOpen
              ? "Loja fechada"
              : `Adicionar · ${formatCurrency(product.price * quantity)}`}
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}
