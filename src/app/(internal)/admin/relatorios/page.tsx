import type { Metadata } from "next";

import { ReportsDashboard } from "@/components/admin/reports-dashboard";

export const metadata: Metadata = { title: "Relatórios" };

export default function AdminReportsPage() {
  return <section className="mx-auto w-full max-w-7xl"><div className="mb-7"><p className="text-sm font-bold uppercase tracking-[0.18em] text-primary">Inteligência</p><h1 className="mt-2 text-3xl font-bold tracking-tight">Relatórios</h1><p className="mt-3 text-muted-foreground">Analise vendas, produtos, categorias e necessidades de estoque.</p></div><ReportsDashboard /></section>;
}
