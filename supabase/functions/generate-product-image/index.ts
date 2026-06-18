import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

async function urlToDataUrl(url: string): Promise<string> {
  if (url.startsWith("data:")) return url;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Falha ao carregar imagem de referência (${res.status})`);
  const contentType = res.headers.get("content-type") || "image/jpeg";
  const buf = new Uint8Array(await res.arrayBuffer());
  let bin = "";
  for (let i = 0; i < buf.length; i++) bin += String.fromCharCode(buf[i]);
  return `data:${contentType};base64,${btoa(bin)}`;
}

function looksLikeImageData(value: string | undefined): value is string {
  if (!value) return false;
  if (value.startsWith("http")) return true;
  const match = value.match(/^data:image\/[a-zA-Z0-9.+-]+;base64,(.+)$/);
  return !!match?.[1] && match[1].length > 5000;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { prompt, productName, referenceImageUrl, model, visualIdentityPrompt } = await req.json();
    if (!prompt && !productName) {
      return new Response(JSON.stringify({ error: "prompt ou productName é obrigatório" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY não configurada");

    const basePrompt = prompt?.trim() || productName;
    const viBlock = visualIdentityPrompt?.trim()
      ? `\nIdentidade visual da marca a ser respeitada: ${visualIdentityPrompt.trim()}`
      : "";
    const fullPrompt = `Foto de produto profissional para catálogo: ${basePrompt}.
Fundo branco/neutro limpo, iluminação de estúdio, alta nitidez, composição centrada, estilo e-commerce.
${referenceImageUrl ? "Use a imagem de referência fornecida como base visual do produto, mantendo formato, cores e proporções." : ""}${viBlock}
IMPORTANTE: Sem textos, sem marcas d'água, sem logotipos.`;

    const selectedModel = model || "google/gemini-2.5-flash-image";

    // TODOS os modelos de imagem (OpenAI gpt-image-* e Google gemini-*-image*)
    // devem ir para /v1/images/generations. O body muda por família.
    const endpoint = "https://ai.gateway.lovable.dev/v1/images/generations";
    const isOpenAIImages = selectedModel.startsWith("openai/gpt-image");

    let body: any;
    if (isOpenAIImages) {
      body = {
        model: selectedModel,
        prompt: fullPrompt,
        size: "1024x1024",
        n: 1,
        quality: "low",
      };
    } else {
      // Gemini image models: messages + modalities. Sem referência, use content string.
      let content: string | any[] = fullPrompt;
      if (referenceImageUrl) {
        const dataUrl = await urlToDataUrl(referenceImageUrl);
        content = [
          { type: "text", text: fullPrompt },
          { type: "image_url", image_url: { url: dataUrl } },
        ];
      }
      body = {
        model: selectedModel,
        messages: [{ role: "user", content }],
        modalities: ["image", "text"],
      };
    }

    const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
    let imageData: string | undefined;

    for (let attempt = 1; attempt <= 3; attempt++) {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const errorText = await response.text().catch(() => "");
        console.error(`AI Gateway error (tentativa ${attempt}):`, response.status, errorText.slice(0, 200));
        if (response.status === 402) {
          return new Response(JSON.stringify({ error: "Créditos insuficientes. Adicione créditos ao workspace." }),
            { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        }
        if (response.status === 429) {
          if (attempt < 3) { await sleep(2000 * attempt); continue; }
          return new Response(JSON.stringify({ error: "Limite de requisições excedido. Tente novamente em alguns segundos." }),
            { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        }
        if (attempt < 3) { await sleep(1000 * attempt); continue; }
        throw new Error(`AI Gateway error: ${response.status} - ${errorText.slice(0, 200)}`);
      }

      const data = await response.json();
      imageData = undefined;
      const b64 = data?.data?.[0]?.b64_json;
      if (b64) {
        imageData = `data:image/png;base64,${b64}`;
      } else {
        const urlInData = data?.data?.[0]?.url;
        if (urlInData) imageData = urlInData;
        else {
          const chatUrl = data?.choices?.[0]?.message?.images?.[0]?.image_url?.url;
          if (chatUrl) imageData = chatUrl;
        }
      }

      if (looksLikeImageData(imageData)) break;

      console.error(`Resposta sem imagem válida (tentativa ${attempt}). Keys:`, Object.keys(data || {}), "sample:", JSON.stringify(data).slice(0, 400));
      imageData = undefined;
      if (attempt < 3) await sleep(1200 * attempt);
    }

    if (!looksLikeImageData(imageData)) {
      return new Response(JSON.stringify({ error: "Não foi possível gerar a imagem após 3 tentativas (resposta sem dados)" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    return new Response(JSON.stringify({ success: true, image: imageData }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (error) {
    console.error("Error:", error);
    const msg = error instanceof Error ? error.message : "Erro desconhecido";
    return new Response(JSON.stringify({ error: msg }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
