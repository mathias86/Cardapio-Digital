import { jsonResponse } from "../_shared/cors.ts";
import { createAdminClient, getConfiguredMercadoPagoSettings, mapPaymentStatus, mercadoPagoRequest, type MercadoPagoPayment } from "../_shared/payments.ts";

async function hmacHex(secret: string, message: string) {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(message));
  return Array.from(new Uint8Array(signature), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function constantTimeEqual(left: string, right: string) {
  if (left.length !== right.length) return false;
  let result = 0;
  for (let index = 0; index < left.length; index += 1) result |= left.charCodeAt(index) ^ right.charCodeAt(index);
  return result === 0;
}

async function validSignature(request: Request, dataId: string, secret: string) {
  const signature = request.headers.get("x-signature");
  const requestId = request.headers.get("x-request-id");
  if (!signature || !requestId) return false;
  const parts = Object.fromEntries(signature.split(",").map((part) => part.trim().split("=", 2)));
  if (!parts.ts || !parts.v1) return false;
  const expected = await hmacHex(secret, `id:${dataId.toLowerCase()};request-id:${requestId};ts:${parts.ts};`);
  return constantTimeEqual(parts.v1, expected);
}

Deno.serve(async (request) => {
  if (request.method !== "POST") return jsonResponse({ received: false }, 405);

  try {
    const body = await request.json() as { data?: { id?: string | number } };
    const dataId = String(body.data?.id ?? new URL(request.url).searchParams.get("data.id") ?? "");
    if (!dataId) return jsonResponse({ received: false }, 400);
    const settings = await getConfiguredMercadoPagoSettings();
    let matched = null;
    for (const item of settings) {
      if (await validSignature(request, dataId, item.webhook_secret)) {
        matched = item;
        break;
      }
    }
    if (!matched) return jsonResponse({ error: "Assinatura inválida." }, 401);

    const payment = await mercadoPagoRequest(`/v1/payments/${encodeURIComponent(dataId)}`, matched.access_token) as MercadoPagoPayment & Record<string, unknown>;
    const externalReference = String(payment.external_reference ?? "");
    const status = String(payment.status ?? "pending");
    const transaction = payment.point_of_interaction?.transaction_data;
    const update = { payment_environment: matched.environment, provider_status: status, provider_payment_id: payment.id ? String(payment.id) : dataId, payment_status: mapPaymentStatus(status), payment_metadata: { qr_code: transaction?.qr_code, qr_code_base64: transaction?.qr_code_base64, ticket_url: transaction?.ticket_url, status_detail: payment.status_detail } };
    const query = createAdminClient().from("orders").update(update);
    const { error } = externalReference ? await query.eq("id", externalReference) : await query.eq("provider_payment_id", dataId);
    if (error) throw error;
    return jsonResponse({ received: true });
  } catch {
    return jsonResponse({ received: false }, 400);
  }
});
