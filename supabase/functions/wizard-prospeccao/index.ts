// Wizard Prospecção — Multi-provider
// Suporta: lovable (Gemini via LOVABLE_API_KEY), openai, anthropic.
// mode="status" retorna quais provedores estão disponíveis.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type Provider = "lovable" | "openai" | "anthropic";

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
  modo?: "auto" | "prompt" | "status" | "ampliar";
  provider?: Provider;
  termos_ampliados?: string[];
}

function montarPrompt(w: WizardInput): string {
  const linhas = [
    `Pesquise na internet empresas reais que sejam potenciais clientes com os critérios abaixo e salve TODAS no Pilar CRM usando a ferramenta MCP \`salvar_empresas_prospectadas\` (uma única chamada com o array \`empresas\`).`,
    ``,
    `## Critérios`,
    w.segmento ? `- Segmento / atividade: ${w.segmento}` : "",
    w.termos_ampliados?.length ? `- Termos de busca ampliados (use TODOS como consultas paralelas): ${w.termos_ampliados.map((t) => `"${t}"`).join(", ")}` : "",
    w.cnae ? `- CNAE: ${w.cnae}` : "",
    w.cidade || w.uf ? `- Região: ${[w.cidade, w.uf].filter(Boolean).join(" - ")}${w.raio_km ? ` (raio ${w.raio_km} km)` : ""}` : "",
    w.porte?.length ? `- Porte: ${w.porte.join(", ")}` : "",
    w.faturamento ? `- Faturamento estimado: ${w.faturamento}` : "",
    w.palavras_chave ? `- Palavras-chave: ${w.palavras_chave}` : "",
    w.fontes ? `- Fontes preferidas: ${w.fontes}` : "",
    w.criterios?.length ? `- Qualificação obrigatória: ${w.criterios.join(", ")}` : "",
    `- Quantidade: ${w.quantidade ?? 20} empresas (máximo 100 por chamada)`,
    ``,
    `## Como salvar no Pilar (OBRIGATÓRIO)`,
    `Chame a ferramenta MCP \`salvar_empresas_prospectadas\` do servidor \`pilar\` UMA ÚNICA VEZ, passando o array completo em \`empresas\`.`,
    `Se o servidor MCP \`pilar\` não estiver disponível, retorne o JSON abaixo para o usuário colar manualmente.`,
    ``,
    `## Campos por empresa (preencha o máximo que conseguir da pesquisa)`,
    `nome (obrig.), nome_fantasia, cnpj, email, telefone, whatsapp (com DDI 55), site, endereco, bairro, cidade, estado (UF 2 letras), cep, cnae_principal, cnae_descricao, segmento_nome${w.segmento ? ` (use "${w.segmento}" quando não houver melhor)` : ""}, descricao, porte, faturamento_estimado, funcionarios_estimado, data_fundacao (YYYY-MM-DD), situacao_cadastral, contato_nome, contato_cargo, contato_email, contato_telefone, score (0-100), score_motivo, prioridade ("alta"|"media"|"baixa"), produtos_interesse [array], tags [array], redes_sociais {instagram, facebook, linkedin, youtube, tiktok}, fontes [URLs consultadas], latitude, longitude, observacoes_internas.`,
    ``,
    `## Exemplo da chamada MCP`,
    '```json',
    `{"empresas":[{"nome":"Empresa Exemplo LTDA","nome_fantasia":"Exemplo","cnpj":"","whatsapp":"5511999999999","email":"contato@exemplo.com.br","site":"https://exemplo.com.br","cidade":"${w.cidade ?? ""}","estado":"${w.uf ?? ""}","segmento_nome":"${w.segmento ?? ""}","descricao":"...","score":80,"prioridade":"alta","redes_sociais":{"instagram":"@exemplo"},"fontes":["https://..."]}]}`,
    '```',
    ``,
    `## Regras`,
    `- Só empresas reais que você encontrou na web. NÃO invente CNPJ, telefones ou e-mails.`,
    `- Se um campo não for encontrado, omita-o ou deixe em branco.`,
    `- Ao terminar, confirme quantas empresas foram salvas via MCP.`,
  ];
  return linhas.filter(Boolean).join("\n");
}

function extractJson(texto: string): any[] {
  const match = texto.match(/\{[\s\S]*"empresas"[\s\S]*\}/);
  const jsonStr = match ? match[0] : texto;
  const parsed = JSON.parse(jsonStr);
  return parsed.empresas ?? [];
}

async function chamarLovableGemini(prompt: string, apiKey: string) {
  const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", "Lovable-API-Key": apiKey },
    body: JSON.stringify({
      model: "google/gemini-2.5-pro",
      messages: [
        { role: "system", content: "Você é um assistente de prospecção B2B. Retorne SEMPRE JSON válido puro (sem markdown, sem ```). Nunca invente dados." },
        { role: "user", content: prompt },
      ],
    }),
  });
  if (!resp.ok) throw new Error(`Lovable AI ${resp.status}: ${await resp.text()}`);
  const data = await resp.json();
  const texto = data.choices?.[0]?.message?.content ?? "";
  return extractJson(texto);
}

