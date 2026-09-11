"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import {
  AlertCircle,
  Clock3,
  LoaderCircle,
  MapPin,
  ReceiptText,
  RefreshCw,
  Utensils,
  WalletCards,
} from "lucide-react";

import { OrderStatusBadge } from "@/components/order/order-status-badge";
import { OrderTimeline } from "@/components/order/order-timeline";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { formatCurrency } from "@/lib/formatters/currency";
import { cn } from "@/lib/utils";
import { getOrderByAccessToken } from "@/services/orders";

const paymentLabels = {
  PIX: "Pix",
  CARD: "Cartão",
  CASH: "Dinheiro",
} as const;

function formatCreatedAt(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "long",
    timeStyle: "short",
  }).format(new Date(value));
}

export function TrackingView({ accessToken }: { accessToken: string }) {
  const orderQuery = useQuery({
    queryKey: ["public-order", accessToken],
    queryFn: () => getOrderByAccessToken(accessToken),
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      return status === "DELIVERED" || status === "CANCELED" ? false : 15_000;
    },
  });

  if (orderQuery.isPending) {
    return (
      <div className="grid gap-6 lg:grid-cols-[1fr_22rem]" aria-label="Carregando pedido">
        <div className="min-h-[32rem] animate-pulse rounded-2xl border bg-card" />
        <div className="h-80 animate-pulse rounded-2xl border bg-card" />
      </div>
    );
  }

  if (orderQuery.isError) {
    return (
      <div className="mx-auto max-w-xl rounded-2xl border border-destructive/20 bg-card p-8 text-center shadow-sm">
        <span className="mx-auto grid size-12 place-items-center rounded-full bg-destructive/10 text-destructive">
          <AlertCircle aria-hidden="true" />
        </span>
        <h2 className="mt-5 text-xl font-bold">Não foi possível consultar o pedido</h2>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          {orderQuery.error instanceof Error
            ? orderQuery.error.message
            : "Tente novamente em alguns instantes."}
        </p>
        <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
          <Button type="button" onClick={() => orderQuery.refetch()} disabled={orderQuery.isFetching}>
            <RefreshCw className={cn(orderQuery.isFetching && "animate-spin")} aria-hidden="true" />
            Tentar novamente
          </Button>
          <Button render={<Link href="/pedido/acompanhar" />} variant="outline">
            Usar outro código
          </Button>
        </div>
      </div>
    );
  }

  const order = orderQuery.data;

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_22rem]">
      <div className="space-y-6">
        <Card>
          <CardHeader className="gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-primary">Pedido</p>
              <CardTitle className="mt-1 text-3xl">#{order.order_number}</CardTitle>
              <p className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
                <Clock3 className="size-4" aria-hidden="true" />
                {formatCreatedAt(order.created_at)}
              </p>
            </div>
            <OrderStatusBadge status={order.status} />
          </CardHeader>
          <CardContent>
            <OrderTimeline order={order} />
            <div className="mt-2 flex flex-wrap items-center justify-between gap-3 border-t pt-4 text-xs text-muted-foreground">
              <span>Atualização automática a cada 15 segundos.</span>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => orderQuery.refetch()}
                disabled={orderQuery.isFetching}
              >
                {orderQuery.isFetching ? (
                  <LoaderCircle className="animate-spin" aria-hidden="true" />
                ) : (
                  <RefreshCw aria-hidden="true" />
                )}
                Atualizar agora
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-xl">
              <ReceiptText className="size-5 text-primary" aria-hidden="true" />
              Itens do pedido
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {order.items.map((item, index) => (
              <div key={item.id}>
                {index > 0 && <Separator className="mb-4" />}
                <div className="flex justify-between gap-5">
                  <div>
                    <p className="font-semibold">{item.quantity}× {item.product_name}</p>
                    {item.notes && <p className="mt-1 text-sm text-muted-foreground">Obs.: {item.notes}</p>}
                  </div>
                  <span className="shrink-0 font-medium">{formatCurrency(item.total_price)}</span>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <div className="space-y-6">
        <Card>
          <CardHeader><CardTitle className="text-xl">Resumo</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between text-sm"><span className="text-muted-foreground">Subtotal</span><span>{formatCurrency(order.subtotal)}</span></div>
            <div className="flex justify-between text-sm"><span className="text-muted-foreground">Taxa de entrega</span><span>{order.delivery_fee > 0 ? formatCurrency(order.delivery_fee) : "Grátis"}</span></div>
            <Separator />
            <div className="flex justify-between text-lg"><strong>Total</strong><strong className="text-primary">{formatCurrency(order.total)}</strong></div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="space-y-4 pt-6">
            <div className="flex gap-3">
              <MapPin className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden="true" />
              <div><p className="font-semibold">Recebimento</p><p className="mt-1 text-sm text-muted-foreground">{order.delivery_type === "DELIVERY" ? "Entrega" : "Retirada na loja"}</p></div>
            </div>
            <div className="flex gap-3">
              <WalletCards className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden="true" />
              <div><p className="font-semibold">Pagamento</p><p className="mt-1 text-sm text-muted-foreground">{paymentLabels[order.payment_method]} · {order.payment_status === "PAID" ? "Pago" : "Pendente"}</p></div>
            </div>
          </CardContent>
        </Card>

        <Button render={<Link href="/cardapio" />} variant="outline" size="lg" className="w-full">
          <Utensils aria-hidden="true" />
          Voltar ao cardápio
        </Button>
      </div>
    </div>
  );
}
