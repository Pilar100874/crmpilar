import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY não configurado");

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const { lacuna_id } = await req.json();
    if (!lacuna_id) {
      return new Response(JSON.stringify({ error: "lacuna_id é obrigatório" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: lacuna, error: lacErr } = await supabase
      .from("kb_lacunas")
      .select("*")
      .eq("id", lacuna_id)
      .single();

    if (lacErr || !lacuna) {
      return new Response(JSON.stringify({ error: "Lacuna não encontrada" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Buscar agente para contexto
    let agentContext = "";
    if (lacuna.agent_id) {
      const { data: agent } = await supabase
        .from("chat_agents")
        .select("nome, descricao, system_prompt, dominio")
        .eq("id", lacuna.agent_id)
        .maybeSingle();
      if (agent) {
        agentContext = `\nAgente: ${agent.nome}\nDomínio/Função: ${agent.dominio || "geral"}\nDescrição: ${agent.descricao || "-"}\n`;
      }
    }

    const systemPrompt = `Você é um especialista em criar respostas claras, objetivas e úteis para uma base de conhecimento de atendimento ao cliente.
Receberá uma pergunta de cliente que NÃO foi respondida pela base atual. Sua tarefa é redigir uma resposta-modelo curta (3 a 8 linhas), em português do Brasil, em tom profissional e amigável, que poderá ser inserida na base de conhecimento do agente após validação humana.
Regras:
- NÃO invente dados específicos (preços, prazos, marcas, números) — use placeholders entre colchetes quando necessário, ex: [preço], [prazo], [modelo].
- Estruture com clareza: comece com a resposta direta e termine com uma pergunta de continuidade quando fizer sentido.
- Não inclua saudações longas nem despedidas formais.${agentContext}`;

    const userPrompt = `Pergunta do cliente: "${lacuna.pergunta}"\n\nGere a resposta sugerida para a base de conhecimento.`;

    const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
      }),
    });

    if (!aiResp.ok) {
      if (aiResp.status === 429) {
        return new Response(JSON.stringify({ error: "Limite de requisições atingido. Tente novamente em alguns instantes." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (aiResp.status === 402) {
        return new Response(JSON.stringify({ error: "Créditos de IA esgotados. Adicione créditos em Configurações → Workspace → Uso." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await aiResp.text();
      console.error("AI gateway error:", aiResp.status, t);
      return new Response(JSON.stringify({ error: "Falha ao gerar resposta sugerida" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await aiResp.json();
    const sugestao: string = data?.choices?.[0]?.message?.content?.trim() || "";

    if (!sugestao) {
      return new Response(JSON.stringify({ error: "IA não retornou conteúdo" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    await supabase
      .from("kb_lacunas")
      .update({ resposta_sugerida: sugestao })
      .eq("id", lacuna_id);

    return new Response(JSON.stringify({ resposta_sugerida: sugestao }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("kb-lacuna-suggest error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Erro desconhecido" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
