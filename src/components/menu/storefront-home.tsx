import Image from "next/image";
import Link from "next/link";
import { connection } from "next/server";
import {
  ArrowRight,
  Clock3,
  MapPin,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  Store,
  Truck,
} from "lucide-react";

import { ProductImage } from "@/components/menu/product-image";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { formatCurrency } from "@/lib/formatters/currency";
import { getSafePublicImageUrl } from "@/lib/images";
import { getPublicMenuData } from "@/services/public-menu";

export async function StorefrontHome() {
  await connection();

  let menuData: Awaited<ReturnType<typeof getPublicMenuData>> | null = null;

  try {
    menuData = await getPublicMenuData();
  } catch (error) {
    console.error("Erro ao carregar a vitrine pública", error);
  }

  if (!menuData) {
    return (
      <section className="surface-grid flex flex-1 items-center px-4 py-20 sm:px-6 lg:px-8">
        <div className="mx-auto w-full max-w-7xl">
          <p className="text-sm font-bold uppercase tracking-[0.2em] text-primary">Cardápio Digital</p>
          <h1 className="mt-4 max-w-3xl text-4xl font-bold tracking-[-0.04em] sm:text-6xl">
            Nosso cardápio está temporariamente indisponível.
          </h1>
          <p className="mt-5 max-w-2xl text-lg leading-8 text-muted-foreground">
            Estamos organizando tudo por aqui. Tente novamente em alguns instantes.
          </p>
          <Button render={<Link href="/cardapio" />} variant="outline" className="mt-8">
            Ver estado do cardápio
          </Button>
        </div>
      </section>
    );
  }

  const { categories, settings } = menuData;
  const products = categories.flatMap((category) => category.products);
  const featuredProduct = products[0];
  const logoUrl = getSafePublicImageUrl(settings.logo_url);

  return (
    <>
        <section className="surface-grid relative overflow-hidden px-4 py-16 sm:px-6 sm:py-24 lg:px-8">
          <div className="absolute -right-24 top-10 size-96 rounded-full bg-primary/10 blur-3xl" />
          <div className="relative mx-auto grid w-full max-w-7xl items-center gap-12 lg:grid-cols-[1.08fr_0.92fr]">
            <div>
              <div className="flex flex-wrap items-center gap-3">
                {logoUrl && (
                  <span className="relative size-12 overflow-hidden rounded-xl border bg-card shadow-sm">
                    <Image src={logoUrl} alt={`Logo ${settings.name}`} fill sizes="48px" className="object-cover" />
                  </span>
                )}
                <Badge
                  variant="secondary"
                  className={settings.is_open ? "bg-emerald-100 text-emerald-800" : ""}
                >
                  <span className={`size-1.5 rounded-full ${settings.is_open ? "bg-emerald-500" : "bg-muted-foreground"}`} />
                  {settings.is_open ? "Aberta agora" : "Fechada no momento"}
                </Badge>
              </div>
              <p className="mt-7 text-sm font-bold uppercase tracking-[0.2em] text-primary">
                {settings.name}
              </p>
              <h1 className="mt-3 text-balance text-4xl font-bold tracking-[-0.045em] sm:text-6xl lg:text-7xl">
                Sabor de verdade, pedido sem complicação.
              </h1>
              <p className="mt-6 max-w-2xl text-pretty text-lg leading-8 text-muted-foreground sm:text-xl">
                Explore o cardápio, escolha seus favoritos e acompanhe tudo de um jeito simples e rápido.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Button render={<Link href="/cardapio" />} size="lg">
                  Ver cardápio
                  <ArrowRight aria-hidden="true" />
                </Button>
                <Button render={<Link href="/pedido/acompanhar" />} variant="outline" size="lg">
                  Acompanhar pedido
                </Button>
              </div>
              <div className="mt-10 flex flex-wrap gap-x-8 gap-y-4 text-sm font-medium text-muted-foreground">
                <span className="flex items-center gap-2">
                  <ShoppingBag className="size-4 text-primary" aria-hidden="true" />
                  Pedido online
                </span>
                <span className="flex items-center gap-2">
                  <Truck className="size-4 text-primary" aria-hidden="true" />
                  Entrega ou retirada
                </span>
                <span className="flex items-center gap-2">
                  <ShieldCheck className="size-4 text-primary" aria-hidden="true" />
                  Valores calculados no servidor
                </span>
              </div>
            </div>

            <div className="relative mx-auto w-full max-w-xl lg:mx-0">
              <div className="absolute -inset-5 -rotate-2 rounded-[2rem] bg-accent/60" />
              <Card className="relative gap-0 overflow-hidden rounded-[1.75rem] py-0 shadow-2xl">
                <div className="relative aspect-[4/3] bg-muted">
                  {featuredProduct ? (
                    <ProductImage imageUrl={featuredProduct.image_url} name={featuredProduct.name} priority />
                  ) : (
                    <div className="grid h-full place-items-center bg-gradient-to-br from-primary/15 via-accent to-background text-primary">
                      <Store className="size-20" strokeWidth={1.2} aria-hidden="true" />
                    </div>
                  )}
                  <Badge className="absolute left-5 top-5 shadow-md">
                    <Sparkles aria-hidden="true" />
                    Destaque da casa
                  </Badge>
                </div>
                <div className="flex items-end justify-between gap-5 p-6">
                  <div>
                    <p className="text-xl font-bold">
                      {featuredProduct?.name ?? "Cardápio sendo preparado"}
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {featuredProduct?.description ?? "Novidades deliciosas chegam em breve."}
                    </p>
                  </div>
                  {featuredProduct && (
                    <p className="shrink-0 text-xl font-bold text-primary">
                      {formatCurrency(featuredProduct.price)}
                    </p>
                  )}
                </div>
              </Card>
            </div>
          </div>
        </section>

        <section className="border-y bg-card px-4 py-8 sm:px-6 lg:px-8">
          <div className="mx-auto flex w-full max-w-7xl flex-col gap-4 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2">
              <MapPin className="size-4 text-primary" aria-hidden="true" />
              {settings.address ?? "Consulte o endereço da loja no atendimento"}
            </div>
            <div className="flex items-center gap-2">
              <Clock3 className="size-4 text-primary" aria-hidden="true" />
              Pedido mínimo {formatCurrency(settings.minimum_order_value)}
              {settings.delivery_price_per_km > 0 ? ` · Entrega ${formatCurrency(settings.delivery_price_per_km)}/km` : settings.delivery_fee > 0 && ` · Entrega ${formatCurrency(settings.delivery_fee)}`}
            </div>
          </div>
        </section>
    </>
  );
}
