import { connection } from "next/server";

import { CheckoutForm } from "@/components/checkout/checkout-form";
import { MenuErrorState } from "@/components/menu/menu-feedback";
import { getPublicMenuData } from "@/services/public-menu";

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

  const mercadoPagoPublicKey = process.env.NEXT_PUBLIC_MERCADO_PAGO_PUBLIC_KEY;
  const mercadoPagoEnabled = Boolean(mercadoPagoPublicKey && process.env.MERCADO_PAGO_ACCESS_TOKEN && process.env.SUPABASE_SERVICE_ROLE_KEY);
  return <CheckoutForm settings={menuData.settings} mercadoPagoPublicKey={mercadoPagoPublicKey} mercadoPagoEnabled={mercadoPagoEnabled} />;
}
