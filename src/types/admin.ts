import type { DeliveryType, OrderItemAddon, OrderStatus, PaymentMethod, PaymentStatus } from "@/types/order";

export type AdminCategory = {
  id: string;
  name: string;
  description: string | null;
  active: boolean;
  display_order: number;
  created_at: string;
};

export type AdminProduct = {
  id: string;
  category_id: string;
  name: string;
  description: string | null;
  price: number;
  image_url: string | null;
  active: boolean;
  stock_quantity: number | null;
  low_stock_threshold: number | null;
  display_order: number;
  created_at: string;
};

export type AdminAddon = { id: string; group_id: string; name: string; description: string | null; price: number; active: boolean; display_order: number };
export type AdminAddonGroup = { id: string; name: string; description: string | null; min_selections: number; max_selections: number; active: boolean; display_order: number; addons: AdminAddon[]; product_ids: string[] };

export type DeliveryPerson = { id: string; name: string; email: string | null; active: boolean; created_at: string };
export type CouponDiscountType = "PERCENTAGE" | "FIXED";
export type AdminCoupon = { id: string; code: string; name: string; description: string | null; discount_type: CouponDiscountType; discount_value: number; minimum_order_value: number; maximum_discount: number | null; starts_at: string | null; ends_at: string | null; usage_limit: number | null; usage_count: number; active: boolean; created_at: string };

export type AdminStoreSettings = {
  id: number;
  name: string;
  logo_url: string | null;
  is_open: boolean;
  delivery_fee: number;
  delivery_price_per_km: number;
  minimum_order_value: number;
  opening_hours: Record<string, unknown>;
  phone: string | null;
  whatsapp: string | null;
  address: string | null;
  pix_key: string | null;
  pix_name: string | null;
};

export type AdminRecentOrder = {
  id: string;
  order_number: number;
  customer_name: string;
  status: OrderStatus;
  total: number;
  created_at: string;
};

export type AdminDashboardData = {
  ordersToday: number;
  salesToday: number;
  activeProducts: number;
  lowStockProducts: number;
  recentOrders: AdminRecentOrder[];
};

export type AdminOrderItem = {
  id: string;
  product_name: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  notes: string | null;
  addons: OrderItemAddon[];
};

export type AdminOrder = AdminRecentOrder & {
  delivery_type: DeliveryType;
  payment_method: PaymentMethod;
  payment_status: PaymentStatus;
  customer_phone: string;
  customer_email: string | null;
  address_street: string | null;
  address_number: string | null;
  address_neighborhood: string | null;
  address_complement: string | null;
  address_reference: string | null;
  notes: string | null;
  subtotal: number;
  delivery_fee: number;
  change_for: number | null;
  coupon_code: string | null;
  discount_amount: number;
  delivery_assigned_to: string | null;
  items: AdminOrderItem[];
};

export type AdminOrderFilters = {
  status: OrderStatus | "ALL";
  from: string;
  to: string;
};

export type DailyReport = {
  sale_date: string;
  orders_count: number;
  canceled_count: number;
  subtotal_total: number;
  delivery_fee_total: number;
  total_sales: number;
  average_ticket: number;
};

export type ItemSalesReport = {
  sale_date: string;
  product_id: string | null;
  product_name: string;
  category_name: string | null;
  quantity_sold: number;
  revenue: number;
};

export type PurchaseSuggestion = {
  product_id: string;
  product_name: string;
  category_name: string;
  stock_quantity: number | null;
  low_stock_threshold: number | null;
  sold_last_7_days: number;
  sold_last_30_days: number;
  low_stock: boolean;
  purchase_alert: boolean;
};

export type AdminReportsData = {
  daily: DailyReport[];
  itemsByDay: ItemSalesReport[];
  topProducts: Array<{ name: string; quantity: number; revenue: number }>;
  categories: Array<{ name: string; quantity: number; revenue: number }>;
  suggestions: PurchaseSuggestion[];
};
