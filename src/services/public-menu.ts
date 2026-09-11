import { cache } from "react";

import { createPublicSupabaseClient } from "@/lib/supabase/public";
import type {
  MenuCategory,
  MenuProduct,
  PublicMenuData,
  StoreSettings,
  MenuAddon,
  MenuAddonGroup,
} from "@/types/menu";

type CategoryRow = Omit<MenuCategory, "products">;

function toNumber(value: number | string) {
  return typeof value === "number" ? value : Number(value);
}

export const getPublicMenuData = cache(async (): Promise<PublicMenuData> => {
  const supabase = createPublicSupabaseClient();

  const [settingsResult, categoriesResult, productsResult, groupsResult, addonsResult, linksResult] = await Promise.all([
    supabase
      .from("store_settings")
      .select(
        "id,name,logo_url,is_open,delivery_fee,minimum_order_value,phone,whatsapp,address",
      )
      .eq("id", 1)
      .maybeSingle<StoreSettings>(),
    supabase
      .from("categories")
      .select("id,name,description,display_order")
      .eq("active", true)
      .order("display_order", { ascending: true })
      .order("name", { ascending: true })
      .returns<CategoryRow[]>(),
    supabase
      .from("products")
      .select(
        "id,category_id,name,description,price,image_url,stock_quantity,display_order",
      )
      .eq("active", true)
      .order("display_order", { ascending: true })
      .order("name", { ascending: true })
      .returns<Array<Omit<MenuProduct, "addon_groups">>>(),
    supabase.from("addon_groups").select("id,name,description,min_selections,max_selections,display_order").eq("active", true).order("display_order").returns<Array<Omit<MenuAddonGroup, "addons">>>(),
    supabase.from("addons").select("id,group_id,name,description,price,display_order").eq("active", true).order("display_order").returns<Array<MenuAddon & { group_id: string }>>(),
    supabase.from("product_addon_groups").select("product_id,addon_group_id,display_order").order("display_order").returns<Array<{ product_id: string; addon_group_id: string; display_order: number }>>(),
  ]);

  const firstError =
    settingsResult.error ?? categoriesResult.error ?? productsResult.error ?? groupsResult.error ?? addonsResult.error ?? linksResult.error;

  if (firstError) {
    throw new Error(`Falha ao carregar o cardápio: ${firstError.message}`);
  }

  if (!settingsResult.data) {
    throw new Error("As configurações públicas da loja não foram encontradas.");
  }

  const addonsByGroup = new Map<string, MenuAddon[]>();
  for (const { group_id, ...addon } of addonsResult.data ?? []) {
    const values = addonsByGroup.get(group_id) ?? [];
    values.push({ ...addon, price: toNumber(addon.price) });
    addonsByGroup.set(group_id, values);
  }
  const groupMap = new Map((groupsResult.data ?? []).map((group) => [group.id, { ...group, addons: addonsByGroup.get(group.id) ?? [] }]));
  const groupsByProduct = new Map<string, MenuAddonGroup[]>();
  for (const link of linksResult.data ?? []) {
    const group = groupMap.get(link.addon_group_id);
    if (!group) continue;
    const values = groupsByProduct.get(link.product_id) ?? [];
    values.push(group);
    groupsByProduct.set(link.product_id, values);
  }

  const products: MenuProduct[] = (productsResult.data ?? []).map((product) => ({
    ...product,
    price: toNumber(product.price),
    addon_groups: groupsByProduct.get(product.id) ?? [],
  }));

  const productsByCategory = new Map<string, MenuProduct[]>();
  for (const product of products) {
    const currentProducts = productsByCategory.get(product.category_id) ?? [];
    currentProducts.push(product);
    productsByCategory.set(product.category_id, currentProducts);
  }

  return {
    settings: {
      ...settingsResult.data,
      delivery_fee: toNumber(settingsResult.data.delivery_fee),
      minimum_order_value: toNumber(
        settingsResult.data.minimum_order_value,
      ),
    },
    categories: (categoriesResult.data ?? []).map((category) => ({
      ...category,
      products: productsByCategory.get(category.id) ?? [],
    })),
  };
});
