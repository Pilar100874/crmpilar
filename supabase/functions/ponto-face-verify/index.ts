// Verificação facial 1:1 — compara a selfie da marcação com o rosto cadastrado do funcionário
// Usa Gemini Vision via Lovable AI Gateway para análise biométrica
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

async function fetchImageAsBase64(url: string): Promise<string | null> {
  try {
    const r = await fetch(url);
    if (!r.ok) return null;
    const buf = await r.arrayBuffer();
    let bin = "";
    const bytes = new Uint8Array(buf);
    for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
    return btoa(bin);
  } catch { return null; }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  try {
    const { funcionario_id, selfie_base64 } = await req.json();
    if (!funcionario_id || !selfie_base64) {
      return new Response(JSON.stringify({ error: "funcionario_id e selfie_base64 obrigatórios" }),
        { status: 400, headers: { ...cors, "Content-Type": "application/json" } });
    }

    const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    const { data: func } = await sb.from("ponto_funcionarios")
      .select("id, nome, face_url, face_match_threshold")
      .eq("id", funcionario_id).maybeSingle();

    if (!func) {
      return new Response(JSON.stringify({ error: "funcionário não encontrado" }),
        { status: 404, headers: { ...cors, "Content-Type": "application/json" } });
    }
    if (!(func as any).face_url) {
      return new Response(JSON.stringify({
        ok: false, enrolled: false,
        message: "Funcionário sem rosto cadastrado. Cadastre na ficha do funcionário."
      }), { headers: { ...cors, "Content-Type": "application/json" } });
    }

    // Baixa imagem de referência. Se face_url for path no bucket privado, gera signed URL.
    let refUrl: string = (func as any).face_url;
    if (refUrl.startsWith("ponto-faces/") || !refUrl.startsWith("http")) {
      const path = refUrl.replace(/^ponto-faces\//, "");
      const { data: signed } = await sb.storage.from("ponto-faces").createSignedUrl(path, 60);
      if (signed?.signedUrl) refUrl = signed.signedUrl;
    }
    const refB64 = await fetchImageAsBase64(refUrl);
    if (!refB64) {
      return new Response(JSON.stringify({ error: "não foi possível baixar foto de referência" }),
        { status: 500, headers: { ...cors, "Content-Type": "application/json" } });
    }

    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!apiKey) {
      return new Response(JSON.stringify({ error: "LOVABLE_API_KEY não configurada" }),
        { status: 500, headers: { ...cors, "Content-Type": "application/json" } });
    }

    // Pede ao modelo uma análise biométrica estruturada
    const prompt = `Você é um sistema de verificação biométrica facial 1:1. Analise se a foto A (referência cadastrada) e a foto B (selfie atual) são da MESMA pessoa.

Considere: traços faciais (olhos, nariz, boca, formato do rosto, queixo, sobrancelhas, proporções). Ignore: iluminação, ângulo leve, expressão, óculos, barba/cabelo curtos.

Retorne APENAS JSON válido no formato:
{"mesma_pessoa": true/false, "score": 0-100, "confianca": "alta"|"media"|"baixa", "motivo": "texto curto"}

Score 0-100 representa similaridade biométrica. Acima de 75 = mesma pessoa com alta confiança. Entre 50-75 = incerto. Abaixo de 50 = pessoas diferentes.`;

    const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [{
          role: "user",
          content: [
            { type: "text", text: prompt },
            { type: "image_url", image_url: { url: `data:image/jpeg;base64,${refB64}` } },
            { type: "image_url", image_url: { url: `data:image/jpeg;base64,${selfie_base64}` } },
          ],
        }],
        response_format: { type: "json_object" },
      }),
    });

    if (!resp.ok) {
      const txt = await resp.text();
      return new Response(JSON.stringify({ error: `Gateway IA falhou: ${resp.status}`, detalhe: txt }),
        { status: resp.status, headers: { ...cors, "Content-Type": "application/json" } });
    }
    const ai = await resp.json();
    const content = ai?.choices?.[0]?.message?.content || "{}";
    let parsed: any = {};
    try { parsed = JSON.parse(content); } catch { parsed = { mesma_pessoa: false, score: 0, motivo: "parse fail" }; }

    const threshold = (func as any).face_match_threshold ?? 70;
    const score = Number(parsed.score || 0);
    const aprovado = parsed.mesma_pessoa === true && score >= threshold;

    return new Response(JSON.stringify({
      ok: true,
      enrolled: true,
      aprovado,
      score,
      threshold,
      confianca: parsed.confianca || "baixa",
      mesma_pessoa: !!parsed.mesma_pessoa,
      motivo: parsed.motivo || "",
    }), { headers: { ...cors, "Content-Type": "application/json" } });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }),
      { status: 500, headers: { ...cors, "Content-Type": "application/json" } });
  }
});
