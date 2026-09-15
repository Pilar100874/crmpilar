import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { z } from "npm:zod@3";
import { getAuthContext, serviceClient, unauthorized, forbidden } from "../_shared/auth.ts";
import { cifrarSegredo, estaCifrado } from "../_shared/segredoConexao.ts";

const TABELAS = ["database_connections", "api_endpoints"] as const;

const BodySchema = z.object({
  tabela: z.enum(TABELAS),
  id: z.string().uuid(),
  senha: z.string().min(1).max(500),
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Método não permitido" }, 405);

  const auth = await getAuthContext(req);
  if (!auth) return unauthorized(corsHeaders);
  if (!auth.isAdmin && !auth.isManager && !auth.isSystemAdmin && !auth.isServiceRole) {
    return forbidden(corsHeaders, "Sem permissão para gerenciar credenciais");
  }

  let corpo: unknown;
  try {
    corpo = await req.json();
  } catch {
    return json({ error: "Dados inválidos" }, 400);
  }

  const parsed = BodySchema.safeParse(corpo);
  if (!parsed.success) {
    return json({ error: "Dados inválidos", detalhes: parsed.error.flatten().fieldErrors }, 400);
  }
  const { tabela, id, senha } = parsed.data;
  if (estaCifrado(senha)) return json({ ok: true });

  const svc = serviceClient();
  const { data: registro, error: erroBusca } = await svc
    .from(tabela)
    .select("id, estabelecimento_id")
    .eq("id", id)
    .maybeSingle();

  if (erroBusca || !registro) return json({ error: "Registro não encontrado" }, 404);

  if (!auth.isSystemAdmin && !auth.isServiceRole && registro.estabelecimento_id !== auth.estabelecimentoId) {
    return forbidden(corsHeaders, "Registro não pertence ao seu estabelecimento");
  }

  const { error } = await svc
    .from(tabela)
    .update({ sql_password: await cifrarSegredo(senha) })
    .eq("id", id);

  if (error) return json({ error: "Não foi possível salvar a credencial" }, 500);

  return json({ ok: true });
});
