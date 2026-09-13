const functionName = "mercado-pago-webhook";

export async function POST(request: Request) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!supabaseUrl) return Response.json({ received: false }, { status: 503 });

  try {
    const response = await fetch(`${supabaseUrl}/functions/v1/${functionName}${new URL(request.url).search}`, {
      method: "POST",
      headers: {
        "Content-Type": request.headers.get("content-type") ?? "application/json",
        "x-request-id": request.headers.get("x-request-id") ?? "",
        "x-signature": request.headers.get("x-signature") ?? "",
      },
      body: await request.text(),
      cache: "no-store",
    });
    return new Response(await response.text(), {
      status: response.status,
      headers: { "Content-Type": response.headers.get("content-type") ?? "application/json" },
    });
  } catch {
    return Response.json({ received: false }, { status: 502 });
  }
}
