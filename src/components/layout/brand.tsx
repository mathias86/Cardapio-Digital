import { Utensils } from "lucide-react";

import { cn } from "@/lib/utils";

type BrandProps = {
  compact?: boolean;
  inverse?: boolean;
};

export function Brand({ compact = false, inverse = false }: BrandProps) {
  return (
    <div className="flex items-center gap-3" aria-label="Cardápio Digital">
      <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary text-primary-foreground shadow-sm">
        <Utensils className="size-5" aria-hidden="true" />
      </span>
      {!compact && (
        <span
          className={cn(
            "text-base font-bold tracking-tight",
            inverse ? "text-sidebar-foreground" : "text-foreground",
          )}
        >
          Cardápio Digital
        </span>
      )}
    </div>
  );
}