async function chamarOpenAI(prompt: string, apiKey: string) {
  const resp = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: { "Authorization": `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "gpt-4o",
      tools: [{ type: "web_search_preview" }],
      input: [
        { role: "system", content: "Assistente de prospecção B2B. Pesquisa empresas reais na web e retorna JSON puro. Nunca invente dados." },
        { role: "user", content: prompt },
      ],
    }),
  });
  if (!resp.ok) throw new Error(`OpenAI ${resp.status}: ${await resp.text()}`);
  const data = await resp.json();
  let texto = "";
  for (const item of data.output ?? []) {
    if (item.type === "message" && Array.isArray(item.content)) {
      for (const c of item.content) if (c.type === "output_text") texto += c.text;
    }
  }
  return extractJson(texto);
}

async function chamarAnthropic(prompt: string, apiKey: string) {
  const resp = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: "claude-3-5-sonnet-latest",
      max_tokens: 8192,
      tools: [{ type: "web_search_20250305", name: "web_search" }],
      system: "Assistente de prospecção B2B. Retorna JSON puro (sem markdown). Nunca invente dados.",
      messages: [{ role: "user", content: prompt }],
    }),
  });
  if (!resp.ok) throw new Error(`Anthropic ${resp.status}: ${await resp.text()}`);
  const data = await resp.json();
  const texto = (data.content ?? []).filter((b: any) => b.type === "text").map((b: any) => b.text).join("");
  return extractJson(texto);
}

async function providersDisponiveis(sb?: any, userId?: string) {
  let dbKeys: any = null;
  if (sb && userId) {
    const { data } = await sb.from("ia_prospec_keys").select("openai_api_key,anthropic_api_key").eq("user_id", userId).maybeSingle();
    dbKeys = data;
  }
  return {
    lovable: !!Deno.env.get("LOVABLE_API_KEY"),
    openai: !!(dbKeys?.openai_api_key || Deno.env.get("OPENAI_API_KEY")),
    anthropic: !!(dbKeys?.anthropic_api_key || Deno.env.get("ANTHROPIC_API_KEY")),
  };
}

async function getKey(provider: Provider, sb: any, userId: string): Promise<string | undefined> {
  if (provider === "lovable") return Deno.env.get("LOVABLE_API_KEY") ?? undefined;
  const { data } = await sb.from("ia_prospec_keys").select("openai_api_key,anthropic_api_key").eq("user_id", userId).maybeSingle();
  if (provider === "openai") return data?.openai_api_key || Deno.env.get("OPENAI_API_KEY") || undefined;
  if (provider === "anthropic") return data?.anthropic_api_key || Deno.env.get("ANTHROPIC_API_KEY") || undefined;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const input: WizardInput = await req.json().catch(() => ({}));

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

    // Endpoint de status
    if (input.modo === "status") {
      return new Response(JSON.stringify({ providers: await providersDisponiveis(sb, userId) }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const prompt = montarPrompt(input);
    const disponiveis = await providersDisponiveis(sb, userId);
    const forcePrompt = input.modo === "prompt";
    const provider = input.provider;

    // Modo prompt (ou fallback quando nenhum provider está disponível/selecionado)
    if (forcePrompt || !provider || !disponiveis[provider]) {
      return new Response(JSON.stringify({
        modo: "prompt",
        prompt,
        motivo: forcePrompt
          ? "solicitado pelo usuário"
          : provider
            ? `chave do provedor "${provider}" não configurada — cole o prompt no Claude Code / ChatGPT / Cursor`
            : "Nenhum provedor selecionado",
        providers: disponiveis,
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Modo automático
    const apiKey = await getKey(provider, sb, userId);
    if (!apiKey) throw new Error(`Chave do provedor ${provider} não encontrada`);
    let empresas: any[] = [];
    if (provider === "lovable") empresas = await chamarLovableGemini(prompt, apiKey);
    else if (provider === "openai") empresas = await chamarOpenAI(prompt, apiKey);
    else if (provider === "anthropic") empresas = await chamarAnthropic(prompt, apiKey);

    if (!Array.isArray(empresas) || empresas.length === 0) {
      return new Response(JSON.stringify({ modo: "auto", provider, inseridas: 0, prompt, aviso: `${provider} não retornou empresas` }), {
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
      origem: `wizard-${provider}`,
      status: "novo",
    })).filter((r) => r.nome);

    const { data: inseridas, error } = await sb.from("prospeccao_empresas").insert(rows).select("id");
    if (error) throw new Error(error.message);

    return new Response(JSON.stringify({ modo: "auto", provider, inseridas: inseridas?.length ?? 0, prompt }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("wizard-prospeccao error:", err?.message);
    return new Response(JSON.stringify({ error: err?.message ?? "Erro interno" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
