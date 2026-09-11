"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, Ban, ChartNoAxesCombined, ReceiptText } from "lucide-react";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { AdminError, AdminLoading } from "@/components/admin/admin-feedback";
import { LiveUpdateStatus } from "@/components/order/live-update-status";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatCurrency } from "@/lib/formatters/currency";
import { useOrdersRealtime } from "@/hooks/use-orders-realtime";
import { getAdminReports } from "@/services/reports";

function dateInput(date: Date) {
  const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return localDate.toISOString().slice(0, 10);
}
function initialRange() { const now = new Date(); const from = new Date(now); from.setDate(from.getDate() - 29); return { from: dateInput(from), to: dateInput(now) }; }
function shortDate(value: string) { const [, month, day] = value.split("-"); return `${day}/${month}`; }

export function ReportsDashboard() {
  const [range, setRange] = useState(initialRange);
  const realtimeStatus = useOrdersRealtime({ queryKey: "admin-reports" });
  const reports = useQuery({ queryKey: ["admin-reports", range], queryFn: () => getAdminReports(range.from, range.to), refetchInterval: 60_000 });
  if (reports.isPending) return <AdminLoading label="Carregando relatórios" />;
  if (reports.isError) return <AdminError error={reports.error} retry={() => reports.refetch()} />;

  const totals = reports.data.daily.reduce((result, day) => ({ orders: result.orders + day.orders_count, canceled: result.canceled + day.canceled_count, sales: result.sales + day.total_sales }), { orders: 0, canceled: 0, sales: 0 });
  const averageTicket = totals.orders ? totals.sales / totals.orders : 0;
  const dailyChart = reports.data.daily.map((day) => ({ ...day, label: shortDate(day.sale_date) }));
  const alerts = reports.data.suggestions.filter((item) => item.purchase_alert).length;
  const metrics = [
    { label: "Pedidos concluídos", value: String(totals.orders), icon: ReceiptText },
    { label: "Vendas", value: formatCurrency(totals.sales), icon: ChartNoAxesCombined },
    { label: "Ticket médio", value: formatCurrency(averageTicket), icon: ReceiptText },
    { label: "Cancelados", value: String(totals.canceled), icon: Ban },
  ];

  return (
    <>
      <Card className="mb-6"><CardContent className="flex flex-wrap items-end gap-4 pt-6"><div className="space-y-2"><Label htmlFor="report-from">Data inicial</Label><Input id="report-from" type="date" value={range.from} onChange={(event) => setRange((current) => ({ ...current, from: event.target.value }))} /></div><div className="space-y-2"><Label htmlFor="report-to">Data final</Label><Input id="report-to" type="date" value={range.to} onChange={(event) => setRange((current) => ({ ...current, to: event.target.value }))} /></div><div className="pb-1 text-xs text-muted-foreground"><p>Os gráficos consideram apenas pedidos entregues.</p><div className="mt-2"><LiveUpdateStatus status={realtimeStatus} isFetching={reports.isFetching} fallbackSeconds={60} /></div></div></CardContent></Card>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{metrics.map(({ label, value, icon: Icon }) => <Card key={label}><CardContent className="flex items-center justify-between pt-6"><div><p className="text-sm text-muted-foreground">{label}</p><p className="mt-2 text-2xl font-bold">{value}</p></div><span className="grid size-11 place-items-center rounded-xl bg-primary/10 text-primary"><Icon aria-hidden="true" /></span></CardContent></Card>)}</div>

      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        <Card><CardHeader><CardTitle className="text-xl">Vendas por dia</CardTitle></CardHeader><CardContent><div className="h-72"><ResponsiveContainer width="100%" height="100%"><AreaChart data={dailyChart}><defs><linearGradient id="sales-fill" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="var(--color-primary)" stopOpacity={0.35} /><stop offset="95%" stopColor="var(--color-primary)" stopOpacity={0} /></linearGradient></defs><CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey="label" fontSize={12} /><YAxis fontSize={12} /><Tooltip /><Area type="monotone" dataKey="total_sales" name="Vendas" stroke="var(--color-primary)" fill="url(#sales-fill)" strokeWidth={3} /></AreaChart></ResponsiveContainer></div></CardContent></Card>
        <Card><CardHeader><CardTitle className="text-xl">Vendas por categoria</CardTitle></CardHeader><CardContent><div className="h-72"><ResponsiveContainer width="100%" height="100%"><BarChart data={reports.data.categories} layout="vertical" margin={{ left: 16 }}><CartesianGrid strokeDasharray="3 3" horizontal={false} /><XAxis type="number" fontSize={12} /><YAxis type="category" dataKey="name" width={100} fontSize={12} /><Tooltip /><Bar dataKey="revenue" name="Receita" fill="var(--color-primary)" radius={[0, 6, 6, 0]} /></BarChart></ResponsiveContainer></div></CardContent></Card>
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        <Card><CardHeader><CardTitle className="text-xl">Produtos mais vendidos</CardTitle></CardHeader><CardContent><div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead className="border-b text-muted-foreground"><tr><th className="py-3">Produto</th><th>Qtd.</th><th className="text-right">Receita</th></tr></thead><tbody>{reports.data.topProducts.map((item) => <tr key={item.name} className="border-b last:border-0"><td className="py-3 font-medium">{item.name}</td><td>{item.quantity}</td><td className="text-right font-medium">{formatCurrency(item.revenue)}</td></tr>)}</tbody></table>{!reports.data.topProducts.length && <p className="py-8 text-center text-muted-foreground">Sem vendas no período.</p>}</div></CardContent></Card>
        <Card><CardHeader className="flex-row items-center justify-between"><CardTitle className="text-xl">Sugestões de compra</CardTitle>{alerts > 0 && <Badge variant="destructive"><AlertTriangle aria-hidden="true" />{alerts} alertas</Badge>}</CardHeader><CardContent><div className="max-h-96 overflow-auto"><table className="w-full text-left text-sm"><thead className="sticky top-0 border-b bg-card text-muted-foreground"><tr><th className="py-3">Produto</th><th>Estoque</th><th>7 dias</th><th>Status</th></tr></thead><tbody>{reports.data.suggestions.map((item) => <tr key={item.product_id} className="border-b last:border-0"><td className="py-3"><p className="font-medium">{item.product_name}</p><p className="text-xs text-muted-foreground">{item.category_name}</p></td><td>{item.stock_quantity ?? "—"}</td><td>{item.sold_last_7_days}</td><td>{item.purchase_alert ? <Badge variant="destructive">Comprar</Badge> : item.low_stock ? <Badge variant="secondary">Baixo</Badge> : <Badge variant="outline">Ok</Badge>}</td></tr>)}</tbody></table></div></CardContent></Card>
      </div>

      <Card className="mt-6"><CardHeader><CardTitle className="text-xl">Itens vendidos por dia</CardTitle></CardHeader><CardContent><div className="max-h-[32rem] overflow-auto"><table className="w-full min-w-[640px] text-left text-sm"><thead className="sticky top-0 border-b bg-card text-muted-foreground"><tr><th className="py-3">Data</th><th>Produto</th><th>Categoria</th><th>Quantidade</th><th className="text-right">Receita</th></tr></thead><tbody>{reports.data.itemsByDay.map((item, index) => <tr key={`${item.sale_date}-${item.product_id}-${index}`} className="border-b last:border-0"><td className="py-3">{shortDate(item.sale_date)}</td><td className="font-medium">{item.product_name}</td><td>{item.category_name ?? "—"}</td><td>{item.quantity_sold}</td><td className="text-right">{formatCurrency(item.revenue)}</td></tr>)}</tbody></table></div></CardContent></Card>
    </>
  );
}
