import type { Metadata } from "next";
import { z } from "zod";

import { TrackingLookup } from "@/components/order/tracking-lookup";
import { TrackingView } from "@/components/order/tracking-view";

export const metadata: Metadata = {
  title: "Acompanhar pedido",
  robots: { index: false, follow: false },
};

const tokenSchema = z.uuid();

export default async function OrderTrackingPage({
  searchParams,
}: PageProps<"/pedido/acompanhar">) {
  const query = await searchParams;
  const token = typeof query.token === "string" ? query.token : null;
  const parsedToken = tokenSchema.safeParse(token);

  return (
    <section className="mx-auto w-full max-w-6xl flex-1 px-4 py-10 sm:px-6 lg:px-8">
      <div className="mb-8 text-center">
        <p className="text-sm font-bold uppercase tracking-[0.18em] text-primary">Seu pedido</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">Acompanhar pedido</h1>
        <p className="mx-auto mt-3 max-w-2xl text-muted-foreground">
          Veja o andamento do preparo e da entrega em um só lugar.
        </p>
      </div>

      {parsedToken.success ? (
        <TrackingView accessToken={parsedToken.data} />
      ) : (
        <>
          {token && (
            <p className="mx-auto mb-4 max-w-xl rounded-xl border border-destructive/20 bg-destructive/5 p-3 text-center text-sm text-destructive" role="alert">
              O código informado é inválido. Confira o link e tente novamente.
            </p>
          )}
          <TrackingLookup />
        </>
      )}
    </section>
  );
}
