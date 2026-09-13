"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Ban, Eye, LoaderCircle, Printer, RefreshCw } from "lucide-react";
import { toast } from "sonner";

import { AdminError, AdminLoading } from "@/components/admin/admin-feedback";
import { LiveUpdateStatus } from "@/components/order/live-update-status";
import { OrderStatusBadge } from "@/components/order/order-status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { formatCurrency } from "@/lib/formatters/currency";
import { useOrdersRealtime } from "@/hooks/use-orders-realtime";
import { getAdminOrders, updateAdminOrderStatus } from "@/services/admin-orders";
import { assignDeliveryOrder, getDeliveryPeople } from "@/services/delivery-people";
import type { AdminOrder, AdminOrderFilters } from "@/types/admin";
import type { OrderStatus } from "@/types/order";

const statusOptions: Array<{ value: OrderStatus; label: string }> = [
  { value: "PENDING", label: "Recebido" }, { value: "CONFIRMED", label: "Confirmado" }, { value: "PREPARING", label: "Em preparo" }, { value: "READY", label: "Pronto" }, { value: "OUT_FOR_DELIVERY", label: "Saiu para entrega" }, { value: "DELIVERED", label: "Concluído" }, { value: "CANCELED", label: "Cancelado" },
];

function dateInput(date: Date) {
  const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return localDate.toISOString().slice(0, 10);
}
function initialFilters(): AdminOrderFilters { const now = new Date(); const from = new Date(now); from.setDate(from.getDate() - 30); return { status: "ALL", from: dateInput(from), to: dateInput(now) }; }
function formatDate(value: string) { return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(new Date(value)); }
function address(order: AdminOrder) { return [[order.address_street, order.address_number].filter(Boolean).join(", "), order.address_neighborhood, order.address_complement].filter(Boolean).join(" · "); }

