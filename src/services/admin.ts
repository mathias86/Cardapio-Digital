import { z } from "zod";

import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import type { CategoryFormValues, ProductFormValues, SettingsFormValues } from "@/lib/validations/admin";
import type { AdminAddonGroup, AdminCategory, AdminDashboardData, AdminProduct, AdminStoreSettings } from "@/types/admin";

const databaseNumber = z.union([z.number(), z.string()]).transform(Number);
const categorySchema = z.object({ id: z.uuid(), name: z.string(), description: z.string().nullable(), active: z.boolean(), display_order: z.number(), created_at: z.string() });
const productSchema = z.object({ id: z.uuid(), category_id: z.uuid(), name: z.string(), description: z.string().nullable(), price: databaseNumber, image_url: z.string().nullable(), active: z.boolean(), stock_quantity: z.number().nullable(), low_stock_threshold: z.number().nullable(), display_order: z.number(), created_at: z.string() });
const settingsSchema = z.object({ id: z.number(), name: z.string(), logo_url: z.string().nullable(), is_open: z.boolean(), delivery_fee: databaseNumber, delivery_price_per_km: databaseNumber, minimum_order_value: databaseNumber, opening_hours: z.record(z.string(), z.unknown()), phone: z.string().nullable(), whatsapp: z.string().nullable(), address: z.string().nullable(), pix_key: z.string().nullable(), pix_name: z.string().nullable() });
const recentOrderSchema = z.object({ id: z.uuid(), order_number: databaseNumber, customer_name: z.string(), status: z.enum(["PENDING", "CONFIRMED", "PREPARING", "READY", "OUT_FOR_DELIVERY", "DELIVERED", "CANCELED"]), total: databaseNumber, created_at: z.string() });

function adminError(error: { code?: string; message: string }) {
  if (error.code === "42501" || error.message.toLowerCase().includes("permission denied")) return new Error("Acesso permitido somente para administradores.");
  if (error.code === "23505") return new Error("Já existe um cadastro com esses dados.");
  return new Error(error.message);
}

function nullableText(value: string) {
  const trimmed = value.trim();
  return trimmed || null;
}

export async function getAdminCategories(): Promise<AdminCategory[]> {
  const { data, error } = await createSupabaseBrowserClient().from("categories").select("id,name,description,active,display_order,created_at").order("display_order").order("name");
  if (error) throw adminError(error);
  const parsed = z.array(categorySchema).safeParse(data);
  if (!parsed.success) throw new Error("Resposta de categorias inválida.");
  return parsed.data satisfies AdminCategory[];
}

export async function saveAdminCategory(values: CategoryFormValues, id?: string) {
  const payload = { name: values.name.trim(), description: nullableText(values.description), active: values.active, display_order: values.display_order };
  const query = id ? createSupabaseBrowserClient().from("categories").update(payload).eq("id", id) : createSupabaseBrowserClient().from("categories").insert(payload);
  const { error } = await query;
  if (error) throw adminError(error);
}

export async function deleteAdminCategory(id: string) {
  const { error } = await createSupabaseBrowserClient().from("categories").delete().eq("id", id);
  if (error) throw adminError(error);
}

export async function getAdminProducts(): Promise<AdminProduct[]> {
  const { data, error } = await createSupabaseBrowserClient().from("products").select("id,category_id,name,description,price,image_url,active,stock_quantity,low_stock_threshold,display_order,created_at").order("display_order").order("name");
  if (error) throw adminError(error);
  const parsed = z.array(productSchema).safeParse(data);
  if (!parsed.success) throw new Error("Resposta de produtos inválida.");
  return parsed.data satisfies AdminProduct[];
}

export async function uploadProductImage(file: File) {
  const extension = file.name.split(".").pop()?.toLowerCase() || "jpg";
  const path = `${crypto.randomUUID()}.${extension}`;
  const supabase = createSupabaseBrowserClient();
  const { error } = await supabase.storage.from("product-images").upload(path, file, { cacheControl: "3600", upsert: false });
  if (error) throw adminError(error);
  return supabase.storage.from("product-images").getPublicUrl(path).data.publicUrl;
}

export async function saveAdminProduct(values: ProductFormValues, id?: string) {
  const payload = { category_id: values.category_id, name: values.name.trim(), description: nullableText(values.description), price: values.price, image_url: nullableText(values.image_url), active: values.active, stock_quantity: values.stock_quantity === "" ? null : values.stock_quantity, low_stock_threshold: values.low_stock_threshold === "" ? null : values.low_stock_threshold, display_order: values.display_order };
  const query = id ? createSupabaseBrowserClient().from("products").update(payload).eq("id", id) : createSupabaseBrowserClient().from("products").insert(payload);
  const { error } = await query;
  if (error) throw adminError(error);
}

export async function deleteAdminProduct(id: string) {
  const { error } = await createSupabaseBrowserClient().from("products").delete().eq("id", id);
  if (error) throw adminError(error);
}

