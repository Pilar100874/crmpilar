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

function pickGenNode(nodes: any[]): { node: any; isVideo: boolean } | null {
  for (const n of nodes) {
    const t = n?.data?.type;
    if (t === "videoGen") return { node: n, isVideo: true };
    if (t === "imageGen") return { node: n, isVideo: false };
  }
  return null;
}

function collectTextPrompt(nodes: any[], variables: Record<string, any>): string {
  const parts: string[] = [];
  for (const n of nodes) {
    if (n?.data?.type === "textInput") {
      const t = String(n?.data?.config?.text || "").trim();
      if (t) parts.push(t);
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

function collectImageRefs(nodes: any[]) {
  const imageUrls: string[] = [];
  const imageRoles: string[] = [];
  for (const n of nodes) {
    const t = n?.data?.type;
    const cfg = n?.data?.config || {};
    if (t === "productImageSelect" && cfg.selectedImageUrl) {
      imageUrls.push(cfg.selectedImageUrl);
      imageRoles.push("produto");
    } else if (t === "galleryInfluencer" && cfg.selectedImageUrl) {
      imageUrls.push(cfg.selectedImageUrl);
      imageRoles.push("influencer");
    } else if (t === "imageInput" && cfg.imageUrl) {
      imageUrls.push(cfg.imageUrl);
      imageRoles.push("referencia");
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

    const prompt = collectTextPrompt(nodes, variables);
    if (!prompt) {
      return new Response(JSON.stringify({ error: "Workflow não tem texto/prompt configurado" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const refs = collectImageRefs(nodes);
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
