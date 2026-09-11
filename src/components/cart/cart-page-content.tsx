"use client";

import Link from "next/link";
import { ArrowLeft, ArrowRight, Trash2 } from "lucide-react";

import { CartEmpty } from "@/components/cart/cart-empty";
import { CartItemRow } from "@/components/cart/cart-item-row";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { useCartHydrated } from "@/hooks/use-cart-hydrated";
import { formatCurrency } from "@/lib/formatters/currency";
import { getCartCount, getCartSubtotal, useCartStore } from "@/stores/cart-store";

export function CartPageContent() {
  const hydrated = useCartHydrated();
  const items = useCartStore((state) => state.items);
  const clearCart = useCartStore((state) => state.clearCart);

  if (!hydrated) {
    return <div className="min-h-[32rem] animate-pulse rounded-2xl border bg-card" />;
  }

  if (items.length === 0) {
    return <CartEmpty />;
  }

  const count = getCartCount(items);
  const subtotal = getCartSubtotal(items);

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_22rem]">
      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <div>
            <CardTitle className="text-xl">Itens do pedido</CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">
              {count} {count === 1 ? "item selecionado" : "itens selecionados"}
            </p>
          </div>
          <Button type="button" variant="ghost" onClick={clearCart} className="text-muted-foreground hover:text-destructive">
            <Trash2 aria-hidden="true" />
            Limpar
          </Button>
        </CardHeader>
        <CardContent>
          {items.map((item, index) => (
            <div key={item.lineId}>
              {index > 0 && <Separator />}
              <CartItemRow item={item} />
            </div>
          ))}
        </CardContent>
      </Card>

      <Card className="h-fit lg:sticky lg:top-24">
        <CardHeader>
          <CardTitle className="text-xl">Resumo</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Subtotal</span>
            <strong>{formatCurrency(subtotal)}</strong>
          </div>
          <p className="rounded-xl bg-muted p-3 text-xs leading-5 text-muted-foreground">
            A taxa de entrega será calculada depois que você escolher entrega ou retirada.
          </p>
          <Button render={<Link href="/checkout" />} size="lg" className="w-full">
            Continuar
            <ArrowRight aria-hidden="true" />
          </Button>
          <Button render={<Link href="/cardapio" />} variant="ghost" className="w-full">
            <ArrowLeft aria-hidden="true" />
            Adicionar mais itens
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
