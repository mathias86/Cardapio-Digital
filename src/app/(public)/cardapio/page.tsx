import type { Metadata } from "next";
import { Suspense } from "react";

import { MenuSkeleton } from "@/components/menu/menu-skeleton";
import { PublicMenuContent } from "@/components/menu/public-menu-content";

export const metadata: Metadata = {
  title: "Cardápio",
  description: "Conheça nossos produtos e escolha seus favoritos.",
};

export default function MenuPage() {
  return (
    <Suspense fallback={<MenuSkeleton />}>
      <PublicMenuContent />
    </Suspense>
  );
}