export async function getAdminAddonGroups(): Promise<AdminAddonGroup[]> {
  const supabase = createSupabaseBrowserClient();
  const [groups, addons, links] = await Promise.all([
    supabase.from("addon_groups").select("id,name,description,min_selections,max_selections,active,display_order").order("display_order").order("name"),
    supabase.from("addons").select("id,group_id,name,description,price,active,display_order").order("display_order").order("name"),
    supabase.from("product_addon_groups").select("product_id,addon_group_id"),
  ]);
  const error = groups.error ?? addons.error ?? links.error;
  if (error) throw adminError(error);
  const groupRows = (groups.data ?? []) as Array<Omit<AdminAddonGroup, "addons" | "product_ids">>;
  const addonRows = (addons.data ?? []) as AdminAddonGroup["addons"];
  const linkRows = (links.data ?? []) as Array<{ product_id: string; addon_group_id: string }>;
  return groupRows.map((group) => ({
    ...group,
    addons: addonRows.filter((addon) => addon.group_id === group.id).map((addon) => ({ ...addon, price: Number(addon.price) })),
    product_ids: linkRows.filter((link) => link.addon_group_id === group.id).map((link) => link.product_id),
  })) as AdminAddonGroup[];
}

export async function saveAdminAddonGroup(values: Omit<AdminAddonGroup, "id" | "addons" | "product_ids"> & { id?: string; product_ids: string[] }) {
  const supabase = createSupabaseBrowserClient();
  const payload = { name: values.name.trim(), description: nullableText(values.description ?? ""), min_selections: values.min_selections, max_selections: values.max_selections, active: values.active, display_order: values.display_order };
  const result = values.id ? await supabase.from("addon_groups").update(payload).eq("id", values.id).select("id").single() : await supabase.from("addon_groups").insert(payload).select("id").single();
  if (result.error) throw adminError(result.error);
  const groupId = result.data.id;
  const deleted = await supabase.from("product_addon_groups").delete().eq("addon_group_id", groupId);
  if (deleted.error) throw adminError(deleted.error);
  if (values.product_ids.length) {
    const inserted = await supabase.from("product_addon_groups").insert(values.product_ids.map((product_id, display_order) => ({ product_id, addon_group_id: groupId, display_order })));
    if (inserted.error) throw adminError(inserted.error);
  }
}

export async function deleteAdminAddonGroup(id: string) {
  const { error } = await createSupabaseBrowserClient().from("addon_groups").delete().eq("id", id);
  if (error) throw adminError(error);
}

export async function saveAdminAddon(values: { id?: string; group_id: string; name: string; description: string; price: number; active: boolean; display_order: number }) {
  const payload = { group_id: values.group_id, name: values.name.trim(), description: nullableText(values.description), price: values.price, active: values.active, display_order: values.display_order };
  const query = values.id ? createSupabaseBrowserClient().from("addons").update(payload).eq("id", values.id) : createSupabaseBrowserClient().from("addons").insert(payload);
  const { error } = await query;
  if (error) throw adminError(error);
}

export async function deleteAdminAddon(id: string) {
  const { error } = await createSupabaseBrowserClient().from("addons").delete().eq("id", id);
  if (error) throw adminError(error);
}

export async function getAdminSettings(): Promise<AdminStoreSettings> {
  const { data, error } = await createSupabaseBrowserClient().from("store_settings").select("id,name,logo_url,is_open,delivery_fee,delivery_price_per_km,minimum_order_value,opening_hours,phone,whatsapp,address,pix_key,pix_name").eq("id", 1).single();
  if (error) throw adminError(error);
  const parsed = settingsSchema.safeParse(data);
  if (!parsed.success) throw new Error("Resposta de configurações inválida.");
  return parsed.data satisfies AdminStoreSettings;
}

export async function saveAdminSettings(values: SettingsFormValues) {
  const payload = { name: values.name.trim(), logo_url: nullableText(values.logo_url), is_open: values.is_open, delivery_fee: values.delivery_fee, delivery_price_per_km: values.delivery_price_per_km, minimum_order_value: values.minimum_order_value, phone: nullableText(values.phone), whatsapp: nullableText(values.whatsapp), address: nullableText(values.address), pix_key: nullableText(values.pix_key), pix_name: nullableText(values.pix_name) };
  const { error } = await createSupabaseBrowserClient().from("store_settings").update(payload).eq("id", 1);
  if (error) throw adminError(error);
}

export async function getAdminDashboard(): Promise<AdminDashboardData> {
  const supabase = createSupabaseBrowserClient();
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
  const [todayResult, productsResult, recentResult] = await Promise.all([
    supabase.from("orders").select("status,total").gte("created_at", start),
    supabase.from("products").select("active,stock_quantity,low_stock_threshold"),
    supabase.from("orders").select("id,order_number,customer_name,status,total,created_at").order("created_at", { ascending: false }).limit(6),
  ]);
  const error = todayResult.error ?? productsResult.error ?? recentResult.error;
  if (error) throw adminError(error);
  const today = z.array(z.object({ status: z.string(), total: databaseNumber })).parse(todayResult.data);
  const products = z.array(z.object({ active: z.boolean(), stock_quantity: z.number().nullable(), low_stock_threshold: z.number().nullable() })).parse(productsResult.data);
  const recentOrders = z.array(recentOrderSchema).parse(recentResult.data);
  return {
    ordersToday: today.length,
    salesToday: today.filter((order) => order.status !== "CANCELED").reduce((sum, order) => sum + order.total, 0),
    activeProducts: products.filter((product) => product.active).length,
    lowStockProducts: products.filter((product) => product.stock_quantity !== null && product.low_stock_threshold !== null && product.stock_quantity <= product.low_stock_threshold).length,
    recentOrders,
  };
}
