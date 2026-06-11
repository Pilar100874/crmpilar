// Executa um workflow do AI Studio de forma simplificada
// para o módulo "Disparar Workflow" do Bot Builder.
//
// Suporta cenários comuns: 1 nó imageGen ou 1 nó videoGen,
// com inputs opcionais de textInput, productImageSelect e galleryInfluencer.
//
// Modo "preview": retorna apenas tipo da mídia + tempo estimado, sem gerar.
// Modo normal: gera e retorna { mediaType, mediaUrl }.

import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

function estimateSecondsFor(model: string, isVideo: boolean, duration?: number): number {
  if (!isVideo) {
    // Imagens: 15s típico, 30s para modelos pesados
    if (/dall-e-4|gpt-image|gemini-3-pro/i.test(model)) return 40;
    return 20;
  }
  const dur = Number(duration) || 5;
  // Vídeos: depende do provedor
  if (/veo|google/i.test(model)) return Math.max(90, dur * 25);
  if (/sora/i.test(model)) return Math.max(120, dur * 30);
  if (/kling|luma|seedance|wavespeed|apiframe/i.test(model)) return Math.max(90, dur * 20);
  return Math.max(90, dur * 25);
}

const COMPOSITE_MODE_DESC: Record<string, string> = {
  clothing: "Vista esta roupa na pessoa da foto.",
  holding: "Insira o produto original na mão da pessoa preservando rótulo, logo, formato e cores.",
  wearing: "Coloque este acessório na pessoa da foto.",
  scene: "Insira o produto original na cena com a pessoa, preservando a embalagem exatamente como na referência.",
};

function pickGenNode(nodes: any[]): { node: any; isVideo: boolean } | null {
  // Vídeo tem prioridade
  for (const n of nodes) {
    const t = n?.data?.type;
    if (t === "videoGen") return { node: n, isVideo: true };
  }
  for (const n of nodes) {
    const t = n?.data?.type;
    if (t === "imageGen" || t === "productComposite" || t === "imageEdit") {
      return { node: n, isVideo: false };
    }
  }
  return null;
}

function categoriaFromGalleryType(type: string, cfg: any): string {
  if (cfg?.categoria) return String(cfg.categoria);
  if (type === "gallerySalvas") return "salvas";
  return type.replace("gallery", "").toLowerCase();
}

function collectTextPrompt(nodes: any[], variables: Record<string, any>, gen: { node: any; isVideo: boolean }): string {
  const parts: string[] = [];
  const cfg = gen.node?.data?.config || {};

  // Modo do productComposite vira diretiva inicial
  if (gen.node?.data?.type === "productComposite") {
    parts.push(COMPOSITE_MODE_DESC[cfg.compositeMode] || COMPOSITE_MODE_DESC.clothing);
  }

  // Prompt do próprio nó de geração (campo `prompt`)
  const genPrompt = String(cfg.prompt || "").trim();
  if (genPrompt) parts.push(genPrompt);

  for (const n of nodes) {
    const t = n?.data?.type;
    const c = n?.data?.config || {};
    if (t === "textInput") {
      const tx = String(c.text || "").trim();
      if (tx) parts.push(tx);
    } else if (t === "textContent") {
      const merged = [c.title, c.subtitle, c.body].filter(Boolean).join("\n").trim();
      if (merged) {
        parts.push(
          `[TEXTO LITERAL — não alterar] título="${c.title || ""}", subtítulo="${c.subtitle || ""}", corpo="${c.body || ""}"`,
        );
      }
    }
  }

  // Variáveis do bot como contexto
  const vars = Object.entries(variables || {})
    .filter(([k, v]) => v !== undefined && v !== null && String(v).trim() !== "" && !k.startsWith("_"))
    .map(([k, v]) => `- ${k}: ${typeof v === "object" ? JSON.stringify(v) : String(v)}`);
  if (vars.length) {
    parts.push(`\n[CONTEXTO DO BOT — informações do contato/conversa]\n${vars.join("\n")}`);
  }
  return parts.join("\n\n").trim();
}

