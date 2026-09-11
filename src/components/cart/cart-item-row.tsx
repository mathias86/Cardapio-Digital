"use client";

import { Trash2 } from "lucide-react";

import { QuantityControl } from "@/components/cart/quantity-control";
import { ProductImage } from "@/components/menu/product-image";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/formatters/currency";
import { useCartStore, type CartItem } from "@/stores/cart-store";

type CartItemRowProps = {
  compact?: boolean;
  item: CartItem;
};

export function CartItemRow({ compact = false, item }: CartItemRowProps) {
  const removeItem = useCartStore((state) => state.removeItem);
  const updateQuantity = useCartStore((state) => state.updateQuantity);

  return (
    <article className="flex gap-3 py-4">
      <div className={`${compact ? "size-16" : "size-20"} relative shrink-0 overflow-hidden rounded-xl bg-muted`}>
        <ProductImage imageUrl={item.imageUrl} name={item.name} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="truncate font-bold">{item.name}</h3>
            <p className="mt-1 text-sm font-semibold text-primary">
              {formatCurrency(item.price * item.quantity)}
            </p>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            onClick={() => removeItem(item.lineId)}
            aria-label={`Remover ${item.name}`}
            className="shrink-0 text-muted-foreground hover:text-destructive"
          >
            <Trash2 aria-hidden="true" />
          </Button>
        </div>
        {item.notes && (
          <p className="mt-2 line-clamp-2 text-xs leading-5 text-muted-foreground">
            Obs.: {item.notes}
          </p>
        )}
        <div className="mt-3">
          <QuantityControl
            value={item.quantity}
            maximum={item.stockQuantity ?? 99}
            onChange={(quantity) => updateQuantity(item.lineId, quantity)}
          />
        </div>
      </div>
    </article>
  );
}
