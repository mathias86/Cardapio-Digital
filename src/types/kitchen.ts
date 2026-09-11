import type { DeliveryType, OrderStatus } from "@/types/order";

export type KitchenOrderStatus = Extract<
  OrderStatus,
  "PENDING" | "CONFIRMED" | "PREPARING" | "READY"
>;

export type KitchenOrderItem = {
  id: string;
  product_id: string;
  product_name: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  notes: string | null;
};

export type KitchenOrder = {
  id: string;
  order_number: number;
  status: KitchenOrderStatus;
  delivery_type: DeliveryType;
  customer_name: string;
  notes: string | null;
  created_at: string;
  items: KitchenOrderItem[];
};

export type KitchenPrintData = {
  order_id: string;
  order_number: number;
  delivery_type: DeliveryType;
  status: KitchenOrderStatus;
  customer_name: string;
  notes: string | null;
  created_at: string;
  items: Array<{
    quantity: number;
    product_name: string;
    notes: string | null;
  }>;
};
