"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { AlertCircle, LoaderCircle, Printer, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/formatters/currency";
import { getDeliveryPrintData } from "@/services/delivery";

const paymentLabels = {
  PIX: "PIX",
  CARD: "CARTÃO",
  CASH: "DINHEIRO",
} as const;

const paymentStatusLabels = {
  PENDING: "PENDENTE",
  PAID: "PAGO",
  FAILED: "FALHOU",
  REFUNDED: "ESTORNADO",
} as const;

function formatPrintDate(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value));
}

export function DeliveryPrintReceipt({ orderId }: { orderId: string }) {
  const printQuery = useQuery({
    queryKey: ["delivery-print", orderId],
    queryFn: () => getDeliveryPrintData(orderId),
    retry: false,
    staleTime: Number.POSITIVE_INFINITY,
  });

  if (printQuery.isPending) {
    return (
      <div className="grid min-h-screen place-items-center bg-white text-black">
        <div className="text-center"><LoaderCircle className="mx-auto size-8 animate-spin" aria-hidden="true" /><p className="mt-3 text-sm">Preparando recibo...</p></div>
      </div>
    );
  }

  if (printQuery.isError) {
    return (
      <div className="grid min-h-screen place-items-center bg-muted p-4">
        <div className="max-w-md rounded-2xl border bg-card p-8 text-center shadow-sm">
          <AlertCircle className="mx-auto size-10 text-destructive" aria-hidden="true" />
          <h1 className="mt-4 text-xl font-bold">Não foi possível gerar o recibo</h1>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            {printQuery.error instanceof Error ? printQuery.error.message : "Tente novamente em alguns instantes."}
          </p>
          <div className="mt-6 flex justify-center gap-3">
            <Button type="button" onClick={() => printQuery.refetch()}>Tentar novamente</Button>
            <Button render={<Link href="/entregador" />} variant="outline">Voltar</Button>
          </div>
        </div>
      </div>
    );
  }

  const order = printQuery.data;
  const street = [order.address_street, order.address_number].filter(Boolean).join(", ");

  return (
    <main className="min-h-screen bg-muted px-4 py-8 text-black print:bg-white print:p-0">
      <div className="print-controls mx-auto mb-5 flex max-w-[80mm] gap-3">
        <Button type="button" size="lg" className="flex-1" onClick={() => window.print()}><Printer aria-hidden="true" />Imprimir</Button>
        <Button type="button" size="lg" variant="outline" aria-label="Fechar" onClick={() => window.close()}><X aria-hidden="true" /></Button>
      </div>

      <article className="thermal-receipt mx-auto w-full max-w-[80mm] bg-white p-5 font-mono text-black shadow-lg print:shadow-none">
        <header className="border-b-2 border-dashed border-black pb-4 text-center">
          <p className="text-sm font-bold uppercase tracking-widest">Entrega</p>
          <h1 className="mt-2 text-4xl font-black">#{order.order_number}</h1>
          <p className="mt-2 text-xs">{formatPrintDate(order.created_at)}</p>
        </header>

        <section className="space-y-2 border-b-2 border-dashed border-black py-4">
          <p className="text-xs uppercase">Cliente</p>
          <p className="text-lg font-black">{order.customer_name}</p>
          <p className="text-lg font-black">{order.customer_phone}</p>
        </section>

        <section className="border-b-2 border-dashed border-black py-4">
          <p className="text-xs font-bold uppercase">Endereço</p>
          <p className="mt-2 text-lg font-black leading-6">{street}</p>
          <p className="mt-1 text-base font-bold">{order.address_neighborhood}</p>
          {order.address_complement && <p className="mt-2 text-sm">COMPL: {order.address_complement}</p>}
          {order.address_reference && <p className="mt-1 text-sm font-bold">REF: {order.address_reference}</p>}
        </section>

        <section className="space-y-3 border-b-2 border-dashed border-black py-4">
          {order.items.map((item, index) => (
            <div key={`${item.product_name}-${index}`}>
              <div className="flex justify-between gap-3 font-bold">
                <span>{item.quantity}x {item.product_name}</span>
                <span>{formatCurrency(item.total_price)}</span>
              </div>
              {item.addons.length > 0 && <p className="mt-1 text-xs">+ {item.addons.map((addon) => addon.addon_name).join(", ")}</p>}
              {item.notes && <p className="mt-1 border-l-4 border-black pl-2 text-xs font-bold">OBS: {item.notes}</p>}
            </div>
          ))}
        </section>

        <section className="space-y-2 border-b-2 border-dashed border-black py-4 text-sm">
          <div className="flex justify-between"><span>SUBTOTAL</span><span>{formatCurrency(order.subtotal)}</span></div>
          <div className="flex justify-between"><span>ENTREGA</span><span>{formatCurrency(order.delivery_fee)}</span></div>
          <div className="flex justify-between text-xl font-black"><span>TOTAL</span><span>{formatCurrency(order.total)}</span></div>
        </section>

        <section className="border-b-2 border-dashed border-black py-4 text-center">
          <p className="text-xs uppercase">Pagamento</p>
          <p className="mt-1 text-xl font-black">{paymentLabels[order.payment_method]}</p>
          <p className="mt-1 text-sm font-bold">{paymentStatusLabels[order.payment_status]}</p>
          {order.payment_method === "CASH" && order.change_for !== null && (
            <div className="mt-3 border-4 border-black p-2">
              <p className="text-xs font-bold">TROCO PARA</p>
              <p className="text-2xl font-black">{formatCurrency(order.change_for)}</p>
              <p className="mt-1 text-xs">DEVOLVER {formatCurrency(order.change_for - order.total)}</p>
            </div>
          )}
        </section>

        {order.notes && (
          <section className="border-b-2 border-dashed border-black py-4">
            <p className="text-xs font-bold uppercase">Observação geral</p>
            <p className="mt-1 text-sm font-bold">{order.notes}</p>
          </section>
        )}

        <footer className="pt-4 text-center text-xs">Cardápio Digital</footer>
      </article>
    </main>
  );
}
