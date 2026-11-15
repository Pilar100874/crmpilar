import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { z } from "npm:zod@3";

// NF-e emitidas contra as unidades (DF-e) via Focus NFe: listar, manifestar e baixar XML.
const json = (b: unknown, status = 200) => new Response(JSON.stringify(b), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
const Body = z.object({
  acao: z.enum(["listar", "manifestar", "xml"]),
  cnpj: z.string().regex(/^\d{14}$/).optional(),
  chave: z.string().regex(/^\d{44}$/).optional(),
  tipo: z.enum(["ciencia", "confirmacao", "desconhecimento", "nao_realizada"]).optional(),
  justificativa: z.string().min(15).max(255).optional(),
  versao: z.number().int().min(0).optional(),
});

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const auth = req.headers.get("Authorization") ?? "";
    const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: auth } } });
    const { data: claims, error: authErr } = await sb.auth.getClaims(auth.replace("Bearer ", ""));
    if (authErr || !claims?.claims?.sub) return json({ error: "Não autenticado" }, 401);
    const p = Body.safeParse(await req.json());
    if (!p.success) return json({ error: p.error.flatten().fieldErrors }, 400);
    const { acao, cnpj, chave, tipo, justificativa, versao } = p.data;

    const { data: estab } = await sb.rpc("get_auth_user_estabelecimento_id");
    if (!estab) return json({ error: "Usuário sem empresa" }, 403);
    const adm = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: c } = await adm.from("nfe_config").select("*").eq("estabelecimento_id", estab).maybeSingle();
    const prod = (c?.ambiente ?? "homologacao") === "producao";
    const tk = prod ? c?.token_producao : c?.token_homologacao;
    if (!tk) return json({ error: "Token do Focus NFe não configurado (Fiscal → Configuração NF-e)" }, 400);
    const BASE = prod ? "https://api.focusnfe.com.br" : "https://homologacao.focusnfe.com.br";
    const focus = (path: string, init: RequestInit = {}) => fetch(BASE + path, { ...init, headers: { Authorization: "Basic " + btoa(tk + ":"), "Content-Type": "application/json" } });

    if (acao === "listar") {
      if (!cnpj) return json({ error: "Informe o CNPJ da unidade" }, 400);
      // Só CNPJs de unidades da própria empresa.
      const { data: uns } = await sb.from("unidades").select("cnpj");
      if (!(uns ?? []).some((u: any) => (u.cnpj ?? "").replace(/\D/g, "") === cnpj)) return json({ error: "CNPJ não pertence às suas unidades" }, 403);
      const r = await focus(`/v2/nfes_recebidas?cnpj=${cnpj}${versao ? `&versao=${versao}` : ""}`);
      const txt = await r.text();
      if (!r.ok) { console.error(`Focus recebidas [${r.status}]: ${txt}`); return json({ error: "Falha ao consultar notas recebidas no Focus NFe", detalhes: txt }, 422); }
      return json({ ok: true, notas: JSON.parse(txt), max_versao: r.headers.get("X-Max-Version") });
    }
    if (!chave) return json({ error: "Informe a chave" }, 400);
    if (acao === "manifestar") {
      if (!tipo) return json({ error: "Informe o tipo de manifestação" }, 400);
      if ((tipo === "nao_realizada") && !justificativa) return json({ error: "Justificativa obrigatória (mín. 15 caracteres)" }, 400);
      const r = await focus(`/v2/nfes_recebidas/${chave}/manifesto`, { method: "POST", body: JSON.stringify({ tipo, ...(justificativa ? { justificativa } : {}) }) });
      const txt = await r.text(); let j: any = {}; try { j = JSON.parse(txt); } catch { j = { mensagem: txt }; }
      if (!r.ok) { console.error(`Focus manifesto [${r.status}]: ${txt}`); return json({ error: j.mensagem || "Manifestação recusada", detalhes: j }, 422); }
      return json({ ok: true, ...j });
    }
    const r = await focus(`/v2/nfes_recebidas/${chave}.xml`);
    const txt = await r.text();
    if (!r.ok) return json({ error: r.status === 404 ? "XML completo ainda não disponível — faça a Ciência da emissão e tente novamente em alguns minutos" : "Falha ao baixar XML", detalhes: txt }, 422);
    return json({ ok: true, xml: txt });
  } catch (e) {
    console.error(e); return json({ error: (e as Error).message }, 500);
  }
});
