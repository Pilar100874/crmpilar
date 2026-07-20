// Wizard Prospecção — Híbrido
// Se OPENAI_API_KEY estiver configurada, usa a Responses API da OpenAI com web_search
// e insere os prospects direto em `prospeccao_empresas`.
// Caso contrário, retorna o prompt pronto para o usuário colar no Claude Code / ChatGPT / Cursor.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface WizardInput {
  segmento?: string;
  cnae?: string;
  cidade?: string;
  uf?: string;
  raio_km?: number;
  porte?: string[];
  faturamento?: string;
  palavras_chave?: string;
  fontes?: string;
  quantidade?: number;
  criterios?: string[];
  modo?: "auto" | "prompt";
}

function montarPrompt(w: WizardInput): string {
  const linhas = [
    `Pesquise na internet e retorne empresas reais que sejam potenciais clientes com os critérios abaixo.`,
    ``,
    `## Critérios`,
    w.segmento ? `- Segmento / atividade: ${w.segmento}` : "",
    w.cnae ? `- CNAE: ${w.cnae}` : "",
    w.cidade || w.uf ? `- Região: ${[w.cidade, w.uf].filter(Boolean).join(" - ")}${w.raio_km ? ` (raio ${w.raio_km} km)` : ""}` : "",
    w.porte?.length ? `- Porte: ${w.porte.join(", ")}` : "",
    w.faturamento ? `- Faturamento estimado: ${w.faturamento}` : "",
    w.palavras_chave ? `- Palavras-chave: ${w.palavras_chave}` : "",
    w.fontes ? `- Fontes preferidas: ${w.fontes}` : "",
    w.criterios?.length ? `- Qualificação obrigatória: ${w.criterios.join(", ")}` : "",
    `- Quantidade: ${w.quantidade ?? 20} empresas`,
    ``,
    `## Como salvar`,
    `Para cada empresa encontrada, chame a ferramenta MCP \`salvar_empresas_prospectadas\` (em lote) com os campos:`,
    `nome, nome_fantasia, cnpj, telefone, whatsapp, email, site, endereco, bairro, cidade, estado, cep,`,
    `cnae_principal, cnae_descricao, segmento_nome, descricao, porte, faturamento_estimado, funcionarios_estimado,`,
    `contato_nome, contato_cargo, contato_email, contato_telefone, score (0-100), score_motivo, prioridade (alta/media/baixa),`,
    `produtos_interesse (array), tags (array), redes_sociais (objeto), fontes (array de URLs).`,
    ``,
    `Regras: só empresas reais com pelo menos uma forma de contato. Não invente CNPJ. Se não souber, deixe em branco.`,
  ];
  return linhas.filter(Boolean).join("\n");
}

async function chamarOpenAI(prompt: string, apiKey: string) {
  const resp = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-4o",
      tools: [{ type: "web_search_preview" }],
      input: [
        {
          role: "system",
          content: "Você é um assistente de prospecção B2B. Pesquisa empresas reais na web e retorna dados estruturados em JSON. Nunca invente dados.",
        },
        {
          role: "user",
          content: prompt + `\n\nRetorne APENAS um JSON no formato: {"empresas":[{...}, ...]} — sem markdown, sem comentários.`,
        },
      ],
    }),
  });
  if (!resp.ok) {
    const t = await resp.text();
    throw new Error(`OpenAI ${resp.status}: ${t}`);
  }
  const data = await resp.json();
  // Extrair texto da resposta
  let texto = "";
  for (const item of data.output ?? []) {
    if (item.type === "message" && Array.isArray(item.content)) {
      for (const c of item.content) {
        if (c.type === "output_text") texto += c.text;
      }
    }
  }
  // Tenta extrair JSON
  const match = texto.match(/\{[\s\S]*"empresas"[\s\S]*\}/);
  const jsonStr = match ? match[0] : texto;
  try {
    const parsed = JSON.parse(jsonStr);
    return parsed.empresas ?? [];
  } catch {
    throw new Error("Resposta da OpenAI não pôde ser interpretada como JSON: " + texto.slice(0, 300));
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Não autenticado" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_PUBLISHABLE_KEY") ?? Deno.env.get("SUPABASE_ANON_KEY")!;
    const sb = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data: userData } = await sb.auth.getUser();
    const userId = userData?.user?.id;
    if (!userId) {
      return new Response(JSON.stringify({ error: "Sessão inválida" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const input: WizardInput = await req.json();
    const prompt = montarPrompt(input);
    const openaiKey = Deno.env.get("OPENAI_API_KEY");
    const forcePrompt = input.modo === "prompt";

    // Modo prompt (ou fallback quando não há chave)
    if (forcePrompt || !openaiKey) {
      return new Response(JSON.stringify({
        modo: "prompt",
        prompt,
        motivo: forcePrompt ? "solicitado pelo usuário" : "OPENAI_API_KEY não configurada — cole o prompt no Claude Code / ChatGPT / Cursor",
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Modo automático
    const empresas = await chamarOpenAI(prompt, openaiKey);
    if (!Array.isArray(empresas) || empresas.length === 0) {
      return new Response(JSON.stringify({ modo: "auto", inseridas: 0, prompt, aviso: "OpenAI não retornou empresas" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const rows = empresas.slice(0, input.quantidade ?? 50).map((e: any) => ({
      user_id: userId,
      nome: String(e.nome ?? e.razao_social ?? "").slice(0, 300),
      nome_fantasia: e.nome_fantasia ?? null,
      cnpj: e.cnpj ?? null,
      email: e.email ?? null,
      telefone: e.telefone ?? null,
      whatsapp: e.whatsapp ?? null,
      site: e.site ?? null,
      endereco: e.endereco ?? null,
      bairro: e.bairro ?? null,
      cidade: e.cidade ?? null,
      estado: e.estado ?? e.uf ?? null,
      cep: e.cep ?? null,
      cnae_principal: e.cnae_principal ?? null,
      cnae_descricao: e.cnae_descricao ?? null,
      segmento_nome: e.segmento_nome ?? input.segmento ?? null,
      descricao: e.descricao ?? null,
      redes_sociais: e.redes_sociais ?? {},
      fontes: e.fontes ?? [],
      contato_nome: e.contato_nome ?? null,
      contato_cargo: e.contato_cargo ?? null,
      contato_email: e.contato_email ?? null,
      contato_telefone: e.contato_telefone ?? null,
      porte: e.porte ?? null,
      faturamento_estimado: e.faturamento_estimado ?? null,
      funcionarios_estimado: e.funcionarios_estimado ?? null,
      data_fundacao: e.data_fundacao ?? null,
      situacao_cadastral: e.situacao_cadastral ?? null,
      score: typeof e.score === "number" ? e.score : null,
      score_motivo: e.score_motivo ?? null,
      produtos_interesse: e.produtos_interesse ?? [],
      prioridade: e.prioridade ?? null,
      latitude: e.latitude ?? null,
      longitude: e.longitude ?? null,
      tags: e.tags ?? [],
      observacoes_internas: e.observacoes_internas ?? null,
      extras: e.extras ?? {},
      origem: "wizard-openai",
      status: "novo",
    })).filter((r) => r.nome);

    const { data: inseridas, error } = await sb.from("prospeccao_empresas").insert(rows).select("id");
    if (error) throw new Error(error.message);

    return new Response(JSON.stringify({ modo: "auto", inseridas: inseridas?.length ?? 0, prompt }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("wizard-prospeccao error:", err?.message);
    return new Response(JSON.stringify({ error: err?.message ?? "Erro interno" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