export function OrderManager() {
  const [filters, setFilters] = useState<AdminOrderFilters>(initialFilters);
  const [selected, setSelected] = useState<AdminOrder | null>(null);
  const [newStatus, setNewStatus] = useState<OrderStatus>("PENDING");
  const queryClient = useQueryClient();
  const realtimeStatus = useOrdersRealtime({ queryKey: "admin-orders" });
  const orders = useQuery({ queryKey: ["admin-orders", filters], queryFn: () => getAdminOrders(filters), refetchInterval: 30_000 });
  const deliveryPeople = useQuery({ queryKey: ["delivery-people"], queryFn: getDeliveryPeople });
  const updateMutation = useMutation({ mutationFn: ({ id, status }: { id: string; status: OrderStatus }) => updateAdminOrderStatus(id, status), onSuccess: async () => { toast.success("Status atualizado."); setSelected(null); await queryClient.invalidateQueries({ queryKey: ["admin-orders"] }); }, onError: (error) => toast.error(error.message) });
  const assignMutation = useMutation({ mutationFn: ({ orderId, deliveryId }: { orderId: string; deliveryId: string }) => assignDeliveryOrder(orderId, deliveryId), onSuccess: async (_, variables) => { toast.success("Entrega atribuída."); setSelected((current) => current ? { ...current, delivery_assigned_to: variables.deliveryId } : current); await queryClient.invalidateQueries({ queryKey: ["admin-orders"] }); }, onError: (error) => toast.error(error.message) });

  function view(order: AdminOrder) { setSelected(order); setNewStatus(order.status); }
  if (orders.isPending) return <AdminLoading />;
  if (orders.isError) return <AdminError error={orders.error} retry={() => orders.refetch()} />;

  return (
    <>
      <Card className="mb-6"><CardContent className="pt-6"><div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_1fr_auto]"><div className="space-y-2"><Label htmlFor="order-status">Status</Label><select id="order-status" value={filters.status} onChange={(event) => setFilters((current) => ({ ...current, status: event.target.value as AdminOrderFilters["status"] }))} className="h-8 w-full rounded-lg border bg-transparent px-2.5 text-sm"><option value="ALL">Todos</option>{statusOptions.map((status) => <option key={status.value} value={status.value}>{status.label}</option>)}</select></div><div className="space-y-2"><Label htmlFor="order-from">De</Label><Input id="order-from" type="date" value={filters.from} onChange={(event) => setFilters((current) => ({ ...current, from: event.target.value }))} /></div><div className="space-y-2"><Label htmlFor="order-to">Até</Label><Input id="order-to" type="date" value={filters.to} onChange={(event) => setFilters((current) => ({ ...current, to: event.target.value }))} /></div><Button type="button" variant="outline" className="self-end" onClick={() => orders.refetch()}><RefreshCw className={orders.isFetching ? "animate-spin" : undefined} aria-hidden="true" />Atualizar</Button></div><div className="mt-4 text-xs text-muted-foreground"><LiveUpdateStatus status={realtimeStatus} isFetching={orders.isFetching} /></div></CardContent></Card>

      <div className="overflow-hidden rounded-xl border bg-card"><div className="overflow-x-auto"><table className="w-full min-w-[760px] text-left text-sm"><thead className="border-b bg-muted/50 text-muted-foreground"><tr><th className="px-4 py-3">Pedido</th><th>Cliente</th><th>Tipo</th><th>Status</th><th>Total</th><th>Data</th><th className="px-4 text-right">Ações</th></tr></thead><tbody>{orders.data.map((order) => <tr key={order.id} className="border-b last:border-0"><td className="px-4 py-4 font-bold">#{order.order_number}</td><td><p className="font-medium">{order.customer_name}</p><p className="text-xs text-muted-foreground">{order.customer_phone}</p></td><td>{order.delivery_type === "DELIVERY" ? "Entrega" : "Retirada"}</td><td><OrderStatusBadge status={order.status} /></td><td className="font-bold">{formatCurrency(order.total)}</td><td>{formatDate(order.created_at)}</td><td className="px-4"><div className="flex justify-end gap-2"><Button type="button" size="sm" variant="outline" onClick={() => view(order)}><Eye aria-hidden="true" />Detalhes</Button>{order.status !== "CANCELED" && order.status !== "DELIVERED" && <Button type="button" size="icon-sm" variant="ghost" className="text-destructive" aria-label="Cancelar pedido" onClick={() => confirm(`Cancelar o pedido #${order.order_number}?`) && updateMutation.mutate({ id: order.id, status: "CANCELED" })}><Ban aria-hidden="true" /></Button>}</div></td></tr>)}</tbody></table></div>{!orders.data.length && <p className="py-12 text-center text-muted-foreground">Nenhum pedido encontrado neste período.</p>}</div>

      <Dialog open={Boolean(selected)} onOpenChange={(open) => !open && setSelected(null)}>{selected && <DialogContent className="max-h-[calc(100vh-2rem)] overflow-y-auto sm:max-w-2xl"><DialogHeader><div className="flex items-center justify-between gap-4 pr-8"><DialogTitle className="text-2xl">Pedido #{selected.order_number}</DialogTitle><OrderStatusBadge status={selected.status} /></div></DialogHeader><div className="grid gap-5 sm:grid-cols-2"><div><p className="text-xs font-bold uppercase text-muted-foreground">Cliente</p><p className="mt-1 font-semibold">{selected.customer_name}</p><p className="text-sm">{selected.customer_phone}</p><p className="text-sm">{selected.customer_email}</p></div><div><p className="text-xs font-bold uppercase text-muted-foreground">Recebimento</p><p className="mt-1 font-semibold">{selected.delivery_type === "DELIVERY" ? "Entrega" : "Retirada"}</p>{selected.delivery_type === "DELIVERY" && <p className="mt-1 text-sm leading-5 text-muted-foreground">{address(selected)}{selected.address_reference && <><br />Ref.: {selected.address_reference}</>}</p>}</div></div>{selected.delivery_type === "DELIVERY" && <div className="rounded-xl border bg-muted/30 p-4"><Label htmlFor="delivery-person">Motoboy responsável</Label><div className="mt-2 flex gap-2"><select id="delivery-person" value={selected.delivery_assigned_to ?? ""} onChange={(event) => event.target.value && assignMutation.mutate({ orderId: selected.id, deliveryId: event.target.value })} className="h-9 min-w-0 flex-1 rounded-lg border bg-background px-3 text-sm" disabled={assignMutation.isPending}><option value="">Selecione...</option>{deliveryPeople.data?.filter((person) => person.active).map((person) => <option key={person.id} value={person.id}>{person.name}</option>)}</select>{assignMutation.isPending && <LoaderCircle className="mt-2 size-4 animate-spin" />}</div></div>}<Separator /><div className="space-y-3">{selected.items.map((item) => <div key={item.id} className="flex justify-between gap-4"><div><p className="font-semibold">{item.quantity}× {item.product_name}</p>{item.notes && <p className="text-xs text-muted-foreground">Obs.: {item.notes}</p>}{item.addons.length > 0 && <p className="text-xs text-muted-foreground">{item.addons.map((addon) => addon.addon_name).join(", ")}</p>}</div><span>{formatCurrency(item.total_price)}</span></div>)}</div>{selected.notes && <p className="rounded-xl bg-muted p-3 text-sm"><strong>Observação geral:</strong> {selected.notes}</p>}<Separator /><div className="grid grid-cols-2 gap-2 text-sm"><span className="text-muted-foreground">Pagamento</span><span className="text-right font-medium">{selected.payment_method} · {selected.payment_status}</span><span className="text-muted-foreground">Subtotal</span><span className="text-right">{formatCurrency(selected.subtotal)}</span><span className="text-muted-foreground">Entrega</span><span className="text-right">{formatCurrency(selected.delivery_fee)}</span>{selected.discount_amount > 0 && <><span className="text-emerald-700">Cupom {selected.coupon_code}</span><span className="text-right text-emerald-700">− {formatCurrency(selected.discount_amount)}</span></>}<strong>Total</strong><strong className="text-right text-lg text-primary">{formatCurrency(selected.total)}</strong></div><div className="grid gap-3 sm:grid-cols-2"><select value={newStatus} onChange={(event) => setNewStatus(event.target.value as OrderStatus)} className="h-9 rounded-lg border bg-transparent px-3 text-sm">{statusOptions.map((status) => <option key={status.value} value={status.value}>{status.label}</option>)}</select><Button type="button" onClick={() => updateMutation.mutate({ id: selected.id, status: newStatus })} disabled={newStatus === selected.status || updateMutation.isPending}>{updateMutation.isPending && <LoaderCircle className="animate-spin" />}Atualizar status</Button><Button type="button" variant="outline" onClick={() => window.open(`/print/cozinha/${selected.id}`, "_blank", "noopener,noreferrer")}><Printer aria-hidden="true" />Cozinha</Button>{selected.delivery_type === "DELIVERY" && <Button type="button" variant="outline" onClick={() => window.open(`/print/entrega/${selected.id}`, "_blank", "noopener,noreferrer")}><Printer aria-hidden="true" />Entrega</Button>}</div><DialogFooter><Button type="button" variant="outline" onClick={() => setSelected(null)}>Fechar</Button></DialogFooter></DialogContent>}</Dialog>
    </>
  );
}
