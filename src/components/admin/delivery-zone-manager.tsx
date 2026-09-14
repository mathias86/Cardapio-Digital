"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { LoaderCircle, MapPinned, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { AdminError, AdminLoading } from "@/components/admin/admin-feedback";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { deleteDeliveryZone, getDeliveryZones, saveDeliveryZone, type DeliveryZone } from "@/services/delivery-zones";

type Draft = { neighborhood: string; distance_km: number; active: boolean };
const emptyDraft: Draft = { neighborhood: "", distance_km: 1, active: true };

export function DeliveryZoneManager() {
  const queryClient = useQueryClient();
  const zones = useQuery({ queryKey: ["delivery-zones"], queryFn: getDeliveryZones });
  const [editing, setEditing] = useState<DeliveryZone | null>(null);
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const refresh = () => queryClient.invalidateQueries({ queryKey: ["delivery-zones"] });
  const save = useMutation({ mutationFn: () => saveDeliveryZone(draft, editing?.id), onSuccess: async () => { toast.success(editing ? "Bairro atualizado." : "Bairro cadastrado."); setEditing(null); setDraft(emptyDraft); await refresh(); }, onError: (error) => toast.error(error.message) });
  const remove = useMutation({ mutationFn: deleteDeliveryZone, onSuccess: async () => { toast.success("Bairro removido."); await refresh(); }, onError: (error) => toast.error(error.message) });

  if (zones.isPending) return <AdminLoading />;
  if (zones.isError) return <AdminError error={zones.error} retry={() => zones.refetch()} />;

  function edit(zone: DeliveryZone) {
    setEditing(zone);
    setDraft({ neighborhood: zone.neighborhood, distance_km: zone.distance_km, active: zone.active });
  }

  return <Card className="mt-6"><CardHeader><CardTitle className="flex items-center gap-2 text-xl"><MapPinned className="size-5 text-primary" />Bairros e distâncias</CardTitle><p className="text-sm text-muted-foreground">Cadastre a distância da loja até cada bairro. O frete será distância × valor por km.</p></CardHeader><CardContent className="space-y-5"><div className="grid gap-4 rounded-xl border bg-muted/30 p-4 sm:grid-cols-[1fr_10rem_auto_auto]"><div className="space-y-2"><Label htmlFor="zone-neighborhood">Bairro</Label><Input id="zone-neighborhood" value={draft.neighborhood} onChange={(event) => setDraft({ ...draft, neighborhood: event.target.value })} placeholder="Ex.: Centro" /></div><div className="space-y-2"><Label htmlFor="zone-distance">Distância (km)</Label><Input id="zone-distance" type="number" min="0.1" step="0.1" value={draft.distance_km} onChange={(event) => setDraft({ ...draft, distance_km: Number(event.target.value) })} /></div><Label className="mt-7 flex items-center gap-2"><input type="checkbox" className="size-4 accent-primary" checked={draft.active} onChange={(event) => setDraft({ ...draft, active: event.target.checked })} />Ativo</Label><div className="mt-6 flex gap-2"><Button type="button" onClick={() => save.mutate()} disabled={save.isPending || draft.neighborhood.trim().length < 2 || draft.distance_km <= 0}>{save.isPending ? <LoaderCircle className="animate-spin" /> : editing ? <Pencil /> : <Plus />}{editing ? "Atualizar" : "Adicionar"}</Button>{editing && <Button type="button" variant="outline" onClick={() => { setEditing(null); setDraft(emptyDraft); }}>Cancelar</Button>}</div></div>{zones.data.length === 0 ? <p className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">Nenhum bairro cadastrado. Enquanto isso, a taxa fixa continua sendo usada.</p> : <div className="divide-y rounded-xl border">{zones.data.map((zone) => <div key={zone.id} className="flex flex-wrap items-center justify-between gap-3 p-4"><div><p className="font-semibold">{zone.neighborhood}</p><p className="text-sm text-muted-foreground">{zone.distance_km.toLocaleString("pt-BR")} km · {zone.active ? "Ativo" : "Inativo"}</p></div><div className="flex gap-2"><Button type="button" size="icon-sm" variant="outline" onClick={() => edit(zone)} aria-label={`Editar ${zone.neighborhood}`}><Pencil /></Button><Button type="button" size="icon-sm" variant="outline" onClick={() => remove.mutate(zone.id)} disabled={remove.isPending} aria-label={`Excluir ${zone.neighborhood}`}><Trash2 /></Button></div></div>)}</div>}</CardContent></Card>;
}
