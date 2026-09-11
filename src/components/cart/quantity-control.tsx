"use client";

import { Minus, Plus } from "lucide-react";

import { Button } from "@/components/ui/button";

type QuantityControlProps = {
  maximum?: number;
  onChange: (quantity: number) => void;
  value: number;
};

export function QuantityControl({
  maximum = 99,
  onChange,
  value,
}: QuantityControlProps) {
  return (
    <div className="inline-flex items-center rounded-xl border bg-card p-1 shadow-sm">
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        onClick={() => onChange(value - 1)}
        disabled={value <= 1}
        aria-label="Diminuir quantidade"
      >
        <Minus aria-hidden="true" />
      </Button>
      <span className="min-w-9 text-center text-sm font-bold" aria-live="polite">
        {value}
      </span>
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        onClick={() => onChange(value + 1)}
        disabled={value >= maximum}
        aria-label="Aumentar quantidade"
      >
        <Plus aria-hidden="true" />
      </Button>
    </div>
  );
}
