import { z } from "zod";

import { createPublicSupabaseClient } from "@/lib/supabase/public";
import type {
  CreatedOrder,
  CreateOrderPayload,
  OrderTrackingData,
} from "@/types/order";

const databaseNumber = z
  .union([z.number(), z.string()])
  .transform(Number)
  .refine(Number.isFinite, "Valor numérico inválido retornado pelo servidor.");

const createdOrderSchema = z.object({
  order_id: z.uuid(),
  order_number: databaseNumber,
  access_token: z.uuid(),
  subtotal: databaseNumber,
  delivery_fee: databaseNumber,
  total: databaseNumber,
});

const trackingItemSchema = z.object({
  id: z.uuid(),
  product_id: z.uuid(),
  product_name: z.string(),
  quantity: z.number().int().positive(),
  unit_price: databaseNumber,
  total_price: databaseNumber,
  notes: z.string().nullable(),
  addons: z.array(z.object({ id: z.uuid().optional(), addon_name: z.string(), unit_price: databaseNumber, total_price: databaseNumber })).default([]),
});

const orderTrackingSchema = z.object({
  id: z.uuid(),
  order_number: databaseNumber,
  status: z.enum([
    "PENDING",
    "CONFIRMED",
    "PREPARING",
    "READY",
    "OUT_FOR_DELIVERY",
    "DELIVERED",
    "CANCELED",
  ]),
  delivery_type: z.enum(["DELIVERY", "PICKUP"]),
  payment_method: z.enum(["PIX", "CARD", "CASH"]),
  payment_status: z.enum(["PENDING", "PAID", "FAILED", "REFUNDED"]),
  customer_name: z.string(),
  subtotal: databaseNumber,
  delivery_fee: databaseNumber,
  discount_amount: databaseNumber,
  coupon_code: z.string().nullable(),
  total: databaseNumber,
  accepted_at: z.string().nullable(),
  preparing_at: z.string().nullable(),
  ready_at: z.string().nullable(),
  out_for_delivery_at: z.string().nullable(),
  delivered_at: z.string().nullable(),
  canceled_at: z.string().nullable(),
  created_at: z.string(),
  updated_at: z.string(),
  items: z.array(trackingItemSchema),
});

function getPublicRpcError(error: { code?: string; message: string }) {
  if (error.code === "PGRST202") {
    return "O serviço de pedidos ainda não foi ativado no Supabase.";
  }

  if (error.message.toLowerCase().includes("fetch failed")) {
    return "Não foi possível conectar à loja. Verifique sua internet e tente novamente.";
  }

  return error.message;
}

export async function createOrder(
  payload: CreateOrderPayload,
): Promise<CreatedOrder> {
  const supabase = createPublicSupabaseClient();
  const { data, error } = await supabase.rpc("create_order", { payload });

  if (error) {
    throw new Error(getPublicRpcError(error));
  }

  const parsed = z.array(createdOrderSchema).safeParse(data);
  if (!parsed.success || !parsed.data[0]) {
    throw new Error("O pedido não foi confirmado. Tente novamente.");
  }

  return parsed.data[0] satisfies CreatedOrder;
}

export async function getOrderByAccessToken(
  accessToken: string,
): Promise<OrderTrackingData> {
  const supabase = createPublicSupabaseClient();
  const { data, error } = await supabase.rpc("get_order_by_access_token", {
    p_access_token: accessToken,
  });

  if (error) {
    throw new Error(getPublicRpcError(error));
  }

  const parsed = orderTrackingSchema.safeParse(data);
  if (!parsed.success) {
    throw new Error("Pedido não encontrado. Confira o link de acompanhamento.");
  }

  return parsed.data satisfies OrderTrackingData;
}
