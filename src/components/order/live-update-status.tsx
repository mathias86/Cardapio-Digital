import { Radio, RefreshCw, WifiOff } from "lucide-react";

import type { RealtimeConnectionStatus } from "@/hooks/use-orders-realtime";

export function LiveUpdateStatus({
  status,
  isFetching = false,
  fallbackSeconds = 30,
}: {
  status: RealtimeConnectionStatus;
  isFetching?: boolean;
  fallbackSeconds?: number;
}) {
  if (isFetching) {
    return (
      <span className="flex items-center gap-2" role="status">
        <RefreshCw className="size-3.5 animate-spin" aria-hidden="true" />
        Sincronizando pedidos
      </span>
    );
  }

  if (status === "connected") {
    return (
      <span className="flex items-center gap-2 text-emerald-700" role="status">
        <Radio className="size-3.5" aria-hidden="true" />
        Tempo real ativo
      </span>
    );
  }

  if (status === "connecting") {
    return (
      <span className="flex items-center gap-2" role="status">
        <span className="size-2 animate-pulse rounded-full bg-amber-500" />
        Conectando ao tempo real
      </span>
    );
  }

  return (
    <span className="flex items-center gap-2 text-amber-700" role="status">
      <WifiOff className="size-3.5" aria-hidden="true" />
      Contingência ativa · atualização a cada {fallbackSeconds}s
    </span>
  );
}
