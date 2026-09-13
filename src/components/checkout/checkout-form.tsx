"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { AlertCircle, CheckCircle2, Copy, CreditCard, LoaderCircle, MapPin, ShoppingBag, Store, WalletCards } from "lucide-react";
import { useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";

import { CartEmpty } from "@/components/cart/cart-empty";
import { MercadoPagoCard } from "@/components/checkout/mercado-pago-card";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { useCartHydrated } from "@/hooks/use-cart-hydrated";
import { formatCurrency } from "@/lib/formatters/currency";
import { createCheckoutSchema, type CheckoutFormValues } from "@/lib/validations/checkout";
import { createOrder } from "@/services/orders";
import { validateCoupon, type CouponValidation } from "@/services/coupons";
import { getCartSubtotal, useCartStore } from "@/stores/cart-store";
import type { StoreSettings } from "@/types/menu";
import type { CreatedOrder, CreateOrderPayload } from "@/types/order";

type CheckoutFormProps = {
  settings: StoreSettings;
  mercadoPagoEnabled: boolean;
  mercadoPagoPublicKey?: string;
};

const paymentOptions = [
  { value: "PIX", label: "Pix", icon: WalletCards },
  { value: "CARD", label: "Cartão", icon: CreditCard },
  { value: "CASH", label: "Dinheiro", icon: Store },
] as const;

function FieldError({ message }: { message?: string }) {
  return message ? <p className="text-xs text-destructive">{message}</p> : null;
}

export function CheckoutForm({ settings, mercadoPagoEnabled, mercadoPagoPublicKey }: CheckoutFormProps) {
  const router = useRouter();
  const hydrated = useCartHydrated();
  const items = useCartStore((state) => state.items);
  const clearCart = useCartStore((state) => state.clearCart);
  const [submissionError, setSubmissionError] = useState<string | null>(null);
  const [cardOrder, setCardOrder] = useState<{ order: CreatedOrder; email?: string } | null>(null);
  const [pixResult, setPixResult] = useState<{ order: CreatedOrder; qr_code?: string; qr_code_base64?: string } | null>(null);
  const [couponCode, setCouponCode] = useState("");
  const [coupon, setCoupon] = useState<(CouponValidation & { subtotal: number }) | null>(null);
  const [couponLoading, setCouponLoading] = useState(false);
  const subtotal = getCartSubtotal(items);
  const schema = useMemo(
    () => createCheckoutSchema(subtotal, settings.delivery_fee),
    [settings.delivery_fee, subtotal],
  );

  const form = useForm<CheckoutFormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      customer_name: "",
      customer_phone: "",
      customer_email: "",
      delivery_type: "DELIVERY",
      address_street: "",
      address_number: "",
      address_neighborhood: "",
      address_complement: "",
      address_reference: "",
      payment_method: mercadoPagoEnabled ? "PIX" : "CASH",
      change_for: "",
      notes: "",
    },
  });

  const deliveryType = useWatch({ control: form.control, name: "delivery_type" });
  const paymentMethod = useWatch({ control: form.control, name: "payment_method" });
  const deliveryFee = deliveryType === "DELIVERY" ? settings.delivery_fee : 0;
  const appliedCoupon = coupon?.subtotal === subtotal ? coupon : null;
  const discount = appliedCoupon?.discount_amount ?? 0;
  const total = subtotal + deliveryFee - discount;
  const belowMinimum = subtotal < settings.minimum_order_value;

  if (!hydrated) {
    return <div className="min-h-[36rem] animate-pulse rounded-2xl border bg-card" />;
  }

  if (items.length === 0) {
    return <CartEmpty />;
  }

  async function handleValidForm(values: CheckoutFormValues) {
    setSubmissionError(null);

    try {
      if (values.payment_method !== "CASH" && !mercadoPagoEnabled) {
        throw new Error("O pagamento online ainda não foi ativado pela loja. Escolha dinheiro ou tente mais tarde.");
      }
      const payload: CreateOrderPayload = {
        customer_name: values.customer_name,
        customer_phone: values.customer_phone,
        customer_email: values.customer_email || undefined,
        delivery_type: values.delivery_type,
        payment_method: values.payment_method,
        change_for:
          values.payment_method === "CASH" && values.change_for
            ? Number(values.change_for.replace(",", "."))
            : undefined,
        address:
          values.delivery_type === "DELIVERY"
            ? {
                street: values.address_street,
                number: values.address_number,
                neighborhood: values.address_neighborhood,
                complement: values.address_complement || undefined,
                reference: values.address_reference || undefined,
              }
            : undefined,
        notes: values.notes || undefined,
        coupon_code: appliedCoupon?.code,
        items: items.map((item) => ({
          product_id: item.productId,
          quantity: item.quantity,
          notes: item.notes || undefined,
          addon_ids: item.selectedAddons.map((addon) => addon.id),
        })),
      };
      const order = await createOrder(payload);

      if (values.payment_method === "CARD") {
        setCardOrder({ order, email: values.customer_email || undefined });
        return;
      }
      if (values.payment_method === "PIX") {
        const response = await fetch("/api/mercado-pago/orders", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ order_id: order.order_id, access_token: order.access_token }),
        });
        const payment = await response.json() as { error?: string; qr_code?: string; qr_code_base64?: string };
        if (!response.ok) throw new Error(payment.error ?? "Não foi possível gerar o Pix.");
        clearCart();
        setPixResult({ order, qr_code: payment.qr_code, qr_code_base64: payment.qr_code_base64 });
        return;
      }

      clearCart();
      toast.success(`Pedido #${order.order_number} confirmado.`);

      const query = new URLSearchParams({
        token: order.access_token,
        numero: String(order.order_number),
      });
      router.replace(`/pedido/sucesso?${query.toString()}`);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Não foi possível finalizar o pedido. Tente novamente.";
      setSubmissionError(message);
      toast.error("Não foi possível confirmar o pedido.");
    }
  }

  async function submitCard(paymentData: Record<string, unknown>) {
    if (!cardOrder) return;
    setSubmissionError(null);
    const response = await fetch("/api/mercado-pago/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ order_id: cardOrder.order.order_id, access_token: cardOrder.order.access_token, payment_data: paymentData }),
    });
    const result = await response.json() as { error?: string; payment_status?: string };
    if (!response.ok) {
      const message = result.error ?? "Pagamento não aprovado.";
      setSubmissionError(message);
      throw new Error(message);
    }
    clearCart();
    toast.success(result.payment_status === "PAID" ? "Pagamento aprovado." : "Pagamento em processamento.");
    const query = new URLSearchParams({ token: cardOrder.order.access_token, numero: String(cardOrder.order.order_number) });
    router.replace(`/pedido/sucesso?${query.toString()}`);
  }

  async function applyCoupon() {
    if (!couponCode.trim()) return;
    setCouponLoading(true);
    try {
      const result = await validateCoupon(couponCode, subtotal);
      setCoupon({ ...result, subtotal });
      setCouponCode(result.code);
      toast.success(`Cupom ${result.code} aplicado.`);
    } catch (error) {
      setCoupon(null);
      toast.error(error instanceof Error ? error.message : "Cupom inválido.");
    } finally {
      setCouponLoading(false);
    }
  }

  if (pixResult) {
    const tracking = `/pedido/acompanhar?token=${encodeURIComponent(pixResult.order.access_token)}`;
    return <Card className="mx-auto max-w-xl"><CardContent className="py-8 text-center"><CheckCircle2 className="mx-auto size-12 text-primary" /><h2 className="mt-4 text-2xl font-bold">Pix do pedido #{pixResult.order.order_number}</h2><p className="mt-2 text-sm text-muted-foreground">Pague pelo QR Code ou copie o código. A confirmação é automática.</p>{pixResult.qr_code_base64 && <Image unoptimized width={256} height={256} className="mx-auto mt-6 size-64 rounded-xl border p-2" alt="QR Code Pix" src={`data:image/png;base64,${pixResult.qr_code_base64}`} />}{pixResult.qr_code && <div className="mt-5 rounded-xl bg-muted p-3 text-left"><p className="break-all text-xs">{pixResult.qr_code}</p><Button className="mt-3 w-full" variant="outline" onClick={() => navigator.clipboard.writeText(pixResult.qr_code ?? "")}><Copy />Copiar código Pix</Button></div>}<Button render={<Link href={tracking} />} className="mt-5 w-full">Acompanhar pagamento e pedido</Button></CardContent></Card>;
  }

  if (cardOrder && mercadoPagoPublicKey) {
    return <Card className="mx-auto max-w-2xl"><CardHeader><CardTitle>Pagamento do pedido #{cardOrder.order.order_number}</CardTitle></CardHeader><CardContent><p className="mb-5 text-sm text-muted-foreground">Preencha os dados do cartão sem sair do site. Total: <strong className="text-foreground">{formatCurrency(cardOrder.order.total)}</strong></p><MercadoPagoCard amount={cardOrder.order.total} email={cardOrder.email} publicKey={mercadoPagoPublicKey} onSubmit={submitCard} onError={setSubmissionError} />{submissionError && <p className="mt-4 rounded-xl bg-destructive/5 p-3 text-sm text-destructive">{submissionError}</p>}</CardContent></Card>;
  }

  return (
    <form onSubmit={form.handleSubmit(handleValidForm)} className="grid gap-8 lg:grid-cols-[1fr_23rem]">
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-xl">
              <ShoppingBag className="size-5 text-primary" aria-hidden="true" />
              Seus dados
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-5 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="customer_name">Nome completo</Label>
              <Input id="customer_name" autoComplete="name" {...form.register("customer_name")} aria-invalid={!!form.formState.errors.customer_name} />
              <FieldError message={form.formState.errors.customer_name?.message} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="customer_phone">Telefone</Label>
              <Input id="customer_phone" type="tel" autoComplete="tel" placeholder="(11) 99999-9999" {...form.register("customer_phone")} aria-invalid={!!form.formState.errors.customer_phone} />
              <FieldError message={form.formState.errors.customer_phone?.message} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="customer_email">E-mail {paymentMethod === "CASH" ? "opcional" : "obrigatório"}</Label>
              <Input id="customer_email" type="email" autoComplete="email" {...form.register("customer_email")} aria-invalid={!!form.formState.errors.customer_email} />
              <FieldError message={form.formState.errors.customer_email?.message} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-xl">
              <MapPin className="size-5 text-primary" aria-hidden="true" />
              Como você quer receber?
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="grid gap-3 sm:grid-cols-2">
              <Label className="has-checked:border-primary has-checked:bg-primary/5 cursor-pointer rounded-xl border p-4 transition">
                <input type="radio" value="DELIVERY" className="size-4 accent-primary" {...form.register("delivery_type")} />
                <span><strong className="block">Entrega</strong><span className="mt-1 block text-xs font-normal text-muted-foreground">Receba no seu endereço</span></span>
              </Label>
              <Label className="has-checked:border-primary has-checked:bg-primary/5 cursor-pointer rounded-xl border p-4 transition">
                <input type="radio" value="PICKUP" className="size-4 accent-primary" {...form.register("delivery_type")} />
                <span><strong className="block">Retirada</strong><span className="mt-1 block text-xs font-normal text-muted-foreground">Busque diretamente na loja</span></span>
              </Label>
            </div>

            {deliveryType === "DELIVERY" ? (
              <div className="grid gap-5 border-t pt-5 sm:grid-cols-3">
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="address_street">Rua</Label>
                  <Input id="address_street" autoComplete="address-line1" {...form.register("address_street")} aria-invalid={!!form.formState.errors.address_street} />
                  <FieldError message={form.formState.errors.address_street?.message} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="address_number">Número</Label>
                  <Input id="address_number" {...form.register("address_number")} aria-invalid={!!form.formState.errors.address_number} />
                  <FieldError message={form.formState.errors.address_number?.message} />
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="address_neighborhood">Bairro</Label>
                  <Input id="address_neighborhood" autoComplete="address-level3" {...form.register("address_neighborhood")} aria-invalid={!!form.formState.errors.address_neighborhood} />
                  <FieldError message={form.formState.errors.address_neighborhood?.message} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="address_complement">Complemento</Label>
                  <Input id="address_complement" autoComplete="address-line2" {...form.register("address_complement")} />
                </div>
                <div className="space-y-2 sm:col-span-3">
                  <Label htmlFor="address_reference">Referência</Label>
                  <Input id="address_reference" placeholder="Ex.: portão azul, próximo à praça" {...form.register("address_reference")} />
                </div>
              </div>
            ) : (
              <div className="rounded-xl bg-muted p-4 text-sm leading-6 text-muted-foreground">
                <strong className="text-foreground">Endereço para retirada</strong><br />
                {settings.address ?? "Consulte o endereço com a loja."}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-xl">
              <WalletCards className="size-5 text-primary" aria-hidden="true" />
              Pagamento
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="grid gap-3 sm:grid-cols-3">
              {paymentOptions.map(({ value, label, icon: Icon }) => (
                <Label key={value} className="has-checked:border-primary has-checked:bg-primary/5 cursor-pointer rounded-xl border p-4 transition">
                  <input type="radio" value={value} disabled={value !== "CASH" && !mercadoPagoEnabled} className="size-4 accent-primary disabled:opacity-40" {...form.register("payment_method")} />
                  <span className="flex items-center gap-2"><Icon className="size-4" aria-hidden="true" />{label}</span>
                </Label>
              ))}
            </div>
            {!mercadoPagoEnabled && <p className="text-xs text-muted-foreground">Pix e cartão serão liberados assim que as credenciais do Mercado Pago forem configuradas.</p>}
            {paymentMethod === "CASH" && (
              <div className="space-y-2 border-t pt-5">
                <Label htmlFor="change_for">Troco para quanto?</Label>
                <Input id="change_for" inputMode="decimal" placeholder={`Ex.: ${Math.ceil(total / 10) * 10}`} {...form.register("change_for")} aria-invalid={!!form.formState.errors.change_for} />
                <FieldError message={form.formState.errors.change_for?.message} />
                <p className="text-xs text-muted-foreground">Deixe em branco se não precisar de troco.</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-xl">Observações do pedido</CardTitle></CardHeader>
          <CardContent>
            <Textarea className="min-h-28 resize-none" maxLength={500} placeholder="Alguma orientação geral para a loja?" {...form.register("notes")} />
          </CardContent>
        </Card>
      </div>

      <Card className="h-fit lg:sticky lg:top-24">
        <CardHeader><CardTitle className="text-xl">Resumo do pedido</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="max-h-56 space-y-3 overflow-y-auto pr-1">
            {items.map((item) => (
              <div key={item.lineId} className="flex justify-between gap-4 text-sm">
                <span className="text-muted-foreground">{item.quantity}× {item.name}{item.selectedAddons.length > 0 && <small className="mt-0.5 block">+ {item.selectedAddons.map((addon) => addon.name).join(", ")}</small>}</span>
                <span className="shrink-0 font-medium">{formatCurrency(item.price * item.quantity)}</span>
              </div>
            ))}
          </div>
          <Separator />
          <div className="space-y-2"><Label htmlFor="coupon-code">Cupom de desconto</Label><div className="flex gap-2"><Input id="coupon-code" value={couponCode} onChange={(event) => { setCouponCode(event.target.value.toUpperCase()); setCoupon(null); }} placeholder="Digite o código" maxLength={30} /><Button type="button" variant="outline" onClick={applyCoupon} disabled={couponLoading || !couponCode.trim()}>{couponLoading && <LoaderCircle className="animate-spin" />}Aplicar</Button></div>{appliedCoupon && <p className="text-xs font-medium text-emerald-700">{appliedCoupon.name}: − {formatCurrency(appliedCoupon.discount_amount)}</p>}</div>
          <Separator />
          <div className="flex justify-between text-sm"><span className="text-muted-foreground">Subtotal</span><span>{formatCurrency(subtotal)}</span></div>
          <div className="flex justify-between text-sm"><span className="text-muted-foreground">Taxa de entrega</span><span>{deliveryFee > 0 ? formatCurrency(deliveryFee) : "Grátis"}</span></div>
          {discount > 0 && <div className="flex justify-between text-sm text-emerald-700"><span>Desconto {appliedCoupon?.code}</span><span>− {formatCurrency(discount)}</span></div>}
          <Separator />
          <div className="flex items-center justify-between text-lg"><strong>Total</strong><strong className="text-primary">{formatCurrency(total)}</strong></div>

          {belowMinimum && (
            <p className="rounded-xl bg-amber-50 p-3 text-xs leading-5 text-amber-800">
              O pedido mínimo é {formatCurrency(settings.minimum_order_value)}. Adicione mais {formatCurrency(settings.minimum_order_value - subtotal)}.
            </p>
          )}

          {submissionError && (
            <div className="flex gap-2 rounded-xl border border-destructive/20 bg-destructive/5 p-3 text-xs leading-5 text-destructive" role="alert">
              <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
              <span>{submissionError}</span>
            </div>
          )}

          <Button type="submit" size="lg" className="w-full" disabled={belowMinimum || form.formState.isSubmitting}>
            {form.formState.isSubmitting ? (
              <>
                <LoaderCircle className="animate-spin" aria-hidden="true" />
                Confirmando...
              </>
            ) : (
              "Finalizar pedido"
            )}
          </Button>
          <Button render={<Link href="/carrinho" />} variant="ghost" className="w-full">Voltar ao carrinho</Button>
        </CardContent>
      </Card>
    </form>
  );
}
