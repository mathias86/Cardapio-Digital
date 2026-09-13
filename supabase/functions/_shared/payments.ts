import { createClient } from "npm:@supabase/supabase-js@2";

export type MercadoPagoEnvironment = "TEST" | "PRODUCTION";
export type MercadoPagoSettings = {
  environment: MercadoPagoEnvironment;
  public_key: string;
  access_token: string;
  webhook_secret: string;
  enabled: boolean;
};

export type MercadoPagoPayment = {
  id?: string;
  status?: string;
  status_detail?: string;
  payment_method?: {
    id?: string;
    type?: string;
    qr_code?: string;
    qr_code_base64?: string;
    ticket_url?: string;
  };
  point_of_interaction?: { transaction_data?: { qr_code?: string; qr_code_base64?: string; ticket_url?: string } };
};

export function createAdminClient() {
  const url = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !serviceRoleKey) throw new Error("Configuração interna do Supabase indisponível.");
  return createClient(url, serviceRoleKey, { auth: { autoRefreshToken: false, persistSession: false } });
}

export async function getActiveMercadoPagoSettings(): Promise<MercadoPagoSettings> {
  const supabase = createAdminClient();
  const { data: store, error: storeError } = await supabase.from("store_settings").select("mercado_pago_environment").eq("id", 1).single();
  if (storeError || !store) throw new Error("Ambiente do Mercado Pago não configurado.");
  const { data, error } = await supabase.from("mercado_pago_settings").select("environment,public_key,access_token,webhook_secret,enabled").eq("environment", store.mercado_pago_environment).single();
  if (error || !data?.enabled || !data.public_key || !data.access_token || !data.webhook_secret) throw new Error("As credenciais ativas do Mercado Pago estão incompletas.");
  return data as MercadoPagoSettings;
}

export async function getConfiguredMercadoPagoSettings(): Promise<MercadoPagoSettings[]> {
  const { data, error } = await createAdminClient().from("mercado_pago_settings").select("environment,public_key,access_token,webhook_secret,enabled");
  if (error) throw error;
  return (data ?? []).filter((item) => item.access_token && item.webhook_secret) as MercadoPagoSettings[];
}

export function mapPaymentStatus(status?: string) {
  if (["approved", "processed", "accredited"].includes(status ?? "")) return "PAID";
  if (["rejected", "cancelled", "canceled"].includes(status ?? "")) return "FAILED";
  if (["refunded", "charged_back"].includes(status ?? "")) return "REFUNDED";
  return "PENDING";
}

export async function mercadoPagoRequest(path: string, accessToken: string, init?: RequestInit) {
  const response = await fetch(`https://api.mercadopago.com${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json", ...(init?.headers ?? {}) },
  });
  const data = await response.json() as Record<string, unknown>;
  if (!response.ok) {
    const message = typeof data.message === "string" ? data.message : "Pagamento recusado pelo Mercado Pago.";
    throw new Error(message);
  }
  return data;
}
