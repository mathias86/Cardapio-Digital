"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { LoaderCircle, Pencil, Plus, Tags } from "lucide-react";
import { toast } from "sonner";

import { AdminError, AdminLoading } from "@/components/admin/admin-feedback";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { formatCurrency } from "@/lib/formatters/currency";
import { getCoupons, saveCoupon, setCouponActive, type CouponInput } from "@/services/coupons";
import type { AdminCoupon } from "@/types/admin";

const emptyCoupon: CouponInput = { code: "", name: "", description: "", discount_type: "PERCENTAGE", discount_value: 10, minimum_order_value: 0, maximum_discount: null, starts_at: "", ends_at: "", usage_limit: null, active: true };
const dateField = (value: string | null) => value ? new Date(value).toISOString().slice(0, 16) : "";

export function CouponManager() {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<AdminCoupon | null>(null);
  const [form, setForm] = useState<CouponInput>(emptyCoupon);
  const queryClient = useQueryClient();
  const coupons = useQuery({ queryKey: ["coupons"], queryFn: getCoupons });
  const save = useMutation({ mutationFn: () => saveCoupon(form, editing?.id), onSuccess: async () => { toast.success("Cupom salvo."); setOpen(false); await queryClient.invalidateQueries({ queryKey: ["coupons"] }); }, onError: (error) => toast.error(error.message) });
  const toggle = useMutation({ mutationFn: ({ id, active }: { id: string; active: boolean }) => setCouponActive(id, active), onSuccess: async () => queryClient.invalidateQueries({ queryKey: ["coupons"] }), onError: (error) => toast.error(error.message) });
  function createNew() { setEditing(null); setForm(emptyCoupon); setOpen(true); }
  function edit(item: AdminCoupon) { setEditing(item); setForm({ code: item.code, name: item.name, description: item.description ?? "", discount_type: item.discount_type, discount_value: item.discount_value, minimum_order_value: item.minimum_order_value, maximum_discount: item.maximum_discount, starts_at: dateField(item.starts_at), ends_at: dateField(item.ends_at), usage_limit: item.usage_limit, active: item.active }); setOpen(true); }

  if (coupons.isPending) return <AdminLoading />;
  if (coupons.isError) return <AdminError error={coupons.error} retry={() => coupons.refetch()} />;
  return <>
    <div className="mb-6 flex justify-end"><Button onClick={createNew}><Plus />Novo cupom</Button></div>
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{coupons.data.map((coupon) => <Card key={coupon.id} className={!coupon.active ? "opacity-65" : ""}><CardContent className="pt-6"><div className="flex items-start justify-between gap-3"><div><div className="flex items-center gap-2"><Badge>{coupon.code}</Badge><Badge variant={coupon.active ? "outline" : "secondary"}>{coupon.active ? "Ativo" : "Inativo"}</Badge></div><h2 className="mt-3 text-lg font-bold">{coupon.name}</h2></div><Button size="icon-sm" variant="ghost" onClick={() => edit(coupon)} aria-label="Editar cupom"><Pencil /></Button></div><p className="mt-2 line-clamp-2 min-h-10 text-sm text-muted-foreground">{coupon.description || "Sem descrição."}</p><p className="mt-4 text-xl font-bold text-primary">{coupon.discount_type === "PERCENTAGE" ? `${coupon.discount_value}%` : formatCurrency(coupon.discount_value)} de desconto</p><div className="mt-4 flex items-center justify-between border-t pt-4 text-xs text-muted-foreground"><span>{coupon.usage_count}{coupon.usage_limit ? `/${coupon.usage_limit}` : ""} usos</span><Button size="sm" variant="ghost" onClick={() => toggle.mutate({ id: coupon.id, active: !coupon.active })}>{coupon.active ? "Desativar" : "Ativar"}</Button></div></CardContent></Card>)}</div>
    {!coupons.data.length && <div className="grid min-h-56 place-items-center rounded-2xl border border-dashed text-center"><div><Tags className="mx-auto size-12 text-muted-foreground" /><p className="mt-3 font-bold">Nenhum cupom cadastrado</p></div></div>}
    <Dialog open={open} onOpenChange={setOpen}><DialogContent className="max-h-[calc(100vh-2rem)] overflow-y-auto sm:max-w-2xl"><DialogHeader><DialogTitle>{editing ? "Editar cupom" : "Novo cupom"}</DialogTitle></DialogHeader><div className="grid gap-4 sm:grid-cols-2"><div className="space-y-2"><Label htmlFor="coupon-code">Código</Label><Input id="coupon-code" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })} placeholder="BEMVINDO10" /></div><div className="space-y-2"><Label htmlFor="coupon-name">Nome</Label><Input id="coupon-name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div><div className="space-y-2 sm:col-span-2"><Label htmlFor="coupon-description">Descrição</Label><Textarea id="coupon-description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div><div className="space-y-2"><Label>Tipo</Label><select className="h-8 w-full rounded-lg border bg-transparent px-2.5 text-sm" value={form.discount_type} onChange={(e) => setForm({ ...form, discount_type: e.target.value as CouponInput["discount_type"] })}><option value="PERCENTAGE">Porcentagem</option><option value="FIXED">Valor fixo</option></select></div><div className="space-y-2"><Label htmlFor="coupon-value">Valor do desconto</Label><Input id="coupon-value" type="number" min="0.01" step="0.01" value={form.discount_value} onChange={(e) => setForm({ ...form, discount_value: Number(e.target.value) })} /></div><div className="space-y-2"><Label htmlFor="coupon-minimum">Pedido mínimo</Label><Input id="coupon-minimum" type="number" min="0" step="0.01" value={form.minimum_order_value} onChange={(e) => setForm({ ...form, minimum_order_value: Number(e.target.value) })} /></div><div className="space-y-2"><Label htmlFor="coupon-maximum">Desconto máximo</Label><Input id="coupon-maximum" type="number" min="0" step="0.01" value={form.maximum_discount ?? ""} onChange={(e) => setForm({ ...form, maximum_discount: e.target.value ? Number(e.target.value) : null })} disabled={form.discount_type === "FIXED"} /></div><div className="space-y-2"><Label htmlFor="coupon-start">Início opcional</Label><Input id="coupon-start" type="datetime-local" value={form.starts_at} onChange={(e) => setForm({ ...form, starts_at: e.target.value })} /></div><div className="space-y-2"><Label htmlFor="coupon-end">Término opcional</Label><Input id="coupon-end" type="datetime-local" value={form.ends_at} onChange={(e) => setForm({ ...form, ends_at: e.target.value })} /></div><div className="space-y-2"><Label htmlFor="coupon-limit">Limite de usos</Label><Input id="coupon-limit" type="number" min="1" value={form.usage_limit ?? ""} onChange={(e) => setForm({ ...form, usage_limit: e.target.value ? Number(e.target.value) : null })} /></div><Label className="mt-6 flex items-center gap-2"><input type="checkbox" className="size-4 accent-primary" checked={form.active} onChange={(e) => setForm({ ...form, active: e.target.checked })} />Cupom ativo</Label></div><DialogFooter><Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button><Button onClick={() => save.mutate()} disabled={save.isPending || form.code.trim().length < 2 || form.name.trim().length < 2 || form.discount_value <= 0}>{save.isPending && <LoaderCircle className="animate-spin" />}Salvar cupom</Button></DialogFooter></DialogContent></Dialog>
  </>;
}
