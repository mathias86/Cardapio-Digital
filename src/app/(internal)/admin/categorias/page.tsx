import type { Metadata } from "next";

import { CategoryManager } from "@/components/admin/category-manager";

export const metadata: Metadata = { title: "Categorias" };

export default function AdminCategoriesPage() {
  return <section className="mx-auto w-full max-w-6xl"><div className="mb-7"><p className="text-sm font-bold uppercase tracking-[0.18em] text-primary">Catálogo</p><h1 className="mt-2 text-3xl font-bold tracking-tight">Categorias</h1><p className="mt-3 text-muted-foreground">Organize as seções exibidas no cardápio.</p></div><CategoryManager /></section>;
}
