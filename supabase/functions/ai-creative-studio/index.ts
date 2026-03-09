import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { decode as base64Decode } from "https://deno.land/std@0.168.0/encoding/base64.ts";

// ===== VIDEO PROVIDER API IMPLEMENTATIONS =====

interface VideoGenerationResult {
  videoUrl?: string;
  thumbnailUrl?: string;
  error?: string;
}

async function fetchApiKey(estabelecimentoId: string, provider: string): Promise<string | null> {
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !supabaseKey) return null;
  const supabase = createClient(supabaseUrl, supabaseKey);
  const { data } = await supabase
    .from("ai_api_keys")
    .select("api_key")
    .eq("estabelecimento_id", estabelecimentoId)
    .eq("provider", provider)
    .eq("is_active", true)
    .limit(1)
    .single();
  return data?.api_key || null;
}

async function uploadVideoToStorage(videoData: Uint8Array, ext: string = "mp4"): Promise<string | null> {
  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !supabaseKey) return null;
    const supabase = createClient(supabaseUrl, supabaseKey);
    const fileName = `studio/${crypto.randomUUID()}.${ext}`;
    const { error } = await supabase.storage
      .from("marketing-videos")
      .upload(fileName, videoData, { contentType: `video/${ext}`, upsert: true });
    if (error) { console.error("[upload-video] Error:", error.message); return null; }
    const { data: publicData } = supabase.storage.from("marketing-videos").getPublicUrl(fileName);
    return publicData.publicUrl;
  } catch (err) { console.error("[upload-video] Failed:", err); return null; }
}

// Poll a URL until condition met or timeout
async function pollUntilDone<T>(
  pollFn: () => Promise<{ done: boolean; result?: T; error?: string }>,
  intervalMs: number = 5000,
  maxAttempts: number = 60
): Promise<T> {
  for (let i = 0; i < maxAttempts; i++) {
    const { done, result, error } = await pollFn();
    if (error) throw new Error(error);
    if (done && result !== undefined) return result;
    await new Promise(r => setTimeout(r, intervalMs));
  }
  throw new Error("Video generation timed out after polling");
}

// --- Google Veo (Vertex AI / AI Studio) ---
async function generateVideoGoogle(apiKey: string, params: any): Promise<VideoGenerationResult> {
  const modelMap: Record<string, string> = {
    "google/veo-3.1": "veo-3.0-generate-preview",
    "google/veo-3.1-fast": "veo-3.0-generate-preview",
    "google/veo-3": "veo-3.0-generate-preview",
    "google/veo-2": "veo-2.0-generate-001",
  };
  const modelId = modelMap[params.model] || "veo-3.0-generate-preview";
  
  // Submit generation request
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${modelId}:predictLongRunning?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        instances: [{
          prompt: params.prompt,
          ...(params.imageUrls?.[0] ? { image: { bytesBase64Encoded: params.imageUrls[0].startsWith("data:") ? params.imageUrls[0].split(",")[1] : undefined, gcsUri: params.imageUrls[0].startsWith("http") ? undefined : undefined } } : {}),
        }],
        parameters: {
          aspectRatio: params.aspectRatio || "16:9",
          personGeneration: "allow_all",
          numberOfVideos: 1,
          durationSeconds: 8,
          ...(params.negativePrompt ? { negativePrompt: params.negativePrompt } : {}),
        },
      }),
    }
  );

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Google Veo API error ${response.status}: ${err.substring(0, 200)}`);
  }
  
  const opData = await response.json();
  const operationName = opData.name;
  if (!operationName) throw new Error("No operation returned from Veo API");

  console.log(`[generate_video] Google Veo operation: ${operationName}`);

  // Poll for completion
  const result = await pollUntilDone<string>(async () => {
    const pollResp = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/${operationName}?key=${apiKey}`
    );
    const pollData = await pollResp.json();
    if (pollData.done) {
      const video = pollData.response?.generatedSamples?.[0]?.video;
      if (video?.uri) return { done: true, result: video.uri };
      if (video?.bytesBase64Encoded) {
        const bytes = base64Decode(video.bytesBase64Encoded);
        const url = await uploadVideoToStorage(new Uint8Array(bytes));
        return { done: true, result: url || undefined };
      }
      return { done: true, error: "No video in response" };
    }
    return { done: false };
  }, 5000, 120);

  return { videoUrl: result };
}

