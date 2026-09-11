import { connection } from "next/server";
import { Clock3, MapPin, Store } from "lucide-react";

import { MenuCatalog } from "@/components/menu/menu-catalog";
import { MenuEmptyState, MenuErrorState } from "@/components/menu/menu-feedback";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/formatters/currency";
import { getPublicMenuData } from "@/services/public-menu";

export async function PublicMenuContent() {
  await connection();

  let menuData: Awaited<ReturnType<typeof getPublicMenuData>> | null = null;

  try {
    menuData = await getPublicMenuData();
  } catch (error) {
    console.error("Erro ao carregar cardápio público", error);
  }

  if (!menuData) {
    return <MenuErrorState />;
  }

  const { categories, settings } = menuData;
  const visibleCategories = categories.filter(
    (category) => category.products.length > 0,
  );

  return (
    <>
        <section className="border-b bg-card">
          <div className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6 sm:py-14 lg:px-8">
            <Badge
              variant={settings.is_open ? "secondary" : "outline"}
              className={settings.is_open ? "bg-emerald-100 text-emerald-800" : ""}
            >
              <span className={`size-1.5 rounded-full ${settings.is_open ? "bg-emerald-500" : "bg-muted-foreground"}`} />
              {settings.is_open ? "Aberta agora" : "Fechada no momento"}
            </Badge>
            <h1 className="mt-5 text-4xl font-bold tracking-[-0.035em] sm:text-5xl">
              {settings.name}
            </h1>
            <p className="mt-3 max-w-2xl text-lg text-muted-foreground">
              Escolha seus favoritos e veja todos os detalhes antes de pedir.
            </p>
            <div className="mt-7 flex flex-wrap gap-x-7 gap-y-3 text-sm text-muted-foreground">
              {settings.address && (
                <span className="flex items-center gap-2">
                  <MapPin className="size-4 text-primary" aria-hidden="true" />
                  {settings.address}
                </span>
              )}
              <span className="flex items-center gap-2">
                <Store className="size-4 text-primary" aria-hidden="true" />
                Pedido mínimo {formatCurrency(settings.minimum_order_value)}
              </span>
              <span className="flex items-center gap-2">
                <Clock3 className="size-4 text-primary" aria-hidden="true" />
                Taxa de entrega {formatCurrency(settings.delivery_fee)}
              </span>
            </div>
          </div>
        </section>

        <div className="px-4 sm:px-6 lg:px-8">
          {visibleCategories.length > 0 ? (
            <MenuCatalog
              categories={visibleCategories}
              isStoreOpen={settings.is_open}
            />
          ) : (
            <MenuEmptyState />
          )}
        </div>
    </>
  );
}
