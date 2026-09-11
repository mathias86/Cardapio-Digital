"use client";

import { useEffect, useRef, useState } from "react";
import {
  REALTIME_SUBSCRIBE_STATES,
  type RealtimePostgresChangesPayload,
} from "@supabase/supabase-js";
import { useQueryClient } from "@tanstack/react-query";

import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

export type RealtimeConnectionStatus = "connecting" | "connected" | "fallback";

type UseOrdersRealtimeOptions = {
  queryKey: string;
  onInsert?: () => void;
};

export function useOrdersRealtime({ queryKey, onInsert }: UseOrdersRealtimeOptions) {
  const [status, setStatus] = useState<RealtimeConnectionStatus>("connecting");
  const onInsertRef = useRef(onInsert);
  const queryClient = useQueryClient();

  useEffect(() => {
    onInsertRef.current = onInsert;
  }, [onInsert]);

  useEffect(() => {
    const supabase = createSupabaseBrowserClient();
    const channel = supabase
      .channel(`orders-${queryKey}-${crypto.randomUUID()}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "orders" },
        (payload: RealtimePostgresChangesPayload<Record<string, unknown>>) => {
          void queryClient.invalidateQueries({ queryKey: [queryKey] });
          if (payload.eventType === "INSERT") onInsertRef.current?.();
        },
      )
      .subscribe((subscriptionStatus: REALTIME_SUBSCRIBE_STATES) => {
        if (subscriptionStatus === REALTIME_SUBSCRIBE_STATES.SUBSCRIBED) setStatus("connected");
        if (
          subscriptionStatus === REALTIME_SUBSCRIBE_STATES.CHANNEL_ERROR ||
          subscriptionStatus === REALTIME_SUBSCRIBE_STATES.TIMED_OUT ||
          subscriptionStatus === REALTIME_SUBSCRIBE_STATES.CLOSED
        ) {
          setStatus("fallback");
        }
      });

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [queryClient, queryKey]);

  return status;
}
