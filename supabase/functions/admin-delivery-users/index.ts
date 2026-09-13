import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders, jsonResponse } from "../_shared/cors.ts";

type CreateDeliveryUser = { name?: string; email?: string; password?: string };

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (request.method !== "POST") return jsonResponse({ error: "Método não permitido." }, 405);

  let createdUserId: string | null = null;
  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const bearer = request.headers.get("Authorization")?.replace(/^Bearer\s+/i, "");
    if (!supabaseUrl || !serviceRoleKey || !bearer) return jsonResponse({ error: "Autenticação obrigatória." }, 401);
    const admin = createClient(supabaseUrl, serviceRoleKey, { auth: { autoRefreshToken: false, persistSession: false } });
    const { data: authData, error: authError } = await admin.auth.getUser(bearer);
    if (authError || !authData.user) return jsonResponse({ error: "Sessão inválida." }, 401);
    const { data: profile } = await admin.from("profiles").select("role,active").eq("id", authData.user.id).single();
    if (!profile?.active || profile.role !== "ADMIN") return jsonResponse({ error: "Acesso permitido somente para administradores." }, 403);

    const input = await request.json() as CreateDeliveryUser;
    const name = input.name?.trim() ?? "";
    const email = input.email?.trim().toLowerCase() ?? "";
    const password = input.password ?? "";
    if (name.length < 2 || name.length > 120) return jsonResponse({ error: "Informe o nome do motoboy." }, 400);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return jsonResponse({ error: "Informe um e-mail válido." }, 400);
    if (password.length < 8) return jsonResponse({ error: "A senha deve ter pelo menos 8 caracteres." }, 400);

    const { data: created, error: createError } = await admin.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { name } });
    if (createError || !created.user) throw new Error(createError?.message ?? "Não foi possível criar o usuário.");
    createdUserId = created.user.id;
    const { error: profileError } = await admin.from("profiles").update({ name, email, role: "DELIVERY", active: true }).eq("id", created.user.id);
    if (profileError) throw profileError;
    return jsonResponse({ id: created.user.id, name, email, active: true }, 201);
  } catch (error) {
    if (createdUserId) {
      const url = Deno.env.get("SUPABASE_URL");
      const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
      if (url && key) await createClient(url, key).auth.admin.deleteUser(createdUserId);
    }
    const message = error instanceof Error && error.message.toLowerCase().includes("already") ? "Já existe um usuário com este e-mail." : error instanceof Error ? error.message : "Não foi possível cadastrar o motoboy.";
    return jsonResponse({ error: message }, 400);
  }
});
