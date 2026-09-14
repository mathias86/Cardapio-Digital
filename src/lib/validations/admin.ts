import { z } from "zod";

const optionalInteger = z.union([z.literal(""), z.coerce.number().int().min(0)]);

export const categoryFormSchema = z.object({
  name: z.string().trim().min(2, "Informe o nome.").max(100),
  description: z.string().trim().max(300),
  display_order: z.coerce.number().int().min(0),
  active: z.boolean(),
});

export const productFormSchema = z.object({
  category_id: z.uuid("Selecione uma categoria."),
  name: z.string().trim().min(2, "Informe o nome.").max(140),
  description: z.string().trim().max(500),
  price: z.coerce.number().min(0, "Informe um preço válido."),
  stock_quantity: optionalInteger,
  low_stock_threshold: optionalInteger,
  display_order: z.coerce.number().int().min(0),
  active: z.boolean(),
  image_url: z.string().trim(),
});

export const settingsFormSchema = z.object({
  name: z.string().trim().min(2).max(120),
  logo_url: z.string().trim(),
  is_open: z.boolean(),
  delivery_fee: z.coerce.number().min(0),
  delivery_price_per_km: z.coerce.number().min(0),
  minimum_order_value: z.coerce.number().min(0),
  phone: z.string().trim().max(30),
  whatsapp: z.string().trim().max(30),
  address: z.string().trim().max(300),
  pix_key: z.string().trim().max(160),
  pix_name: z.string().trim().max(160),
});

export type CategoryFormValues = z.infer<typeof categoryFormSchema>;
export type ProductFormValues = z.infer<typeof productFormSchema>;
export type SettingsFormValues = z.infer<typeof settingsFormSchema>;
export type CategoryFormInput = z.input<typeof categoryFormSchema>;
export type ProductFormInput = z.input<typeof productFormSchema>;
export type SettingsFormInput = z.input<typeof settingsFormSchema>;
