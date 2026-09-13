import { z } from "zod";

import { createPublicSupabaseClient } from "@/lib/supabase/public";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import type { AdminCoupon, CouponDiscountType } from "@/types/admin";

const databaseNumber = z.union([z.number(), z.string()]).transform(Number);
const couponSchema = z.object({ id: z.uuid(), code: z.string(), name: z.string(), description: z.string().nullable(), discount_type: z.enum(["PERCENTAGE", "FIXED"]), discount_value: databaseNumber, minimum_order_value: databaseNumber, maximum_discount: databaseNumber.nullable(), starts_at: z.string().nullable(), ends_at: z.string().nullable(), usage_limit: z.number().nullable(), usage_count: z.number(), active: z.boolean(), created_at: z.string() });
const validationSchema = z.object({ code: z.string(), name: z.string(), description: z.string().nullable(), discount_amount: databaseNumber });

export type CouponInput = { code: string; name: string; description: string; discount_type: CouponDiscountType; discount_value: number; minimum_order_value: number; maximum_discount: number | null; starts_at: string; ends_at: string; usage_limit: number | null; active: boolean };
export type CouponValidation = { code: string; name: string; description: string | null; discount_amount: number };

export async function getCoupons(): Promise<AdminCoupon[]> {
  const { data, error } = await createSupabaseBrowserClient().from("coupons").select("*").order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return z.array(couponSchema).parse(data);
}

export async function saveCoupon(input: CouponInput, id?: string) {
  const payload = { ...input, code: input.code.trim().toUpperCase(), name: input.name.trim(), description: input.description.trim() || null, starts_at: input.starts_at ? new Date(input.starts_at).toISOString() : null, ends_at: input.ends_at ? new Date(input.ends_at).toISOString() : null };
  const query = id ? createSupabaseBrowserClient().from("coupons").update(payload).eq("id", id) : createSupabaseBrowserClient().from("coupons").insert(payload);
  const { error } = await query;
  if (error) throw new Error(error.code === "23505" ? "Já existe um cupom com este código." : error.message);
}

export async function setCouponActive(id: string, active: boolean) {
  const { error } = await createSupabaseBrowserClient().from("coupons").update({ active }).eq("id", id);
  if (error) throw new Error(error.message);
}

export async function validateCoupon(code: string, subtotal: number): Promise<CouponValidation> {
  const { data, error } = await createPublicSupabaseClient().rpc("validate_coupon", { p_code: code, p_subtotal: subtotal });
  if (error) throw new Error(error.message);
  return validationSchema.parse(data);
}
