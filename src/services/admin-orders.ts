import { z } from "zod";

import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import type { AdminOrder, AdminOrderFilters } from "@/types/admin";
import type { OrderStatus } from "@/types/order";

const databaseNumber = z.union([z.number(), z.string()]).transform(Number);
const nullableDatabaseNumber = z.union([z.number(), z.string()]).transform(Number).nullable();
const orderStatus = z.enum(["PENDING", "CONFIRMED", "PREPARING", "READY", "OUT_FOR_DELIVERY", "DELIVERED", "CANCELED"]);
const orderSchema = z.object({
  id: z.uuid(), order_number: databaseNumber, customer_name: z.string(), customer_phone: z.string(), customer_email: z.string().nullable(), status: orderStatus,
  delivery_type: z.enum(["DELIVERY", "PICKUP"]), payment_method: z.enum(["PIX", "CARD", "CASH"]), payment_status: z.enum(["PENDING", "PAID", "FAILED", "REFUNDED"]),
  address_street: z.string().nullable(), address_number: z.string().nullable(), address_neighborhood: z.string().nullable(), address_complement: z.string().nullable(), address_reference: z.string().nullable(), notes: z.string().nullable(),
  subtotal: databaseNumber, delivery_fee: databaseNumber, total: databaseNumber, change_for: nullableDatabaseNumber, created_at: z.string(),
  items: z.array(z.object({ id: z.uuid(), product_name: z.string(), quantity: z.number(), unit_price: databaseNumber, total_price: databaseNumber, notes: z.string().nullable(), addons: z.array(z.object({ id: z.uuid(), addon_name: z.string(), unit_price: databaseNumber, total_price: databaseNumber })).default([]) })),
});

function adminOrderError(error: { code?: string; message: string }) {
  if (error.code === "42501" || error.message.toLowerCase().includes("permission denied")) return new Error("Acesso permitido somente para administradores.");
  return new Error(error.message);
}

export async function getAdminOrders(filters: AdminOrderFilters): Promise<AdminOrder[]> {
  const supabase = createSupabaseBrowserClient();
  let query = supabase.from("orders").select("id,order_number,customer_name,customer_phone,customer_email,status,delivery_type,payment_method,payment_status,address_street,address_number,address_neighborhood,address_complement,address_reference,notes,subtotal,delivery_fee,total,change_for,created_at,items:order_items(id,product_name,quantity,unit_price,total_price,notes,addons:order_item_addons(id,addon_name,unit_price,total_price))").order("created_at", { ascending: false }).limit(200);
  if (filters.status !== "ALL") query = query.eq("status", filters.status);
  if (filters.from) query = query.gte("created_at", `${filters.from}T00:00:00-03:00`);
  if (filters.to) query = query.lte("created_at", `${filters.to}T23:59:59.999-03:00`);
  const { data, error } = await query;
  if (error) throw adminOrderError(error);
  const parsed = z.array(orderSchema).safeParse(data);
  if (!parsed.success) throw new Error("A resposta de pedidos é inválida.");
  return parsed.data satisfies AdminOrder[];
}

export async function updateAdminOrderStatus(orderId: string, status: OrderStatus) {
  const { error } = await createSupabaseBrowserClient().rpc("update_order_status", { p_order_id: orderId, p_status: status });
  if (error) throw adminOrderError(error);
}
