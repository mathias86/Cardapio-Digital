"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Edit3, LoaderCircle, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { AdminError, AdminLoading } from "@/components/admin/admin-feedback";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { formatCurrency } from "@/lib/formatters/currency";
import { deleteAdminAddon, deleteAdminAddonGroup, getAdminAddonGroups, getAdminProducts, saveAdminAddon, saveAdminAddonGroup } from "@/services/admin";
import type { AdminAddon, AdminAddonGroup } from "@/types/admin";

type GroupDraft = { id?: string; name: string; description: string; min_selections: number; max_selections: number; active: boolean; display_order: number; product_ids: string[] };
type AddonDraft = { id?: string; group_id: string; name: string; description: string; price: number; active: boolean; display_order: number };
const emptyGroup: GroupDraft = { name: "", description: "", min_selections: 0, max_selections: 1, active: true, display_order: 0, product_ids: [] };
const emptyAddon = (group_id: string): AddonDraft => ({ group_id, name: "", description: "", price: 0, active: true, display_order: 0 });

export function AddonManager() {
  const queryClient = useQueryClient();
  const groups = useQuery({ queryKey: ["admin-addon-groups"], queryFn: getAdminAddonGroups });
  const products = useQuery({ queryKey: ["admin-products"], queryFn: getAdminProducts });
  const [groupDraft, setGroupDraft] = useState<GroupDraft | null>(null);
  const [addonDraft, setAddonDraft] = useState<AddonDraft | null>(null);
  const refresh = () => queryClient.invalidateQueries({ queryKey: ["admin-addon-groups"] });
  const groupSave = useMutation({ mutationFn: saveAdminAddonGroup, onSuccess: async () => { setGroupDraft(null); toast.success("Grupo salvo."); await refresh(); }, onError: (error) => toast.error(error.message) });
  const groupDelete = useMutation({ mutationFn: deleteAdminAddonGroup, onSuccess: async () => { toast.success("Grupo removido."); await refresh(); }, onError: (error) => toast.error(error.message) });
  const addonSave = useMutation({ mutationFn: saveAdminAddon, onSuccess: async () => { setAddonDraft(null); toast.success("Opção salva."); await refresh(); }, onError: (error) => toast.error(error.message) });
  const addonDelete = useMutation({ mutationFn: deleteAdminAddon, onSuccess: async () => { toast.success("Opção removida."); await refresh(); }, onError: (error) => toast.error(error.message) });

  if (groups.isPending || products.isPending) return <AdminLoading />;
  if (groups.isError) return <AdminError error={groups.error} retry={() => groups.refetch()} />;
  if (products.isError) return <AdminError error={products.error} retry={() => products.refetch()} />;

  function editGroup(group?: AdminAddonGroup) {
    setGroupDraft(group ? { id: group.id, name: group.name, description: group.description ?? "", min_selections: group.min_selections, max_selections: group.max_selections, active: group.active, display_order: group.display_order, product_ids: group.product_ids } : { ...emptyGroup });
  }
  function editAddon(groupId: string, addon?: AdminAddon) {
    setAddonDraft(addon ? { id: addon.id, group_id: addon.group_id, name: addon.name, description: addon.description ?? "", price: addon.price, active: addon.active, display_order: addon.display_order } : emptyAddon(groupId));
  }
  function submitGroup() {
    if (!groupDraft || groupDraft.name.trim().length < 2) return toast.error("Informe o nome do grupo.");
    if (groupDraft.min_selections < 0 || groupDraft.max_selections < 1 || groupDraft.min_selections > groupDraft.max_selections) return toast.error("Revise os limites de seleção.");
    groupSave.mutate({ ...groupDraft, description: groupDraft.description || null, addons: [] } as never);
  }
  function submitAddon() {
    if (!addonDraft || addonDraft.name.trim().length < 2) return toast.error("Informe o nome da opção.");
    if (addonDraft.price < 0) return toast.error("O preço não pode ser negativo.");
    addonSave.mutate(addonDraft);
  }

  return <>
    <div className="mb-5 flex justify-end"><Button onClick={() => editGroup()}><Plus />Novo grupo</Button></div>
    <div className="grid gap-5 lg:grid-cols-2">
      {groups.data.map((group) => <Card key={group.id}><CardHeader className="flex-row items-start justify-between gap-3"><div><CardTitle>{group.name}</CardTitle><p className="mt-1 text-xs text-muted-foreground">{group.min_selections > 0 ? `Mínimo ${group.min_selections}` : "Opcional"} · máximo {group.max_selections} · {group.product_ids.length} produto(s)</p></div><Badge variant={group.active ? "default" : "secondary"}>{group.active ? "Ativo" : "Inativo"}</Badge></CardHeader><CardContent className="space-y-3">
        {group.addons.map((addon) => <div key={addon.id} className="flex items-center justify-between gap-3 rounded-lg border p-3"><div><p className="text-sm font-semibold">{addon.name}</p><p className="text-xs text-muted-foreground">{formatCurrency(addon.price)} · {addon.active ? "ativo" : "inativo"}</p></div><div className="flex gap-1"><Button size="icon-sm" variant="outline" onClick={() => editAddon(group.id, addon)} aria-label="Editar opção"><Edit3 /></Button><Button size="icon-sm" variant="ghost" className="text-destructive" onClick={() => confirm(`Remover ${addon.name}?`) && addonDelete.mutate(addon.id)} aria-label="Remover opção"><Trash2 /></Button></div></div>)}
        {!group.addons.length && <p className="rounded-lg bg-muted p-3 text-sm text-muted-foreground">Nenhuma opção cadastrada.</p>}
        <div className="flex flex-wrap gap-2 pt-2"><Button size="sm" variant="outline" onClick={() => editAddon(group.id)}><Plus />Adicionar opção</Button><Button size="sm" variant="outline" onClick={() => editGroup(group)}><Edit3 />Editar grupo</Button><Button size="sm" variant="ghost" className="text-destructive" onClick={() => confirm(`Remover o grupo ${group.name} e suas opções?`) && groupDelete.mutate(group.id)}><Trash2 />Remover</Button></div>
      </CardContent></Card>)}
    </div>
    {!groups.data.length && <div className="rounded-xl border border-dashed bg-card p-10 text-center text-muted-foreground">Crie o primeiro grupo, por exemplo “Molhos”.</div>}

    <Dialog open={Boolean(groupDraft)} onOpenChange={(open) => !open && setGroupDraft(null)}><DialogContent className="max-h-[calc(100vh-2rem)] overflow-y-auto sm:max-w-2xl"><DialogHeader><DialogTitle>{groupDraft?.id ? "Editar grupo" : "Novo grupo"}</DialogTitle></DialogHeader>{groupDraft && <div className="space-y-4"><div className="space-y-2"><Label>Nome</Label><Input value={groupDraft.name} onChange={(e) => setGroupDraft({ ...groupDraft, name: e.target.value })} placeholder="Ex.: Molhos" /></div><div className="space-y-2"><Label>Descrição</Label><Textarea value={groupDraft.description} onChange={(e) => setGroupDraft({ ...groupDraft, description: e.target.value })} /></div><div className="grid gap-4 sm:grid-cols-3"><div className="space-y-2"><Label>Mínimo</Label><Input type="number" min="0" value={groupDraft.min_selections} onChange={(e) => setGroupDraft({ ...groupDraft, min_selections: Number(e.target.value) })} /></div><div className="space-y-2"><Label>Máximo</Label><Input type="number" min="1" value={groupDraft.max_selections} onChange={(e) => setGroupDraft({ ...groupDraft, max_selections: Number(e.target.value) })} /></div><div className="space-y-2"><Label>Ordem</Label><Input type="number" min="0" value={groupDraft.display_order} onChange={(e) => setGroupDraft({ ...groupDraft, display_order: Number(e.target.value) })} /></div></div><Label className="flex items-center gap-2"><input type="checkbox" checked={groupDraft.active} onChange={(e) => setGroupDraft({ ...groupDraft, active: e.target.checked })} className="size-4 accent-primary" />Grupo ativo</Label><div className="space-y-2"><Label>Exibir nos produtos</Label><div className="grid max-h-52 gap-2 overflow-y-auto rounded-xl border p-3 sm:grid-cols-2">{products.data.map((product) => <Label key={product.id} className="flex items-center gap-2 rounded-lg p-2 hover:bg-muted"><input type="checkbox" checked={groupDraft.product_ids.includes(product.id)} onChange={(e) => setGroupDraft({ ...groupDraft, product_ids: e.target.checked ? [...groupDraft.product_ids, product.id] : groupDraft.product_ids.filter((id) => id !== product.id) })} className="size-4 accent-primary" />{product.name}</Label>)}</div></div></div>}<DialogFooter><Button variant="outline" onClick={() => setGroupDraft(null)}>Cancelar</Button><Button onClick={submitGroup} disabled={groupSave.isPending}>{groupSave.isPending && <LoaderCircle className="animate-spin" />}Salvar grupo</Button></DialogFooter></DialogContent></Dialog>

    <Dialog open={Boolean(addonDraft)} onOpenChange={(open) => !open && setAddonDraft(null)}><DialogContent><DialogHeader><DialogTitle>{addonDraft?.id ? "Editar opção" : "Nova opção"}</DialogTitle></DialogHeader>{addonDraft && <div className="space-y-4"><div className="space-y-2"><Label>Nome</Label><Input value={addonDraft.name} onChange={(e) => setAddonDraft({ ...addonDraft, name: e.target.value })} placeholder="Ex.: Maionese verde" /></div><div className="space-y-2"><Label>Descrição</Label><Textarea value={addonDraft.description} onChange={(e) => setAddonDraft({ ...addonDraft, description: e.target.value })} /></div><div className="grid grid-cols-2 gap-4"><div className="space-y-2"><Label>Preço</Label><Input type="number" min="0" step="0.01" value={addonDraft.price} onChange={(e) => setAddonDraft({ ...addonDraft, price: Number(e.target.value) })} /></div><div className="space-y-2"><Label>Ordem</Label><Input type="number" min="0" value={addonDraft.display_order} onChange={(e) => setAddonDraft({ ...addonDraft, display_order: Number(e.target.value) })} /></div></div><Label className="flex items-center gap-2"><input type="checkbox" checked={addonDraft.active} onChange={(e) => setAddonDraft({ ...addonDraft, active: e.target.checked })} className="size-4 accent-primary" />Opção ativa</Label></div>}<DialogFooter><Button variant="outline" onClick={() => setAddonDraft(null)}>Cancelar</Button><Button onClick={submitAddon} disabled={addonSave.isPending}>{addonSave.isPending && <LoaderCircle className="animate-spin" />}Salvar opção</Button></DialogFooter></DialogContent></Dialog>
  </>;
}
