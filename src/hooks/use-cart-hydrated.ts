"use client";

import { useSyncExternalStore } from "react";

import { useCartStore } from "@/stores/cart-store";

function subscribeToHydration(callback: () => void) {
  const unsubscribeStart = useCartStore.persist.onHydrate(callback);
  const unsubscribeFinish = useCartStore.persist.onFinishHydration(callback);

  return () => {
    unsubscribeStart();
    unsubscribeFinish();
  };
}

export function useCartHydrated() {
  return useSyncExternalStore(
    subscribeToHydration,
    () => useCartStore.persist.hasHydrated(),
    () => false,
  );
}
