import Link from "next/link";
import { AlertTriangle, ChefHat } from "lucide-react";

import { Button } from "@/components/ui/button";

export function MenuEmptyState() {
  return (
    <div className="mx-auto my-16 max-w-xl rounded-2xl border border-dashed bg-card p-10 text-center shadow-sm">
      <span className="mx-auto grid size-14 place-items-center rounded-2xl bg-primary/10 text-primary">
        <ChefHat className="size-7" aria-hidden="true" />
      </span>
      <h2 className="mt-5 text-2xl font-bold">Cardápio em preparação</h2>
      <p className="mt-2 leading-6 text-muted-foreground">
        Ainda não há categorias ativas com produtos disponíveis. Volte em breve.
      </p>
    </div>
  );
}

export function MenuErrorState() {
  return (
    <div className="mx-auto my-16 max-w-xl rounded-2xl border border-destructive/20 bg-card p-10 text-center shadow-sm">
      <span className="mx-auto grid size-14 place-items-center rounded-2xl bg-destructive/10 text-destructive">
        <AlertTriangle className="size-7" aria-hidden="true" />
      </span>
      <h2 className="mt-5 text-2xl font-bold">Não foi possível abrir o cardápio</h2>
      <p className="mt-2 leading-6 text-muted-foreground">
        Tivemos uma dificuldade para carregar os produtos. Tente novamente em alguns instantes.
      </p>
      <Button render={<Link href="/" />} variant="outline" className="mt-6">
        Voltar ao início
      </Button>
    </div>
  );
}
