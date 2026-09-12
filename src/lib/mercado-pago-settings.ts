import "server-only";

import { createSupabaseServiceClient } from "@/lib/supabase/service";
import type { MercadoPagoEnvironment } from "@/types/payment-settings";

export type MercadoPagoServerSettings = { environment: MercadoPagoEnvironment; public_key: string; access_token: string; webhook_secret: string; enabled: boolean };

export async function getActiveMercadoPagoServerSettings(): Promise<MercadoPagoServerSettings> {
  const supabase = createSupabaseServiceClient();
  const { data: store, error: storeError } = await supabase.from("store_settings").select("mercado_pago_environment").eq("id", 1).single();
  if (storeError || !store) throw new Error("Ambiente do Mercado Pago não configurado.");
  const { data, error } = await supabase.from("mercado_pago_settings").select("environment,public_key,access_token,webhook_secret,enabled").eq("environment", store.mercado_pago_environment).single();
  if (error || !data?.enabled || !data.public_key || !data.access_token || !data.webhook_secret) throw new Error("As credenciais ativas do Mercado Pago estão incompletas.");
  return data as MercadoPagoServerSettings;
}

export async function getAllMercadoPagoServerSettings() {
  const { data, error } = await createSupabaseServiceClient().from("mercado_pago_settings").select("environment,public_key,access_token,webhook_secret,enabled");
  if (error) throw error;
  return (data ?? []).filter((item) => item.access_token && item.webhook_secret) as MercadoPagoServerSettings[];
}
