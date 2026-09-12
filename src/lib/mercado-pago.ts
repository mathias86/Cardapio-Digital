import "server-only";

export type MercadoPagoPaymentResult = { id: string; status: string; status_detail?: string; payment_method?: { id?: string; type?: string; qr_code?: string; qr_code_base64?: string; ticket_url?: string } };

export function mapPaymentStatus(status?: string) {
  if (["approved", "processed", "accredited"].includes(status ?? "")) return "PAID" as const;
  if (["rejected", "cancelled", "canceled"].includes(status ?? "")) return "FAILED" as const;
  if (["refunded", "charged_back"].includes(status ?? "")) return "REFUNDED" as const;
  return "PENDING" as const;
}

export function getPaymentFromOrder(data: Record<string, unknown>): MercadoPagoPaymentResult | null {
  const transactions = data.transactions as { payments?: MercadoPagoPaymentResult[] } | undefined;
  return transactions?.payments?.[0] ?? null;
}

export async function mercadoPagoRequest(path: string, accessToken: string, init?: RequestInit) {
  const response = await fetch(`https://api.mercadopago.com${path}`, { ...init, headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json", ...(init?.headers ?? {}) }, cache: "no-store" });
  const data = await response.json() as Record<string, unknown>;
  if (!response.ok) {
    const message = typeof data.message === "string" ? data.message : "Pagamento recusado pelo Mercado Pago.";
    throw new Error(message);
  }
  return data;
}
