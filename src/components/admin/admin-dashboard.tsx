"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, ClipboardList, PackageCheck, ShoppingBag } from "lucide-react";

import { AdminError, AdminLoading } from "@/components/admin/admin-feedback";
import { LiveUpdateStatus } from "@/components/order/live-update-status";
import { OrderStatusBadge } from "@/components/order/order-status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/lib/formatters/currency";
import { useOrdersRealtime } from "@/hooks/use-orders-realtime";
import { getAdminDashboard } from "@/services/admin";

function formatTime(value: string) {
  return new Intl.DateTimeFormat("pt-BR", { hour: "2-digit", minute: "2-digit" }).format(new Date(value));
}

export function AdminDashboard() {
  const realtimeStatus = useOrdersRealtime({ queryKey: "admin-dashboard" });
  const dashboard = useQuery({ queryKey: ["admin-dashboard"], queryFn: getAdminDashboard, refetchInterval: 60_000 });
  if (dashboard.isPending) return <AdminLoading label="Carregando painel" />;
  if (dashboard.isError) return <AdminError error={dashboard.error} retry={() => dashboard.refetch()} />;

  const metrics = [
    { label: "Pedidos hoje", value: String(dashboard.data.ordersToday), icon: ClipboardList },
    { label: "Vendas hoje", value: formatCurrency(dashboard.data.salesToday), icon: ShoppingBag },
    { label: "Produtos ativos", value: String(dashboard.data.activeProducts), icon: PackageCheck },
    { label: "Estoque baixo", value: String(dashboard.data.lowStockProducts), icon: AlertTriangle },
  ];

  return (
    <>
      <div className="mb-4 flex justify-end text-xs text-muted-foreground"><LiveUpdateStatus status={realtimeStatus} isFetching={dashboard.isFetching} fallbackSeconds={60} /></div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {metrics.map(({ label, value, icon: Icon }) => <Card key={label}><CardContent className="flex items-center justify-between pt-6"><div><p className="text-sm text-muted-foreground">{label}</p><p className="mt-2 text-2xl font-bold">{value}</p></div><span className="grid size-11 place-items-center rounded-xl bg-primary/10 text-primary"><Icon aria-hidden="true" /></span></CardContent></Card>)}
      </div>
      <Card className="mt-6">
        <CardHeader className="flex-row items-center justify-between"><CardTitle className="text-xl">Pedidos recentes</CardTitle><Button render={<Link href="/admin/pedidos" />} variant="outline" size="sm">Ver todos</Button></CardHeader>
        <CardContent>
          {dashboard.data.recentOrders.length ? <div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead className="border-b text-muted-foreground"><tr><th className="py-3">Pedido</th><th>Cliente</th><th>Status</th><th>Total</th><th>Horário</th></tr></thead><tbody>{dashboard.data.recentOrders.map((order) => <tr key={order.id} className="border-b last:border-0"><td className="py-4 font-bold">#{order.order_number}</td><td>{order.customer_name}</td><td><OrderStatusBadge status={order.status} /></td><td className="font-medium">{formatCurrency(order.total)}</td><td>{formatTime(order.created_at)}</td></tr>)}</tbody></table></div> : <p className="py-10 text-center text-muted-foreground">Nenhum pedido registrado.</p>}
        </CardContent>
      </Card>
    </>
  );
}
