import { z } from "zod";

import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import type { AdminReportsData } from "@/types/admin";

const databaseNumber = z.union([z.number(), z.string()]).transform(Number);
const dailySchema = z.object({ sale_date: z.string(), orders_count: databaseNumber, canceled_count: databaseNumber, subtotal_total: databaseNumber, delivery_fee_total: databaseNumber, total_sales: databaseNumber, average_ticket: databaseNumber });
const itemSchema = z.object({ sale_date: z.string(), product_id: z.uuid().nullable(), product_name: z.string(), category_name: z.string().nullable(), quantity_sold: databaseNumber, revenue: databaseNumber });
const suggestionSchema = z.object({ product_id: z.uuid(), product_name: z.string(), category_name: z.string(), stock_quantity: z.number().nullable(), low_stock_threshold: z.number().nullable(), sold_last_7_days: databaseNumber, sold_last_30_days: databaseNumber, low_stock: z.boolean(), purchase_alert: z.boolean() });

export async function getAdminReports(from: string, to: string): Promise<AdminReportsData> {
  const supabase = createSupabaseBrowserClient();
  const [dailyResult, itemsResult, suggestionsResult] = await Promise.all([
    supabase.from("report_daily_summary").select("*").gte("sale_date", from).lte("sale_date", to).order("sale_date"),
    supabase.from("report_items_sold_by_day").select("*").gte("sale_date", from).lte("sale_date", to).order("sale_date", { ascending: false }),
    supabase.from("report_purchase_suggestions").select("*").order("purchase_alert", { ascending: false }).order("sold_last_7_days", { ascending: false }),
  ]);
  const error = dailyResult.error ?? itemsResult.error ?? suggestionsResult.error;
  if (error) throw new Error(error.code === "42501" ? "Acesso permitido somente para administradores." : error.message);
  const daily = z.array(dailySchema).parse(dailyResult.data);
  const itemsByDay = z.array(itemSchema).parse(itemsResult.data);
  const suggestions = z.array(suggestionSchema).parse(suggestionsResult.data);
  const productMap = new Map<string, { name: string; quantity: number; revenue: number }>();
  const categoryMap = new Map<string, { name: string; quantity: number; revenue: number }>();
  for (const item of itemsByDay) {
    const product = productMap.get(item.product_name) ?? { name: item.product_name, quantity: 0, revenue: 0 };
    product.quantity += item.quantity_sold; product.revenue += item.revenue; productMap.set(item.product_name, product);
    const categoryName = item.category_name ?? "Sem categoria";
    const category = categoryMap.get(categoryName) ?? { name: categoryName, quantity: 0, revenue: 0 };
    category.quantity += item.quantity_sold; category.revenue += item.revenue; categoryMap.set(categoryName, category);
  }
  return {
    daily,
    itemsByDay,
    topProducts: [...productMap.values()].sort((a, b) => b.quantity - a.quantity).slice(0, 10),
    categories: [...categoryMap.values()].sort((a, b) => b.revenue - a.revenue),
    suggestions,
  };
}
