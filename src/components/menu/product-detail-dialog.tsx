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
  const [selectedAddonIds, setSelectedAddonIds] = useState<string[]>([]);
  const addItem = useCartStore((state) => state.addItem);
  const isSoldOut = product.stock_quantity === 0;

  function handleAddItem() {
    for (const group of product.addon_groups) {
      const count = group.addons.filter((addon) => selectedAddonIds.includes(addon.id)).length;
      if (count < group.min_selections || count > group.max_selections) {
        toast.error(`${group.name}: escolha entre ${group.min_selections} e ${group.max_selections}.`);
        return;
      }
    }
    const selectedAddons = product.addon_groups.flatMap((group) => group.addons).filter((addon) => selectedAddonIds.includes(addon.id));
    addItem({ product, quantity, notes, selectedAddons });
    toast.success(`${product.name} foi adicionado ao carrinho.`);
    onAdded();
  }

  function toggleAddon(groupId: string, addonId: string, maximum: number) {
    setSelectedAddonIds((current) => {
      if (current.includes(addonId)) return current.filter((id) => id !== addonId);
      const groupAddonIds = product.addon_groups.find((item) => item.id === groupId)?.addons.map((addon) => addon.id) ?? [];
      const selectedInGroup = current.filter((id) => groupAddonIds.includes(id));
      if (maximum === 1) return [...current.filter((id) => !groupAddonIds.includes(id)), addonId];
      if (selectedInGroup.length >= maximum) {
        toast.error(`Você pode escolher no máximo ${maximum} opções.`);
        return current;
      }
      return [...current, addonId];
    });
  }

  const addonsTotal = product.addon_groups.flatMap((group) => group.addons).filter((addon) => selectedAddonIds.includes(addon.id)).reduce((sum, addon) => sum + addon.price, 0);

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
        {product.addon_groups.map((group) => (
          <div key={group.id} className="space-y-3 rounded-xl border p-4">
            <div className="flex items-start justify-between gap-3">
              <div><p className="font-semibold">{group.name}</p>{group.description && <p className="mt-1 text-xs text-muted-foreground">{group.description}</p>}</div>
              <span className="shrink-0 rounded-full bg-muted px-2 py-1 text-[11px] font-bold">{group.min_selections > 0 ? "Obrigatório" : "Opcional"} · até {group.max_selections}</span>
            </div>
            <div className="space-y-2">
              {group.addons.map((addon) => (
                <Label key={addon.id} className="flex cursor-pointer items-center justify-between gap-3 rounded-lg border px-3 py-2.5 has-checked:border-primary has-checked:bg-primary/5">
                  <span className="flex items-center gap-3"><input type={group.max_selections === 1 ? "radio" : "checkbox"} name={`addon-${group.id}`} checked={selectedAddonIds.includes(addon.id)} onChange={() => toggleAddon(group.id, addon.id, group.max_selections)} className="size-4 accent-primary" /><span><span className="block text-sm font-medium">{addon.name}</span>{addon.description && <span className="text-xs font-normal text-muted-foreground">{addon.description}</span>}</span></span>
                  <span className="shrink-0 text-sm font-semibold">{addon.price > 0 ? `+ ${formatCurrency(addon.price)}` : "Grátis"}</span>
                </Label>
              ))}
            </div>
          </div>
        ))}
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
              : `Adicionar · ${formatCurrency((product.price + addonsTotal) * quantity)}`}
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}