function collectImageRefs(nodes: any[], variables: Record<string, any> = {}) {
  const imageUrls: string[] = [];
  const imageRoles: string[] = [];
  for (const n of nodes) {
    const t = String(n?.data?.type || "");
    const cfg = n?.data?.config || {};
    if (t === "productImageSelect" && cfg.selectedImageUrl) {
      imageUrls.push(cfg.selectedImageUrl);
      imageRoles.push("produto");
    } else if (t === "multiProductSelect" && Array.isArray(cfg.products)) {
      for (const p of cfg.products) {
        const url = p?.foto_url || p?.imageUrl;
        if (url) {
          imageUrls.push(url);
          imageRoles.push("produto");
        }
      }
    } else if (t.startsWith("gallery") && cfg.selectedImageUrl) {
      imageUrls.push(cfg.selectedImageUrl);
      imageRoles.push(categoriaFromGalleryType(t, cfg));
    } else if ((t === "imageInput" || t === "mediaGallery") && (cfg.imageUrl || cfg.selectedUrl)) {
      imageUrls.push(cfg.imageUrl || cfg.selectedUrl);
      imageRoles.push("referencia");
    }
  }

  // Bot variables — bloco ask_product_image salva a URL escolhida em variável
  const isHttpUrl = (v: any) => typeof v === "string" && /^https?:\/\//i.test(v);
  const productVarKeys = ["produto_imagem_url", "produto_foto_url", "product_image_url", "imagem_produto"];
  for (const k of productVarKeys) {
    const v = variables?.[k];
    if (isHttpUrl(v) && !imageUrls.includes(v)) {
      imageUrls.push(v);
      imageRoles.push("produto");
    }
  }
  const influencerVarKeys = ["influencer_imagem_url", "influencer_foto_url", "influencer_url"];
  for (const k of influencerVarKeys) {
    const v = variables?.[k];
    if (isHttpUrl(v) && !imageUrls.includes(v)) {
      imageUrls.push(v);
      imageRoles.push("influencer");
    }
  }
  return { imageUrls, imageRoles };
}

async function callStudio(action: string, params: any, estabelecimentoId: string) {
  const resp = await fetch(`${SUPABASE_URL}/functions/v1/ai-creative-studio`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
    },
    body: JSON.stringify({ action, params, estabelecimentoId }),
  });
  const text = await resp.text();
  let data: any;
  try { data = JSON.parse(text); } catch { data = { error: text }; }
  if (!resp.ok) {
    throw new Error(data?.error || `ai-creative-studio HTTP ${resp.status}`);
  }
  return data;
}

async function generateImage(genCfg: any, prompt: string, refs: { imageUrls: string[]; imageRoles: string[] }, estabelecimentoId: string) {
  const model = genCfg.model || "google/gemini-2.5-flash-image";
  const data = await callStudio(
    "generate_image",
    {
      prompt,
      model,
      imageSize: genCfg.imageSize || "1024x1024",
      aspectRatio: genCfg.aspectRatio || "1:1",
      imageStyle: genCfg.imageStyle || "natural",
      imageUrls: refs.imageUrls.length ? refs.imageUrls : undefined,
      imageRoles: refs.imageRoles.length ? refs.imageRoles : undefined,
      estabelecimentoId,
    },
    estabelecimentoId,
  );
  const url = data?.result?.imageUrl || data?.imageUrl || data?.result?.url;
  if (!url) throw new Error(data?.result?.error || data?.error || "Sem URL de imagem retornada");
  return url as string;
}

