import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { z } from "npm:zod@3";

const json = (b: unknown, status = 200) => new Response(JSON.stringify(b), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
const Body = z.object({
  operacao: z.string().min(1).max(60),
  destino: z.string().max(20),
  emitente: z.record(z.unknown()),
  destinatario: z.record(z.unknown()),
  itens: z.array(z.record(z.unknown())).min(1).max(500),
});

/** Repassa a consulta tributária ao motor Systax com as credenciais da empresa (Fiscal → Configuração Systax). */
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const auth = req.headers.get("Authorization") ?? "";
    const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: auth } } });
    const { data: claims, error: authErr } = await sb.auth.getClaims(auth.replace("Bearer ", ""));
    if (authErr || !claims?.claims?.sub) return json({ error: "Não autenticado" }, 401);
    const parsed = Body.safeParse(await req.json());
    if (!parsed.success) return json({ error: parsed.error.flatten().fieldErrors }, 400);
    const { data: est } = await sb.rpc("get_auth_user_estabelecimento_id");
    if (!est) return json({ error: "Usuário sem empresa" }, 403);
    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: cfg } = await admin.from("systax_config").select("*").eq("estabelecimento_id", est).maybeSingle();
    if (!cfg?.url_api || !cfg?.token) return json({ error: "Motor fiscal Systax não configurado (Fiscal → Configuração Systax)" }, 400);
    const headers: Record<string, string> = { "Content-Type": "application/json", Accept: "application/json", Authorization: `Bearer ${cfg.token}` };
    if (cfg.licenca) headers["X-Licenca"] = cfg.licenca;
    if (cfg.usuario) headers["X-Usuario"] = cfg.usuario;
    const resp = await fetch(cfg.url_api, { method: "POST", headers, body: JSON.stringify({ ambiente: cfg.ambiente, ...parsed.data }) });
    const texto = await resp.text();
    let corpo: any; try { corpo = JSON.parse(texto); } catch { corpo = { mensagem: texto.slice(0, 500) }; }
    if (!resp.ok) return json({ error: `Systax recusou a consulta (${resp.status})`, detalhes: corpo?.mensagem ?? corpo?.message ?? corpo }, 502);
    const itens = Array.isArray(corpo) ? corpo : corpo?.itens ?? corpo?.items ?? corpo?.resultado ?? [];
    if (!Array.isArray(itens) || itens.length !== parsed.data.itens.length) return json({ error: "Retorno do Systax sem a tributação de todos os itens", detalhes: corpo }, 502);
    return json({ itens });
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : "Erro inesperado" }, 500);
  }
});
