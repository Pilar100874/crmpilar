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

    if (styleSource === "visual_identity" && estabelecimentoId) {
      const { data: vi } = await supabase
        .from("studio_visual_identity")
        .select("prompt, selected_images, images, use_prompt, use_images")
        .eq("estabelecimento_id", estabelecimentoId)
        .eq("is_active", true)
        .maybeSingle();
      if (vi) {
        if (vi.use_prompt && vi.prompt) styleGuidance = vi.prompt;
        if (vi.use_images) {
          const imgs = (vi.selected_images?.length ? vi.selected_images : vi.images) || [];
          for (const img of imgs.slice(0, 3)) {
            const url = typeof img === "string" ? img : img?.url;
            if (url) referenceImages.push(url);
          }
        }
      }
    } else if (styleSource === "preset" && preset) {
      styleGuidance = PRESET_PROMPTS[preset] || "";
    }

    if (referenceImageUrl) referenceImages.unshift(referenceImageUrl);

    const finalPrompt = [
      basePrompt,
      prompt,
      styleGuidance ? `Estilo da marca: ${styleGuidance}` : "",
      referenceImageUrl ? "Use a primeira imagem como referência principal de produto/cena." : "",
      referenceImages.length > (referenceImageUrl ? 1 : 0) ? "Use as demais imagens como referência da identidade visual da marca (cores, tom, composição)." : "",
      "Imagem publicitária de alta qualidade. Textos em Português Brasileiro se houver.",
    ].filter(Boolean).join("\n");

    // Convert reference URLs to base64
    const refContent: any[] = [];
    for (const url of referenceImages.slice(0, 4)) {
      const b64 = await fetchAsBase64(url);
      if (b64) refContent.push({ type: "image_url", image_url: { url: b64 } });
    }

    const variationsCount = Math.max(1, Math.min(6, Number(variations) || 4));

    const generated: string[] = [];
    const errors: string[] = [];

    for (let i = 0; i < variationsCount; i++) {
      const varyHint = i === 0 ? "" : ` Variação ${i + 1}: traga um ângulo/composição diferente das anteriores.`;
      const messages = [{
        role: "user",
        content: [
          ...refContent,
          { type: "text", text: finalPrompt + varyHint },
        ],
      }];

      try {
        const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${LOVABLE_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "google/gemini-2.5-flash-image",
            messages,
            modalities: ["image", "text"],
          }),
        });
        if (!resp.ok) {
          const t = await resp.text();
          if (resp.status === 429) return new Response(JSON.stringify({ error: "Limite de requisições. Tente novamente." }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
          if (resp.status === 402) return new Response(JSON.stringify({ error: "Créditos insuficientes no workspace." }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
          errors.push(`v${i + 1}: ${resp.status} ${t.slice(0, 120)}`);
          continue;
        }
        const data = await resp.json();
        const img = data.choices?.[0]?.message?.images?.[0]?.image_url?.url;
        if (img) generated.push(img);
        else errors.push(`v${i + 1}: sem imagem retornada`);
      } catch (e: any) {
        errors.push(`v${i + 1}: ${e?.message || e}`);
      }
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
    return new Response(JSON.stringify({ error: e?.message || String(e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
