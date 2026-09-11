"use client";

import { AlertTriangle, RefreshCw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

export function RouteLoading() {
  return (
    <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 sm:px-6 lg:px-8" aria-label="Carregando página">
      <Skeleton className="h-4 w-28" />
      <Skeleton className="mt-4 h-10 w-full max-w-sm" />
      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3].map((item) => <Skeleton key={item} className="h-48 rounded-2xl" />)}
      </div>
    </main>
  );
}

export function RouteError({ retry }: { retry: () => void }) {
  return (
    <main className="grid min-h-[70vh] place-items-center px-4 py-12">
      <div className="w-full max-w-lg rounded-2xl border border-destructive/20 bg-card p-8 text-center shadow-sm">
        <span className="mx-auto grid size-12 place-items-center rounded-full bg-destructive/10 text-destructive">
          <AlertTriangle aria-hidden="true" />
        </span>
        <h1 className="mt-5 text-2xl font-bold">Algo não saiu como esperado</h1>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          Não foi possível abrir esta página. Verifique sua conexão e tente novamente.
        </p>
        <Button type="button" className="mt-6" onClick={retry}>
          <RefreshCw aria-hidden="true" />
          Tentar novamente
        </Button>
      </div>
    </main>
  );
}
