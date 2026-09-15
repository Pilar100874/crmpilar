import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { z } from "npm:zod@3";

const BodySchema = z.object({
  estabelecimento_id: z.string().uuid(),
  categoria: z.string().trim().max(120).optional().nullable(),
  descricao: z.string().trim().min(10).max(5000),
  local_ocorrencia: z.string().trim().max(200).optional().nullable(),
  data_ocorrencia: z.string().trim().max(10).optional().nullable(),
  anonimo: z.boolean(),
  nome: z.string().trim().max(120).optional().nullable(),
  email: z.string().trim().max(254).email().optional().nullable(),
  telefone: z.string().trim().max(20).optional().nullable(),
});

const LIMITE_POR_ORIGEM = 3; // por hora
const LIMITE_POR_EMPRESA = 30; // por hora
const JANELA_MS = 60 * 60 * 1000;

async function hashOrigem(valor: string) {
  const dados = new TextEncoder().encode(`denuncias:${valor}`);
  const buf = await crypto.subtle.digest("SHA-256", dados);
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Método não permitido" }, 405);

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
  const d = parsed.data;
  if (!d.anonimo && !d.nome) return json({ error: "Informe seu nome ou marque como anônimo" }, 400);

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  // canal precisa estar ativo para o estabelecimento
  const { data: cfg } = await supabase
    .from("ecommerce_config")
    .select("denuncias_enabled")
    .eq("estabelecimento_id", d.estabelecimento_id)
    .maybeSingle();
  if (!cfg?.denuncias_enabled) return json({ error: "Canal de denúncias indisponível" }, 404);

  const ip = (req.headers.get("x-forwarded-for") || "").split(",")[0].trim() || "desconhecido";
  const origem = await hashOrigem(ip);
  const desde = new Date(Date.now() - JANELA_MS).toISOString();

  const { count: porOrigem } = await supabase
    .from("ecommerce_denuncias_envios")
    .select("id", { count: "exact", head: true })
    .eq("estabelecimento_id", d.estabelecimento_id)
    .eq("origem_hash", origem)
    .gte("created_at", desde);

  if ((porOrigem ?? 0) >= LIMITE_POR_ORIGEM) {
    return json({ error: "Muitos envios em pouco tempo. Tente novamente mais tarde." }, 429);
  }

  const { count: porEmpresa } = await supabase
    .from("ecommerce_denuncias_envios")
    .select("id", { count: "exact", head: true })
    .eq("estabelecimento_id", d.estabelecimento_id)
    .gte("created_at", desde);

  if ((porEmpresa ?? 0) >= LIMITE_POR_EMPRESA) {
    return json({ error: "Canal temporariamente indisponível. Tente novamente mais tarde." }, 429);
  }

  const { error } = await supabase.from("ecommerce_denuncias").insert({
    estabelecimento_id: d.estabelecimento_id,
    categoria: d.categoria || null,
    descricao: d.descricao,
    local_ocorrencia: d.local_ocorrencia || null,
    data_ocorrencia: d.data_ocorrencia || null,
    anonimo: d.anonimo,
    nome: d.anonimo ? null : d.nome || null,
    email: d.anonimo ? null : d.email || null,
    telefone: d.anonimo ? null : d.telefone || null,
    status: "nova",
  });

  if (error) return json({ error: "Não foi possível registrar a denúncia" }, 500);

  await supabase.from("ecommerce_denuncias_envios").insert({
    estabelecimento_id: d.estabelecimento_id,
    origem_hash: origem,
  });

  return json({ ok: true });
});
