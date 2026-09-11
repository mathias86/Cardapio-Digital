import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { z } from "zod";

import { DeliveryPrintReceipt } from "@/components/delivery/delivery-print-receipt";

export const metadata: Metadata = {
  title: "Recibo de entrega",
  robots: { index: false, follow: false },
};

async function DeliveryPrintContent({
  params,
}: {
  params: PageProps<"/print/entrega/[orderId]">["params"];
}) {
  const { orderId } = await params;
  const parsedOrderId = z.uuid().safeParse(orderId);

  if (!parsedOrderId.success) notFound();

  return <DeliveryPrintReceipt orderId={parsedOrderId.data} />;
}

export default function DeliveryPrintPage({
  params,
}: PageProps<"/print/entrega/[orderId]">) {
  return (
    <Suspense fallback={<div className="min-h-screen animate-pulse bg-white" />}>
      <DeliveryPrintContent params={params} />
    </Suspense>
  );
}
