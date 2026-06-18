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

    // Route por família de modelo
    const isOpenAIImages = selectedModel.startsWith("openai/gpt-image");
    const endpoint = isOpenAIImages
      ? "https://ai.gateway.lovable.dev/v1/images/generations"
      : "https://ai.gateway.lovable.dev/v1/chat/completions";

    let body: any;
    if (isOpenAIImages) {
      // OpenAI images-generations não aceita referência multimodal nesta rota
      body = {
        model: selectedModel,
        prompt: fullPrompt,
        size: "1024x1024",
        n: 1,
        quality: "low",
      };
    } else {
      const userContent: any[] = [{ type: "text", text: fullPrompt }];
      if (referenceImageUrl) {
        const dataUrl = await urlToDataUrl(referenceImageUrl);
        userContent.push({ type: "image_url", image_url: { url: dataUrl } });
      }
      body = {
        model: selectedModel,
        messages: [{ role: "user", content: userContent }],
        modalities: ["image", "text"],
      };
    }

    const response = await fetch(endpoint, {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI Gateway error:", response.status, errorText);
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Limite de requisições excedido. Tente novamente em alguns segundos." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Créditos insuficientes. Adicione créditos ao workspace." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      throw new Error(`AI Gateway error: ${response.status} - ${errorText.slice(0, 200)}`);
    }

    const data = await response.json();

    let imageData: string | undefined;
    if (isOpenAIImages) {
      const b64 = data?.data?.[0]?.b64_json;
      if (b64) imageData = `data:image/png;base64,${b64}`;
    } else {
      imageData = data.choices?.[0]?.message?.images?.[0]?.image_url?.url;
    }

    if (!imageData) {
      return new Response(JSON.stringify({ error: "Não foi possível gerar a imagem" }),
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
