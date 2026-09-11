import { Badge } from "@/components/ui/badge";
import type { OrderStatus } from "@/types/order";

const statusConfig: Record<OrderStatus, { label: string; className: string }> = {
  PENDING: {
    label: "Recebido",
    className: "border-amber-200 bg-amber-50 text-amber-800",
  },
  CONFIRMED: {
    label: "Confirmado",
    className: "border-blue-200 bg-blue-50 text-blue-800",
  },
  PREPARING: {
    label: "Em preparo",
    className: "border-orange-200 bg-orange-50 text-orange-800",
  },
  READY: {
    label: "Pronto",
    className: "border-emerald-200 bg-emerald-50 text-emerald-800",
  },
  OUT_FOR_DELIVERY: {
    label: "Saiu para entrega",
    className: "border-violet-200 bg-violet-50 text-violet-800",
  },
  DELIVERED: {
    label: "Concluído",
    className: "border-emerald-200 bg-emerald-50 text-emerald-800",
  },
  CANCELED: {
    label: "Cancelado",
    className: "border-red-200 bg-red-50 text-red-800",
  },
};

export function OrderStatusBadge({ status }: { status: OrderStatus }) {
  const config = statusConfig[status];

  return (
    <Badge variant="outline" className={config.className}>
      {config.label}
    </Badge>
  );
}
