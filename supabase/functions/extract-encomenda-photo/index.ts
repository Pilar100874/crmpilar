// Extrai dados de uma etiqueta/encomenda a partir de uma foto usando Lovable AI Gateway.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const { imageBase64, imageUrl } = await req.json();
    if (!imageBase64 && !imageUrl) return json({ error: "imageBase64 ou imageUrl obrigatório" }, 400);

    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!apiKey) return json({ error: "LOVABLE_API_KEY ausente" }, 500);

    const imgUrl = imageUrl
      ? imageUrl
      : `data:image/jpeg;base64,${String(imageBase64).replace(/^data:[^;]+;base64,/, "")}`;

    const prompt = `Você recebe a foto de uma etiqueta de encomenda/correios. Extraia os campos e retorne APENAS um JSON válido (sem markdown, sem comentários) no formato:
{
  "transportadora": "Correios|Sedex|Jadlog|Loggi|Total Express|Mercado Envios|Amazon|Uber Flash|Motoboy|Outra|null",
  "codigo_rastreio": "string|null",
  "tipo_encomenda": "Envelope/Carta|Caixa Pequena|Caixa Média|Caixa Grande|Sacola|Documentos|Alimento/Delivery|Outro|null",
  "remetente": "string|null",
  "destinatario": "string|null",
  "descricao": "string|null"
}
Se não conseguir ler algum campo, use null. Não invente dados.`;

    const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: prompt },
              { type: "image_url", image_url: { url: imgUrl } },
            ],
          },
        ],
      }),
    });

    if (!resp.ok) {
      const txt = await resp.text();
      return json({ error: "Falha AI Gateway", details: txt }, 502);
    }
    const data = await resp.json();
    const content: string = data?.choices?.[0]?.message?.content ?? "{}";
    const cleaned = content.replace(/^```json\s*|\s*```$/g, "").trim();
    let parsed: any = {};
    try {
      parsed = JSON.parse(cleaned);
    } catch {
      const m = cleaned.match(/\{[\s\S]*\}/);
      if (m) parsed = JSON.parse(m[0]);
    }
    return json({ ok: true, fields: parsed });
  } catch (e) {
    return json({ error: String((e as Error)?.message || e) }, 500);
  }
});
