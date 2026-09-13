import type { Metadata } from "next";

import { DeliveryPeopleManager } from "@/components/admin/delivery-people-manager";

export const metadata: Metadata = { title: "Motoboys" };

export default function DeliveryPeoplePage() {
  return <section className="mx-auto w-full max-w-7xl"><div className="mb-7"><p className="text-sm font-bold uppercase tracking-[0.18em] text-primary">Equipe de entrega</p><h1 className="mt-2 text-3xl font-bold tracking-tight">Motoboys</h1><p className="mt-3 text-muted-foreground">Cadastre entregadores e mantenha cada pedido atribuído ao profissional correto.</p></div><DeliveryPeopleManager /></section>;
}
