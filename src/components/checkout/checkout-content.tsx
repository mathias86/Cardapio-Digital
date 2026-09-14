import { connection } from "next/server";

import { CheckoutForm } from "@/components/checkout/checkout-form";
import { MenuErrorState } from "@/components/menu/menu-feedback";
import { getPublicMenuData } from "@/services/public-menu";
import { getMercadoPagoPublicSettings } from "@/services/payment-settings";

export async function CheckoutContent() {
  await connection();

  let menuData: Awaited<ReturnType<typeof getPublicMenuData>> | null = null;

  try {
    menuData = await getPublicMenuData();
  } catch (error) {
    console.error("Erro ao carregar configurações do checkout", error);
  }

  if (!menuData) {
    return <MenuErrorState />;
  }

  const paymentSettings = await getMercadoPagoPublicSettings().catch(() => null);
  return <CheckoutForm settings={menuData.settings} mercadoPagoPublicKey={paymentSettings?.public_key ?? undefined} mercadoPagoEnabled={paymentSettings?.enabled ?? false} mercadoPagoEnvironment={paymentSettings?.environment} />;
}
