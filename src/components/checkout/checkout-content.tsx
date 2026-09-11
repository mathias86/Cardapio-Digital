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

  return <CheckoutForm settings={menuData.settings} />;
}
