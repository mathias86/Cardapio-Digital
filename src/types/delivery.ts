import type { OrderItemAddon, PaymentMethod, PaymentStatus } from "@/types/order";

export type DeliveryOrderStatus = "READY" | "OUT_FOR_DELIVERY" | "DELIVERED";

export type DeliveryOrderItem = {
  id: string;
  product_name: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  notes: string | null;
  addons: OrderItemAddon[];
};

export type DeliveryOrder = {
  id: string;
  order_number: number;
  status: DeliveryOrderStatus;
  customer_name: string;
  customer_phone: string;
  address_street: string | null;
  address_number: string | null;
  address_neighborhood: string | null;
  address_complement: string | null;
  address_reference: string | null;
  payment_method: PaymentMethod;
  payment_status: PaymentStatus;
  change_for: number | null;
  subtotal: number;
  delivery_fee: number;
  total: number;
  notes: string | null;
  delivery_assigned_to: string | null;
  delivery_assigned_at: string | null;
  created_at: string;
  items: DeliveryOrderItem[];
};

export type DeliveryOrdersResult = {
  currentUserId: string;
  orders: DeliveryOrder[];
};

export type DeliveryPrintData = Omit<
  DeliveryOrder,
  "id" | "delivery_assigned_to" | "delivery_assigned_at" | "items"
> & {
  order_id: string;
  items: Array<Omit<DeliveryOrderItem, "id">>;
};
