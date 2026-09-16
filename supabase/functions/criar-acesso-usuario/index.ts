import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

/**
 * Cria (ou atualiza a senha de) o acesso de login de um usuário do cadastro.
 * Só pode ser chamada por admin do mesmo estabelecimento.
 */
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "unauthorized" }, 401);

    const anon = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );

    const { data: { user }, error: userErr } = await anon.auth.getUser();
    if (userErr || !user) return json({ error: "unauthorized" }, 401);

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false } },
    );

    // Quem chamou precisa ser admin do estabelecimento
    const { data: chamador } = await admin
      .from("usuarios")
      .select("id, estabelecimento_id")
      .eq("auth_user_id", user.id)
      .maybeSingle();
    if (!chamador) return json({ error: "usuario_nao_encontrado" }, 403);

    const { data: role } = await admin
      .from("user_roles")
      .select("role")
      .eq("user_id", chamador.id)
      .eq("role", "admin")
      .maybeSingle();
    if (!role) return json({ error: "somente_admin" }, 403);

    const body = await req.json().catch(() => ({}));
    const usuarioId = String(body?.usuario_id ?? "").trim();
    const senha = String(body?.senha ?? "");
    if (!usuarioId || senha.length < 6) return json({ error: "dados_invalidos" }, 400);

    const { data: alvo } = await admin
      .from("usuarios")
      .select("id, nome, email, auth_user_id, estabelecimento_id")
      .eq("id", usuarioId)
      .maybeSingle();
    if (!alvo) return json({ error: "usuario_nao_encontrado" }, 404);
    if (alvo.estabelecimento_id !== chamador.estabelecimento_id) {
      return json({ error: "outro_estabelecimento" }, 403);
    }
    const email = (alvo.email ?? "").trim().toLowerCase();
    if (!email) return json({ error: "sem_email" }, 400);

    // Já existe conta de login para esse e-mail?
    let authId = alvo.auth_user_id as string | null;
    if (!authId) {
      const { data: lista } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
      authId = lista?.users?.find((u) => (u.email ?? "").toLowerCase() === email)?.id ?? null;
    }

    const traduzErro = (msg: string) => {
      const m = msg.toLowerCase();
      if (m.includes("weak") || m.includes("pwned") || m.includes("known to be"))
        return "Senha muito fraca ou vazada. Use uma senha forte (mínimo 8 caracteres, com letras, números e símbolos).";
      if (m.includes("should be at least"))
        return "Senha muito curta. Use no mínimo 8 caracteres.";
      if (m.includes("already registered") || m.includes("already been registered"))
        return "Já existe um login com este e-mail.";
      return msg;
    };

    if (authId) {
      const { error } = await admin.auth.admin.updateUserById(authId, { email, password: senha });
      if (error) return json({ error: traduzErro(error.message) }, 400);
    } else {
      const { data: criado, error } = await admin.auth.admin.createUser({
        email,
        password: senha,
        email_confirm: true,
        user_metadata: { full_name: alvo.nome },
      });
      if (error) return json({ error: traduzErro(error.message) }, 400);
      authId = criado.user?.id ?? null;
    }

    if (!authId) return json({ error: "falha_ao_criar" }, 500);

    await admin.from("usuarios").update({ auth_user_id: authId }).eq("id", alvo.id);

    return json({ ok: true, auth_user_id: authId });
  } catch (e) {
    return json({ error: String((e as Error).message ?? e) }, 500);
  }
});