async function generateVideoPolled(genCfg: any, prompt: string, refs: { imageUrls: string[]; imageRoles: string[] }, estabelecimentoId: string) {
  const model = genCfg.videoModel || genCfg.model || "google/veo-3.1";
  const baseParams = {
    prompt,
    model,
    aspectRatio: genCfg.aspectRatio || "16:9",
    resolution: genCfg.resolution || "1080p",
    duration: genCfg.duration || 5,
    imageUrls: refs.imageUrls.length ? refs.imageUrls : undefined,
    imageRoles: refs.imageRoles.length ? refs.imageRoles : undefined,
    estabelecimentoId,
  };

  // Estratégia de start: prefere google se modelo google, senão apiframe/wavespeed
  let startAction = "start_wavespeed_video";
  if (/^google\/|veo/i.test(model)) startAction = "start_google_video";
  else if (/^apiframe\//i.test(model)) startAction = "start_apiframe_video";

  let started: any;
  try {
    started = await callStudio(startAction, baseParams, estabelecimentoId);
  } catch (e) {
    // Fallback síncrono — alguns modelos (sora-2, replicate, etc.) só funcionam pelo generate_video
    console.log(`[bot-run-ai-studio-workflow] start_* falhou (${e}). Caindo para generate_video sincrono.`);
    const data = await callStudio("generate_video", baseParams, estabelecimentoId);
    const url = data?.result?.videoUrl || data?.videoUrl;
    if (!url) throw new Error(data?.result?.error || data?.error || "Sem URL de vídeo retornada");
    return url as string;
  }

  const startResult = started?.result || started;
  const taskId = startResult?.taskId || startResult?.task_id || startResult?.id;
  if (!taskId) {
    if (startResult?.videoUrl) return startResult.videoUrl as string;
    throw new Error(startResult?.error || "Sem taskId retornado pelo provedor");
  }

  let fetchAction = "fetch_wavespeed_video";
  if (startAction === "start_google_video" || startResult?._googleProvider) fetchAction = "fetch_google_video";
  else if (startAction === "start_apiframe_video") fetchAction = "fetch_apiframe_video";

  // Polling até ~5 minutos
  const maxMs = 300_000;
  const start = Date.now();
  while (Date.now() - start < maxMs) {
    await new Promise((r) => setTimeout(r, 6000));
    try {
      const pollData = await callStudio(fetchAction, { taskId, estabelecimentoId }, estabelecimentoId);
      const r = pollData?.result || pollData;
      if (r?.error) throw new Error(r.error);
      if (r?.done && r?.videoUrl) return r.videoUrl as string;
      if (r?.videoUrl) return r.videoUrl as string;
    } catch (e) {
      console.log(`[bot-run-ai-studio-workflow] poll erro: ${e}`);
    }
  }
  throw new Error("Tempo esgotado aguardando o vídeo (5min)");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { workflowId, variables = {}, preview = false } = body || {};

    if (!workflowId) {
      return new Response(JSON.stringify({ error: "workflowId é obrigatório" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const { data: wf, error: wfErr } = await supabase
      .from("ai_studio_workflows")
      .select("id, nome, nodes_data, estabelecimento_id")
      .eq("id", workflowId)
      .maybeSingle();

    if (wfErr || !wf) {
      return new Response(JSON.stringify({ error: "Workflow do AI Studio não encontrado" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const nodes: any[] = Array.isArray(wf.nodes_data) ? wf.nodes_data : [];
    const gen = pickGenNode(nodes);
    if (!gen) {
      return new Response(
        JSON.stringify({ error: "Nenhum nó de geração (imagem/vídeo) encontrado no workflow" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const cfg = gen.node.data.config || {};
    const model = gen.isVideo ? (cfg.videoModel || cfg.model || "google/veo-3.1") : (cfg.model || "google/gemini-2.5-flash-image");
    const estSecs = estimateSecondsFor(model, gen.isVideo, cfg.duration);

    if (preview) {
      return new Response(
        JSON.stringify({
          mediaType: gen.isVideo ? "video" : "image",
          estimatedSeconds: estSecs,
          model,
          workflowName: wf.nome,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const refs = collectImageRefs(nodes, variables);
    let prompt = collectTextPrompt(nodes, variables, gen);
    if (!prompt && refs.imageUrls.length === 0) {
      return new Response(JSON.stringify({ error: "Workflow não tem texto/prompt nem referências de imagem." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!prompt) {
      // Fallback mínimo para nós como productComposite com apenas refs visuais
      prompt = "Gere a imagem combinando as referências fornecidas, preservando produto e pessoa.";
    }
    const estabelecimentoId = String(wf.estabelecimento_id);

    let mediaUrl: string;
    if (gen.isVideo) {
      mediaUrl = await generateVideoPolled(cfg, prompt, refs, estabelecimentoId);
    } else {
      mediaUrl = await generateImage(cfg, prompt, refs, estabelecimentoId);
    }

    return new Response(
      JSON.stringify({
        mediaType: gen.isVideo ? "video" : "image",
        mediaUrl,
        model,
        workflowName: wf.nome,
        estimatedSeconds: estSecs,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e: any) {
    console.error("[bot-run-ai-studio-workflow] erro:", e);
    return new Response(JSON.stringify({ error: e?.message || String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
