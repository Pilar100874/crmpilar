import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

async function callGateway(apiKey: string, body: Record<string, any>) {
  const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      "Lovable-API-Key": apiKey,
      "X-Lovable-AIG-SDK": "vercel-ai-sdk",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  if (!resp.ok) {
    const text = await resp.text().catch(() => "");
    throw Object.assign(new Error(`${resp.status} ${text.slice(0, 200)}`), { status: resp.status });
  }
  return resp.json();
}

function extractImageUrl(data: any): string | null {
  const msg = data?.choices?.[0]?.message;
  if (!msg) return null;
  if (Array.isArray(msg?.images) && msg.images[0]?.image_url?.url) return msg.images[0].image_url.url;
  if (Array.isArray(msg?.content)) {
    for (const part of msg.content) {
      if (part?.type === "image_url" && part?.image_url?.url) return part.image_url.url;
      if (part?.inline_data?.mime_type?.startsWith("image/") && part?.inline_data?.data) {
        return `data:${part.inline_data.mime_type};base64,${part.inline_data.data}`;
      }
    }
  }
  return null;
}

async function persistImage(supabase: any, imageUrl: string, estabelecimentoId: string, index: number): Promise<string> {
  try {
    let contentType = "image/png";
    let bytes: Uint8Array;
    const m = imageUrl.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.*)$/s);
    if (m) {
      contentType = m[1];
      const binary = atob(m[2]);
      bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    } else {
      const r = await fetch(imageUrl);
      if (!r.ok) return imageUrl;
      contentType = r.headers.get("content-type") || contentType;
      bytes = new Uint8Array(await r.arrayBuffer());
    }
    const ext = contentType.includes("png") ? "png" : contentType.includes("webp") ? "webp" : "jpg";
    const safeEst = String(estabelecimentoId || "simulador").replace(/[^a-zA-Z0-9_-]/g, "");
    const path = `bot-product-samples/${safeEst}/${Date.now()}_${crypto.randomUUID()}_${index}.${ext}`;
    const { error } = await supabase.storage.from("marketing-images").upload(path, bytes, {
      contentType, upsert: false,
    });
    if (error) return imageUrl;
    const { data: pub } = supabase.storage.from("marketing-images").getPublicUrl(path);
    return pub?.publicUrl || imageUrl;
  } catch {
    return imageUrl;
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { description = "", count = 3, estabelecimentoId = "" } = await req.json();

    if (!description.trim()) {
      return new Response(JSON.stringify({ error: "description é obrigatório" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY não configurada");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const n = Math.max(1, Math.min(6, Number(count) || 3));

    const basePrompt = [
      "TAREFA: gerar UMA imagem fotorrealista do produto descrito, ISOLADO em FUNDO TRANSPARENTE (alpha PNG).",
      `DESCRIÇÃO DO PRODUTO: ${description}`,
      "REGRAS OBRIGATÓRIAS:",
      "- Produto centralizado, em primeiro plano, totalmente visível.",
      "- FUNDO TOTALMENTE TRANSPARENTE (canal alpha). Não desenhe cenário, mesa, parede, gradiente, nem sombra projetada no chão.",
      "- Apenas o produto recortado (estilo packshot/PNG de catálogo).",
      "- Iluminação de estúdio suave, alta nitidez, qualidade fotográfica premium.",
      "- Não inclua texto, marca d'água, logos extras nem mãos/pessoas.",
      "- Formato 1:1.",
    ].join("\n");

    const angles = [
      "vista frontal, levemente em ângulo 3/4 à direita",
      "vista lateral pura, perfil esquerdo",
      "vista frontal levemente de cima (top-front)",
      "vista frontal pura, totalmente de frente",
      "vista 3/4 à esquerda, levemente de baixo (hero shot)",
      "vista superior (top-down) totalmente plana",
    ];

    const generated: string[] = [];
    const errors: string[] = [];
    const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

    const genOne = async (i: number): Promise<string | null> => {
      const varPrompt = `${basePrompt}\n\nVARIAÇÃO ${i + 1} de ${n}: ${angles[i % angles.length]}.`;
      for (let attempt = 1; attempt <= 3; attempt++) {
        try {
          const data = await callGateway(LOVABLE_API_KEY, {
            model: "google/gemini-3.1-flash-image-preview",
            messages: [
              { role: "system", content: "Você é um fotógrafo de catálogo. Gere packshots de produto em fundo transparente, sem cenário." },
              { role: "user", content: [{ type: "text", text: varPrompt }] },
            ],
            modalities: ["image", "text"],
            max_tokens: 4096,
          });
          const img = extractImageUrl(data);
          if (img) return img;
          if (attempt === 3) errors.push(`v${i + 1}: sem imagem`);
          await sleep(1200);
        } catch (e: any) {
          if (e?.status === 402) { errors.push(`v${i + 1}: créditos insuficientes`); return null; }
          if (e?.status === 429) { await sleep(2000 * attempt); continue; }
          if (attempt === 3) errors.push(`v${i + 1}: ${e?.message || e}`);
          await sleep(800);
        }
      }
      return null;
    };

    for (let i = 0; i < n; i++) {
      const img = await genOne(i);
      if (img) generated.push(await persistImage(supabase, img, estabelecimentoId, i + 1));
      if (i < n - 1) await sleep(500);
    }

    return new Response(JSON.stringify({
      success: generated.length > 0,
      images: generated,
      errors,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e: any) {
    console.error("bot-generate-product-samples error:", e);
    const status = e?.status === 402 ? 402 : e?.status === 429 ? 429 : 500;
    return new Response(JSON.stringify({ error: e?.message || String(e) }), {
      status, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
