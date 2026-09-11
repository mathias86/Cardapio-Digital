import type { Metadata } from "next";

import { OrderManager } from "@/components/admin/order-manager";

export const metadata: Metadata = { title: "Pedidos" };

export default function AdminOrdersPage() {
  return <section className="mx-auto w-full max-w-7xl"><div className="mb-7"><p className="text-sm font-bold uppercase tracking-[0.18em] text-primary">Operação</p><h1 className="mt-2 text-3xl font-bold tracking-tight">Pedidos</h1><p className="mt-3 text-muted-foreground">Consulte, atualize, cancele e imprima pedidos.</p></div><OrderManager /></section>;
}
