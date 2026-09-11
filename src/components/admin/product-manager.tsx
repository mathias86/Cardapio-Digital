"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { zodResolver } from "@hookform/resolvers/zod";
import { Edit3, LoaderCircle, Plus, Trash2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { AdminError, AdminLoading } from "@/components/admin/admin-feedback";
import { ProductImage } from "@/components/menu/product-image";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { formatCurrency } from "@/lib/formatters/currency";
import { productFormSchema, type ProductFormInput, type ProductFormValues } from "@/lib/validations/admin";
import { deleteAdminProduct, getAdminCategories, getAdminProducts, saveAdminProduct, uploadProductImage } from "@/services/admin";
import type { AdminProduct } from "@/types/admin";

const emptyValues: ProductFormValues = { category_id: "", name: "", description: "", price: 0, stock_quantity: "", low_stock_threshold: "", display_order: 0, active: true, image_url: "" };

export function ProductManager() {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<AdminProduct | null>(null);
  const [uploading, setUploading] = useState(false);
  const queryClient = useQueryClient();
  const products = useQuery({ queryKey: ["admin-products"], queryFn: getAdminProducts });
  const categories = useQuery({ queryKey: ["admin-categories"], queryFn: getAdminCategories });
  const form = useForm<ProductFormInput, unknown, ProductFormValues>({ resolver: zodResolver(productFormSchema), defaultValues: emptyValues });
  const saveMutation = useMutation({ mutationFn: (values: ProductFormValues) => saveAdminProduct(values, editing?.id), onSuccess: async () => { toast.success("Produto salvo."); setOpen(false); await queryClient.invalidateQueries({ queryKey: ["admin-products"] }); }, onError: (error) => toast.error(error.message) });
  const deleteMutation = useMutation({ mutationFn: deleteAdminProduct, onSuccess: async () => { toast.success("Produto removido."); await queryClient.invalidateQueries({ queryKey: ["admin-products"] }); }, onError: (error) => toast.error(error.message) });

  function showForm(product?: AdminProduct) {
    setEditing(product ?? null);
    form.reset(product ? { category_id: product.category_id, name: product.name, description: product.description ?? "", price: product.price, stock_quantity: product.stock_quantity ?? "", low_stock_threshold: product.low_stock_threshold ?? "", display_order: product.display_order, active: product.active, image_url: product.image_url ?? "" } : { ...emptyValues, category_id: categories.data?.[0]?.id ?? "" });
    setOpen(true);
  }

  async function handleImage(file?: File) {
    if (!file) return;
    setUploading(true);
    try { const url = await uploadProductImage(file); form.setValue("image_url", url, { shouldDirty: true }); toast.success("Imagem enviada."); } catch (error) { toast.error(error instanceof Error ? error.message : "Falha no upload."); } finally { setUploading(false); }
  }

  if (products.isPending || categories.isPending) return <AdminLoading />;
  if (products.isError) return <AdminError error={products.error} retry={() => products.refetch()} />;
  if (categories.isError) return <AdminError error={categories.error} retry={() => categories.refetch()} />;
  const categoryNames = new Map(categories.data.map((category) => [category.id, category.name]));

  return (
    <>
      <div className="mb-5 flex justify-end"><Button type="button" onClick={() => showForm()} disabled={!categories.data.length}><Plus aria-hidden="true" />Novo produto</Button></div>
      {!categories.data.length ? <div className="rounded-xl border border-dashed bg-card p-10 text-center text-muted-foreground">Cadastre uma categoria antes do primeiro produto.</div> : <div className="grid gap-4 lg:grid-cols-2">{products.data.map((product) => { const lowStock = product.stock_quantity !== null && product.low_stock_threshold !== null && product.stock_quantity <= product.low_stock_threshold; return <div key={product.id} className="grid grid-cols-[6rem_1fr] overflow-hidden rounded-xl border bg-card shadow-sm"><div className="relative min-h-32 bg-muted"><ProductImage imageUrl={product.image_url} name={product.name} /></div><div className="min-w-0 p-4"><div className="flex items-start justify-between gap-3"><div><p className="truncate font-bold">{product.name}</p><p className="mt-1 text-xs text-muted-foreground">{categoryNames.get(product.category_id)}</p></div><Badge variant={product.active ? "default" : "secondary"}>{product.active ? "Ativo" : "Inativo"}</Badge></div><div className="mt-3 flex items-end justify-between gap-3"><div><p className="font-bold text-primary">{formatCurrency(product.price)}</p><p className={lowStock ? "mt-1 text-xs font-bold text-destructive" : "mt-1 text-xs text-muted-foreground"}>Estoque: {product.stock_quantity ?? "não controlado"}</p></div><div className="flex gap-1"><Button type="button" size="icon-sm" variant="outline" onClick={() => showForm(product)} aria-label="Editar"><Edit3 aria-hidden="true" /></Button><Button type="button" size="icon-sm" variant="ghost" className="text-destructive" onClick={() => confirm(`Remover ${product.name}?`) && deleteMutation.mutate(product.id)} aria-label="Remover"><Trash2 aria-hidden="true" /></Button></div></div></div></div>; })}</div>}

      <Dialog open={open} onOpenChange={setOpen}><DialogContent className="max-h-[calc(100vh-2rem)] overflow-y-auto sm:max-w-2xl"><DialogHeader><DialogTitle>{editing ? "Editar produto" : "Novo produto"}</DialogTitle></DialogHeader><form onSubmit={form.handleSubmit((values) => saveMutation.mutate(values))} className="space-y-4"><div className="grid gap-4 sm:grid-cols-2"><div className="space-y-2"><Label htmlFor="product-name">Nome</Label><Input id="product-name" {...form.register("name")} />{form.formState.errors.name && <p className="text-xs text-destructive">{form.formState.errors.name.message}</p>}</div><div className="space-y-2"><Label htmlFor="product-category">Categoria</Label><select id="product-category" className="h-8 w-full rounded-lg border bg-transparent px-2.5 text-sm" {...form.register("category_id")}>{categories.data.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select></div></div><div className="space-y-2"><Label htmlFor="product-description">Descrição</Label><Textarea id="product-description" {...form.register("description")} /></div><div className="grid gap-4 sm:grid-cols-3"><div className="space-y-2"><Label htmlFor="product-price">Preço</Label><Input id="product-price" type="number" min="0" step="0.01" {...form.register("price", { valueAsNumber: true })} /></div><div className="space-y-2"><Label htmlFor="product-stock">Estoque opcional</Label><Input id="product-stock" type="number" min="0" {...form.register("stock_quantity", { setValueAs: (value) => value === "" ? "" : Number(value) })} /></div><div className="space-y-2"><Label htmlFor="product-threshold">Alerta mínimo</Label><Input id="product-threshold" type="number" min="0" {...form.register("low_stock_threshold", { setValueAs: (value) => value === "" ? "" : Number(value) })} /></div></div><div className="grid gap-4 sm:grid-cols-2"><div className="space-y-2"><Label htmlFor="product-order">Ordem</Label><Input id="product-order" type="number" min="0" {...form.register("display_order", { valueAsNumber: true })} /></div><Label className="mt-6 flex items-center gap-2"><input type="checkbox" className="size-4 accent-primary" {...form.register("active")} />Produto ativo</Label></div><div className="space-y-2"><Label htmlFor="product-image">Imagem do produto</Label><Input id="product-image" type="file" accept="image/jpeg,image/png,image/webp,image/avif" disabled={uploading} onChange={(event) => handleImage(event.target.files?.[0])} /><input type="hidden" {...form.register("image_url")} />{uploading && <p className="flex items-center gap-2 text-xs text-muted-foreground"><LoaderCircle className="size-3 animate-spin" />Enviando imagem...</p>}</div><DialogFooter><Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancelar</Button><Button type="submit" disabled={saveMutation.isPending || uploading}>{saveMutation.isPending && <LoaderCircle className="animate-spin" aria-hidden="true" />}Salvar produto</Button></DialogFooter></form></DialogContent></Dialog>
    </>
  );
}
