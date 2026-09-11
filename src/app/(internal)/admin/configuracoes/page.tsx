import type { Metadata } from "next";

import { SettingsForm } from "@/components/admin/settings-form";

export const metadata: Metadata = { title: "Configurações" };

export default function AdminSettingsPage() {
  return <section className="mx-auto w-full max-w-6xl"><div className="mb-7"><p className="text-sm font-bold uppercase tracking-[0.18em] text-primary">Administração</p><h1 className="mt-2 text-3xl font-bold tracking-tight">Configurações</h1><p className="mt-3 text-muted-foreground">Atualize os dados públicos e as regras comerciais da loja.</p></div><SettingsForm /></section>;
}
