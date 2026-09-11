import type { Metadata } from "next";
import { AddonManager } from "@/components/admin/addon-manager";

export const metadata: Metadata = { title: "Adicionais" };

export default function AdminAddonsPage() {
  return <section className="mx-auto w-full max-w-7xl"><div className="mb-7"><p className="text-sm font-bold uppercase tracking-[0.18em] text-primary">Catálogo</p><h1 className="mt-2 text-3xl font-bold tracking-tight">Adicionais</h1><p className="mt-2 text-muted-foreground">Crie grupos de molhos, extras e acompanhamentos e escolha em quais produtos aparecem.</p></div><AddonManager /></section>;
}
