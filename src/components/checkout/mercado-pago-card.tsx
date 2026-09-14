"use client";

import { useEffect } from "react";
import { CardPayment, initMercadoPago } from "@mercadopago/sdk-react";

export function MercadoPagoCard({ amount, email, publicKey, onSubmit, onError }: { amount: number; email?: string; publicKey: string; onSubmit: (data: Record<string, unknown>) => Promise<void>; onError: (message: string) => void }) {
  useEffect(() => { initMercadoPago(publicKey, { locale: "pt-BR" }); }, [publicKey]);
  return <CardPayment
    initialization={{ amount, payer: { email } }}
    locale="pt-BR"
    customization={{ paymentMethods: { maxInstallments: 12, types: { included: ["credit_card", "debit_card"] } } }}
    onSubmit={async (formData, additionalData) => onSubmit({ ...formData, payment_type_id: additionalData?.paymentTypeId })}
    onError={(error) => onError(error instanceof Error && error.message ? error.message : "Não foi possível carregar o formulário do cartão. Atualize a página e tente novamente.")}
  />;
}
