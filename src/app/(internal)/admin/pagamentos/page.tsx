import type { Metadata } from "next";

import { PaymentSettingsManager } from "@/components/admin/payment-settings-manager";

export const metadata: Metadata = { title: "Pagamentos" };

export default function AdminPaymentsPage() {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://cardapio-digital-app-one.vercel.app";
  return <section className="mx-auto w-full max-w-7xl"><div className="mb-7"><p className="text-sm font-bold uppercase tracking-[0.18em] text-primary">Integrações</p><h1 className="mt-2 text-3xl font-bold tracking-tight">Mercado Pago</h1><p className="mt-3 text-muted-foreground">Gerencie credenciais de teste e produção e alterne o ambiente ativo com segurança.</p></div><PaymentSettingsManager webhookUrl={`${appUrl}/api/mercado-pago/webhook`} /></section>;
}
