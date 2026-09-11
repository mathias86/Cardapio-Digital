"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { AlertCircle, LoaderCircle, Printer, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { getKitchenPrintData } from "@/services/kitchen";

function formatPrintDate(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value));
}

export function KitchenPrintReceipt({ orderId }: { orderId: string }) {
  const printQuery = useQuery({
    queryKey: ["kitchen-print", orderId],
    queryFn: () => getKitchenPrintData(orderId),
    retry: false,
    staleTime: Number.POSITIVE_INFINITY,
  });

  if (printQuery.isPending) {
    return (
      <div className="grid min-h-screen place-items-center bg-white text-black">
        <div className="text-center">
          <LoaderCircle className="mx-auto size-8 animate-spin" aria-hidden="true" />
          <p className="mt-3 text-sm">Preparando comanda...</p>
        </div>
      </div>
    );
  }

  if (printQuery.isError) {
    return (
      <div className="grid min-h-screen place-items-center bg-muted p-4">
        <div className="max-w-md rounded-2xl border bg-card p-8 text-center shadow-sm">
          <AlertCircle className="mx-auto size-10 text-destructive" aria-hidden="true" />
          <h1 className="mt-4 text-xl font-bold">Não foi possível gerar a comanda</h1>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            {printQuery.error instanceof Error
              ? printQuery.error.message
              : "Tente novamente em alguns instantes."}
          </p>
          <div className="mt-6 flex justify-center gap-3">
            <Button type="button" onClick={() => printQuery.refetch()}>Tentar novamente</Button>
            <Button render={<Link href="/cozinha" />} variant="outline">Voltar</Button>
          </div>
        </div>
      </div>
    );
  }

  const order = printQuery.data;

  return (
    <main className="min-h-screen bg-muted px-4 py-8 text-black print:bg-white print:p-0">
      <div className="print-controls mx-auto mb-5 flex max-w-[80mm] gap-3">
        <Button type="button" size="lg" className="flex-1" onClick={() => window.print()}>
          <Printer aria-hidden="true" />
          Imprimir
        </Button>
        <Button type="button" size="lg" variant="outline" aria-label="Fechar" onClick={() => window.close()}>
          <X aria-hidden="true" />
        </Button>
      </div>

      <article className="thermal-receipt mx-auto w-full max-w-[80mm] bg-white p-5 font-mono text-black shadow-lg print:shadow-none">
        <header className="border-b-2 border-dashed border-black pb-4 text-center">
          <p className="text-sm font-bold uppercase tracking-widest">Cozinha</p>
          <h1 className="mt-2 text-4xl font-black">#{order.order_number}</h1>
          <p className="mt-2 text-lg font-bold">
            {order.delivery_type === "DELIVERY" ? "ENTREGA" : "RETIRADA"}
          </p>
          <p className="mt-1 text-xs">{formatPrintDate(order.created_at)}</p>
        </header>

        <section className="border-b-2 border-dashed border-black py-4">
          <p className="text-xs uppercase">Cliente</p>
          <p className="mt-1 font-bold">{order.customer_name}</p>
        </section>

        <section className="space-y-4 border-b-2 border-dashed border-black py-4">
          {order.items.map((item, index) => (
            <div key={`${item.product_name}-${index}`}>
              <p className="text-lg font-black leading-tight">
                {item.quantity}x {item.product_name}
              </p>
              {item.notes && (
                <p className="mt-1 border-l-4 border-black pl-2 text-sm font-bold leading-5">
                  OBS: {item.notes}
                </p>
              )}
            </div>
          ))}
        </section>

        {order.notes && (
          <section className="border-b-2 border-dashed border-black py-4">
            <p className="text-xs font-bold uppercase">Observação geral</p>
            <p className="mt-1 text-sm font-bold leading-5">{order.notes}</p>
          </section>
        )}

        <footer className="pt-4 text-center text-xs">
          <p>{order.items.reduce((total, item) => total + item.quantity, 0)} itens</p>
          <p className="mt-2">Cardápio Digital</p>
        </footer>
      </article>
    </main>
  );
}
