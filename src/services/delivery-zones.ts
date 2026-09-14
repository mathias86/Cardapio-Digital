import { z } from "zod";

import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

const databaseNumber = z.union([z.number(), z.string()]).transform(Number);
const deliveryZoneSchema = z.object({
  id: z.uuid(),
  neighborhood: z.string(),
  distance_km: databaseNumber,
  active: z.boolean(),
  created_at: z.string(),
});

export type DeliveryZone = z.infer<typeof deliveryZoneSchema>;
export type DeliveryZoneInput = { neighborhood: string; distance_km: number; active: boolean };

function zoneError(error: { code?: string; message: string }) {
  if (error.code === "23505") return new Error("Este bairro já está cadastrado.");
  if (error.code === "42501") return new Error("Acesso permitido somente para administradores.");
  return new Error(error.message);
}

export async function getDeliveryZones(): Promise<DeliveryZone[]> {
  const { data, error } = await createSupabaseBrowserClient().from("delivery_zones").select("id,neighborhood,distance_km,active,created_at").order("neighborhood");
  if (error) throw zoneError(error);
  return z.array(deliveryZoneSchema).parse(data);
}

export async function saveDeliveryZone(input: DeliveryZoneInput, id?: string) {
  const payload = { neighborhood: input.neighborhood.trim(), distance_km: input.distance_km, active: input.active };
  const query = id ? createSupabaseBrowserClient().from("delivery_zones").update(payload).eq("id", id) : createSupabaseBrowserClient().from("delivery_zones").insert(payload);
  const { error } = await query;
  if (error) throw zoneError(error);
}

export async function deleteDeliveryZone(id: string) {
  const { error } = await createSupabaseBrowserClient().from("delivery_zones").delete().eq("id", id);
  if (error) throw zoneError(error);
}
