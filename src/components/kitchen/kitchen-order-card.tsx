"use client";

import { Clock3, Flame, LoaderCircle, Printer, ShoppingBag, Utensils } from "lucide-react";

import { OrderStatusBadge } from "@/components/order/order-status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import type { KitchenOrder, KitchenOrderStatus } from "@/types/kitchen";

type KitchenOrderCardProps = {
  order: KitchenOrder;
  isUpdating: boolean;
  onStatusChange: (
    orderId: string,
    status: Extract<KitchenOrderStatus, "PREPARING" | "READY">,
  ) => void;
};

function formatOrderTime(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

export function KitchenOrderCard({
  order,
  isUpdating,
  onStatusChange,
}: KitchenOrderCardProps) {
  const isWaiting = order.status === "PENDING" || order.status === "CONFIRMED";
  const nextStatus = isWaiting ? "PREPARING" : order.status === "PREPARING" ? "READY" : null;

  return (
    <Card
      className={cn(
        "gap-0 overflow-hidden border-2 py-0 shadow-md",
        isWaiting && "border-amber-300",
        order.status === "PREPARING" && "border-orange-400",
        order.status === "READY" && "border-emerald-400",
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
        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm font-medium">
          <span className="flex items-center gap-1.5">
            <Clock3 className="size-4 text-primary" aria-hidden="true" />
            {formatOrderTime(order.created_at)}
          </span>
          <span className="flex items-center gap-1.5">
            {order.delivery_type === "DELIVERY" ? (
              <ShoppingBag className="size-4 text-primary" aria-hidden="true" />
            ) : (
              <Utensils className="size-4 text-primary" aria-hidden="true" />
            )}
            {order.delivery_type === "DELIVERY" ? "Entrega" : "Retirada"}
          </span>
        </div>
      </CardHeader>

      <CardContent className="space-y-4 py-5">
        <p className="text-sm font-semibold text-muted-foreground">{order.customer_name}</p>
        <div className="space-y-4">
          {order.items.map((item, index) => (
            <div key={item.id}>
              {index > 0 && <Separator className="mb-4" />}
              <div className="flex gap-3 text-lg font-bold leading-tight">
                <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-foreground text-base text-background">
                  {item.quantity}
                </span>
                <span className="pt-1">{item.product_name}{item.addons.length > 0 && <small className="mt-1 block text-sm font-medium text-muted-foreground">+ {item.addons.map((addon) => addon.addon_name).join(", ")}</small>}</span>
              </div>
              {item.notes && (
                <p className="ml-11 mt-2 rounded-lg bg-amber-50 p-2 text-sm font-semibold leading-5 text-amber-900">
                  Obs.: {item.notes}
                </p>
              )}
            </div>
          ))}
        </div>

        {order.notes && (
          <div className="rounded-xl border border-orange-200 bg-orange-50 p-3 text-sm leading-5 text-orange-950">
            <strong>Observação geral:</strong> {order.notes}
          </div>
        )}
      </CardContent>

      <CardFooter className="grid grid-cols-[auto_1fr] gap-3 bg-muted/45 py-4">
        <Button
          type="button"
          variant="outline"
          size="lg"
          aria-label={`Imprimir pedido ${order.order_number}`}
          onClick={() => window.open(`/print/cozinha/${order.id}`, "_blank", "noopener,noreferrer")}
        >
          <Printer aria-hidden="true" />
        </Button>
        {nextStatus ? (
          <Button
            type="button"
            size="lg"
            className={cn(
              "text-base font-bold",
              nextStatus === "READY" && "bg-emerald-600 hover:bg-emerald-700",
            )}
            onClick={() => onStatusChange(order.id, nextStatus)}
            disabled={isUpdating}
          >
            {isUpdating ? (
              <LoaderCircle className="animate-spin" aria-hidden="true" />
            ) : (
              <Flame aria-hidden="true" />
            )}
            {nextStatus === "PREPARING" ? "Iniciar preparo" : "Marcar como pronto"}
          </Button>
        ) : (
          <div className="flex items-center justify-center rounded-lg bg-emerald-100 px-4 text-sm font-bold text-emerald-800">
            Aguardando retirada ou entrega
          </div>
        )}
      </CardFooter>
    </Card>
  );
}
