import Link from "next/link";
import { ShoppingBasket } from "lucide-react";

import { Button } from "@/components/ui/button";

export function CartEmpty({ compact = false }: { compact?: boolean }) {
  return (
    <div className={`grid place-items-center text-center ${compact ? "min-h-72 px-6" : "min-h-[28rem] rounded-2xl border border-dashed bg-card p-10"}`}>
      <div>
        <span className="mx-auto grid size-14 place-items-center rounded-2xl bg-primary/10 text-primary">
          <ShoppingBasket className="size-7" aria-hidden="true" />
        </span>
        <h2 className="mt-5 text-xl font-bold">Seu carrinho está vazio</h2>
        <p className="mt-2 max-w-sm text-sm leading-6 text-muted-foreground">
          Escolha algo gostoso no cardápio para começar seu pedido.
        </p>
        <Button render={<Link href="/cardapio" />} className="mt-6">
          Explorar cardápio
        </Button>
      </div>
    </div>
  );
}
