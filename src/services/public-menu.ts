import { cache } from "react";

import { createPublicSupabaseClient } from "@/lib/supabase/public";
import type {
  MenuCategory,
  MenuProduct,
  PublicMenuData,
  StoreSettings,
} from "@/types/menu";

type CategoryRow = Omit<MenuCategory, "products">;

function toNumber(value: number | string) {
  return typeof value === "number" ? value : Number(value);
}

export const getPublicMenuData = cache(async (): Promise<PublicMenuData> => {
  const supabase = createPublicSupabaseClient();

  const [settingsResult, categoriesResult, productsResult] = await Promise.all([
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
      .returns<MenuProduct[]>(),
  ]);

  const firstError =
    settingsResult.error ?? categoriesResult.error ?? productsResult.error;

  if (firstError) {
    throw new Error(`Falha ao carregar o cardápio: ${firstError.message}`);
  }

  if (!settingsResult.data) {
    throw new Error("As configurações públicas da loja não foram encontradas.");
  }

  const products = (productsResult.data ?? []).map((product) => ({
    ...product,
    price: toNumber(product.price),
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
