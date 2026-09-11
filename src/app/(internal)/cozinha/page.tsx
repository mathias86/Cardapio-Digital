import type { Metadata } from "next";

import { KitchenDashboard } from "@/components/kitchen/kitchen-dashboard";

export const metadata: Metadata = {
  title: "Cozinha",
};

export default function KitchenPage() {
  return (
    <section className="mx-auto w-full max-w-[100rem]">
      <div className="mb-7">
        <p className="text-sm font-bold uppercase tracking-[0.18em] text-primary">Operação ao vivo</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">Painel da cozinha</h1>
        <p className="mt-3 text-muted-foreground">Organize o preparo e mantenha cada pedido avançando.</p>
      </div>
      <KitchenDashboard />
    </section>
  );
}
