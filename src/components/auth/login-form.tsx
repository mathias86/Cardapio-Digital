"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { AlertCircle, LoaderCircle, LockKeyhole, Mail } from "lucide-react";
import { useForm } from "react-hook-form";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { loginSchema, type LoginFormValues } from "@/lib/validations/login";
import { getRoleHome, type InternalProfile } from "@/types/auth";

function safeNextPath(value: string | null) {
  return value?.startsWith("/") && !value.startsWith("//") ? value : null;
}

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [formError, setFormError] = useState<string | null>(null);
  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  async function handleLogin(values: LoginFormValues) {
    setFormError(null);
    const supabase = createSupabaseBrowserClient();
    const { data, error } = await supabase.auth.signInWithPassword(values);

    if (error || !data.user) {
      setFormError("E-mail ou senha inválidos.");
      return;
    }

    const { data: profileData, error: profileError } = await supabase
      .from("profiles")
      .select("id,name,role,active")
      .eq("id", data.user.id)
      .maybeSingle();
    const profile = profileData as InternalProfile | null;

    if (profileError || !profile?.active || profile.role === "CUSTOMER") {
      await supabase.auth.signOut();
      setFormError("Este usuário não possui acesso interno ativo.");
      return;
    }

    const requestedPath = safeNextPath(searchParams.get("next"));
    router.replace(requestedPath ?? getRoleHome(profile.role));
    router.refresh();
  }

  return (
    <Card className="shadow-lg">
      <CardHeader className="text-center">
        <p className="text-sm font-bold uppercase tracking-[0.18em] text-primary">Acesso interno</p>
        <CardTitle className="text-2xl">Entrar no sistema</CardTitle>
        <p className="text-sm leading-6 text-muted-foreground">Use o usuário cadastrado para sua função.</p>
      </CardHeader>
      <CardContent>
        <form onSubmit={form.handleSubmit(handleLogin)} className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="email">E-mail</Label>
            <div className="relative"><Mail className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" /><Input id="email" type="email" autoComplete="email" className="pl-9" {...form.register("email")} aria-invalid={Boolean(form.formState.errors.email)} /></div>
            {form.formState.errors.email && <p className="text-xs text-destructive">{form.formState.errors.email.message}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Senha</Label>
            <div className="relative"><LockKeyhole className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" /><Input id="password" type="password" autoComplete="current-password" className="pl-9" {...form.register("password")} aria-invalid={Boolean(form.formState.errors.password)} /></div>
            {form.formState.errors.password && <p className="text-xs text-destructive">{form.formState.errors.password.message}</p>}
          </div>
          {formError && <div className="flex gap-2 rounded-xl border border-destructive/20 bg-destructive/5 p-3 text-sm text-destructive" role="alert"><AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />{formError}</div>}
          <Button type="submit" size="lg" className="w-full" disabled={form.formState.isSubmitting}>
            {form.formState.isSubmitting ? <><LoaderCircle className="animate-spin" aria-hidden="true" />Entrando...</> : "Entrar"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
