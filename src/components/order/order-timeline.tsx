import { Check, Circle, X } from "lucide-react";

import { cn } from "@/lib/utils";
import type { OrderTrackingData } from "@/types/order";

type TimelineStep = {
  status: OrderTrackingData["status"];
  label: string;
  description: string;
  timestamp: string | null;
};

function formatDateTime(value: string | null) {
  if (!value) return null;

  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

export function OrderTimeline({ order }: { order: OrderTrackingData }) {
  const steps: TimelineStep[] = [
    {
      status: "PENDING",
      label: "Pedido recebido",
      description: "A loja recebeu o seu pedido.",
      timestamp: order.created_at,
    },
    {
      status: "CONFIRMED",
      label: "Pedido confirmado",
      description: "A loja confirmou os itens do pedido.",
      timestamp: order.accepted_at,
    },
    {
      status: "PREPARING",
      label: "Em preparo",
      description: "A cozinha está preparando seu pedido.",
      timestamp: order.preparing_at,
    },
    {
      status: "READY",
      label:
        order.delivery_type === "DELIVERY"
          ? "Pronto para entrega"
          : "Pronto para retirada",
      description:
        order.delivery_type === "DELIVERY"
          ? "O pedido está aguardando o entregador."
          : "O pedido já pode ser retirado na loja.",
      timestamp: order.ready_at,
    },
    ...(order.delivery_type === "DELIVERY"
      ? [
          {
            status: "OUT_FOR_DELIVERY" as const,
            label: "Saiu para entrega",
            description: "Seu pedido está a caminho.",
            timestamp: order.out_for_delivery_at,
          },
        ]
      : []),
    {
      status: "DELIVERED",
      label: order.delivery_type === "DELIVERY" ? "Pedido entregue" : "Pedido retirado",
      description: "Pedido concluído. Bom apetite!",
      timestamp: order.delivered_at,
    },
  ];

  const activeIndex = steps.findIndex((step) => step.status === order.status);

  return (
    <div className="space-y-0" aria-label="Progresso do pedido">
      {order.status === "CANCELED" && (
        <div className="mb-5 flex gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-red-800">
          <span className="grid size-8 shrink-0 place-items-center rounded-full bg-red-100">
            <X className="size-4" aria-hidden="true" />
          </span>
          <div>
            <p className="font-semibold">Pedido cancelado</p>
            <p className="mt-1 text-sm text-red-700">
              Entre em contato com a loja se precisar de ajuda.
            </p>
          </div>
        </div>
      )}

      {steps.map((step, index) => {
        const isCurrent = activeIndex === index;
        const isComplete = Boolean(step.timestamp) || (activeIndex >= 0 && index < activeIndex);
        const timestamp = formatDateTime(step.timestamp);

        return (
          <div key={step.status} className="grid grid-cols-[2rem_1fr] gap-3">
            <div className="flex flex-col items-center">
              <span
                className={cn(
                  "grid size-8 place-items-center rounded-full border-2 bg-background",
                  isComplete && "border-primary bg-primary text-primary-foreground",
                  isCurrent && !isComplete && "border-primary text-primary",
                  !isComplete && !isCurrent && "border-muted text-muted-foreground",
                )}
                aria-hidden="true"
              >
                {isComplete ? <Check className="size-4" /> : <Circle className="size-3 fill-current" />}
              </span>
              {index < steps.length - 1 && (
                <span className={cn("min-h-12 w-0.5 flex-1 bg-border", isComplete && "bg-primary")} />
              )}
            </div>
            <div className="pb-6 pt-1">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className={cn("font-semibold", !isComplete && !isCurrent && "text-muted-foreground")}>
                  {step.label}
                </p>
                {timestamp && <time className="text-xs text-muted-foreground">{timestamp}</time>}
              </div>
              <p className="mt-1 text-sm text-muted-foreground">{step.description}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
