import type { Metadata } from "next";

import { CouponManager } from "@/components/admin/coupon-manager";

export const metadata: Metadata = { title: "Cupons" };

export default function CouponsPage() {
  return <section className="mx-auto w-full max-w-7xl"><div className="mb-7"><p className="text-sm font-bold uppercase tracking-[0.18em] text-primary">Promoções</p><h1 className="mt-2 text-3xl font-bold tracking-tight">Cupons</h1><p className="mt-3 text-muted-foreground">Crie descontos por porcentagem ou valor fixo, com período, pedido mínimo e limite de usos.</p></div><CouponManager /></section>;
}
