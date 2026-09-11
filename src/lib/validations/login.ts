import { z } from "zod";

export const loginSchema = z.object({
  email: z.email("Informe um e-mail válido.").trim(),
  password: z.string().min(6, "A senha deve ter pelo menos 6 caracteres."),
});

export type LoginFormValues = z.infer<typeof loginSchema>;
