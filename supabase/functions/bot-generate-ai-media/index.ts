import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const PRESET_PROMPTS: Record<string, string> = {
  produto_branco: "produto em fundo branco infinito, iluminação de estúdio, fotografia de catálogo, sombras suaves",
  produto_lifestyle: "produto em cena lifestyle real, luz natural, ambiente aspiracional, composição editorial",
  influencer_ugc: "estilo UGC, foto autêntica de influenciador, luz natural, aparência espontânea de celular",
  post_promocional: "post promocional para redes sociais, layout chamativo, cores vibrantes, alto contraste",
  story_vertical: "formato vertical 9:16, story de Instagram, composição vertical dramática",
  cinematic: "estilo cinematográfico, color grading premium, profundidade de campo, luz dramática",
};

async function fetchAsBase64(url: string): Promise<string | null> {
  try {
    if (url.startsWith("data:image/")) return url;
    const r = await fetch(url);
    if (!r.ok) return null;
    const ct = r.headers.get("content-type") || "image/jpeg";
    const buf = new Uint8Array(await r.arrayBuffer());
    let bin = "";
    for (let i = 0; i < buf.length; i++) bin += String.fromCharCode(buf[i]);
    return `data:${ct};base64,${btoa(bin)}`;
  } catch {
    return null;
  }
}

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

function extensionFromContentType(contentType: string): string {
  if (contentType.includes("png")) return "png";
  if (contentType.includes("webp")) return "webp";
  if (contentType.includes("gif")) return "gif";
  return "jpg";
}

async function persistGeneratedImage(supabase: any, imageUrl: string, estabelecimentoId: string, index: number): Promise<string> {
  try {
    let contentType = "image/jpeg";
    let bytes: Uint8Array;

    const dataUrlMatch = imageUrl.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.*)$/s);
    if (dataUrlMatch) {
      contentType = dataUrlMatch[1];
      const binary = atob(dataUrlMatch[2]);
      bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    } else {
      const response = await fetch(imageUrl);
      if (!response.ok) return imageUrl;
      contentType = response.headers.get("content-type") || contentType;
      bytes = new Uint8Array(await response.arrayBuffer());
    }

    const safeEst = String(estabelecimentoId || "simulador").replace(/[^a-zA-Z0-9_-]/g, "");
    const ext = extensionFromContentType(contentType);
    const path = `bot-ai-media/${safeEst}/${Date.now()}_${crypto.randomUUID()}_${index}.${ext}`;
    const { error } = await supabase.storage.from("marketing-images").upload(path, bytes, {
      contentType,
      upsert: true,
    });
    if (error) {
      console.warn("Falha ao salvar imagem gerada no storage:", error.message);
      return imageUrl;
    }
    const { data } = supabase.storage.from("marketing-images").getPublicUrl(path);
    return data?.publicUrl || imageUrl;
  } catch (error) {
    console.warn("Falha ao persistir imagem gerada:", error);
    return imageUrl;
  }
}

