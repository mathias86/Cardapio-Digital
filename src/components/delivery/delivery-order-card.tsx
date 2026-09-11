"use client";

import {
  Banknote,
  CheckCircle2,
  Clock3,
  LoaderCircle,
  MapPin,
  Navigation,
  Phone,
  Printer,
  ReceiptText,
} from "lucide-react";

import { OrderStatusBadge } from "@/components/order/order-status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { formatCurrency } from "@/lib/formatters/currency";
import { cn } from "@/lib/utils";
import type { DeliveryOrder, DeliveryOrderStatus } from "@/types/delivery";

type DeliveryOrderCardProps = {
  order: DeliveryOrder;
  isUpdating: boolean;
  onStatusChange: (
    orderId: string,
    status: Extract<DeliveryOrderStatus, "OUT_FOR_DELIVERY" | "DELIVERED">,
  ) => void;
};

const paymentLabels = {
  PIX: "Pix",
  CARD: "Cartão",
  CASH: "Dinheiro",
} as const;

const paymentStatusLabels = {
  PENDING: "Pendente",
  PAID: "Pago",
  FAILED: "Falhou",
  REFUNDED: "Estornado",
} as const;

function formatOrderTime(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function formatAddress(order: DeliveryOrder) {
  const street = [order.address_street, order.address_number]
    .filter(Boolean)
    .join(", ");
  return [street, order.address_neighborhood].filter(Boolean).join(" · ");
}

export function DeliveryOrderCard({
  order,
  isUpdating,
  onStatusChange,
}: DeliveryOrderCardProps) {
  const nextStatus =
    order.status === "READY"
      ? "OUT_FOR_DELIVERY"
      : order.status === "OUT_FOR_DELIVERY"
        ? "DELIVERED"
        : null;
  const address = formatAddress(order);

  return (
    <Card
      className={cn(
        "gap-0 overflow-hidden py-0 shadow-md",
        order.status === "READY" && "border-emerald-300",
        order.status === "OUT_FOR_DELIVERY" && "border-violet-300",
      )}
    >
      <CardHeader className="bg-muted/45 py-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-muted-foreground">Pedido</p>
            <CardTitle className="mt-1 text-3xl">#{order.order_number}</CardTitle>
          </div>
          <OrderStatusBadge status={order.status} />
        </div>
        <p className="mt-3 flex items-center gap-2 text-sm font-medium">
          <Clock3 className="size-4 text-primary" aria-hidden="true" />
          Recebido às {formatOrderTime(order.created_at)}
        </p>
      </CardHeader>

      <CardContent className="space-y-5 py-5">
        <div>
          <p className="text-lg font-bold">{order.customer_name}</p>
          <Button
            render={<a href={`tel:${order.customer_phone}`} />}
            variant="outline"
            size="lg"
            className="mt-3 w-full justify-start text-base"
          >
            <Phone aria-hidden="true" />
            {order.customer_phone}
          </Button>
        </div>

        <div className="rounded-xl bg-foreground p-4 text-background">
          <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.14em] text-background/70">
            <MapPin className="size-4" aria-hidden="true" />
            Endereço de entrega
          </p>
          <p className="mt-2 text-lg font-bold leading-6">{address || "Endereço não informado"}</p>
          {order.address_complement && <p className="mt-2 text-sm">Complemento: {order.address_complement}</p>}
          {order.address_reference && <p className="mt-1 text-sm">Referência: {order.address_reference}</p>}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-xl border p-3">
            <p className="text-xs text-muted-foreground">Pagamento</p>
            <p className="mt-1 font-bold">{paymentLabels[order.payment_method]}</p>
            <p className="mt-1 text-xs text-muted-foreground">{paymentStatusLabels[order.payment_status]}</p>
          </div>
          <div className="rounded-xl border p-3 text-right">
            <p className="text-xs text-muted-foreground">Total</p>
            <p className="mt-1 text-xl font-black text-primary">{formatCurrency(order.total)}</p>
          </div>
        </div>

        {order.payment_method === "CASH" && order.change_for !== null && (
          <div className="flex items-center justify-between rounded-xl border-2 border-amber-300 bg-amber-50 p-4 text-amber-950">
            <span className="flex items-center gap-2 font-bold"><Banknote aria-hidden="true" />Troco para</span>
            <strong className="text-xl">{formatCurrency(order.change_for)}</strong>
          </div>
        )}

        <details className="rounded-xl border p-4">
          <summary className="flex cursor-pointer list-none items-center gap-2 font-semibold">
            <ReceiptText className="size-4 text-primary" aria-hidden="true" />
            {order.items.reduce((total, item) => total + item.quantity, 0)} itens do pedido
          </summary>
          <div className="mt-4 space-y-3 border-t pt-4">
            {order.items.map((item, index) => (
              <div key={item.id}>
                {index > 0 && <Separator className="mb-3" />}
                <div className="flex justify-between gap-4 text-sm">
                  <span><strong>{item.quantity}×</strong> {item.product_name}</span>
                  <span className="shrink-0">{formatCurrency(item.total_price)}</span>
                </div>
                {item.notes && <p className="mt-1 text-xs text-muted-foreground">Obs.: {item.notes}</p>}
              </div>
            ))}
          </div>
        </details>

        {order.notes && (
          <p className="rounded-xl bg-muted p-3 text-sm leading-5"><strong>Observação:</strong> {order.notes}</p>
        )}
      </CardContent>

      <CardFooter className="grid grid-cols-[auto_1fr] gap-3 bg-muted/45 py-4">
        <Button
          type="button"
          variant="outline"
          size="lg"
          aria-label={`Imprimir pedido ${order.order_number}`}
          onClick={() => window.open(`/print/entrega/${order.id}`, "_blank", "noopener,noreferrer")}
        >
          <Printer aria-hidden="true" />
        </Button>
        {nextStatus ? (
          <Button
            type="button"
            size="lg"
            className={cn(
              "min-h-12 text-sm font-bold",
              nextStatus === "DELIVERED" && "bg-emerald-600 hover:bg-emerald-700",
            )}
            onClick={() => onStatusChange(order.id, nextStatus)}
            disabled={isUpdating}
          >
            {isUpdating ? (
              <LoaderCircle className="animate-spin" aria-hidden="true" />
            ) : nextStatus === "OUT_FOR_DELIVERY" ? (
              <Navigation aria-hidden="true" />
            ) : (
              <CheckCircle2 aria-hidden="true" />
            )}
            {nextStatus === "OUT_FOR_DELIVERY"
              ? "Assumir e sair para entrega"
              : "Marcar como entregue"}
          </Button>
        ) : (
          <div className="flex min-h-12 items-center justify-center rounded-lg bg-emerald-100 px-4 text-sm font-bold text-emerald-800">
            Entrega concluída
          </div>
        )}
      </CardFooter>
    </Card>
  );
}
