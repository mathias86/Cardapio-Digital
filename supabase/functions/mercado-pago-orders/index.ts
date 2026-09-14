import { corsHeaders, jsonResponse } from "../_shared/cors.ts";
import { createAdminClient, getActiveMercadoPagoSettings, mapPaymentStatus, mercadoPagoRequest, type MercadoPagoPayment } from "../_shared/payments.ts";

type OrderRequest = {
  order_id?: string;
  access_token?: string;
  attempt_id?: string;
  payment_data?: Record<string, unknown>;
};

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (request.method !== "POST") return jsonResponse({ error: "Método não permitido." }, 405);

  try {
    const input = await request.json() as OrderRequest;
    if (!input.order_id || !input.access_token || !uuidPattern.test(input.order_id) || !uuidPattern.test(input.access_token)) {
      return jsonResponse({ error: "Dados do pedido inválidos." }, 400);
    }

    const supabase = createAdminClient();
    const mercadoPago = await getActiveMercadoPagoSettings();
    const { data: order, error } = await supabase.from("orders").select("id,order_number,total,payment_method,payment_status,customer_email,customer_name,provider_order_id,provider_payment_id").eq("id", input.order_id).eq("access_token", input.access_token).single();
    if (error || !order) return jsonResponse({ error: "Pedido não encontrado." }, 404);
    if (order.payment_method === "CASH") return jsonResponse({ error: "Este pedido não usa pagamento online." }, 400);
    if ((order.provider_order_id || order.provider_payment_id) && order.payment_status !== "FAILED") {
      return jsonResponse({ error: "O pagamento deste pedido já foi iniciado." }, 409);
    }

    const paymentData = input.payment_data ?? {};
    const amount = Number(order.total).toFixed(2);
    const isPix = order.payment_method === "PIX";
    const payerData = paymentData.payer as { email?: string; identification?: unknown } | undefined;
    const paymentMethodId = isPix ? "pix" : String(paymentData.payment_method_id ?? "");
    const cardToken = isPix ? undefined : String(paymentData.token ?? "");
    if (!isPix && (!paymentMethodId || !cardToken)) return jsonResponse({ error: "Dados do cartão incompletos." }, 400);

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const idempotencyKey = input.attempt_id && uuidPattern.test(input.attempt_id) ? input.attempt_id : order.id;
    const mpPayment = await mercadoPagoRequest("/v1/payments", mercadoPago.access_token, {
      method: "POST",
      headers: { "X-Idempotency-Key": idempotencyKey },
      body: JSON.stringify({
        transaction_amount: Number(amount),
        description: `Pedido #${order.order_number}`,
        external_reference: order.id,
        notification_url: `${supabaseUrl}/functions/v1/mercado-pago-webhook`,
        payment_method_id: paymentMethodId,
        ...(isPix ? {} : { token: cardToken, installments: Number(paymentData.installments ?? 1), issuer_id: paymentData.issuer_id ? String(paymentData.issuer_id) : undefined }),
        payer: { email: payerData?.email || order.customer_email, identification: payerData?.identification, first_name: order.customer_name },
      }),
    });
    const payment = mpPayment as MercadoPagoPayment;
    const providerStatus = String(payment.status ?? "pending");
    const transaction = payment.point_of_interaction?.transaction_data;
    const metadata = { qr_code: transaction?.qr_code, qr_code_base64: transaction?.qr_code_base64, ticket_url: transaction?.ticket_url, status_detail: payment.status_detail };
    const { error: updateError } = await supabase.from("orders").update({ payment_provider: "MERCADO_PAGO", payment_environment: mercadoPago.environment, provider_order_id: null, provider_payment_id: payment.id ? String(payment.id) : null, provider_status: providerStatus, payment_status: mapPaymentStatus(providerStatus), payment_metadata: metadata }).eq("id", order.id);
    if (updateError) throw updateError;
    if (mapPaymentStatus(providerStatus) === "FAILED") {
      return jsonResponse({ error: `Pagamento recusado pelo Mercado Pago${payment.status_detail ? ` (${payment.status_detail})` : ""}. Você pode tentar novamente ou trocar a forma de pagamento.`, status: providerStatus, payment_status: "FAILED", ...metadata }, 422);
    }
    return jsonResponse({ status: providerStatus, payment_status: mapPaymentStatus(providerStatus), ...metadata });
  } catch (error) {
    return jsonResponse({ error: error instanceof Error ? error.message : "Não foi possível processar o pagamento." }, 400);
  }
});
