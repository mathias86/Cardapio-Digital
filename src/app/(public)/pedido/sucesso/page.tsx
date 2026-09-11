import type { Metadata } from "next";
import Link from "next/link";
import { CheckCircle2, ClipboardList, Utensils } from "lucide-react";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export const metadata: Metadata = {
  title: "Pedido recebido",
  robots: { index: false, follow: false },
};

const successParamsSchema = z.object({
  token: z.uuid(),
  numero: z.coerce.number().int().positive(),
});

export default async function OrderSuccessPage({
  searchParams,
}: PageProps<"/pedido/sucesso">) {
  const query = await searchParams;
  const parsed = successParamsSchema.safeParse({
    token: typeof query.token === "string" ? query.token : "",
    numero: typeof query.numero === "string" ? query.numero : "",
  });

  if (!parsed.success) {
    return (
      <section className="mx-auto grid w-full max-w-3xl flex-1 place-items-center px-4 py-12 sm:px-6">
        <Card className="w-full text-center">
          <CardContent className="py-10">
            <h1 className="text-2xl font-bold">Confirmação não encontrada</h1>
            <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-muted-foreground">
              Finalize um pedido pelo checkout para receber o número e o link de acompanhamento.
            </p>
            <Button render={<Link href="/cardapio" />} className="mt-6">
              Ir para o cardápio
            </Button>
          </CardContent>
        </Card>
      </section>
    );
  }

  const trackingHref = `/pedido/acompanhar?token=${encodeURIComponent(parsed.data.token)}`;

  return (
    <section className="mx-auto grid w-full max-w-3xl flex-1 place-items-center px-4 py-12 sm:px-6">
      <Card className="w-full overflow-hidden text-center shadow-lg">
        <div className="h-2 bg-primary" />
        <CardContent className="px-6 py-10 sm:px-12 sm:py-14">
          <span className="mx-auto grid size-16 place-items-center rounded-full bg-emerald-100 text-emerald-700">
            <CheckCircle2 className="size-9" aria-hidden="true" />
          </span>
          <p className="mt-6 text-sm font-bold uppercase tracking-[0.18em] text-primary">Pedido recebido</p>
          <h1 className="mt-2 text-4xl font-bold tracking-tight sm:text-5xl">#{parsed.data.numero}</h1>
          <p className="mx-auto mt-4 max-w-lg leading-7 text-muted-foreground">
            Seu pedido foi confirmado e enviado para a loja. Acompanhe cada mudança de status pelo link abaixo.
          </p>
          <div className="mx-auto mt-8 flex max-w-md flex-col gap-3">
            <Button render={<Link href={trackingHref} />} size="lg">
              <ClipboardList aria-hidden="true" />
              Acompanhar pedido
            </Button>
            <Button render={<Link href="/cardapio" />} variant="outline" size="lg">
              <Utensils aria-hidden="true" />
              Voltar ao cardápio
            </Button>
          </div>
          <p className="mt-7 text-xs leading-5 text-muted-foreground">
            Guarde o link de acompanhamento. Ele é a chave de acesso ao seu pedido.
          </p>
        </CardContent>
      </Card>
    </section>
  );
}