// --- OpenAI Sora ---
async function generateVideoOpenAI(apiKey: string, params: any): Promise<VideoGenerationResult> {
  const model = "sora";
  const size = params.aspectRatio === "9:16" ? "1080x1920" : params.aspectRatio === "1:1" ? "1080x1080" : "1920x1080";

  // Step 1: Create video job via POST /v1/videos (multipart/form-data)
  const formData = new FormData();
  formData.append("model", model);
  formData.append("prompt", params.prompt);
  formData.append("size", size);
  formData.append("duration", "10");
  formData.append("n", "1");

  const response = await fetch("https://api.openai.com/v1/videos", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
    },
    body: formData,
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`OpenAI Sora API error ${response.status}: ${err.substring(0, 200)}`);
  }

  const jobData = await response.json();
  const jobId = jobData.id;
  if (!jobId) throw new Error("No job ID returned from OpenAI Sora");

  console.log(`[generate_video] OpenAI Sora job created: ${jobId}`);

  // Step 2: Poll GET /v1/videos/{id} until completed
  const videoUrl = await pollUntilDone<string>(async () => {
    const pollResp = await fetch(`https://api.openai.com/v1/videos/${jobId}`, {
      headers: { "Authorization": `Bearer ${apiKey}` },
    });
    if (!pollResp.ok) {
      const errText = await pollResp.text();
      return { done: false, error: undefined };
    }
    const pollData = await pollResp.json();
    console.log(`[generate_video] Sora poll status: ${pollData.status}`);
    
    if (pollData.status === "failed") {
      return { done: true, error: pollData.error?.message || "Video generation failed" } as any;
    }
    if (pollData.status === "completed") {
      const url = pollData.output?.url || pollData.data?.[0]?.url;
      if (url) return { done: true, result: url };
    }
    return { done: false };
  }, 5000, 120);

  // Download and re-upload to our storage
  const videoResp = await fetch(videoUrl);
  const videoBytes = new Uint8Array(await videoResp.arrayBuffer());
  const storedUrl = await uploadVideoToStorage(videoBytes);

  return { videoUrl: storedUrl || videoUrl };
}

// --- Runway ---
async function generateVideoRunway(apiKey: string, params: any): Promise<VideoGenerationResult> {
  const modelMap: Record<string, string> = {
    "runway/gen4": "gen4_turbo",
    "runway/gen3-alpha-turbo": "gen3a_turbo",
  };
  const model = modelMap[params.model] || "gen3a_turbo";

  const body: any = {
    model,
    promptText: params.prompt,
    ratio: params.aspectRatio === "9:16" ? "portrait" : params.aspectRatio === "1:1" ? "square" : "widescreen",
    duration: 10,
  };

  if (params.imageUrls?.[0]?.startsWith("http")) {
    body.promptImage = params.imageUrls[0];
  }

  const response = await fetch("https://api.dev.runwayml.com/v1/image_to_video", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "X-Runway-Version": "2024-11-06",
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Runway API error ${response.status}: ${err.substring(0, 200)}`);
  }

  const taskData = await response.json();
  const taskId = taskData.id;
  if (!taskId) throw new Error("No task ID from Runway");

  console.log(`[generate_video] Runway task: ${taskId}`);

  const result = await pollUntilDone<string>(async () => {
    const pollResp = await fetch(`https://api.dev.runwayml.com/v1/tasks/${taskId}`, {
      headers: { "Authorization": `Bearer ${apiKey}`, "X-Runway-Version": "2024-11-06" },
    });
    const pollData = await pollResp.json();
    if (pollData.status === "SUCCEEDED") {
      return { done: true, result: pollData.output?.[0] };
    }
    if (pollData.status === "FAILED") {
      return { done: true, error: pollData.failure || "Runway generation failed" };
    }
    return { done: false };
  }, 5000, 120);

  // Download and re-upload
  const videoResp = await fetch(result);
  const videoBytes = new Uint8Array(await videoResp.arrayBuffer());
  const storedUrl = await uploadVideoToStorage(videoBytes);

  return { videoUrl: storedUrl || result };
}

