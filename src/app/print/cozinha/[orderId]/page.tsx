import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { z } from "zod";

import { KitchenPrintReceipt } from "@/components/kitchen/kitchen-print-receipt";

export const metadata: Metadata = {
  title: "Comanda da cozinha",
  robots: { index: false, follow: false },
};

async function KitchenPrintContent({
  params,
}: {
  params: PageProps<"/print/cozinha/[orderId]">["params"];
}) {
  const { orderId } = await params;
  const parsedOrderId = z.uuid().safeParse(orderId);

  if (!parsedOrderId.success) notFound();

  return <KitchenPrintReceipt orderId={parsedOrderId.data} />;
}

export default function KitchenPrintPage({
  params,
}: PageProps<"/print/cozinha/[orderId]">) {
  return (
    <Suspense fallback={<div className="min-h-screen animate-pulse bg-white" />}>
      <KitchenPrintContent params={params} />
    </Suspense>
  );
}
