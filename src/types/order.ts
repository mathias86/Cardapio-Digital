export type OrderStatus =
  | "PENDING"
  | "CONFIRMED"
  | "PREPARING"
  | "READY"
  | "OUT_FOR_DELIVERY"
  | "DELIVERED"
  | "CANCELED";

export type DeliveryType = "DELIVERY" | "PICKUP";
export type PaymentMethod = "PIX" | "CARD" | "CASH";
export type PaymentStatus = "PENDING" | "PAID" | "FAILED" | "REFUNDED";

export type CreateOrderPayload = {
  customer_name: string;
  customer_phone: string;
  customer_email?: string;
  delivery_type: DeliveryType;
  payment_method: PaymentMethod;
  change_for?: number;
  address?: {
    street: string;
    number: string;
    neighborhood: string;
    complement?: string;
    reference?: string;
  };
  notes?: string;
  coupon_code?: string;
  items: Array<{
    product_id: string;
    quantity: number;
    notes?: string;
    addon_ids?: string[];
  }>;
};

export type CreatedOrder = {
  order_id: string;
  order_number: number;
  access_token: string;
  subtotal: number;
  delivery_fee: number;
  total: number;
};

export type OrderTrackingItem = {
  id: string;
  product_id: string;
  product_name: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  notes: string | null;
  addons: OrderItemAddon[];
};

export type OrderItemAddon = { id?: string; addon_name: string; unit_price: number; total_price: number };

export type OrderTrackingData = {
  id: string;
  order_number: number;
  status: OrderStatus;
  delivery_type: DeliveryType;
  payment_method: PaymentMethod;
  payment_status: PaymentStatus;
  customer_name: string;
  subtotal: number;
  delivery_fee: number;
  discount_amount: number;
  coupon_code: string | null;
  total: number;
  accepted_at: string | null;
  preparing_at: string | null;
  ready_at: string | null;
  out_for_delivery_at: string | null;
  delivered_at: string | null;
  canceled_at: string | null;
  created_at: string;
  updated_at: string;
  items: OrderTrackingItem[];
};
