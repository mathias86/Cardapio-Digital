import { Suspense } from "react";

import { MenuSkeleton } from "@/components/menu/menu-skeleton";
import { StorefrontHome } from "@/components/menu/storefront-home";

export default function HomePage() {
  return (
    <Suspense fallback={<MenuSkeleton />}>
      <StorefrontHome />
    </Suspense>
  );
}
