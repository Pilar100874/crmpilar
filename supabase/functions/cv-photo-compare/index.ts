import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const key = Deno.env.get("LOVABLE_API_KEY");
    if (!key) {
      return new Response(JSON.stringify({ error: "Missing LOVABLE_API_KEY" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { previous_url, current_url, angle_label } = await req.json();
    if (!previous_url || !current_url) {
      return new Response(JSON.stringify({ error: "previous_url e current_url são obrigatórios" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const prompt = `Você é um perito de vistoria veicular. Compare estas duas fotos do MESMO ângulo (${angle_label ?? "veículo"}). 
A primeira é a foto ANTERIOR (referência). A segunda é a foto ATUAL.
Identifique QUALQUER mudança visível: novas batidas, arranhões, amassados, faróis/lanternas quebrados, retrovisores, pneus, sujeira excessiva, adesivos, cargas, portas abertas, etc.
Ignore diferenças de luz, ângulo leve, sombras ou clima.
Responda APENAS em JSON válido, sem markdown:
{"has_changes": boolean, "severity": "none"|"low"|"medium"|"high", "summary": "descrição curta em português (máx 140 chars)", "findings": ["item 1", "item 2"]}`;

    const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Lovable-API-Key": key },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: prompt },
              { type: "image_url", image_url: { url: previous_url } },
              { type: "image_url", image_url: { url: current_url } },
            ],
          },
        ],
      }),
    });

    if (!resp.ok) {
      const t = await resp.text();
      return new Response(JSON.stringify({ error: `AI error: ${resp.status}`, detail: t }), {
        status: resp.status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await resp.json();
    const raw: string = data?.choices?.[0]?.message?.content ?? "";
    const clean = raw.replace(/```json|```/g, "").trim();
    let parsed: any = { has_changes: false, severity: "none", summary: "Sem análise", findings: [] };
    try {
      const match = clean.match(/\{[\s\S]*\}/);
      parsed = JSON.parse(match ? match[0] : clean);
    } catch {
      parsed.summary = clean.slice(0, 140);
    }

    return new Response(JSON.stringify(parsed), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