// --- Kling (Kuaishou) ---
async function generateVideoKling(apiKey: string, params: any): Promise<VideoGenerationResult> {
  const response = await fetch("https://api.klingai.com/v1/videos/text2video", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      prompt: params.prompt,
      negative_prompt: params.negativePrompt || "",
      cfg_scale: params.cfgScale || 0.5,
      mode: params.model === "kling/v2.1" ? "highquality" : "std",
      aspect_ratio: params.aspectRatio || "16:9",
      duration: "5",
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Kling API error ${response.status}: ${err.substring(0, 200)}`);
  }

  const taskData = await response.json();
  const taskId = taskData.data?.task_id;
  if (!taskId) throw new Error("No task ID from Kling");

  const result = await pollUntilDone<string>(async () => {
    const pollResp = await fetch(`https://api.klingai.com/v1/videos/text2video/${taskId}`, {
      headers: { "Authorization": `Bearer ${apiKey}` },
    });
    const pollData = await pollResp.json();
    const status = pollData.data?.task_status;
    if (status === "succeed") {
      const videoUrl = pollData.data?.task_result?.videos?.[0]?.url;
      return { done: true, result: videoUrl };
    }
    if (status === "failed") {
      return { done: true, error: pollData.data?.task_status_msg || "Kling generation failed" };
    }
    return { done: false };
  }, 5000, 120);

  const videoResp = await fetch(result);
  const videoBytes = new Uint8Array(await videoResp.arrayBuffer());
  const storedUrl = await uploadVideoToStorage(videoBytes);
  return { videoUrl: storedUrl || result };
}

// --- Luma Dream Machine ---
async function generateVideoLuma(apiKey: string, params: any): Promise<VideoGenerationResult> {
  const body: any = {
    prompt: params.prompt,
    aspect_ratio: params.aspectRatio || "16:9",
    loop: params.loop || false,
  };
  if (params.imageUrls?.[0]?.startsWith("http")) {
    body.keyframes = { frame0: { type: "image", url: params.imageUrls[0] } };
  }

  const response = await fetch("https://api.lumalabs.ai/dream-machine/v1/generations", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Luma API error ${response.status}: ${err.substring(0, 200)}`);
  }

  const taskData = await response.json();
  const taskId = taskData.id;
  if (!taskId) throw new Error("No generation ID from Luma");

  const result = await pollUntilDone<string>(async () => {
    const pollResp = await fetch(`https://api.lumalabs.ai/dream-machine/v1/generations/${taskId}`, {
      headers: { "Authorization": `Bearer ${apiKey}` },
    });
    const pollData = await pollResp.json();
    if (pollData.state === "completed") {
      return { done: true, result: pollData.assets?.video };
    }
    if (pollData.state === "failed") {
      return { done: true, error: pollData.failure_reason || "Luma generation failed" };
    }
    return { done: false };
  }, 5000, 120);

  const videoResp = await fetch(result);
  const videoBytes = new Uint8Array(await videoResp.arrayBuffer());
  const storedUrl = await uploadVideoToStorage(videoBytes);
  return { videoUrl: storedUrl || result };
}

// --- Stability AI Video ---
async function generateVideoStability(apiKey: string, params: any): Promise<VideoGenerationResult> {
  // Stability requires an image input for video
  if (!params.imageUrls?.[0]) {
    throw new Error("Stability Video requer uma imagem de referência como entrada");
  }

  const formData = new FormData();
  // Fetch the image and add as blob
  const imgResp = await fetch(params.imageUrls[0]);
  const imgBlob = await imgResp.blob();
  formData.append("image", imgBlob, "input.png");
  formData.append("cfg_scale", String(params.cfgScale || 2.5));
  formData.append("motion_bucket_id", "127");

  const response = await fetch("https://api.stability.ai/v2beta/image-to-video", {
    method: "POST",
    headers: { "Authorization": `Bearer ${apiKey}` },
    body: formData,
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Stability API error ${response.status}: ${err.substring(0, 200)}`);
  }

  const taskData = await response.json();
  const generationId = taskData.id;
  if (!generationId) throw new Error("No generation ID from Stability");

  const result = await pollUntilDone<Uint8Array>(async () => {
    const pollResp = await fetch(`https://api.stability.ai/v2beta/image-to-video/result/${generationId}`, {
      headers: { "Authorization": `Bearer ${apiKey}`, "Accept": "video/*" },
    });
    if (pollResp.status === 202) return { done: false };
    if (pollResp.ok) {
      const bytes = new Uint8Array(await pollResp.arrayBuffer());
      return { done: true, result: bytes };
    }
    return { done: true, error: `Stability poll error: ${pollResp.status}` };
  }, 5000, 120);

  const storedUrl = await uploadVideoToStorage(result);
  return { videoUrl: storedUrl || undefined };
}

