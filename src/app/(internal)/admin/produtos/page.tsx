import type { Metadata } from "next";

import { ProductManager } from "@/components/admin/product-manager";

export const metadata: Metadata = { title: "Produtos" };

export default function AdminProductsPage() {
  return <section className="mx-auto w-full max-w-7xl"><div className="mb-7"><p className="text-sm font-bold uppercase tracking-[0.18em] text-primary">Catálogo</p><h1 className="mt-2 text-3xl font-bold tracking-tight">Produtos</h1><p className="mt-3 text-muted-foreground">Gerencie preços, imagens, disponibilidade e estoque.</p></div><ProductManager /></section>;
}
