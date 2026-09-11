import type { Metadata } from "next";
import { Suspense } from "react";

import { CheckoutContent } from "@/components/checkout/checkout-content";
import { MenuSkeleton } from "@/components/menu/menu-skeleton";

export const metadata: Metadata = {
  title: "Checkout",
};

export default function CheckoutPage() {
  return (
    <section className="mx-auto w-full max-w-7xl flex-1 px-4 py-10 sm:px-6 lg:px-8">
      <p className="text-sm font-bold uppercase tracking-[0.18em] text-primary">Última etapa</p>
      <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">Finalizar pedido</h1>
      <p className="mt-3 text-muted-foreground">Confira os itens e preencha seus dados para continuar.</p>
      <div className="mt-8">
        <Suspense fallback={<MenuSkeleton />}>
          <CheckoutContent />
        </Suspense>
      </div>
    </section>
  );
}
