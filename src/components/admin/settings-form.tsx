"use client";

import { useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { zodResolver } from "@hookform/resolvers/zod";
import { LoaderCircle, Save } from "lucide-react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { AdminError, AdminLoading } from "@/components/admin/admin-feedback";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { settingsFormSchema, type SettingsFormInput, type SettingsFormValues } from "@/lib/validations/admin";
import { getAdminSettings, saveAdminSettings } from "@/services/admin";

const defaults: SettingsFormValues = { name: "", logo_url: "", is_open: true, delivery_fee: 0, minimum_order_value: 0, phone: "", whatsapp: "", address: "", pix_key: "", pix_name: "" };

export function SettingsForm() {
  const queryClient = useQueryClient();
  const settings = useQuery({ queryKey: ["admin-settings"], queryFn: getAdminSettings });
  const form = useForm<SettingsFormInput, unknown, SettingsFormValues>({ resolver: zodResolver(settingsFormSchema), defaultValues: defaults });
  useEffect(() => { if (settings.data) form.reset({ ...settings.data, logo_url: settings.data.logo_url ?? "", phone: settings.data.phone ?? "", whatsapp: settings.data.whatsapp ?? "", address: settings.data.address ?? "", pix_key: settings.data.pix_key ?? "", pix_name: settings.data.pix_name ?? "" }); }, [form, settings.data]);
  const mutation = useMutation({ mutationFn: saveAdminSettings, onSuccess: async () => { toast.success("Configurações salvas."); await queryClient.invalidateQueries({ queryKey: ["admin-settings"] }); }, onError: (error) => toast.error(error.message) });
  if (settings.isPending) return <AdminLoading />;
  if (settings.isError) return <AdminError error={settings.error} retry={() => settings.refetch()} />;

  return <form onSubmit={form.handleSubmit((values) => mutation.mutate(values))} className="grid gap-6 xl:grid-cols-[1fr_22rem]"><Card><CardHeader><CardTitle className="text-xl">Dados da loja</CardTitle></CardHeader><CardContent className="grid gap-5 sm:grid-cols-2"><div className="space-y-2 sm:col-span-2"><Label htmlFor="store-name">Nome</Label><Input id="store-name" {...form.register("name")} /></div><div className="space-y-2 sm:col-span-2"><Label htmlFor="logo-url">URL do logo</Label><Input id="logo-url" {...form.register("logo_url")} /></div><div className="space-y-2"><Label htmlFor="phone">Telefone</Label><Input id="phone" {...form.register("phone")} /></div><div className="space-y-2"><Label htmlFor="whatsapp">WhatsApp</Label><Input id="whatsapp" {...form.register("whatsapp")} /></div><div className="space-y-2 sm:col-span-2"><Label htmlFor="address">Endereço</Label><Textarea id="address" {...form.register("address")} /></div><div className="space-y-2"><Label htmlFor="pix-key">Chave Pix</Label><Input id="pix-key" {...form.register("pix_key")} /></div><div className="space-y-2"><Label htmlFor="pix-name">Nome do favorecido</Label><Input id="pix-name" {...form.register("pix_name")} /></div></CardContent></Card><div className="space-y-6"><Card><CardHeader><CardTitle className="text-xl">Operação</CardTitle></CardHeader><CardContent className="space-y-5"><Label className="flex items-center justify-between rounded-xl border p-4"><span><strong className="block">Loja aberta</strong><span className="mt-1 block text-xs font-normal text-muted-foreground">Permitir novos pedidos</span></span><input type="checkbox" className="size-5 accent-primary" {...form.register("is_open")} /></Label><div className="space-y-2"><Label htmlFor="delivery-fee">Taxa de entrega</Label><Input id="delivery-fee" type="number" min="0" step="0.01" {...form.register("delivery_fee", { valueAsNumber: true })} /></div><div className="space-y-2"><Label htmlFor="minimum-order">Pedido mínimo</Label><Input id="minimum-order" type="number" min="0" step="0.01" {...form.register("minimum_order_value", { valueAsNumber: true })} /></div></CardContent></Card><Button type="submit" size="lg" className="w-full" disabled={mutation.isPending}>{mutation.isPending ? <LoaderCircle className="animate-spin" aria-hidden="true" /> : <Save aria-hidden="true" />}Salvar configurações</Button></div></form>;
}
