import { createHmac, timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";

import { getPaymentFromOrder, mapPaymentStatus, mercadoPagoRequest } from "@/lib/mercado-pago";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import { getAllMercadoPagoServerSettings } from "@/lib/mercado-pago-settings";

function validSignature(request: Request, dataId: string, secret: string) {
  const signature = request.headers.get("x-signature");
  const requestId = request.headers.get("x-request-id");
  if (!signature || !requestId) return false;
  const parts = Object.fromEntries(signature.split(",").map((part) => part.trim().split("=")));
  if (!parts.ts || !parts.v1) return false;
  const expected = createHmac("sha256", secret).update(`id:${dataId};request-id:${requestId};ts:${parts.ts};`).digest("hex");
  const received = Buffer.from(parts.v1);
  const calculated = Buffer.from(expected);
  return received.length === calculated.length && timingSafeEqual(received, calculated);
}

export async function POST(request: Request) {
  try {
    const body = await request.json() as { data?: { id?: string | number }; type?: string };
    const dataId = String(body.data?.id ?? "");
    const settings = await getAllMercadoPagoServerSettings();
    const matched = settings.find((item) => validSignature(request, dataId, item.webhook_secret));
    if (!dataId || !matched) return NextResponse.json({ error: "Assinatura inválida." }, { status: 401 });
    const mpOrder = await mercadoPagoRequest(`/v1/orders/${encodeURIComponent(dataId)}`, matched.access_token);
    const externalReference = String(mpOrder.external_reference ?? "");
    const payment = getPaymentFromOrder(mpOrder);
    const status = String(payment?.status ?? mpOrder.status ?? "pending");
    const method = payment?.payment_method;
    const supabase = createSupabaseServiceClient();
    const update = { payment_environment: matched.environment, provider_status: status, provider_payment_id: payment?.id ? String(payment.id) : null, payment_status: mapPaymentStatus(status), payment_metadata: { qr_code: method?.qr_code, qr_code_base64: method?.qr_code_base64, ticket_url: method?.ticket_url, status_detail: payment?.status_detail } };
    const query = supabase.from("orders").update(update);
    const { error } = externalReference ? await query.eq("id", externalReference) : await query.eq("provider_order_id", dataId);
    if (error) throw error;
    return NextResponse.json({ received: true });
  } catch {
    return NextResponse.json({ received: false }, { status: 400 });
  }
}
