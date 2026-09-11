"use client";

import { useState } from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertCircle, CheckCircle2, Navigation, PackageCheck, RefreshCw } from "lucide-react";
import { toast } from "sonner";

import { DeliveryOrderCard } from "@/components/delivery/delivery-order-card";
import { LiveUpdateStatus } from "@/components/order/live-update-status";
import { Button } from "@/components/ui/button";
import { useOrdersRealtime } from "@/hooks/use-orders-realtime";
import { getDeliveryOrders, updateDeliveryOrderStatus } from "@/services/delivery";
import type { DeliveryOrderStatus } from "@/types/delivery";

type DeliveryFilter = DeliveryOrderStatus;

const filterConfig = [
  { value: "READY", label: "Disponíveis", icon: PackageCheck },
  { value: "OUT_FOR_DELIVERY", label: "Em rota", icon: Navigation },
  { value: "DELIVERED", label: "Concluídas", icon: CheckCircle2 },
] as const;

export function DeliveryDashboard() {
  const [filter, setFilter] = useState<DeliveryFilter>("READY");
  const queryClient = useQueryClient();
  const realtimeStatus = useOrdersRealtime({ queryKey: "delivery-orders" });
  const ordersQuery = useQuery({
    queryKey: ["delivery-orders"],
    queryFn: getDeliveryOrders,
    refetchInterval: 30_000,
  });
  const statusMutation = useMutation({
    mutationFn: ({
      orderId,
      status,
    }: {
      orderId: string;
      status: Extract<DeliveryOrderStatus, "OUT_FOR_DELIVERY" | "DELIVERED">;
    }) => updateDeliveryOrderStatus(orderId, status),
    onSuccess: async (_, variables) => {
      toast.success(
        variables.status === "OUT_FOR_DELIVERY"
          ? "Entrega assumida. Boa rota!"
          : "Entrega concluída.",
      );
      setFilter(variables.status);
      await queryClient.invalidateQueries({ queryKey: ["delivery-orders"] });
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Não foi possível atualizar a entrega.");
    },
  });

  if (ordersQuery.isPending) {
    return <div className="mx-auto min-h-[32rem] max-w-2xl animate-pulse rounded-2xl border bg-card" aria-label="Carregando entregas" />;
  }

  if (ordersQuery.isError) {
    const requiresLogin =
      ordersQuery.error instanceof Error &&
      ordersQuery.error.message.includes("usuário");

    return (
      <div className="mx-auto max-w-xl rounded-2xl border border-destructive/20 bg-card p-8 text-center shadow-sm">
        <span className="mx-auto grid size-12 place-items-center rounded-full bg-destructive/10 text-destructive"><AlertCircle aria-hidden="true" /></span>
        <h2 className="mt-5 text-xl font-bold">Não foi possível carregar as entregas</h2>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          {ordersQuery.error instanceof Error ? ordersQuery.error.message : "Tente novamente em alguns instantes."}
        </p>
        <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
          {requiresLogin && <Button render={<Link href="/login" />}>Ir para o login</Button>}
          <Button type="button" variant="outline" onClick={() => ordersQuery.refetch()}><RefreshCw aria-hidden="true" />Tentar novamente</Button>
        </div>
      </div>
    );
  }

  const available = ordersQuery.data.orders
    .filter((order) => order.status === "READY")
    .reverse();
  const inRoute = ordersQuery.data.orders.filter(
    (order) =>
      order.status === "OUT_FOR_DELIVERY" &&
      order.delivery_assigned_to === ordersQuery.data.currentUserId,
  );
  const delivered = ordersQuery.data.orders
    .filter(
      (order) =>
        order.status === "DELIVERED" &&
        order.delivery_assigned_to === ordersQuery.data.currentUserId,
    )
    .slice(0, 10);
  const ordersByFilter = {
    READY: available,
    OUT_FOR_DELIVERY: inRoute,
    DELIVERED: delivered,
  };
  const visibleOrders = ordersByFilter[filter];
  const updatingOrderId = statusMutation.isPending
    ? statusMutation.variables?.orderId
    : undefined;

  function handleStatusChange(
    orderId: string,
    status: Extract<DeliveryOrderStatus, "OUT_FOR_DELIVERY" | "DELIVERED">,
  ) {
    statusMutation.mutate({ orderId, status });
  }

  return (
    <>
      <div className="sticky top-16 z-20 -mx-4 mb-6 border-y bg-background/95 px-4 py-3 backdrop-blur md:static md:mx-0 md:rounded-xl md:border">
        <div className="mx-auto grid max-w-2xl grid-cols-3 gap-2">
          {filterConfig.map(({ value, label, icon: Icon }) => {
            const count = ordersByFilter[value].length;
            return (
              <Button
                key={value}
                type="button"
                variant={filter === value ? "default" : "ghost"}
                className="h-auto min-h-14 flex-col gap-1 px-2 text-xs"
                onClick={() => setFilter(value)}
              >
                <span className="flex items-center gap-1.5"><Icon className="size-4" aria-hidden="true" />{count}</span>
                {label}
              </Button>
            );
          })}
        </div>
      </div>

      <div className="mx-auto mb-5 flex w-full max-w-2xl items-center justify-between gap-3 text-xs text-muted-foreground">
        <LiveUpdateStatus status={realtimeStatus} isFetching={ordersQuery.isFetching} />
        <Button type="button" variant="ghost" size="sm" onClick={() => ordersQuery.refetch()} disabled={ordersQuery.isFetching}>
          <RefreshCw className={ordersQuery.isFetching ? "animate-spin" : undefined} aria-hidden="true" />Atualizar
        </Button>
      </div>

      <div className="mx-auto w-full max-w-2xl space-y-5">
        {visibleOrders.length > 0 ? (
          visibleOrders.map((order) => (
            <DeliveryOrderCard
              key={order.id}
              order={order}
              isUpdating={updatingOrderId === order.id}
              onStatusChange={handleStatusChange}
            />
          ))
        ) : (
          <div className="grid min-h-64 place-items-center rounded-2xl border border-dashed bg-card p-8 text-center">
            <div><PackageCheck className="mx-auto size-12 text-muted-foreground" aria-hidden="true" /><h2 className="mt-4 text-xl font-bold">Nada por aqui</h2><p className="mt-2 text-sm text-muted-foreground">{filter === "READY" ? "Nenhuma entrega disponível agora." : filter === "OUT_FOR_DELIVERY" ? "Você não possui entregas em rota." : "Nenhuma entrega concluída recentemente."}</p></div>
          </div>
        )}
      </div>
    </>
  );
}
