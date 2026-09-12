import { NextResponse } from "next/server";
import { z } from "zod";

import { getPaymentFromOrder, mapPaymentStatus, mercadoPagoRequest } from "@/lib/mercado-pago";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import { getActiveMercadoPagoServerSettings } from "@/lib/mercado-pago-settings";

const requestSchema = z.object({
  order_id: z.uuid(),
  access_token: z.uuid(),
  payment_data: z.record(z.string(), z.unknown()).optional(),
});

export async function POST(request: Request) {
  try {
    const input = requestSchema.parse(await request.json());
    const supabase = createSupabaseServiceClient();
    const mercadoPago = await getActiveMercadoPagoServerSettings();
    const { data: order, error } = await supabase.from("orders").select("id,order_number,total,payment_method,payment_status,customer_email,customer_name,provider_order_id").eq("id", input.order_id).eq("access_token", input.access_token).single();
    if (error || !order) return NextResponse.json({ error: "Pedido não encontrado." }, { status: 404 });
    if (order.payment_method === "CASH") return NextResponse.json({ error: "Este pedido não usa pagamento online." }, { status: 400 });
    if (order.provider_order_id) return NextResponse.json({ error: "O pagamento deste pedido já foi iniciado." }, { status: 409 });

    const paymentData = input.payment_data ?? {};
    const amount = Number(order.total).toFixed(2);
    const isPix = order.payment_method === "PIX";
    const payerData = paymentData.payer as { email?: string; identification?: unknown } | undefined;
    const paymentMethod = isPix
      ? { id: "pix", type: "bank_transfer" }
      : {
          id: String(paymentData.payment_method_id ?? ""),
          type: String(paymentData.payment_type_id ?? "credit_card"),
          token: String(paymentData.token ?? ""),
          installments: Number(paymentData.installments ?? 1),
        };
    if (!isPix && (!paymentMethod.id || !paymentMethod.token)) return NextResponse.json({ error: "Dados do cartão incompletos." }, { status: 400 });

    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? new URL(request.url).origin;
    const mpOrder = await mercadoPagoRequest("/v1/orders", mercadoPago.access_token, {
      method: "POST",
      headers: { "X-Idempotency-Key": order.id },
      body: JSON.stringify({
        type: "online",
        total_amount: amount,
        external_reference: order.id,
        processing_mode: "automatic",
        notification_url: `${appUrl}/api/mercado-pago/webhook`,
        transactions: { payments: [{ amount, payment_method: paymentMethod }] },
        payer: { email: payerData?.email || order.customer_email, identification: payerData?.identification, first_name: order.customer_name },
      }),
    });
    const payment = getPaymentFromOrder(mpOrder);
    const providerStatus = String(payment?.status ?? mpOrder.status ?? "pending");
    const method = payment?.payment_method;
    const metadata = { qr_code: method?.qr_code, qr_code_base64: method?.qr_code_base64, ticket_url: method?.ticket_url, status_detail: payment?.status_detail };
    const { error: updateError } = await supabase.from("orders").update({ payment_provider: "MERCADO_PAGO", payment_environment: mercadoPago.environment, provider_order_id: String(mpOrder.id), provider_payment_id: payment?.id ? String(payment.id) : null, provider_status: providerStatus, payment_status: mapPaymentStatus(providerStatus), payment_metadata: metadata }).eq("id", order.id);
    if (updateError) throw updateError;
    return NextResponse.json({ status: providerStatus, payment_status: mapPaymentStatus(providerStatus), ...metadata });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Não foi possível processar o pagamento.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
