import { z } from "zod";

import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import type {
  KitchenOrder,
  KitchenOrderStatus,
  KitchenPrintData,
} from "@/types/kitchen";

const databaseNumber = z.union([z.number(), z.string()]).transform(Number);
const kitchenStatusSchema = z.enum(["PENDING", "CONFIRMED", "PREPARING", "READY"]);

const kitchenItemSchema = z.object({
  id: z.uuid(),
  product_id: z.uuid(),
  product_name: z.string(),
  quantity: z.number().int().positive(),
  unit_price: databaseNumber,
  total_price: databaseNumber,
  notes: z.string().nullable(),
});

const kitchenOrderSchema = z.object({
  id: z.uuid(),
  order_number: databaseNumber,
  status: kitchenStatusSchema,
  delivery_type: z.enum(["DELIVERY", "PICKUP"]),
  customer_name: z.string(),
  notes: z.string().nullable(),
  created_at: z.string(),
  items: z.array(kitchenItemSchema),
});

const kitchenPrintSchema = z.object({
  order_id: z.uuid(),
  order_number: databaseNumber,
  delivery_type: z.enum(["DELIVERY", "PICKUP"]),
  status: kitchenStatusSchema,
  customer_name: z.string(),
  notes: z.string().nullable(),
  created_at: z.string(),
  items: z.array(
    z.object({
      quantity: z.number().int().positive(),
      product_name: z.string(),
      notes: z.string().nullable(),
    }),
  ),
});

function internalError(error: { code?: string; message: string }) {
  if (error.code === "PGRST202") {
    return new Error("As funções da cozinha ainda não foram ativadas no Supabase.");
  }

  if (error.code === "42501" || error.message.toLowerCase().includes("permission denied")) {
    return new Error("Entre com um usuário ADMIN ou KITCHEN para acessar a cozinha.");
  }

  return new Error(error.message);
}

export async function getKitchenOrders(): Promise<KitchenOrder[]> {
  const supabase = createSupabaseBrowserClient();
  const { data, error } = await supabase
    .from("orders")
    .select(
      "id,order_number,status,delivery_type,customer_name,notes,created_at,items:order_items(id,product_id,product_name,quantity,unit_price,total_price,notes)",
    )
    .in("status", ["PENDING", "CONFIRMED", "PREPARING", "READY"])
    .order("created_at", { ascending: true });

  if (error) throw internalError(error);

  const parsed = z.array(kitchenOrderSchema).safeParse(data);
  if (!parsed.success) {
    throw new Error("A resposta dos pedidos da cozinha é inválida.");
  }

  return parsed.data satisfies KitchenOrder[];
}

export async function updateKitchenOrderStatus(
  orderId: string,
  status: Extract<KitchenOrderStatus, "PREPARING" | "READY">,
) {
  const supabase = createSupabaseBrowserClient();
  const { error } = await supabase.rpc("update_order_status", {
    p_order_id: orderId,
    p_status: status,
  });

  if (error) throw internalError(error);
}

export async function getKitchenPrintData(
  orderId: string,
): Promise<KitchenPrintData> {
  const supabase = createSupabaseBrowserClient();
  const { data, error } = await supabase.rpc("get_kitchen_print_data", {
    p_order_id: orderId,
  });

  if (error) throw internalError(error);

  const parsed = kitchenPrintSchema.safeParse(data);
  if (!parsed.success) {
    throw new Error("A comanda retornada pelo servidor é inválida.");
  }

  return parsed.data satisfies KitchenPrintData;
}
