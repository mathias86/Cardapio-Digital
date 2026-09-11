"use client";

import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertCircle, ChefHat, Clock3, RefreshCw, UtensilsCrossed } from "lucide-react";
import { toast } from "sonner";

import { KitchenOrderCard } from "@/components/kitchen/kitchen-order-card";
import { LiveUpdateStatus } from "@/components/order/live-update-status";
import { Button } from "@/components/ui/button";
import { useOrdersRealtime } from "@/hooks/use-orders-realtime";
import { getKitchenOrders, updateKitchenOrderStatus } from "@/services/kitchen";
import type { KitchenOrder, KitchenOrderStatus } from "@/types/kitchen";

type KitchenColumnProps = {
  title: string;
  description: string;
  orders: KitchenOrder[];
  emptyMessage: string;
  updatingOrderId?: string;
  onStatusChange: (
    orderId: string,
    status: Extract<KitchenOrderStatus, "PREPARING" | "READY">,
  ) => void;
};

function KitchenColumn({
  title,
  description,
  orders,
  emptyMessage,
  updatingOrderId,
  onStatusChange,
}: KitchenColumnProps) {
  return (
    <section className="min-w-0 space-y-4">
      <div className="flex items-start justify-between gap-4 rounded-xl border bg-card p-4">
        <div>
          <h2 className="text-lg font-bold">{title}</h2>
          <p className="mt-1 text-xs text-muted-foreground">{description}</p>
        </div>
        <span className="grid size-8 shrink-0 place-items-center rounded-full bg-foreground text-sm font-bold text-background">
          {orders.length}
        </span>
      </div>

      {orders.length > 0 ? (
        orders.map((order) => (
          <KitchenOrderCard
            key={order.id}
            order={order}
            isUpdating={updatingOrderId === order.id}
            onStatusChange={onStatusChange}
          />
        ))
      ) : (
        <div className="grid min-h-36 place-items-center rounded-xl border border-dashed bg-card/50 p-6 text-center text-sm text-muted-foreground">
          {emptyMessage}
        </div>
      )}
    </section>
  );
}

