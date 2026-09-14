import { z } from "zod";

const optionalText = (maximum: number) => z.string().trim().max(maximum);

export function createCheckoutSchema() {
  return z
    .object({
      customer_name: z.string().trim().min(2, "Informe seu nome.").max(120),
      customer_phone: z
        .string()
        .trim()
        .regex(/^[0-9+() .-]{8,25}$/, "Informe um telefone válido."),
      customer_email: z
        .union([z.literal(""), z.email("Informe um e-mail válido.")])
        .optional(),
      delivery_type: z.enum(["DELIVERY", "PICKUP"]),
      address_street: optionalText(160),
      address_number: optionalText(30),
      address_neighborhood: optionalText(100),
      address_complement: optionalText(120),
      address_reference: optionalText(160),
      payment_method: z.enum(["PIX", "CARD", "CASH"]),
      change_for: optionalText(20),
      notes: optionalText(500),
    })
    .superRefine((data, context) => {
      if (data.delivery_type === "DELIVERY") {
        for (const [field, message] of [
          ["address_street", "Informe a rua."],
          ["address_number", "Informe o número."],
          ["address_neighborhood", "Informe o bairro."],
        ] as const) {
          if (!data[field]) {
            context.addIssue({ code: "custom", path: [field], message });
          }
        }
      }

      if (data.payment_method !== "CASH" && !data.customer_email) {
        context.addIssue({
          code: "custom",
          path: ["customer_email"],
          message: "Informe seu e-mail para o pagamento online.",
        });
      }

      if (data.payment_method === "CASH" && data.change_for) {
        const changeFor = Number(data.change_for.replace(",", "."));
        if (!Number.isFinite(changeFor) || changeFor <= 0) {
          context.addIssue({
            code: "custom",
            path: ["change_for"],
            message: "Informe um valor válido para o troco.",
          });
        }
      }
    });
}

export type CheckoutFormValues = z.infer<ReturnType<typeof createCheckoutSchema>>;
