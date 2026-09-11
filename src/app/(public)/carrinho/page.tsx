import type { Metadata } from "next";

import { CartPageContent } from "@/components/cart/cart-page-content";

export const metadata: Metadata = {
  title: "Carrinho",
};

export default function CartPage() {
  return (
    <section className="mx-auto w-full max-w-7xl flex-1 px-4 py-10 sm:px-6 lg:px-8">
      <p className="text-sm font-bold uppercase tracking-[0.18em] text-primary">Seu pedido</p>
      <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">Carrinho</h1>
      <div className="mt-8"><CartPageContent /></div>
    </section>
  );
}
