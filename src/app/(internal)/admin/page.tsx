import type { Metadata } from "next";

import { AdminDashboard } from "@/components/admin/admin-dashboard";

export const metadata: Metadata = { title: "Administração" };

export default function AdminPage() {
  return (
    <section className="mx-auto w-full max-w-7xl">
      <div className="mb-7"><p className="text-sm font-bold uppercase tracking-[0.18em] text-primary">Administração</p><h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">Visão geral</h1><p className="mt-3 text-muted-foreground">Acompanhe a operação e acesse os principais cadastros.</p></div>
      <AdminDashboard />
    </section>
  );
}
