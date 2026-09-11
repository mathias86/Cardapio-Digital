import Link from "next/link";

import { CartSheet } from "@/components/cart/cart-sheet";
import { Brand } from "@/components/layout/brand";
import { Button } from "@/components/ui/button";

export function PublicHeader() {
  return (
    <header className="sticky top-0 z-40 border-b bg-background/90 backdrop-blur-xl">
      <div className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link href="/" aria-label="Ir para o início">
          <Brand />
        </Link>
        <nav className="flex items-center gap-2" aria-label="Navegação principal">
          <Button render={<Link href="/cardapio" />} variant="ghost">
            Cardápio
          </Button>
          <CartSheet />
        </nav>
      </div>
    </header>
  );
}
