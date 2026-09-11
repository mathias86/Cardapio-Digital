"use client";

import { useState } from "react";
import Link from "next/link";
import { ShoppingBag } from "lucide-react";

import { CartEmpty } from "@/components/cart/cart-empty";
import { CartItemRow } from "@/components/cart/cart-item-row";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { useCartHydrated } from "@/hooks/use-cart-hydrated";
import { formatCurrency } from "@/lib/formatters/currency";
import { getCartCount, getCartSubtotal, useCartStore } from "@/stores/cart-store";

export function CartSheet() {
  const [open, setOpen] = useState(false);
  const hydrated = useCartHydrated();
  const items = useCartStore((state) => state.items);
  const count = hydrated ? getCartCount(items) : 0;
  const subtotal = getCartSubtotal(items);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger
        render={
          <Button className="relative" size="icon" aria-label="Abrir carrinho" />
        }
      >
        <ShoppingBag aria-hidden="true" />
        {count > 0 && (
          <span className="absolute -right-1.5 -top-1.5 grid min-w-5 place-items-center rounded-full bg-foreground px-1 text-[10px] font-bold text-background ring-2 ring-background">
            {count > 99 ? "99+" : count}
          </span>
        )}
      </SheetTrigger>
      <SheetContent className="w-full sm:max-w-md">
        <SheetHeader className="border-b pr-12">
          <SheetTitle className="text-lg font-bold">Seu carrinho</SheetTitle>
          <SheetDescription>
            {count > 0 ? `${count} ${count === 1 ? "item" : "itens"} no pedido` : "Adicione produtos para começar"}
          </SheetDescription>
        </SheetHeader>

        {hydrated && items.length > 0 ? (
          <div className="flex-1 overflow-y-auto px-4">
            {items.map((item, index) => (
              <div key={item.lineId}>
                {index > 0 && <Separator />}
                <CartItemRow item={item} compact />
              </div>
            ))}
          </div>
        ) : (
          <CartEmpty compact />
        )}

        {hydrated && items.length > 0 && (
          <SheetFooter className="border-t bg-muted/40">
            <div className="mb-2 flex items-center justify-between text-base">
              <span className="text-muted-foreground">Subtotal</span>
              <strong>{formatCurrency(subtotal)}</strong>
            </div>
            <Button render={<Link href="/checkout" />} size="lg" onClick={() => setOpen(false)}>
              Ir para o checkout
            </Button>
            <Button render={<Link href="/carrinho" />} variant="ghost" onClick={() => setOpen(false)}>
              Ver carrinho completo
            </Button>
          </SheetFooter>
        )}
      </SheetContent>
    </Sheet>
  );
}