function extractImageUrl(data: any): string | null {
  const msg = data?.choices?.[0]?.message;
  const direct = msg?.images?.[0]?.image_url?.url;
  if (direct) return direct;
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

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const {
      prompt = "",
      basePrompt = "",
      variations = 4,
      styleSource = "visual_identity",
      preset = "",
      referenceImageUrl = "",
      estabelecimentoId = "",
      aspectRatio = "1:1",
    } = await req.json();

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY não configurada");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Build style guidance
    let styleGuidance = "";
    const referenceImages: string[] = [];
    let selectedModel = "google/gemini-3.1-flash-image-preview";

    if (styleSource === "visual_identity" && estabelecimentoId) {
      const { data: vi } = await supabase
        .from("studio_visual_identity")
        .select("prompt, selected_images, images, use_prompt, use_images, preferred_model")
        .eq("estabelecimento_id", estabelecimentoId)
        .eq("is_active", true)
        .maybeSingle();
      if (vi) {
        if (vi.use_prompt && vi.prompt) styleGuidance = vi.prompt;
        if (vi.use_images) {
          const allImages = Array.isArray(vi.images) ? vi.images : [];
          const selectedIndices = Array.isArray(vi.selected_images) ? vi.selected_images : [];
          const imgs = selectedIndices.length
            ? selectedIndices.filter((i: number) => i >= 0 && i < allImages.length).map((i: number) => allImages[i])
            : allImages;
          for (const img of imgs.slice(0, 3)) {
            const url = typeof img === "string" ? img : img?.url;
            if (url) referenceImages.push(url);
          }
        }
        if (["google/gemini-2.5-flash-image", "google/gemini-3-pro-image-preview", "google/gemini-3.1-flash-image-preview"].includes(vi.preferred_model)) {
          selectedModel = vi.preferred_model;
        }
      }
    } else if (styleSource === "preset" && preset) {
      styleGuidance = PRESET_PROMPTS[preset] || "";
    }

    if (referenceImageUrl) referenceImages.unshift(referenceImageUrl);

    const finalPrompt = [
      "TAREFA: gerar exatamente UMA imagem publicitária por chamada para WhatsApp.",
      prompt ? `PEDIDO DO USUÁRIO — siga isto como briefing principal: ${prompt}` : "",
      basePrompt ? `INSTRUÇÕES FIXAS DO BLOCO: ${basePrompt}` : "",
      styleGuidance ? `IDENTIDADE VISUAL DA MARCA — preserve cores, tom, linguagem, composição, fotografia e personalidade: ${styleGuidance}` : "",
      referenceImageUrl ? "REFERÊNCIA PRINCIPAL: a primeira imagem enviada é a referência mais importante. Preserve produto/objeto/personagem, embalagem, cores, forma e elementos visuais principais." : "",
      referenceImages.length > (referenceImageUrl ? 1 : 0) ? "REFERÊNCIAS DA MARCA: as demais imagens definem identidade visual, paleta, iluminação, composição e acabamento." : "",
      `FORMATO OBRIGATÓRIO: gere todas as imagens no mesmo tamanho e proporção ${aspectRatio}. Não altere a proporção entre variações.`,
      "Não ignore o pedido do usuário. Não crie assunto aleatório. Resultado premium, realista, pronto para marketing. Textos em Português Brasileiro se houver.",
    ].filter(Boolean).join("\n\n");

    // Convert reference URLs to base64
    const refContent: any[] = [];
    for (const url of referenceImages.slice(0, 4)) {
      const b64 = await fetchAsBase64(url);
      if (b64) refContent.push({ type: "image_url", image_url: { url: b64 } });
    }

    const variationsCount = Math.max(1, Math.min(6, Number(variations) || 4));

    const generated: string[] = [];
    const errors: string[] = [];

    const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

    const generateVariation = async (variationIndex: number): Promise<string | null> => {
      const varyHint = `\n\nVARIAÇÃO ${variationIndex + 1} de ${variationsCount}: mantenha o mesmo briefing, identidade visual e referências; mude apenas ângulo, enquadramento, pose ou composição para criar uma opção distinta.`;
      const messages = [{
        role: "user",
        content: [
          ...refContent,
          { type: "text", text: finalPrompt + varyHint },
        ],
      }];

      for (let attempt = 1; attempt <= 4; attempt++) {
        try {
          const data = await callGateway(LOVABLE_API_KEY, {
            model: attempt >= 3 && selectedModel !== "google/gemini-2.5-flash-image" ? "google/gemini-2.5-flash-image" : selectedModel,
            messages: [
              { role: "system", content: "Você é um diretor de arte e compositor fotográfico. Siga rigorosamente o briefing do usuário, use referências visuais quando existirem e preserve a identidade visual da marca." },
              ...messages,
            ],
            modalities: ["image", "text"],
            max_tokens: 4096,
          });
          const img = extractImageUrl(data);
          if (img) return img;
          if (attempt === 4) errors.push(`v${variationIndex + 1}: sem imagem retornada (${String(data.choices?.[0]?.finish_reason || "sem motivo")})`);
          await sleep(1500);
        } catch (e: any) {
          if (e?.status === 402) {
            errors.push(`v${variationIndex + 1}: créditos insuficientes`);
            return null;
          }
          if (e?.status === 429) {
            await sleep(2000 * attempt);
            continue;
          }
          if (attempt === 4) errors.push(`v${variationIndex + 1}: ${e?.message || e}`);
          await sleep(1000);
        }
      }
      return null;
    };

    // Sequential generation to avoid rate limits and ensure ALL variations are produced
    for (let i = 0; i < variationsCount; i++) {
      const img = await generateVariation(i);
      if (img) generated.push(await persistGeneratedImage(supabase, img, estabelecimentoId, i + 1));
      if (i < variationsCount - 1) await sleep(800);
    }

    // Final fill attempt for any missing variations
    let safety = 0;
    while (generated.length < variationsCount && safety < variationsCount) {
      const img = await generateVariation(generated.length + safety);
      if (img) generated.push(await persistGeneratedImage(supabase, img, estabelecimentoId, generated.length + 1));
      safety++;
      await sleep(800);
    }


    return new Response(JSON.stringify({
      success: generated.length > 0,
      images: generated,
      prompt: finalPrompt,
      referenceCount: refContent.length,
      errors,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e: any) {
    console.error("bot-generate-ai-media error:", e);
    if (e?.status === 429) {
      return new Response(JSON.stringify({ error: "Limite de requisições. Tente novamente." }), {
        status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (e?.status === 402) {
      return new Response(JSON.stringify({ error: "Créditos insuficientes no workspace." }), {
        status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    return new Response(JSON.stringify({ error: e?.message || String(e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
