import type { Metadata } from "next";

import { DeliveryDashboard } from "@/components/delivery/delivery-dashboard";

export const metadata: Metadata = {
  title: "Entregas",
};

export default function DeliveryPage() {
  return (
    <section className="mx-auto w-full max-w-5xl">
      <div className="mb-6 text-center md:text-left">
        <p className="text-sm font-bold uppercase tracking-[0.18em] text-primary">Operação mobile</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">Minhas entregas</h1>
        <p className="mt-3 text-muted-foreground">Assuma pedidos prontos e acompanhe sua rota.</p>
      </div>
      <DeliveryDashboard />
    </section>
  );
}
