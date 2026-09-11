"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { zodResolver } from "@hookform/resolvers/zod";
import { Edit3, LoaderCircle, Plus, Trash2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { AdminError, AdminLoading } from "@/components/admin/admin-feedback";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { categoryFormSchema, type CategoryFormInput, type CategoryFormValues } from "@/lib/validations/admin";
import { deleteAdminCategory, getAdminCategories, saveAdminCategory } from "@/services/admin";
import type { AdminCategory } from "@/types/admin";

const emptyValues: CategoryFormValues = { name: "", description: "", display_order: 0, active: true };

export function CategoryManager() {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<AdminCategory | null>(null);
  const queryClient = useQueryClient();
  const categories = useQuery({ queryKey: ["admin-categories"], queryFn: getAdminCategories });
  const form = useForm<CategoryFormInput, unknown, CategoryFormValues>({ resolver: zodResolver(categoryFormSchema), defaultValues: emptyValues });
  const saveMutation = useMutation({ mutationFn: (values: CategoryFormValues) => saveAdminCategory(values, editing?.id), onSuccess: async () => { toast.success("Categoria salva."); setOpen(false); await queryClient.invalidateQueries({ queryKey: ["admin-categories"] }); }, onError: (error) => toast.error(error.message) });
  const deleteMutation = useMutation({ mutationFn: deleteAdminCategory, onSuccess: async () => { toast.success("Categoria removida."); await queryClient.invalidateQueries({ queryKey: ["admin-categories"] }); }, onError: (error) => toast.error(error.message) });

  function showForm(category?: AdminCategory) {
    setEditing(category ?? null);
    form.reset(category ? { name: category.name, description: category.description ?? "", display_order: category.display_order, active: category.active } : emptyValues);
    setOpen(true);
  }

  if (categories.isPending) return <AdminLoading />;
  if (categories.isError) return <AdminError error={categories.error} retry={() => categories.refetch()} />;

  return (
    <>
      <div className="mb-5 flex justify-end"><Button type="button" onClick={() => showForm()}><Plus aria-hidden="true" />Nova categoria</Button></div>
      <div className="overflow-hidden rounded-xl border bg-card"><div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead className="border-b bg-muted/50 text-muted-foreground"><tr><th className="px-4 py-3">Ordem</th><th>Categoria</th><th>Status</th><th className="px-4 text-right">Ações</th></tr></thead><tbody>{categories.data.map((category) => <tr key={category.id} className="border-b last:border-0"><td className="px-4 py-4">{category.display_order}</td><td><p className="font-semibold">{category.name}</p><p className="mt-1 max-w-xl text-xs text-muted-foreground">{category.description || "Sem descrição"}</p></td><td><Badge variant={category.active ? "default" : "secondary"}>{category.active ? "Ativa" : "Inativa"}</Badge></td><td className="px-4"><div className="flex justify-end gap-2"><Button type="button" size="icon-sm" variant="outline" onClick={() => showForm(category)} aria-label="Editar"><Edit3 aria-hidden="true" /></Button><Button type="button" size="icon-sm" variant="ghost" className="text-destructive" onClick={() => confirm(`Remover ${category.name}?`) && deleteMutation.mutate(category.id)} aria-label="Remover"><Trash2 aria-hidden="true" /></Button></div></td></tr>)}</tbody></table></div></div>
      <Dialog open={open} onOpenChange={setOpen}><DialogContent className="sm:max-w-lg"><DialogHeader><DialogTitle>{editing ? "Editar categoria" : "Nova categoria"}</DialogTitle></DialogHeader><form onSubmit={form.handleSubmit((values) => saveMutation.mutate(values))} className="space-y-4"><div className="space-y-2"><Label htmlFor="category-name">Nome</Label><Input id="category-name" {...form.register("name")} />{form.formState.errors.name && <p className="text-xs text-destructive">{form.formState.errors.name.message}</p>}</div><div className="space-y-2"><Label htmlFor="category-description">Descrição</Label><Textarea id="category-description" {...form.register("description")} /></div><div className="grid grid-cols-2 gap-4"><div className="space-y-2"><Label htmlFor="category-order">Ordem</Label><Input id="category-order" type="number" min="0" {...form.register("display_order", { valueAsNumber: true })} /></div><Label className="mt-6 flex items-center gap-2"><input type="checkbox" className="size-4 accent-primary" {...form.register("active")} />Categoria ativa</Label></div><DialogFooter><Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancelar</Button><Button type="submit" disabled={saveMutation.isPending}>{saveMutation.isPending && <LoaderCircle className="animate-spin" aria-hidden="true" />}Salvar</Button></DialogFooter></form></DialogContent></Dialog>
    </>
  );
}
