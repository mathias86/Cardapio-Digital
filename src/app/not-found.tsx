import Link from "next/link";
import { SearchX } from "lucide-react";

import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main className="grid min-h-screen place-items-center bg-muted/50 px-4 py-12">
      <div className="w-full max-w-lg rounded-2xl border bg-card p-8 text-center shadow-sm">
        <SearchX className="mx-auto size-12 text-primary" aria-hidden="true" />
        <p className="mt-5 text-sm font-bold uppercase tracking-[0.18em] text-primary">Erro 404</p>
        <h1 className="mt-2 text-2xl font-bold">Página não encontrada</h1>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">O endereço pode ter mudado ou não existe.</p>
        <Button render={<Link href="/" />} className="mt-6">Voltar ao cardápio</Button>
      </div>
    </main>
  );
}
