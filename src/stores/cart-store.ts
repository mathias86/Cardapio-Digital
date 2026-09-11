"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

import type { MenuProduct } from "@/types/menu";

export type CartItem = {
  lineId: string;
  productId: string;
  name: string;
  price: number;
  imageUrl: string | null;
  quantity: number;
  notes: string;
  stockQuantity: number | null;
  selectedAddons: Array<{ id: string; name: string; price: number }>;
};

type AddCartItemInput = {
  product: MenuProduct;
  quantity: number;
  notes: string;
  selectedAddons: Array<{ id: string; name: string; price: number }>;
};

type CartState = {
  items: CartItem[];
  addItem: (input: AddCartItemInput) => void;
  clearCart: () => void;
  removeItem: (lineId: string) => void;
  updateQuantity: (lineId: string, quantity: number) => void;
};

function createLineId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export const useCartStore = create<CartState>()(
  persist(
    (set) => ({
      items: [],
      addItem: ({ product, quantity, notes, selectedAddons }) =>
        set((state) => ({
          items: [
            ...state.items,
            {
              lineId: createLineId(),
              productId: product.id,
              name: product.name,
              price: product.price + selectedAddons.reduce((sum, addon) => sum + addon.price, 0),
              imageUrl: product.image_url,
              quantity,
              notes: notes.trim(),
              stockQuantity: product.stock_quantity,
              selectedAddons,
            },
          ],
        })),
      clearCart: () => set({ items: [] }),
      removeItem: (lineId) =>
        set((state) => ({
          items: state.items.filter((item) => item.lineId !== lineId),
        })),
      updateQuantity: (lineId, quantity) =>
        set((state) => ({
          items: state.items.map((item) => {
            if (item.lineId !== lineId) return item;

            const maximum = item.stockQuantity ?? 99;
            return {
              ...item,
              quantity: Math.min(Math.max(1, quantity), maximum),
            };
          }),
        })),
    }),
    {
      name: "cardapio-digital-cart",
      version: 2,
      storage: createJSONStorage(() => localStorage),
      skipHydration: true,
      partialize: (state) => ({ items: state.items }),
      migrate: (persisted) => {
        const state = persisted as CartState;
        return { ...state, items: (state.items ?? []).map((item) => ({ ...item, selectedAddons: item.selectedAddons ?? [] })) };
      },
    },
  ),
);

export function getCartCount(items: CartItem[]) {
  return items.reduce((total, item) => total + item.quantity, 0);
}

export function getCartSubtotal(items: CartItem[]) {
  return items.reduce((total, item) => total + item.price * item.quantity, 0);
}
