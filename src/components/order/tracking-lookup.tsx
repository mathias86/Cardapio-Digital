"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const tokenSchema = z.uuid("Informe um código de acompanhamento válido.");

export function TrackingLookup() {
  const router = useRouter();
  const [token, setToken] = useState("");
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const result = tokenSchema.safeParse(token.trim());

    if (!result.success) {
      setError(result.error.issues[0]?.message ?? "Código inválido.");
      return;
    }

    setError(null);
    router.push(`/pedido/acompanhar?token=${encodeURIComponent(result.data)}`);
  }

  return (
    <form onSubmit={handleSubmit} className="mx-auto max-w-xl rounded-2xl border bg-card p-6 shadow-sm sm:p-8">
      <div className="space-y-2">
        <Label htmlFor="tracking-token">Código de acompanhamento</Label>
        <Input
          id="tracking-token"
          value={token}
          onChange={(event) => setToken(event.target.value)}
          placeholder="00000000-0000-0000-0000-000000000000"
          autoComplete="off"
          aria-invalid={Boolean(error)}
        />
        {error && <p className="text-xs text-destructive">{error}</p>}
      </div>
      <Button type="submit" size="lg" className="mt-5 w-full">
        <Search aria-hidden="true" />
        Consultar pedido
      </Button>
      <p className="mt-4 text-center text-xs leading-5 text-muted-foreground">
        O código está no link recebido após a confirmação do pedido.
      </p>
    </form>
  );
}
