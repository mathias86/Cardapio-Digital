import { z } from "zod";

import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import type { DeliveryPerson } from "@/types/admin";

const deliveryPersonSchema = z.object({ id: z.uuid(), name: z.string(), email: z.string().nullable(), active: z.boolean(), created_at: z.string() });

export async function getDeliveryPeople(): Promise<DeliveryPerson[]> {
  const { data, error } = await createSupabaseBrowserClient().from("profiles").select("id,name,email,active,created_at").eq("role", "DELIVERY").order("name");
  if (error) throw new Error(error.message);
  return z.array(deliveryPersonSchema).parse(data);
}

export async function createDeliveryPerson(input: { name: string; email: string; password: string }) {
  const { data, error } = await createSupabaseBrowserClient().functions.invoke("admin-delivery-users", { body: input });
  if (error) throw new Error((data as { error?: string } | null)?.error ?? error.message);
  if ((data as { error?: string } | null)?.error) throw new Error((data as { error: string }).error);
}

export async function setDeliveryPersonActive(id: string, active: boolean) {
  const { error } = await createSupabaseBrowserClient().from("profiles").update({ active }).eq("id", id).eq("role", "DELIVERY");
  if (error) throw new Error(error.message);
}

export async function assignDeliveryOrder(orderId: string, deliveryId: string) {
  const { error } = await createSupabaseBrowserClient().rpc("assign_delivery_order", { p_order_id: orderId, p_delivery_id: deliveryId });
  if (error) throw new Error(error.message);
}
