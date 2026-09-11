import { z } from "zod";

import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import type {
  DeliveryOrder,
  DeliveryOrdersResult,
  DeliveryOrderStatus,
  DeliveryPrintData,
} from "@/types/delivery";

const databaseNumber = z.union([z.number(), z.string()]).transform(Number);
const nullableDatabaseNumber = z
  .union([z.number(), z.string()])
  .transform(Number)
  .nullable();
const deliveryStatusSchema = z.enum(["READY", "OUT_FOR_DELIVERY", "DELIVERED"]);

const deliveryItemSchema = z.object({
  id: z.uuid(),
  product_name: z.string(),
  quantity: z.number().int().positive(),
  unit_price: databaseNumber,
  total_price: databaseNumber,
  notes: z.string().nullable(),
});

const deliveryOrderFields = {
  order_number: databaseNumber,
  status: deliveryStatusSchema,
  customer_name: z.string(),
  customer_phone: z.string(),
  address_street: z.string().nullable(),
  address_number: z.string().nullable(),
  address_neighborhood: z.string().nullable(),
  address_complement: z.string().nullable(),
  address_reference: z.string().nullable(),
  payment_method: z.enum(["PIX", "CARD", "CASH"]),
  payment_status: z.enum(["PENDING", "PAID", "FAILED", "REFUNDED"]),
  change_for: nullableDatabaseNumber,
  subtotal: databaseNumber,
  delivery_fee: databaseNumber,
  total: databaseNumber,
  notes: z.string().nullable(),
  created_at: z.string(),
};

const deliveryOrderSchema = z.object({
  id: z.uuid(),
  ...deliveryOrderFields,
  delivery_assigned_to: z.uuid().nullable(),
  delivery_assigned_at: z.string().nullable(),
  items: z.array(deliveryItemSchema),
});

const deliveryPrintSchema = z.object({
  order_id: z.uuid(),
  ...deliveryOrderFields,
  items: z.array(deliveryItemSchema.omit({ id: true })),
});

function deliveryError(error: { code?: string; message: string }) {
  if (error.code === "PGRST202") {
    return new Error("As funções de entrega ainda não foram ativadas no Supabase.");
  }

  if (error.code === "42501" || error.message.toLowerCase().includes("permission denied")) {
    return new Error("Entre com um usuário ADMIN ou DELIVERY para acessar as entregas.");
  }

  return new Error(error.message);
}

export async function getDeliveryOrders(): Promise<DeliveryOrdersResult> {
  const supabase = createSupabaseBrowserClient();
  const { data: authData, error: authError } = await supabase.auth.getUser();

  if (authError || !authData.user) {
    throw new Error("Entre com um usuário DELIVERY para acessar as entregas.");
  }

  const { data, error } = await supabase
    .from("orders")
    .select(
      "id,order_number,status,customer_name,customer_phone,address_street,address_number,address_neighborhood,address_complement,address_reference,payment_method,payment_status,change_for,subtotal,delivery_fee,total,notes,delivery_assigned_to,delivery_assigned_at,created_at,items:order_items(id,product_name,quantity,unit_price,total_price,notes)",
    )
    .eq("delivery_type", "DELIVERY")
    .in("status", ["READY", "OUT_FOR_DELIVERY", "DELIVERED"])
    .or(`status.eq.READY,delivery_assigned_to.eq.${authData.user.id}`)
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) throw deliveryError(error);

  const parsed = z.array(deliveryOrderSchema).safeParse(data);
  if (!parsed.success) {
    throw new Error("A resposta dos pedidos de entrega é inválida.");
  }

  return {
    currentUserId: authData.user.id,
    orders: parsed.data satisfies DeliveryOrder[],
  };
}

export async function updateDeliveryOrderStatus(
  orderId: string,
  status: Extract<DeliveryOrderStatus, "OUT_FOR_DELIVERY" | "DELIVERED">,
) {
  const supabase = createSupabaseBrowserClient();
  const { error } = await supabase.rpc("update_order_status", {
    p_order_id: orderId,
    p_status: status,
  });

  if (error) throw deliveryError(error);
}

export async function getDeliveryPrintData(
  orderId: string,
): Promise<DeliveryPrintData> {
  const supabase = createSupabaseBrowserClient();
  const { data, error } = await supabase.rpc("get_delivery_print_data", {
    p_order_id: orderId,
  });

  if (error) throw deliveryError(error);

  const parsed = deliveryPrintSchema.safeParse(data);
  if (!parsed.success) {
    throw new Error("O recibo de entrega retornado pelo servidor é inválido.");
  }

  return parsed.data satisfies DeliveryPrintData;
}
