import { z } from "zod";

import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { createPublicSupabaseClient } from "@/lib/supabase/public";
import type { MercadoPagoAdminSettings, MercadoPagoEnvironment, MercadoPagoPublicSettings } from "@/types/payment-settings";

const environmentSchema = z.enum(["TEST", "PRODUCTION"]);
const adminSchema = z.object({ environment: environmentSchema, public_key: z.string().nullable(), enabled: z.boolean(), access_token_configured: z.boolean(), webhook_secret_configured: z.boolean(), active: z.boolean(), updated_at: z.string() });
const publicSchema = z.object({ environment: environmentSchema, public_key: z.string().nullable(), enabled: z.boolean() });

export async function getMercadoPagoAdminSettings(): Promise<MercadoPagoAdminSettings[]> {
  const { data, error } = await createSupabaseBrowserClient().rpc("get_mercado_pago_admin_settings");
  if (error) throw new Error(error.message);
  return z.array(adminSchema).parse(data);
}

export async function saveMercadoPagoSettings(input: { environment: MercadoPagoEnvironment; publicKey: string; accessToken?: string; webhookSecret?: string; enabled: boolean; activate: boolean }) {
  const { error } = await createSupabaseBrowserClient().rpc("save_mercado_pago_settings", { p_environment: input.environment, p_public_key: input.publicKey, p_access_token: input.accessToken || null, p_webhook_secret: input.webhookSecret || null, p_enabled: input.enabled, p_activate: input.activate });
  if (error) throw new Error(error.message);
}

export async function getMercadoPagoPublicSettings(): Promise<MercadoPagoPublicSettings | null> {
  const { data, error } = await createPublicSupabaseClient().rpc("get_mercado_pago_public_settings");
  if (error) throw new Error(error.message);
  return publicSchema.nullable().parse(Array.isArray(data) ? data[0] ?? null : data);
}