// --- Generic handler for unsupported providers ---
async function generateVideoUnsupported(model: string): Promise<VideoGenerationResult> {
  return { error: `Provedor de vídeo "${model.split('/')[0]}" ainda não possui integração de API implementada. Configure uma chave válida para: Google (Veo), OpenAI (Sora), Runway, Kling, Luma ou Stability.` };
}

// Route to correct provider
async function handleVideoGeneration(params: any): Promise<VideoGenerationResult> {
  const model = params.model as string;
  const provider = model.split("/")[0];
  const estabelecimentoId = params.estabelecimentoId;
  
  if (!estabelecimentoId) throw new Error("estabelecimentoId é obrigatório para geração de vídeo");
  
  const apiKey = await fetchApiKey(estabelecimentoId, provider);
  if (!apiKey) {
    throw new Error(`Chave de API não configurada para o provedor "${provider}". Configure em Configurações → APIs Pagas.`);
  }

  console.log(`[generate_video] Provider=${provider}, Model=${model}`);
  
  switch (provider) {
    case "google": return generateVideoGoogle(apiKey, params);
    case "openai": return generateVideoOpenAI(apiKey, params);
    case "runway": return generateVideoRunway(apiKey, params);
    case "kling": return generateVideoKling(apiKey, params);
    case "luma": return generateVideoLuma(apiKey, params);
    case "stability": return generateVideoStability(apiKey, params);
    case "pika":
    case "minimax":
    case "bytedance":
      return generateVideoUnsupported(model);
    default:
      return generateVideoUnsupported(model);
  }
}

async function uploadBase64ToStorage(base64DataUrl: string): Promise<string | null> {
  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !supabaseKey) {
      console.warn("[upload] Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
      return null;
    }
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    const [header, base64] = base64DataUrl.split(",");
    const mime = header.match(/data:(.*?);/)?.[1] || "image/png";
    const ext = mime.includes("jpeg") || mime.includes("jpg") ? "jpg" : "png";
    const fileName = `studio/${crypto.randomUUID()}.${ext}`;
    
    const bytes = base64Decode(base64);
    
    const { error } = await supabase.storage
      .from("marketing-images")
      .upload(fileName, bytes, { contentType: mime, upsert: true });

    if (error) {
      console.error("[upload] Storage upload error:", error.message);
      return null;
    }

    const { data: publicData } = supabase.storage
      .from("marketing-images")
      .getPublicUrl(fileName);

    console.log("[upload] Uploaded to storage:", publicData.publicUrl?.substring(0, 100));
    return publicData.publicUrl;
  } catch (err) {
    console.error("[upload] Failed to upload:", err);
    return null;
  }
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

async function callGateway(apiKey: string, body: Record<string, any>) {
  const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const status = response.status;
    const errorText = await response.text().catch(() => "");
    console.error(`AI gateway ${status}:`, errorText);
    if (status === 429) throw Object.assign(new Error("Rate limit exceeded"), { status: 429 });
    if (status === 402) throw Object.assign(new Error("Credits exhausted"), { status: 402 });
    throw Object.assign(new Error(`AI gateway error: ${status} - ${errorText}`), { status: 500 });
  }

  return response.json();
}

// Only these models are supported by Lovable AI gateway
const SUPPORTED_LLM_MODELS = [
  "google/gemini-2.5-flash", "google/gemini-2.5-flash-lite", "google/gemini-2.5-pro",
  "google/gemini-3-flash-preview", "google/gemini-3-pro-preview",
  "openai/gpt-5", "openai/gpt-5-mini", "openai/gpt-5-nano", "openai/gpt-5.2",
];

const SUPPORTED_IMAGE_MODELS = [
  "google/gemini-2.5-flash-image", "google/gemini-3-pro-image-preview",
];

function validateModel(model: string, type: "llm" | "image"): string {
  const supported = type === "image" ? SUPPORTED_IMAGE_MODELS : SUPPORTED_LLM_MODELS;
  if (supported.includes(model)) return model;
  // Fallback to default
  console.warn(`Unsupported model "${model}" for ${type}, using default`);
  return type === "image" ? "google/gemini-2.5-flash-image" : "google/gemini-3-flash-preview";
}

// Max ~500KB base64 per image to support product composite reference images
const MAX_IMAGE_BASE64_LENGTH = 500_000;

