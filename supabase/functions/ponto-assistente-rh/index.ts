// Assistente RH - chat com contexto do banco de ponto (streaming)
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const { messages, empresa_id } = await req.json();
    if (!Array.isArray(messages)) {
      return new Response(JSON.stringify({ error: "messages é obrigatório" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY")!;

    // Contexto compacto da empresa
    let contexto = "";
    if (empresa_id) {
      const [{ count: funcs }, { data: alertas }, { data: espelho }] = await Promise.all([
        supabase.from("ponto_funcionarios").select("*", { count: "exact", head: true })
          .eq("empresa_id", empresa_id).eq("status", "ativo"),
        supabase.from("ponto_alertas").select("nivel, categoria, descricao, created_at")
          .eq("empresa_id", empresa_id).eq("resolvido", false).order("created_at", { ascending: false }).limit(20),
        supabase.from("ponto_espelho_diario")
          .select("data, atraso_min, extra_min, falta, saldo_banco_min, noturno_min, ponto_funcionarios!inner(nome,empresa_id)")
          .eq("ponto_funcionarios.empresa_id", empresa_id)
          .gte("data", new Date(Date.now() - 30*86400000).toISOString().slice(0,10))
          .limit(200),
      ]);
      const totHE = (espelho || []).reduce((s, r: any) => s + (r.extra_min || 0), 0);
      const totFaltas = (espelho || []).filter((r: any) => r.falta).length;
      const totAtrasos = (espelho || []).reduce((s, r: any) => s + (r.atraso_min || 0), 0);
      contexto = `Contexto atual da empresa (últimos 30 dias):
- Funcionários ativos: ${funcs ?? 0}
- Horas extras totais: ${(totHE/60).toFixed(1)}h
- Faltas: ${totFaltas}
- Atrasos totais: ${(totAtrasos/60).toFixed(1)}h
- Alertas abertos (últimos 20): ${JSON.stringify(alertas || [])}`;
    }

    const system = `Você é o Assistente RH do módulo de Controle de Ponto. Responda em português, de forma direta e prática. Use o contexto fornecido quando relevante. Cite números reais quando possível. Se a pergunta exigir dado que não está no contexto, peça para o usuário consultar a tela específica.

${contexto}`;

    const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Lovable-API-Key": LOVABLE_API_KEY },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        stream: true,
        messages: [{ role: "system", content: system }, ...messages],
      }),
    });

    if (aiResp.status === 429) {
      return new Response(JSON.stringify({ error: "Limite de requisições atingido" }), {
        status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (aiResp.status === 402) {
      return new Response(JSON.stringify({ error: "Créditos esgotados" }), {
        status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!aiResp.ok || !aiResp.body) {
      const txt = await aiResp.text();
      return new Response(JSON.stringify({ error: txt }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(aiResp.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