export function KitchenDashboard() {
  const queryClient = useQueryClient();
  const realtimeStatus = useOrdersRealtime({
    queryKey: "kitchen-orders",
    onInsert: () => toast.info("Novo pedido recebido na cozinha."),
  });
  const ordersQuery = useQuery({
    queryKey: ["kitchen-orders"],
    queryFn: getKitchenOrders,
    refetchInterval: 30_000,
  });
  const statusMutation = useMutation({
    mutationFn: ({
      orderId,
      status,
    }: {
      orderId: string;
      status: Extract<KitchenOrderStatus, "PREPARING" | "READY">;
    }) => updateKitchenOrderStatus(orderId, status),
    onSuccess: async (_, variables) => {
      toast.success(
        variables.status === "PREPARING"
          ? "Preparo iniciado."
          : "Pedido marcado como pronto.",
      );
      await queryClient.invalidateQueries({ queryKey: ["kitchen-orders"] });
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Não foi possível atualizar o pedido.");
    },
  });

  if (ordersQuery.isPending) {
    return (
      <div className="grid gap-5 xl:grid-cols-3" aria-label="Carregando pedidos da cozinha">
        {[1, 2, 3].map((item) => (
          <div key={item} className="min-h-96 animate-pulse rounded-2xl border bg-card" />
        ))}
      </div>
    );
  }

  if (ordersQuery.isError) {
    const requiresLogin =
      ordersQuery.error instanceof Error &&
      ordersQuery.error.message.includes("ADMIN ou KITCHEN");

    return (
      <div className="mx-auto max-w-xl rounded-2xl border border-destructive/20 bg-card p-8 text-center shadow-sm">
        <span className="mx-auto grid size-12 place-items-center rounded-full bg-destructive/10 text-destructive">
          <AlertCircle aria-hidden="true" />
        </span>
        <h2 className="mt-5 text-xl font-bold">Não foi possível carregar a cozinha</h2>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          {ordersQuery.error instanceof Error
            ? ordersQuery.error.message
            : "Tente novamente em alguns instantes."}
        </p>
        <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
          {requiresLogin && (
            <Button render={<Link href="/login" />}>Ir para o login</Button>
          )}
          <Button type="button" variant="outline" onClick={() => ordersQuery.refetch()}>
            <RefreshCw aria-hidden="true" />
            Tentar novamente
          </Button>
        </div>
      </div>
    );
  }

  const waiting = ordersQuery.data.filter(
    (order) => order.status === "PENDING" || order.status === "CONFIRMED",
  );
  const preparing = ordersQuery.data.filter((order) => order.status === "PREPARING");
  const ready = ordersQuery.data.filter((order) => order.status === "READY");
  const updatingOrderId = statusMutation.isPending
    ? statusMutation.variables?.orderId
    : undefined;

  function handleStatusChange(
    orderId: string,
    status: Extract<KitchenOrderStatus, "PREPARING" | "READY">,
  ) {
    statusMutation.mutate({ orderId, status });
  }

  return (
    <>
      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <div className="flex items-center gap-4 rounded-xl border bg-card p-4 shadow-sm">
          <span className="grid size-11 place-items-center rounded-xl bg-amber-100 text-amber-800"><Clock3 aria-hidden="true" /></span>
          <div><p className="text-2xl font-bold">{waiting.length}</p><p className="text-xs text-muted-foreground">Aguardando início</p></div>
        </div>
        <div className="flex items-center gap-4 rounded-xl border bg-card p-4 shadow-sm">
          <span className="grid size-11 place-items-center rounded-xl bg-orange-100 text-orange-800"><ChefHat aria-hidden="true" /></span>
          <div><p className="text-2xl font-bold">{preparing.length}</p><p className="text-xs text-muted-foreground">Em preparo</p></div>
        </div>
        <div className="flex items-center gap-4 rounded-xl border bg-card p-4 shadow-sm">
          <span className="grid size-11 place-items-center rounded-xl bg-emerald-100 text-emerald-800"><UtensilsCrossed aria-hidden="true" /></span>
          <div><p className="text-2xl font-bold">{ready.length}</p><p className="text-xs text-muted-foreground">Prontos</p></div>
        </div>
      </div>

      <div className="mb-5 flex flex-wrap items-center justify-between gap-3 text-xs text-muted-foreground">
        <LiveUpdateStatus status={realtimeStatus} isFetching={ordersQuery.isFetching} />
        <Button type="button" variant="ghost" size="sm" onClick={() => ordersQuery.refetch()} disabled={ordersQuery.isFetching}>
          <RefreshCw className={ordersQuery.isFetching ? "animate-spin" : undefined} aria-hidden="true" />
          Atualizar agora
        </Button>
      </div>

      {ordersQuery.data.length === 0 ? (
        <div className="grid min-h-72 place-items-center rounded-2xl border border-dashed bg-card p-8 text-center">
          <div><ChefHat className="mx-auto size-12 text-muted-foreground" aria-hidden="true" /><h2 className="mt-4 text-xl font-bold">Cozinha em dia</h2><p className="mt-2 text-sm text-muted-foreground">Nenhum pedido aguardando preparo.</p></div>
        </div>
      ) : (
        <div className="grid items-start gap-5 xl:grid-cols-3">
          <KitchenColumn title="Novos pedidos" description="Recebidos e confirmados" orders={waiting} emptyMessage="Nenhum pedido novo." updatingOrderId={updatingOrderId} onStatusChange={handleStatusChange} />
          <KitchenColumn title="Em preparo" description="Produção em andamento" orders={preparing} emptyMessage="Nenhum pedido em preparo." updatingOrderId={updatingOrderId} onStatusChange={handleStatusChange} />
          <KitchenColumn title="Prontos" description="Aguardando retirada ou entrega" orders={ready} emptyMessage="Nenhum pedido pronto." updatingOrderId={updatingOrderId} onStatusChange={handleStatusChange} />
        </div>
      )}
    </>
  );
}
