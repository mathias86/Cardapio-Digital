"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, Copy, Eye, EyeOff, KeyRound, LoaderCircle, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

import { AdminError, AdminLoading } from "@/components/admin/admin-feedback";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getMercadoPagoAdminSettings, saveMercadoPagoSettings } from "@/services/payment-settings";
import type { MercadoPagoAdminSettings, MercadoPagoEnvironment } from "@/types/payment-settings";

type Draft = { publicKey: string; accessToken: string; webhookSecret: string; enabled: boolean; activate: boolean };

function EnvironmentForm({ settings, webhookUrl }: { settings: MercadoPagoAdminSettings; webhookUrl: string }) {
  const queryClient = useQueryClient();
  const [showSecrets, setShowSecrets] = useState(false);
  const [draft, setDraft] = useState<Draft>({ publicKey: settings.public_key ?? "", accessToken: "", webhookSecret: "", enabled: settings.enabled, activate: settings.active });
  const save = useMutation({
    mutationFn: () => saveMercadoPagoSettings({ environment: settings.environment, ...draft }),
    onSuccess: async () => { setDraft((current) => ({ ...current, accessToken: "", webhookSecret: "" })); toast.success(`${settings.environment === "TEST" ? "Teste" : "Produção"} salvo.`); await queryClient.invalidateQueries({ queryKey: ["mercado-pago-settings"] }); },
    onError: (error) => toast.error(error.message),
  });
  const ready = Boolean(draft.publicKey && (draft.accessToken || settings.access_token_configured) && (draft.webhookSecret || settings.webhook_secret_configured));
  const label = settings.environment === "TEST" ? "Ambiente de teste" : "Ambiente de produção";

  return <Card className={settings.active ? "border-primary shadow-md" : ""}>
    <CardHeader className="flex-row items-start justify-between gap-3"><div><CardTitle>{label}</CardTitle><p className="mt-1 text-sm text-muted-foreground">{settings.environment === "TEST" ? "Use para homologação sem misturar as credenciais reais." : "Ative somente após concluir os testes."}</p></div><div className="flex gap-2">{settings.active && <Badge>Em uso</Badge>}<Badge variant={ready ? "outline" : "secondary"}>{ready ? "Credenciais completas" : "Incompleto"}</Badge></div></CardHeader>
    <CardContent className="space-y-5">
      <div className="space-y-2"><Label htmlFor={`public-${settings.environment}`}>Public Key</Label><Input id={`public-${settings.environment}`} value={draft.publicKey} onChange={(event) => setDraft({ ...draft, publicKey: event.target.value })} placeholder="APP_USR-..." autoComplete="off" /></div>
      <div className="space-y-2"><Label htmlFor={`token-${settings.environment}`}>Access Token</Label><div className="flex gap-2"><Input id={`token-${settings.environment}`} type={showSecrets ? "text" : "password"} value={draft.accessToken} onChange={(event) => setDraft({ ...draft, accessToken: event.target.value })} placeholder={settings.access_token_configured ? "Configurado — deixe vazio para manter" : "APP_USR-..."} autoComplete="new-password" /><Button type="button" size="icon" variant="outline" onClick={() => setShowSecrets(!showSecrets)} aria-label={showSecrets ? "Ocultar segredos" : "Mostrar segredos"}>{showSecrets ? <EyeOff /> : <Eye />}</Button></div></div>
      <div className="space-y-2"><Label htmlFor={`webhook-${settings.environment}`}>Assinatura secreta do webhook</Label><Input id={`webhook-${settings.environment}`} type={showSecrets ? "text" : "password"} value={draft.webhookSecret} onChange={(event) => setDraft({ ...draft, webhookSecret: event.target.value })} placeholder={settings.webhook_secret_configured ? "Configurada — deixe vazio para manter" : "Cole após salvar no Mercado Pago"} autoComplete="new-password" /></div>
      <div className="rounded-xl border bg-muted/50 p-3"><p className="text-xs font-bold uppercase text-muted-foreground">URL do webhook</p><div className="mt-2 flex items-center gap-2"><code className="min-w-0 flex-1 break-all text-xs">{webhookUrl}</code><Button type="button" size="icon-sm" variant="outline" onClick={() => navigator.clipboard.writeText(webhookUrl).then(() => toast.success("URL copiada."))} aria-label="Copiar URL"><Copy /></Button></div></div>
      <div className="grid gap-3 sm:grid-cols-2"><Label className="flex cursor-pointer items-center gap-2 rounded-xl border p-3"><input type="checkbox" className="size-4 accent-primary" checked={draft.enabled} onChange={(event) => setDraft({ ...draft, enabled: event.target.checked })} />Aceitar pagamentos</Label><Label className="flex cursor-pointer items-center gap-2 rounded-xl border p-3"><input type="checkbox" className="size-4 accent-primary" checked={draft.activate} onChange={(event) => setDraft({ ...draft, activate: event.target.checked })} />Usar este ambiente</Label></div>
      <Button className="w-full" onClick={() => save.mutate()} disabled={save.isPending || !draft.publicKey}>{save.isPending ? <LoaderCircle className="animate-spin" /> : <ShieldCheck />}Salvar com segurança</Button>
    </CardContent>
  </Card>;
}

export function PaymentSettingsManager({ webhookUrl }: { webhookUrl: string }) {
  const settings = useQuery({ queryKey: ["mercado-pago-settings"], queryFn: getMercadoPagoAdminSettings });
  if (settings.isPending) return <AdminLoading />;
  if (settings.isError) return <AdminError error={settings.error} retry={() => settings.refetch()} />;
  const byEnvironment = new Map<MercadoPagoEnvironment, MercadoPagoAdminSettings>(settings.data.map((item) => [item.environment, item]));
  return <><div className="mb-6 grid gap-3 rounded-2xl border bg-emerald-50 p-5 text-emerald-950 sm:grid-cols-[auto_1fr]"><CheckCircle2 className="size-6" /><div><p className="font-bold">Troca de credenciais sem novo deploy</p><p className="mt-1 text-sm leading-6">Salve Teste e Produção separadamente. Os campos secretos nunca voltam preenchidos; deixar vazio mantém o valor já armazenado.</p></div></div><div className="grid gap-6 xl:grid-cols-2">{(["TEST", "PRODUCTION"] as const).map((environment) => { const item = byEnvironment.get(environment); return item ? <EnvironmentForm key={`${environment}-${item.updated_at}`} settings={item} webhookUrl={webhookUrl} /> : null; })}</div><div className="mt-6 flex items-start gap-3 rounded-xl border p-4 text-sm text-muted-foreground"><KeyRound className="mt-0.5 size-5 shrink-0 text-primary" /><p>Ao trocar o ambiente ativo, novos pedidos passam a usar as credenciais escolhidas. Pedidos já criados mantêm o ambiente original.</p></div></>;
}
