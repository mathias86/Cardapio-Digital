"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Bike, LoaderCircle, Plus, UserCheck, UserX } from "lucide-react";
import { toast } from "sonner";

import { AdminError, AdminLoading } from "@/components/admin/admin-feedback";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createDeliveryPerson, getDeliveryPeople, setDeliveryPersonActive } from "@/services/delivery-people";

export function DeliveryPeopleManager() {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const queryClient = useQueryClient();
  const people = useQuery({ queryKey: ["delivery-people"], queryFn: getDeliveryPeople });
  const create = useMutation({ mutationFn: createDeliveryPerson, onSuccess: async () => { toast.success("Motoboy cadastrado."); setOpen(false); setForm({ name: "", email: "", password: "" }); await queryClient.invalidateQueries({ queryKey: ["delivery-people"] }); }, onError: (error) => toast.error(error.message) });
  const toggle = useMutation({ mutationFn: ({ id, active }: { id: string; active: boolean }) => setDeliveryPersonActive(id, active), onSuccess: async () => { toast.success("Cadastro atualizado."); await queryClient.invalidateQueries({ queryKey: ["delivery-people"] }); }, onError: (error) => toast.error(error.message) });

  if (people.isPending) return <AdminLoading />;
  if (people.isError) return <AdminError error={people.error} retry={() => people.refetch()} />;

  return <>
    <div className="mb-6 flex justify-end"><Button onClick={() => setOpen(true)}><Plus />Cadastrar motoboy</Button></div>
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {people.data.map((person) => <Card key={person.id}><CardContent className="flex items-center gap-4 pt-6"><span className="grid size-12 shrink-0 place-items-center rounded-full bg-primary/10 text-primary"><Bike /></span><div className="min-w-0 flex-1"><div className="flex items-center gap-2"><p className="truncate font-bold">{person.name}</p><Badge variant={person.active ? "outline" : "secondary"}>{person.active ? "Ativo" : "Inativo"}</Badge></div><p className="truncate text-sm text-muted-foreground">{person.email}</p></div><Button type="button" size="icon-sm" variant="ghost" disabled={toggle.isPending} onClick={() => toggle.mutate({ id: person.id, active: !person.active })} aria-label={person.active ? "Desativar motoboy" : "Ativar motoboy"}>{person.active ? <UserX /> : <UserCheck />}</Button></CardContent></Card>)}
    </div>
    {!people.data.length && <div className="grid min-h-56 place-items-center rounded-2xl border border-dashed text-center"><div><Bike className="mx-auto size-12 text-muted-foreground" /><p className="mt-3 font-bold">Nenhum motoboy cadastrado</p><p className="mt-1 text-sm text-muted-foreground">Cadastre o primeiro entregador para atribuir pedidos.</p></div></div>}
    <Dialog open={open} onOpenChange={setOpen}><DialogContent><DialogHeader><DialogTitle>Novo motoboy</DialogTitle></DialogHeader><div className="space-y-4"><div className="space-y-2"><Label htmlFor="delivery-name">Nome</Label><Input id="delivery-name" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} /></div><div className="space-y-2"><Label htmlFor="delivery-email">E-mail de acesso</Label><Input id="delivery-email" type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} /></div><div className="space-y-2"><Label htmlFor="delivery-password">Senha inicial</Label><Input id="delivery-password" type="password" value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} autoComplete="new-password" /><p className="text-xs text-muted-foreground">Use pelo menos 8 caracteres. O motoboy poderá entrar imediatamente.</p></div></div><DialogFooter><Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button><Button onClick={() => create.mutate(form)} disabled={create.isPending || form.name.trim().length < 2 || !form.email || form.password.length < 8}>{create.isPending && <LoaderCircle className="animate-spin" />}Cadastrar</Button></DialogFooter></DialogContent></Dialog>
  </>;
}
