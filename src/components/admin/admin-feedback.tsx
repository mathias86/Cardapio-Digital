"use client";

import Link from "next/link";
import { AlertCircle, RefreshCw } from "lucide-react";

import { Button } from "@/components/ui/button";

export function AdminLoading({ label = "Carregando..." }: { label?: string }) {
  return <div className="min-h-72 animate-pulse rounded-2xl border bg-card" aria-label={label} />;
}

export function AdminError({ error, retry }: { error: unknown; retry: () => void }) {
  return (
    <div className="rounded-2xl border border-destructive/20 bg-card p-8 text-center">
      <AlertCircle className="mx-auto size-10 text-destructive" aria-hidden="true" />
      <h2 className="mt-4 text-xl font-bold">Não foi possível carregar os dados</h2>
      <p className="mt-2 text-sm text-muted-foreground">{error instanceof Error ? error.message : "Tente novamente."}</p>
      <div className="mt-6 flex justify-center gap-3"><Button type="button" onClick={retry}><RefreshCw aria-hidden="true" />Tentar novamente</Button><Button render={<Link href="/login" />} variant="outline">Login</Button></div>
    </div>
  );
}
