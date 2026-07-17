import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { grupo, descritivo, tema, count = 10, complemento, existentes, escopo } = await req.json();
    if (!tema) {
      return new Response(JSON.stringify({ error: "tema é obrigatório" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const isGeral = escopo === "geral" || !grupo;

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY não configurada");

    const n = Math.max(1, Math.min(50, Number(count) || 10));
    const existentesArr: string[] = Array.isArray(existentes) ? existentes.slice(0, 100) : [];

    const sys = "Você é um copywriter brasileiro especialista em mensagens curtas para marketing. Responda SEMPRE em JSON válido no formato solicitado.";
    const user = [
      isGeral ? `Escopo: geral (mensagens amplas, sem grupo de produtos específico)` : `Grupo de produtos: ${grupo}`,
      !isGeral && descritivo ? `Sobre o grupo: ${descritivo}` : "",
      `Tema: ${tema}`,
      complemento ? `Complemento/direcionamento do usuário: ${complemento}` : "",
      isGeral
        ? `Gere ${n} frases DISTINTAS, curtas (até 140 caracteres), em português brasileiro, sobre o tema, sem citar nenhum grupo/categoria de produto específico.`
        : `Gere ${n} frases DISTINTAS, curtas (até 140 caracteres), em português brasileiro, sobre o tema aplicado a esse grupo de produtos.`,
      `Sem emojis excessivos, sem aspas, sem numeração. Cada frase deve funcionar sozinha em WhatsApp/SMS/redes sociais.`,
      existentesArr.length ? `NÃO repita nem parafraseie estas frases já existentes:\n- ${existentesArr.join("\n- ")}` : "",
      `Responda APENAS com JSON: {"frases":["frase1","frase2",...]}`,
    ].filter(Boolean).join("\n");

    const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: sys },
          { role: "user", content: user },
        ],
        response_format: { type: "json_object" },
      }),
    });

    if (!resp.ok) {
      const txt = await resp.text();
      throw new Error(`AI Gateway ${resp.status}: ${txt.slice(0, 300)}`);
    }

    const data = await resp.json();
    const raw = data?.choices?.[0]?.message?.content || "{}";
    let parsed: any = {};
    try { parsed = JSON.parse(raw); } catch {
      const m = String(raw).match(/\{[\s\S]*\}/);
      parsed = m ? JSON.parse(m[0]) : {};
    }
    const frases = Array.isArray(parsed?.frases)
      ? parsed.frases.map((f: any) => String(f || "").trim()).filter(Boolean).slice(0, n)
      : [];

    return new Response(JSON.stringify({ success: frases.length > 0, frases }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    console.error("gerar-mensagens-grupo error:", e);
    return new Response(JSON.stringify({ error: e?.message || String(e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