function truncateImageUrl(url: string): string | null {
  if (!url) return null;
  // If it's a regular URL (not base64), keep it
  if (url.startsWith("http://") || url.startsWith("https://")) return url;
  // If base64 is too large, skip it
  if (url.length > MAX_IMAGE_BASE64_LENGTH) {
    console.warn(`Skipping image: base64 too large (${(url.length / 1024).toFixed(0)}KB)`);
    return null;
  }
  return url;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { action, params } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    console.log(`[ai-creative-studio] action=${action}, model=${params?.model || 'default'}`);

    switch (action) {
      case "enhance_prompt": {
        const model = validateModel(params.model || "google/gemini-3-flash-preview", "llm");
        const data = await callGateway(LOVABLE_API_KEY, {
          model,
          messages: [
            { role: "system", content: params.systemPrompt || "You are a creative prompt enhancement assistant. Take the user's simple prompt and expand it with vivid, descriptive details for AI generation. Keep the enhanced prompt concise but rich in visual detail." },
            { role: "user", content: params.prompt },
          ],
        });

        return new Response(JSON.stringify({ result: data.choices?.[0]?.message?.content }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      case "generate_image": {
        const model = validateModel(params.model || "google/gemini-2.5-flash-image", "image");
        const refImages = (params.imageUrls || []) as string[];
        const imageRoles = (params.imageRoles || []) as string[];

        // Identify strict references (product/logo/influencer/clothing) — use EDIT mode
        const strictRoles = ['PRODUCT - DO NOT MODIFY', 'LOGO - DO NOT MODIFY', 'PERSON/INFLUENCER - DO NOT MODIFY', 'CLOTHING - DO NOT MODIFY'];
        const strictImages: { url: string; role: string }[] = [];
        const flexibleImages: { url: string; role: string }[] = [];

        for (let i = 0; i < refImages.length; i++) {
          const safe = truncateImageUrl(refImages[i]);
          if (!safe) continue;
          const role = imageRoles[i] || 'REFERENCE';
          if (strictRoles.includes(role)) {
            strictImages.push({ url: safe, role });
          } else {
            flexibleImages.push({ url: safe, role });
          }
        }

        let data: any;

        if (strictImages.length > 0) {
          // === EDIT MODE: ALL strict images sent as subjects to preserve ===
          console.log(`[generate_image] EDIT MODE — ${strictImages.length} strict refs, ${flexibleImages.length} flexible refs`);
          
          const editContent: any[] = [];

          // First: flexible references as environment/style context
          for (const flex of flexibleImages) {
            editContent.push({ type: "text", text: `[STYLE/ENVIRONMENT REFERENCE: ${flex.role} — use only for background/scenery inspiration]` });
            editContent.push({ type: "image_url", image_url: { url: flex.url } });
          }

          // Build the list of what must be preserved
          const subjectDescriptions = strictImages.map((s, i) => `Image ${i + 1}: ${s.role}`).join(', ');
          
          // Then: ALL strict images with clear labels
          for (let i = 0; i < strictImages.length; i++) {
            const s = strictImages[i];
            editContent.push({ type: "text", text: `[SUBJECT ${i + 1}: ${s.role} — PRESERVE EXACTLY, do NOT modify]` });
            editContent.push({ type: "image_url", image_url: { url: s.url } });
          }

          // Finally: the edit instruction
          const editPrompt = `COMPOSE an image that contains ALL of the above subjects (${subjectDescriptions}) EXACTLY as they appear — same face, identity, body, shape, colors, labels, packaging, proportions. Do NOT redraw, reimagine, or alter any subject. Only create/modify the BACKGROUND and SURROUNDINGS based on:\n\n${params.prompt}`;
          editContent.push({ type: "text", text: editPrompt });

          data = await callGateway(LOVABLE_API_KEY, {
            model,
            messages: [
              { role: "system", content: "You are an image compositor. You receive one or more subject images (products, logos, people, clothing) that must appear in the final image EXACTLY as provided — pixel-perfect identity, face, shape, colors, labels, packaging. NEVER redraw, reimagine, stylize, or alter any subject. You may ONLY change the background, scenery, lighting, and composition around them. If environment/style references are provided, use them ONLY for background inspiration." },
              { role: "user", content: editContent },
            ],
            modalities: ["image", "text"],
          });
        } else {
          // === GENERATION MODE: No strict references, generate freely ===
          const content: any[] = [];
          for (let idx = 0; idx < refImages.length; idx++) {
            const safe = truncateImageUrl(refImages[idx]);
            if (safe) {
              const roleLabel = imageRoles[idx] || `Reference image ${idx + 1}`;
              content.push({ type: "text", text: `[IMAGE ${idx + 1}: ${roleLabel}]` });
              content.push({ type: "image_url", image_url: { url: safe } });
            }
          }
          content.push({ type: "text", text: params.prompt });

          console.log(`[generate_image] GENERATION MODE — ${refImages.length} refs`);

          const systemMessage = refImages.length > 0
            ? "You are an image generator. Use reference images for style and environment inspiration. Create a high-quality image based on the prompt."
            : "You are an image generator. Create high-quality images based on the prompt.";

          data = await callGateway(LOVABLE_API_KEY, {
            model,
            messages: [
              { role: "system", content: systemMessage },
              { role: "user", content },
            ],
            modalities: ["image", "text"],
          });
        }

        const msg = data.choices?.[0]?.message;
        console.log(`[generate_image] Full message keys:`, JSON.stringify(Object.keys(msg || {})));
        console.log(`[generate_image] Has images array:`, !!(msg?.images?.length));
        console.log(`[generate_image] Content type:`, typeof msg?.content);
        if (Array.isArray(msg?.content)) {
          console.log(`[generate_image] Content parts:`, msg.content.map((p: any) => p.type || typeof p));
        }
        
        // Try multiple extraction paths for the image
        let imageUrl = msg?.images?.[0]?.image_url?.url;
        let text = typeof msg?.content === 'string' ? msg.content : '';
        
        // If content is an array of parts (multimodal), extract image from there
        if (!imageUrl && Array.isArray(msg?.content)) {
          for (const part of msg.content) {
            if (part.type === 'image_url' && part.image_url?.url) {
              imageUrl = part.image_url.url;
            } else if (part.type === 'text' && part.text) {
              text = part.text;
            }
          }
        }

        // Also check inline_data format
        if (!imageUrl && Array.isArray(msg?.content)) {
          for (const part of msg.content) {
            if (part.inline_data?.mime_type?.startsWith('image/')) {
              imageUrl = `data:${part.inline_data.mime_type};base64,${part.inline_data.data}`;
            }
          }
        }

        if (!imageUrl) {
          console.warn(`[generate_image] No image in response. Text: "${(text || '').substring(0, 200)}"`);
          console.warn(`[generate_image] Full response structure:`, JSON.stringify(data).substring(0, 500));
        } else {
          console.log(`[generate_image] Image extracted, length: ${imageUrl.length}`);
          // Upload to storage for reliable delivery
          if (imageUrl.startsWith('data:')) {
            const publicUrl = await uploadBase64ToStorage(imageUrl);
            if (publicUrl) imageUrl = publicUrl;
          }
        }

        return new Response(JSON.stringify({ result: { imageUrl, text } }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      case "edit_image": {
        const model = validateModel(params.model || "google/gemini-2.5-flash-image", "image");
        const content: any[] = [
          { type: "text", text: params.prompt },
        ];
        // Support single imageUrl or multiple imageUrls (filter oversized)
        const imageUrls = params.imageUrls || (params.imageUrl ? [params.imageUrl] : []);
        for (const url of imageUrls) {
          const safe = truncateImageUrl(url);
          if (safe) {
            content.push({ type: "image_url", image_url: { url: safe } });
          }
        }

        const data = await callGateway(LOVABLE_API_KEY, {
          model,
          messages: [{ role: "user", content }],
          modalities: ["image", "text"],
        });

        const msg = data.choices?.[0]?.message;
        let imageUrl = msg?.images?.[0]?.image_url?.url;
        
        if (!imageUrl && Array.isArray(msg?.content)) {
          for (const part of msg.content) {
            if (part.type === 'image_url' && part.image_url?.url) {
              imageUrl = part.image_url.url;
            } else if (part.inline_data?.mime_type?.startsWith('image/')) {
              imageUrl = `data:${part.inline_data.mime_type};base64,${part.inline_data.data}`;
            }
          }
        }

        // Upload to storage for reliable delivery
        if (imageUrl && imageUrl.startsWith('data:')) {
          const publicUrl = await uploadBase64ToStorage(imageUrl);
          if (publicUrl) imageUrl = publicUrl;
        }

        return new Response(JSON.stringify({ result: { imageUrl } }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      case "generate_text": {
        const model = validateModel(params.model || "google/gemini-3-flash-preview", "llm");
        const data = await callGateway(LOVABLE_API_KEY, {
          model,
          messages: [
            ...(params.systemPrompt ? [{ role: "system", content: params.systemPrompt }] : []),
            { role: "user", content: params.prompt },
          ],
        });

        return new Response(JSON.stringify({ result: data.choices?.[0]?.message?.content }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      case "analyze_image": {
        const model = validateModel(params.model || "google/gemini-3-flash-preview", "llm");
        const content: any[] = [
          { type: "text", text: params.prompt || "Describe this image in detail." },
        ];
        if (params.imageUrl) {
          content.push({ type: "image_url", image_url: { url: params.imageUrl } });
        }

        const data = await callGateway(LOVABLE_API_KEY, {
          model,
          messages: [{ role: "user", content }],
        });

        return new Response(JSON.stringify({ result: data.choices?.[0]?.message?.content }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      case "generate_video": {
        console.log(`[generate_video] Starting video generation: model=${params.model}`);
        const videoResult = await handleVideoGeneration(params);
        return new Response(JSON.stringify({ result: videoResult }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      case "generate_audio": {
        const provider = (params.provider || "elevenlabs") as string;
        const text = params.text as string;
        if (!text) throw new Error("Text is required for audio generation");

        const estabId = params.estabelecimentoId;
        console.log(`[generate_audio] Provider=${provider}, text length=${text.length}`);

        if (provider === "elevenlabs") {
          const apiKey = await fetchApiKey(estabId, "elevenlabs");
          if (!apiKey) throw new Error("ElevenLabs API key not configured. Go to Settings → Paid APIs.");

          // Fetch extra config from base_url field
          let extraConfig: Record<string, any> = {};
          try {
            const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
            const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
            const sb = createClient(supabaseUrl, supabaseKey);
            const { data } = await sb.from("ai_api_keys").select("base_url").eq("estabelecimento_id", estabId).eq("provider", "elevenlabs").eq("is_active", true).limit(1).single();
            if (data?.base_url) extraConfig = JSON.parse(data.base_url);
          } catch {}

          const voiceId = params.voiceId || extraConfig.defaultVoiceId || "JBFqnCBsd6RMkjVDRZzb";
          const model = params.audioModel?.replace("elevenlabs/", "") || extraConfig.defaultModel || "eleven_multilingual_v2";
          const outputFormat = extraConfig.outputFormat || "mp3_44100_128";

          const ttsResp = await fetch(
            `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}?output_format=${outputFormat}`,
            {
              method: "POST",
              headers: { "xi-api-key": apiKey, "Content-Type": "application/json" },
              body: JSON.stringify({
                text,
                model_id: model,
                voice_settings: {
                  stability: extraConfig.stability ?? 0.5,
                  similarity_boost: extraConfig.similarityBoost ?? 0.75,
                  style: extraConfig.style ?? 0.5,
                  use_speaker_boost: extraConfig.useSpeakerBoost ?? true,
                  speed: extraConfig.speed ?? 1.0,
                },
              }),
            }
          );

          if (!ttsResp.ok) {
            const errText = await ttsResp.text().catch(() => "");
            throw new Error(`ElevenLabs TTS ${ttsResp.status}: ${errText.substring(0, 200)}`);
          }

          const audioBuffer = await ttsResp.arrayBuffer();
          // Upload to storage
          const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
          const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
          const sb = createClient(supabaseUrl, supabaseKey);
          const fileName = `studio/${crypto.randomUUID()}.mp3`;
          await sb.storage.from("marketing-audio").upload(fileName, new Uint8Array(audioBuffer), { contentType: "audio/mpeg", upsert: true });
          const { data: pubData } = sb.storage.from("marketing-audio").getPublicUrl(fileName);

          return new Response(JSON.stringify({ result: { audioUrl: pubData.publicUrl, voiceId, model } }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        if (provider === "google") {
          const apiKey = await fetchApiKey(estabId, "google");
          if (!apiKey) throw new Error("Google API key not configured.");
          // Google Cloud TTS
          const ttsResp = await fetch(`https://texttospeech.googleapis.com/v1/text:synthesize?key=${apiKey}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              input: { text },
              voice: { languageCode: params.lang || "pt-BR", ssmlGender: "FEMALE" },
              audioConfig: { audioEncoding: "MP3" },
            }),
          });
          if (!ttsResp.ok) throw new Error(`Google TTS error ${ttsResp.status}`);
          const ttsData = await ttsResp.json();
          const audioContent = ttsData.audioContent; // base64
          const audioBytes = base64Decode(audioContent);
          const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
          const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
          const sb = createClient(supabaseUrl, supabaseKey);
          const fileName = `studio/${crypto.randomUUID()}.mp3`;
          await sb.storage.from("marketing-audio").upload(fileName, audioBytes, { contentType: "audio/mpeg", upsert: true });
          const { data: pubData } = sb.storage.from("marketing-audio").getPublicUrl(fileName);
          return new Response(JSON.stringify({ result: { audioUrl: pubData.publicUrl, provider: "google" } }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        if (provider === "openai") {
          const apiKey = await fetchApiKey(estabId, "openai");
          if (!apiKey) throw new Error("OpenAI API key not configured.");
          const ttsResp = await fetch("https://api.openai.com/v1/audio/speech", {
            method: "POST",
            headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
            body: JSON.stringify({
              model: "tts-1-hd",
              input: text,
              voice: params.voice || "alloy",
              response_format: "mp3",
            }),
          });
          if (!ttsResp.ok) throw new Error(`OpenAI TTS error ${ttsResp.status}`);
          const audioBuffer = await ttsResp.arrayBuffer();
          const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
          const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
          const sb = createClient(supabaseUrl, supabaseKey);
          const fileName = `studio/${crypto.randomUUID()}.mp3`;
          await sb.storage.from("marketing-audio").upload(fileName, new Uint8Array(audioBuffer), { contentType: "audio/mpeg", upsert: true });
          const { data: pubData } = sb.storage.from("marketing-audio").getPublicUrl(fileName);
          return new Response(JSON.stringify({ result: { audioUrl: pubData.publicUrl, provider: "openai" } }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        throw new Error(`Unsupported audio provider: ${provider}`);
      }

      case "generate_music": {
        const estabId = params.estabelecimentoId;
        const prompt = params.prompt as string;
        if (!prompt) throw new Error("Prompt is required for music generation");
        const duration = params.duration || 30;
        const provider = (params.provider || "elevenlabs") as string;

        console.log(`[generate_music] Provider=${provider}, prompt="${prompt.substring(0, 60)}"`);

        if (provider === "elevenlabs") {
          const apiKey = await fetchApiKey(estabId, "elevenlabs");
          if (!apiKey) throw new Error("ElevenLabs API key not configured. Go to Settings → Paid APIs.");

          const musicResp = await fetch("https://api.elevenlabs.io/v1/music", {
            method: "POST",
            headers: { "xi-api-key": apiKey, "Content-Type": "application/json" },
            body: JSON.stringify({ prompt, duration_seconds: duration }),
          });
          if (!musicResp.ok) {
            const errText = await musicResp.text().catch(() => "");
            throw new Error(`ElevenLabs Music ${musicResp.status}: ${errText.substring(0, 200)}`);
          }
          const audioBuffer = await musicResp.arrayBuffer();
          const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
          const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
          const sb = createClient(supabaseUrl, supabaseKey);
          const fileName = `studio/${crypto.randomUUID()}.mp3`;
          await sb.storage.from("marketing-audio").upload(fileName, new Uint8Array(audioBuffer), { contentType: "audio/mpeg", upsert: true });
          const { data: pubData } = sb.storage.from("marketing-audio").getPublicUrl(fileName);
          return new Response(JSON.stringify({ result: { audioUrl: pubData.publicUrl, duration, provider: "elevenlabs" } }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        if (provider === "suno") {
          const apiKey = await fetchApiKey(estabId, "suno");
          if (!apiKey) throw new Error("Suno API key not configured. Go to Settings → Paid APIs.");
          // Suno API v2
          const sunoResp = await fetch("https://api.suno.ai/v2/generate", {
            method: "POST",
            headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
            body: JSON.stringify({
              prompt,
              duration: duration,
              make_instrumental: params.instrumental || false,
            }),
          });
          if (!sunoResp.ok) throw new Error(`Suno API error ${sunoResp.status}`);
          const sunoData = await sunoResp.json();
          const audioUrl = sunoData.audio_url || sunoData.url;
          return new Response(JSON.stringify({ result: { audioUrl, duration, provider: "suno" } }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        throw new Error(`Unsupported music provider: ${provider}`);
      }

      default:
        return new Response(JSON.stringify({ error: `Unknown action: ${action}` }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    }
  } catch (e: any) {
    console.error("ai-creative-studio error:", e);
    const status = e?.status || 500;
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
