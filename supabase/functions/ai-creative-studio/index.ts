import { createClient } from "npm:@supabase/supabase-js@2.49.1";
import { revisarPortugues } from "../_shared/revisar-pt.ts";

function mapWavespeedLanguage(lang: unknown): string {
  const v = String(lang || "").trim().toLowerCase();
  const map: Record<string, string> = {
    "": "Portuguese",
    "pt": "Portuguese", "pt-br": "Portuguese", "pt-pt": "Portuguese", "portuguese": "Portuguese", "português": "Portuguese",
    "en": "English", "en-us": "English", "en-gb": "English", "english": "English",
    "es": "Spanish", "es-es": "Spanish", "es-mx": "Spanish", "spanish": "Spanish",
    "de": "German", "german": "German",
    "it": "Italian", "italian": "Italian",
    "fr": "French", "french": "French",
    "ja": "Japanese", "japanese": "Japanese",
    "zh": "Chinese", "zh-cn": "Chinese", "chinese": "Chinese",
    "auto": "auto",
  };
  return map[v] || "Portuguese";
}

function base64Encode(data: ArrayBuffer | Uint8Array): string {
  const bytes = data instanceof Uint8Array ? data : new Uint8Array(data);
  const chunks: string[] = [];
  const chunkSize = 8192;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    chunks.push(String.fromCharCode(...bytes.subarray(i, i + chunkSize)));
  }
  return btoa(chunks.join(""));
}

function base64Decode(str: string): Uint8Array {
  const binary = atob(str);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

// ===== VIDEO PROVIDER API IMPLEMENTATIONS =====

interface VideoGenerationResult {
  videoUrl?: string;
  thumbnailUrl?: string;
  provider?: string;
  providerVideoId?: string;
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
    if (done && result === undefined) {
      throw new Error("timeout:A geração de vídeo foi concluída mas não retornou resultado. Tente novamente.");
    }
    await new Promise(r => setTimeout(r, intervalMs));
  }
  throw new Error("timeout:A geração de vídeo excedeu o tempo limite. O servidor do modelo está sobrecarregado. Tente novamente mais tarde.");
}

// --- Google Veo (Vertex AI / AI Studio) ---
// Starts a Google Veo long-running operation and returns the operation name immediately.
// Polling is done client-side via fetch_google_video to avoid edge function wall-clock limits.
async function startVideoGoogle(apiKey: string, params: any): Promise<{ taskId: string; provider: string }> {
  const modelMap: Record<string, string> = {
    "google/veo-3.1": "veo-3.1-generate-preview",
    "google/veo-3.1-fast": "veo-3.1-fast-generate-preview",
    "google/veo-3": "veo-3.1-generate-preview",
    "google/veo-2": "veo-2.0-generate-001",
  };
  const modelId = modelMap[params.model] || "veo-3.1-generate-preview";

  // Prepare image reference for image-to-video mode
  let imagePayload: any = {};
  const allImageUrls = (params.imageUrls || []) as string[];
  const bestImageUrl = allImageUrls[0];

  if (params.bridgeMode && allImageUrls.length >= 2 && allImageUrls[0]?.startsWith("http") && allImageUrls[1]?.startsWith("http")) {
    try {
      console.log(`[generate_video] Google Veo bridge mode: composing side-by-side reference from both frames`);
      const [respA, respB] = await Promise.all([fetch(allImageUrls[0]), fetch(allImageUrls[1])]);
      if (respA.ok && respB.ok) {
        const [imgBufA, imgBufB] = await Promise.all([respA.arrayBuffer(), respB.arrayBuffer()]);
        const mimeTypeA = (respA.headers.get("content-type") || "image/jpeg").split(";")[0].trim();
        const mimeTypeB = (respB.headers.get("content-type") || "image/jpeg").split(";")[0].trim();
        const dataUrlA = `data:${mimeTypeA};base64,${base64Encode(imgBufA)}`;
        const dataUrlB = `data:${mimeTypeB};base64,${base64Encode(imgBufB)}`;
        const svg = `
          <svg xmlns="http://www.w3.org/2000/svg" width="2560" height="720" viewBox="0 0 2560 720">
            <rect width="2560" height="720" fill="black"/>
            <image href="${dataUrlA}" x="0" y="0" width="1280" height="720" preserveAspectRatio="xMidYMid slice"/>
            <image href="${dataUrlB}" x="1280" y="0" width="1280" height="720" preserveAspectRatio="xMidYMid slice"/>
            <rect x="0" y="0" width="1280" height="720" fill="none" stroke="white" stroke-width="8"/>
            <rect x="1280" y="0" width="1280" height="720" fill="none" stroke="white" stroke-width="8"/>
            <rect x="32" y="28" width="250" height="72" rx="16" fill="rgba(0,0,0,0.72)"/>
            <rect x="1780" y="28" width="748" height="72" rx="16" fill="rgba(0,0,0,0.72)"/>
            <text x="58" y="74" fill="white" font-size="36" font-family="Arial, sans-serif" font-weight="700">START FRAME</text>
            <text x="1808" y="74" fill="white" font-size="36" font-family="Arial, sans-serif" font-weight="700">END FRAME</text>
          </svg>
        `;
        const svgBytes = new TextEncoder().encode(svg);
        imagePayload = { image: { bytesBase64Encoded: base64Encode(svgBytes), mimeType: "image/svg+xml" } };
      }
    } catch (imgErr) {
      console.warn(`[generate_video] Google Veo bridge: failed to compose frames:`, imgErr);
    }
  } else if (bestImageUrl?.startsWith("http")) {
    try {
      const imgResp = await fetch(bestImageUrl);
      if (imgResp.ok) {
        const contentType = imgResp.headers.get("content-type") || "image/png";
        const mimeType = contentType.split(";")[0].trim();
        const imgBuf = await imgResp.arrayBuffer();
        const b64 = base64Encode(imgBuf);
        imagePayload = { image: { bytesBase64Encoded: b64, mimeType } };
      }
    } catch (imgErr) {
      console.warn(`[generate_video] Google Veo: failed to attach image:`, imgErr);
    }
  }

  let cleanPrompt = params.prompt || "";

  if (params.bridgeMode) {
    const directionMatch = cleanPrompt.match(/TRANSITION DIRECTION:\s*([\s\S]*?)(?:\n\nCRITICAL:|$)/);
    const userDirection = directionMatch?.[1]?.trim() || cleanPrompt;
    cleanPrompt = `The attached reference image contains two exact frames side by side: LEFT is the starting frame and RIGHT is the ending frame. Create a smooth cinematic transition from the LEFT frame to the RIGHT frame. ${userDirection}. The first moment must match the left frame and the last moment must match the right frame.`;
  } else {
    const fidelityMarkers = [
      '🔊 Áudio', '⚠️ INSTRUÇÕES', '[INSTRUÇÃO PADRÃO]', '🔒 ORDEM',
      'TÉCNICA:', 'PESSOA/INFLUENCER', '[PRODUTO', '[PESSOA',
      'PRESERVAÇÃO PIXEL', 'MODO FOTOMONTAGEM', 'Imagem 1:', 'Imagem 2:',
      'NÃO gere', 'NÃO altere', 'NÃO mude', 'NÃO crie', 'NÃO modifique', 'NÃO redesenhe',
      'É a MESMA pessoa', 'É o MESMO produto', 'Se a IA gerar',
      'COPIAR EXATAMENTE', 'COPIAR ROSTO', 'pixel a pixel', 'pixel-identical',
      'FOTOGRAFIAS REAIS', 'montagem fotográfica', 'FIDELIDADE',
      'Você DEVE manter', 'Você DEVE reproduzir',
      'mesmo rosto', 'tom de pele', 'traços faciais', 'características faciais',
      'mesma embalagem', 'mesmas cores', 'mesmo layout',
    ];
    let cutIndex = cleanPrompt.length;
    for (const marker of fidelityMarkers) {
      const idx = cleanPrompt.indexOf(marker);
      if (idx >= 0 && idx < cutIndex) cutIndex = idx;
    }
    cleanPrompt = cleanPrompt.substring(0, cutIndex).replace(/\n{2,}/g, "\n\n").trim();
  }

  if (cleanPrompt.length < 20) {
    cleanPrompt = "A cinematic product showcase video with smooth camera movement, professional lighting, and elegant composition.";
  }

  const withAudio = params.withAudio !== false;
  const withMusic = withAudio ? (params.withMusic !== false) : false;
  if (!withAudio) {
    cleanPrompt += "\n\nGenerate a completely SILENT video. No speech, no music, no soundtrack, no ambient audio.";
  } else if (!withMusic) {
    cleanPrompt += "\n\nDo NOT add any background music or soundtrack. Keep only natural non-musical audio.";
  }

  console.log(`[start_google_video] Veo prompt (${cleanPrompt.length} chars), model=${modelId}`);

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${modelId}:predictLongRunning?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        instances: [{ prompt: cleanPrompt, ...imagePayload }],
        parameters: {
          aspectRatio: (["16:9","9:16"].includes(params.aspectRatio) ? params.aspectRatio : "16:9"),
          ...(modelId.startsWith("veo-3")
            ? {}
            : { durationSeconds: Math.min(8, Math.max(4, Math.round(Number(params.duration) || 6))) }),
          ...(modelId.startsWith("veo-2") ? { generateAudio: withAudio } : {}),
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

  console.log(`[start_google_video] operation: ${operationName}`);
  return { taskId: operationName, provider: "google" };
}

// Single poll of a Google Veo operation. Returns { done, videoUrl?, error? }.
async function fetchVideoGoogleOnce(apiKey: string, operationName: string): Promise<{ done: boolean; videoUrl?: string; error?: string; provider?: string; status?: string; message?: string }> {
  const pollResp = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/${operationName}?key=${apiKey}`
  );
  const pollData = await pollResp.json();
  const isDone = pollData.done === true;
  const hasError = pollData.error != null;

  if (hasError) {
    const errMsg = typeof pollData.error === 'object' ? (pollData.error.message || JSON.stringify(pollData.error)) : String(pollData.error);
    return { done: true, error: `Google Veo error: ${errMsg.substring(0, 200)}` };
  }

  if (!isDone) return { done: false, provider: "google", status: "processing", message: "Google Veo está renderizando o vídeo" };

  const resp = pollData.response || pollData.result || pollData;
  const genResp = resp?.generateVideoResponse;
  if (genResp?.raiMediaFilteredCount > 0 || genResp?.raiMediaFilteredReasons?.length > 0) {
    const reasons = genResp.raiMediaFilteredReasons?.join("; ") || "Conteúdo bloqueado pela moderação";
    return { done: true, error: `blocked:${reasons}` };
  }

  const downloadAndStore = async (uri: string) => {
    const downloadUrl = uri.includes("?") ? `${uri}&key=${apiKey}` : `${uri}?key=${apiKey}`;
    const dlResp = await fetch(downloadUrl);
    if (!dlResp.ok) return { done: true, error: `Failed to download video: ${dlResp.status}` };
    const videoBytes = new Uint8Array(await dlResp.arrayBuffer());
    const storedUrl = await uploadVideoToStorage(videoBytes);
    return { done: true, videoUrl: storedUrl || undefined, provider: "google" };
  };

  const genSamples = genResp?.generatedSamples;
  if (genSamples?.[0]?.video?.uri) return await downloadAndStore(genSamples[0].video.uri);
  if (genSamples?.[0]?.video?.bytesBase64Encoded) {
    const bytes = base64Decode(genSamples[0].video.bytesBase64Encoded);
    const url = await uploadVideoToStorage(new Uint8Array(bytes));
    return { done: true, videoUrl: url || undefined, provider: "google" };
  }

  const samples = resp?.generatedSamples || resp?.videos || resp?.predictions || [];
  const video = samples?.[0]?.video || samples?.[0];
  if (video?.uri) return await downloadAndStore(video.uri);
  if (video?.bytesBase64Encoded) {
    const bytes = base64Decode(video.bytesBase64Encoded);
    const url = await uploadVideoToStorage(new Uint8Array(bytes));
    return { done: true, videoUrl: url || undefined, provider: "google" };
  }
  if (typeof video === "string" && video.startsWith("http")) return await downloadAndStore(video);

  return { done: true, error: `No video in response: ${JSON.stringify(resp).substring(0, 300)}` };
}

// Back-compat sync wrapper (used by internal auto-routing). Polls a short number of times,
// then surfaces a friendly timeout so the caller can fall back / retry.
async function generateVideoGoogle(apiKey: string, params: any): Promise<VideoGenerationResult> {
  const { taskId } = await startVideoGoogle(apiKey, params);
  // Poll up to ~110s within the edge function (leaves room before wall-clock timeout)
  for (let i = 0; i < 22; i++) {
    await new Promise((r) => setTimeout(r, 5000));
    const tick = await fetchVideoGoogleOnce(apiKey, taskId);
    if (tick.done) {
      if (tick.error) throw new Error(tick.error);
      return { videoUrl: tick.videoUrl, provider: "google" };
    }
  }
  // Surface taskId so the client can keep polling via fetch_google_video without restarting generation
  throw new Error(`async_pending:${taskId}`);
}

// --- OpenAI Sora ---
async function generateVideoOpenAI(apiKey: string, params: any): Promise<VideoGenerationResult> {
  const model = params.model?.includes("sora-2-pro") ? "sora-2-pro" : "sora-2";
  const size = params.aspectRatio === "9:16" ? "720x1280" : "1280x720";

  // Sora only accepts seconds: 4, 8, or 12
  const validSeconds = [4, 8, 12];
  const dur = params.duration || 4;
  const soraSeconds = validSeconds.reduce((prev, curr) => Math.abs(curr - dur) < Math.abs(prev - dur) ? curr : prev);

  const isCorrection = params.correctionMode === true;
  const sourceVideoId = typeof params.sourceVideoId === "string" && params.sourceVideoId.trim()
    ? params.sourceVideoId.trim()
    : null;
  const sourceVideoUrl = typeof params.sourceVideoUrl === "string" && params.sourceVideoUrl.startsWith("http")
    ? params.sourceVideoUrl
    : null;
  const firstImageRef = Array.isArray(params.imageUrls) ? params.imageUrls[0] : null;

  const buildCreateFormData = (includeReference: boolean) => {
    const formData = new FormData();
    formData.append("model", model);
    formData.append("prompt", params.prompt);
    formData.append("size", size);
    formData.append("seconds", String(soraSeconds));

    if (includeReference && isCorrection) {
      if (sourceVideoUrl) {
        formData.append("input_reference", sourceVideoUrl);
      }
      if (typeof firstImageRef === "string" && firstImageRef) {
        // JSON-safe reference shape documented by OpenAI videos API
        formData.append("image_reference", JSON.stringify({ image_url: firstImageRef }));
      }
    }

    return formData;
  };

  let response: Response;

  // Prefer remix when we have a previous OpenAI video id (best fidelity for corrections)
  if (isCorrection && sourceVideoId) {
    const remixForm = buildCreateFormData(false);
    response = await fetch(`https://api.openai.com/v1/videos/${sourceVideoId}/remix`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
      },
      body: remixForm,
    });

    if (!response.ok) {
      const remixErr = await response.text();
      console.warn(`[generate_video] Sora remix failed (${response.status}), fallback to create: ${remixErr.substring(0, 200)}`);
      const includeReference = !!(sourceVideoUrl || firstImageRef);
      response = await fetch("https://api.openai.com/v1/videos", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${apiKey}`,
        },
        body: buildCreateFormData(includeReference),
      });
    }
  } else {
    const includeReference = isCorrection && !!(sourceVideoUrl || firstImageRef);
    response = await fetch("https://api.openai.com/v1/videos", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
      },
      body: buildCreateFormData(includeReference),
    });

    // In correction mode we must NOT silently drop references,
    // otherwise the model can regenerate a radically different video.
    if (!response.ok && includeReference) {
      const firstErr = await response.text();
      throw new Error(`Sora não aceitou referência para correção (${response.status}). Para preservar fidelidade, use OpenAI Remix ou Runway video-to-video. Detalhe: ${firstErr.substring(0, 180)}`);
    }
  }

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`OpenAI Sora API error ${response.status}: ${err.substring(0, 200)}`);
  }

  const jobData = await response.json();
  const jobId = jobData.id;
  if (!jobId) throw new Error("No job ID returned from OpenAI Sora");

  console.log(`[generate_video] OpenAI Sora job created: ${jobId}`);

  // Step 2: Poll GET /v1/videos/{id} until completed
  const videoId = await pollUntilDone<string>(async () => {
    const pollResp = await fetch(`https://api.openai.com/v1/videos/${jobId}`, {
      headers: { "Authorization": `Bearer ${apiKey}` },
    });
    if (!pollResp.ok) {
      await pollResp.text();
      return { done: false };
    }
    const pollData = await pollResp.json();
    console.log(`[generate_video] Sora poll status: ${pollData.status}`);

    if (pollData.status === "failed") {
      return { done: true, error: pollData.error?.message || "Video generation failed" } as any;
    }
    if (pollData.status === "completed" || pollData.status === "succeeded") {
      return { done: true, result: jobId };
    }
    return { done: false };
  }, 5000, 120);

  // Step 3: Download video content via GET /v1/videos/{id}/content
  const contentResp = await fetch(`https://api.openai.com/v1/videos/${videoId}/content`, {
    headers: { "Authorization": `Bearer ${apiKey}` },
  });

  if (!contentResp.ok) {
    throw new Error(`Failed to download Sora video: ${contentResp.status}`);
  }

  const videoBytes = new Uint8Array(await contentResp.arrayBuffer());
  const storedUrl = await uploadVideoToStorage(videoBytes);
  return {
    videoUrl: storedUrl || undefined,
    provider: "openai",
    providerVideoId: videoId,
  };
}

// --- Runway ---
async function generateVideoRunway(apiKey: string, params: any): Promise<VideoGenerationResult> {
  const modelMap: Record<string, string> = {
    "runway/gen4": "gen4_turbo",
    "runway/gen3-alpha-turbo": "gen3a_turbo",
  };

  const hasSourceVideo = typeof params.sourceVideoUrl === "string" && params.sourceVideoUrl.startsWith("http");
  const useVideoToVideo = params.correctionMode === true && hasSourceVideo;

  let endpoint = "https://api.dev.runwayml.com/v1/image_to_video";
  let body: any;

  if (useVideoToVideo) {
    // Runway video-to-video gives much better fidelity for correction flows.
    endpoint = "https://api.dev.runwayml.com/v1/video_to_video";
    body = {
      model: "gen4_aleph",
      promptText: params.prompt,
      videoUri: params.sourceVideoUrl,
    };

    if (params.seed !== undefined && params.seed !== null && `${params.seed}` !== "undefined" && !Number.isNaN(Number(params.seed))) {
      body.seed = Number(params.seed);
    }
  } else {
    const model = modelMap[params.model] || "gen3a_turbo";
    body = {
      model,
      promptText: params.prompt,
      ratio: params.aspectRatio === "9:16" ? "portrait" : params.aspectRatio === "1:1" ? "square" : "widescreen",
      duration: params.duration || 10,
    };

    if (params.imageUrls?.[0]?.startsWith("http")) {
      body.promptImage = params.imageUrls[0];
    }
    // Bridge mode: use last_frame for Runway Gen-3 to create start→end transition
    if (params.bridgeMode && params.imageUrls?.[1]?.startsWith("http")) {
      body.lastFrame = params.imageUrls[1];
      console.log(`[generate_video] Runway bridge mode: promptImage (start) + lastFrame (end)`);
    }
  }

  const response = await fetch(endpoint, {
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
    const mode = useVideoToVideo ? "video_to_video" : "image_to_video";
    throw new Error(`Runway API (${mode}) error ${response.status}: ${err.substring(0, 200)}`);
  }

  const taskData = await response.json();
  const taskId = taskData.id;
  if (!taskId) throw new Error("No task ID from Runway");

  console.log(`[generate_video] Runway task (${useVideoToVideo ? "v2v" : "i2v"}): ${taskId}`);

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

  return {
    videoUrl: storedUrl || result,
    provider: "runway",
    providerVideoId: taskId,
  };
}

// --- Kling (Kuaishou) ---
async function generateVideoKling(apiKey: string, params: any): Promise<VideoGenerationResult> {
  // Use image-to-video endpoint when reference images are provided
  const hasStartImage = params.imageUrls?.[0]?.startsWith("http");
  const endpoint = hasStartImage
    ? "https://api.klingai.com/v1/videos/image2video"
    : "https://api.klingai.com/v1/videos/text2video";

  const klingBody: any = {
    prompt: params.prompt,
    negative_prompt: params.negativePrompt || "",
    cfg_scale: params.cfgScale || 0.5,
    mode: params.model === "kling/v2.1" ? "highquality" : "std",
    aspect_ratio: params.aspectRatio || "16:9",
    duration: String(params.duration || 5),
  };

  if (hasStartImage) {
    klingBody.image = params.imageUrls[0];
    console.log(`[generate_video] Kling: using image-to-video with start frame`);
    // Bridge mode: add tail image for Kling if supported
    if (params.bridgeMode && params.imageUrls?.[1]?.startsWith("http")) {
      klingBody.image_tail = params.imageUrls[1];
      console.log(`[generate_video] Kling bridge mode: image (start) + image_tail (end)`);
    }
  }

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(klingBody),
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
    // Bridge mode: add end keyframe for Luma
    if (params.bridgeMode && params.imageUrls?.[1]?.startsWith("http")) {
      body.keyframes.frame1 = { type: "image", url: params.imageUrls[1] };
      console.log(`[generate_video] Luma bridge mode: frame0 (start) + frame1 (end)`);
    }
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

// --- Replicate (LTX-Video 2) ---
async function generateVideoReplicate(apiKey: string, params: any): Promise<VideoGenerationResult> {
  const prompt = params.prompt || params.description || "A cinematic video";
  const duration = Math.min(10, Math.max(2, Number(params.duration) || 5));
  const aspectRatio = params.aspectRatio === "9:16" ? "9:16" : params.aspectRatio === "1:1" ? "1:1" : "16:9";
  
  // Map aspect ratio to resolution
  const resolutionMap: Record<string, { width: number; height: number }> = {
    "16:9": { width: 768, height: 512 },
    "9:16": { width: 512, height: 768 },
    "1:1": { width: 512, height: 512 },
  };
  const res = resolutionMap[aspectRatio] || resolutionMap["16:9"];

  const input: any = {
    prompt,
    width: res.width,
    height: res.height,
    num_frames: Math.round(duration * 24), // ~24fps
    guidance_scale: params.cfgScale || 3,
    num_inference_steps: params.steps || 40,
  };

  // Support image-to-video if reference image provided
  if (params.imageUrls?.[0]) {
    input.image = params.imageUrls[0];
  }

  if (params.negativePrompt) {
    input.negative_prompt = params.negativePrompt;
  }

  console.log(`[generate_video] Replicate LTX-Video: prompt="${prompt.substring(0, 100)}", ${res.width}x${res.height}, frames=${input.num_frames}`);

  // Create prediction
  const createResp = await fetch("https://api.replicate.com/v1/predictions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "lightricks/ltx-video",
      input,
    }),
  });

  if (!createResp.ok) {
    const err = await createResp.text();
    throw new Error(`Replicate API error ${createResp.status}: ${err.substring(0, 300)}`);
  }

  const prediction = await createResp.json();
  const predictionId = prediction.id;
  if (!predictionId) throw new Error("No prediction ID from Replicate");

  console.log(`[generate_video] Replicate prediction created: ${predictionId}`);

  // Poll for completion
  const videoUrl = await pollUntilDone<string>(async () => {
    const pollResp = await fetch(`https://api.replicate.com/v1/predictions/${predictionId}`, {
      headers: { "Authorization": `Bearer ${apiKey}` },
    });
    const pollData = await pollResp.json();

    if (pollData.status === "succeeded") {
      // Output can be a string URL or array of URLs
      const output = pollData.output;
      const url = Array.isArray(output) ? output[0] : output;
      return { done: true, result: url };
    }
    if (pollData.status === "failed" || pollData.status === "canceled") {
      return { done: true, error: pollData.error || "Replicate generation failed" };
    }
    return { done: false };
  }, 4000, 180);

  // Download and store
  const videoResp = await fetch(videoUrl);
  const videoBytes = new Uint8Array(await videoResp.arrayBuffer());
  const storedUrl = await uploadVideoToStorage(videoBytes);
  return { videoUrl: storedUrl || videoUrl };
}

// --- Apiframe unified provider ---
function extractApiframeVideoUrl(payload: any): string | null {
  return payload?.video_urls?.[0]
    || payload?.video_url
    || payload?.result_url
    || payload?.output_url
    || (Array.isArray(payload?.output) ? payload.output[0] : payload?.output)
    || payload?.result?.video_urls?.[0]
    || payload?.result?.video_url
    || payload?.result?.result_url
    || payload?.result?.output_url
    || (Array.isArray(payload?.result?.output) ? payload.result.output[0] : payload?.result?.output)
    || payload?.data?.video_urls?.[0]
    || payload?.data?.video_url
    || payload?.data?.result_url
    || payload?.data?.output_url
    || payload?.data?.url
    || payload?.generation?.assets?.video
    || payload?.assets?.video
    || payload?.url
    || null;
}

async function startVideoApiframe(estabelecimentoId: string, params: any): Promise<{ taskId?: string; videoUrl?: string; error?: string }> {
  const model = (params.model as string) || "";
  const subModel = model.replace("apiframe/", "");

  const ACTION_MAP: Record<string, string> = {
    "midjourney-video": "midjourney-video",
    "runway-gen4": "runway-imagine",
    "runway": "runway-imagine",
    "kling-2.6": "kling-2.6",
    "kling-2.5": "kling-2.5-turbo",
    "luma": "luma-imagine",
  };

  const action = ACTION_MAP[subModel];
  if (!action) {
    return { error: `Modelo "${subModel}" não está disponível no Apiframe. Modelos suportados: Runway, Kling 2.6/2.5, Luma.` };
  }

  // Pre-generate hero frame if strict refs or brand identity exist
  const _roles = (params.imageRoles || []) as string[];
  const _hasStrict = _roles.some(r => r === 'PRODUCT - DO NOT MODIFY' || r === 'PERSON/INFLUENCER - DO NOT MODIFY');
  const _hasVI = _roles.some(r => r === 'BRAND IDENTITY REFERENCE');
  if ((_hasStrict || _hasVI) && !params._heroFrameUsed) {
    try {
      const hero = await generateHeroFrame(params);
      if (hero) {
        console.log(`[apiframe-video] Using hero frame as starting image (VI=${_hasVI})`);
        params.imageUrls = [hero];
        params._heroFrameUsed = true;
      }
    } catch (e) {
      console.warn(`[apiframe-video] hero frame failed:`, (e as Error)?.message);
    }
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !supabaseKey) {
    return { error: "Configuração do servidor incompleta (SUPABASE_URL/SERVICE_ROLE_KEY)." };
  }

  const afParams: Record<string, any> = {};
  const startImageUrl = params.imageUrls?.[0] || null;
  const endImageUrl = params.imageUrls?.[1] || null;
  const isBridge = params.bridgeMode === true;

  let cleanPrompt = params.prompt || "";
  if (isBridge) {
    const dirMatch = cleanPrompt.match(/TRANSITION DIRECTION:\s*([\s\S]*?)(?:\n\nCRITICAL:|$)/);
    if (dirMatch?.[1]?.trim()) cleanPrompt = dirMatch[1].trim();
    console.log(`[apiframe-video] Bridge mode: cleaned prompt to "${cleanPrompt.substring(0, 120)}..."`);
  }
  // Apiframe has a prompt length limit (~500 chars for most models)
  // Truncate long storyboard prompts to a concise version
  if (cleanPrompt.length > 480) {
    // Build a concise prompt preserving key info about product + influencer
    const productMatch = cleanPrompt.match(/for "([^"]+)"/) || cleanPrompt.match(/PRODUTO[^:]*:\s*([^\n.]{3,60})/i);
    const productName = productMatch?.[1]?.trim() || '';
    const hasInfluencer = /influencer|pessoa|person/i.test(cleanPrompt);
    const hasHeroFrame = params._heroFrameUsed === true;
    
    if (hasHeroFrame) {
      cleanPrompt = hasInfluencer
        ? `Animate this image: a person naturally demonstrating and holding the product "${productName}". Cinematic smooth motion, professional lighting. The person and product must remain IDENTICAL to the starting image. No text overlays.`
        : `Animate this image: cinematic product video for "${productName}". Smooth camera movement, professional lighting. The product must remain IDENTICAL to the starting image. No text overlays.`;
    } else {
      cleanPrompt = hasInfluencer
        ? `Cinematic video: an influencer holding and demonstrating the product "${productName}". Professional advertising, premium lighting. The product must appear exactly as in the reference image. No text overlays.`
        : `Cinematic promotional video for "${productName}". Professional product advertising, clean modern style, premium lighting, smooth camera movements. No text overlays.`;
    }
    console.log(`[apiframe-video] Prompt truncated from ${(params.prompt || "").length} chars to ${cleanPrompt.length}`);
  }
  afParams.prompt = cleanPrompt;

  if (subModel === "kling-2.5") {
    if (startImageUrl) afParams.start_image = startImageUrl;
    if (endImageUrl && isBridge) afParams.end_image = endImageUrl;
  } else if (subModel === "kling-2.6") {
    if (startImageUrl) afParams.image_url = startImageUrl;
    if (endImageUrl && isBridge) afParams.image_tail = endImageUrl;
  } else if (subModel === "luma") {
    if (startImageUrl) afParams.image_url = startImageUrl;
    if (endImageUrl && isBridge) afParams.end_image_url = endImageUrl;
  } else if (subModel === "runway") {
    afParams.model = "gen3a_turbo";
    if (startImageUrl) {
      afParams.image_url = startImageUrl;
      afParams.generation_type = "image2video";
    } else {
      afParams.generation_type = "text2video";
    }
    if (endImageUrl && isBridge) afParams.end_image_url = endImageUrl;
  } else {
    if (startImageUrl) {
      afParams.image_url = startImageUrl;
      afParams.generation_type = "image2video";
    } else {
      afParams.generation_type = "text2video";
    }
    if (endImageUrl && isBridge) afParams.end_image_url = endImageUrl;
  }

  if (params.aspectRatio) afParams.aspect_ratio = params.aspectRatio;
  const afRawDur = Number(params.duration) || 5;
  if (subModel.includes("kling") || subModel.includes("runway") || subModel.includes("luma")) {
    afParams.duration = afRawDur <= 7 ? 5 : 10;
  } else {
    afParams.duration = afRawDur;
  }

  console.log(`[apiframe-video] Calling action="${action}" for model="${model}", bridge=${isBridge}, hasStart=${!!startImageUrl}, hasEnd=${!!endImageUrl}`);

  const proxyUrl = `${supabaseUrl}/functions/v1/apiframe-proxy`;
  const startResp = await fetch(proxyUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${supabaseKey}`,
    },
    body: JSON.stringify({ action, estabelecimentoId, params: afParams }),
  });

  const startData = await startResp.json().catch(() => ({}));
  if (!startResp.ok || startData?.error) {
    return { error: startData?.error || `Erro ao iniciar geração via Apiframe (${startResp.status})` };
  }

  const taskId = startData?.task_id || startData?.taskId || startData?.id || startData?.data?.task_id || startData?.data?.taskId || startData?.data?.id;
  if (taskId) {
    console.log(`[apiframe-video] Task started: ${taskId}`);
    return { taskId };
  }

  const directUrl = extractApiframeVideoUrl(startData);
  if (directUrl) {
    const videoResp = await fetch(directUrl);
    const videoBytes = new Uint8Array(await videoResp.arrayBuffer());
    const storedUrl = await uploadVideoToStorage(videoBytes);
    return { videoUrl: storedUrl || directUrl };
  }

  console.log(`[apiframe-video] Unexpected start payload: ${JSON.stringify(startData).substring(0, 600)}`);
  return { error: "Apiframe não retornou task_id nem video_url." };
}

async function fetchVideoApiframe(estabelecimentoId: string, taskId: string): Promise<{ done: boolean; videoUrl?: string; error?: string; provider?: string; status?: string; message?: string }> {
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !supabaseKey) {
    return { done: true, error: "Configuração do servidor incompleta (SUPABASE_URL/SERVICE_ROLE_KEY)." };
  }

  const proxyUrl = `${supabaseUrl}/functions/v1/apiframe-proxy`;
  const pollResp = await fetch(proxyUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${supabaseKey}`,
    },
    body: JSON.stringify({ action: "fetch", estabelecimentoId, params: { task_id: taskId } }),
  });
  const pollData = await pollResp.json().catch(() => ({}));

  if (!pollResp.ok || pollData?.error) {
    return { done: true, error: pollData?.error || `Falha ao consultar tarefa no Apiframe (${pollResp.status}).` };
  }

  const url = extractApiframeVideoUrl(pollData);
  if (url) {
    const videoResp = await fetch(url);
    const videoBytes = new Uint8Array(await videoResp.arrayBuffer());
    const storedUrl = await uploadVideoToStorage(videoBytes);
    return { done: true, videoUrl: storedUrl || url };
  }

  const status = String(
    pollData?.status
    || pollData?.state
    || pollData?.task_status
    || pollData?.result?.status
    || pollData?.result?.state
    || pollData?.data?.status
    || pollData?.data?.state
    || ""
  ).toLowerCase();

  if (["finished", "completed", "complete", "succeeded", "success"].includes(status)) {
    console.log(`[apiframe-video] Completed without URL payload: ${JSON.stringify(pollData).substring(0, 600)}`);
    return { done: true, error: "Apiframe concluiu mas não retornou URL do vídeo." };
  }

  const failureReason = pollData?.failure_reason
    || pollData?.error
    || pollData?.message
    || pollData?.errors?.[0]?.msg
    || pollData?.result?.failure_reason
    || pollData?.result?.error
    || pollData?.data?.failure_reason
    || pollData?.data?.error;

  if (["failed", "error", "cancelled", "canceled"].includes(status) || failureReason) {
    return { done: true, error: failureReason || "Geração falhou no Apiframe." };
  }

  return {
    done: false,
    provider: "apiframe",
    status: status || "processing",
    message: status ? `Apiframe retornou status: ${status}` : "Apiframe está renderizando o vídeo",
  };
}

async function generateVideoApiframe(estabelecimentoId: string, params: any): Promise<VideoGenerationResult> {
  const started = await startVideoApiframe(estabelecimentoId, params);
  if (started.error) return { error: started.error };
  if (started.videoUrl) return { videoUrl: started.videoUrl, provider: "apiframe" };
  if (!started.taskId) return { error: "Apiframe não retornou task_id." };

  const videoUrl = await pollUntilDone<string>(async () => {
    const poll = await fetchVideoApiframe(estabelecimentoId, started.taskId!);
    if (poll.error) return { done: true, error: poll.error };
    if (poll.done && poll.videoUrl) return { done: true, result: poll.videoUrl };
    return { done: false };
  }, 5000, 120);

  return { videoUrl, provider: "apiframe" };
}

// --- WaveSpeed video generation ---
// Model mapping: wavespeed/model-name → WaveSpeed API path
// Mapping based on official WaveSpeed model registry (https://wavespeed.ai/models)
const WAVESPEED_VIDEO_MODEL_MAP: Record<string, string> = {
  "seedance-2.0": "bytedance/seedance-2.0/image-to-video",
  // Kling — kwaivgi namespace on WaveSpeed (NOT kuaishou)
  "kling-2.1": "kwaivgi/kling-v2.1-i2v-pro",
  "kling-2.6": "kwaivgi/kling-v2.6-pro/image-to-video",
  "kling-2.6-std": "kwaivgi/kling-v2.6-std/image-to-video",
  "kling-3.0": "kwaivgi/kling-v3.0-pro/image-to-video",
  "kling-3.0-std": "kwaivgi/kling-v3.0-std/image-to-video",
  // WAN — wavespeed-ai or alibaba namespace
  "wan-2.1": "wavespeed-ai/wan-2.2/image-to-video",
  "wan-2.2": "wavespeed-ai/wan-2.2/image-to-video",
  "wan-2.5": "alibaba/wan-2.5/image-to-video",
  "wan-2.6": "alibaba/wan-2.6/image-to-video",
  "wan-2.7": "alibaba/wan-2.7/image-to-video",
  // Google Veo (sob WaveSpeed — alternativa ao Google nativo)
  "veo-2": "google/veo2/image-to-video",
  "veo-3": "google/veo3/image-to-video",
  "veo-3-fast": "google/veo3-fast/image-to-video",
  "veo-3.1": "google/veo3.1/image-to-video",
  // Outros
  "ltx-video": "wavespeed-ai/ltx-2.3/image-to-video",
  "ltx-2-pro": "lightricks/ltx-2-pro/image-to-video",
  "sora-2": "openai/sora-2/image-to-video",
  "vidu-q3": "vidu/q3/image-to-video",
  "pixverse-v6": "pixverse/pixverse-v6/image-to-video",
};

// Image model mapping for wavespeed
const WAVESPEED_IMAGE_MODEL_MAP: Record<string, string> = {
  "flux-dev": "wavespeed-ai/flux-dev/text-to-image",
  "flux-schnell": "wavespeed-ai/flux-schnell/text-to-image",
  "flux-pro": "wavespeed-ai/flux-pro/text-to-image",
  "gpt-image-2": "openai/gpt-image-2/text-to-image",
  "nano-banana-2": "wavespeed-ai/nano-banana-2/text-to-image",
  "seedream-3": "bytedance/seedream-3.0/text-to-image",
  "recraft-v3": "recraft/v3/text-to-image",
  "sd3.5-turbo": "stabilityai/sd3.5-turbo/text-to-image",
  "ideogram-v3": "ideogram/v3/text-to-image",
  "kolors": "kwai/kolors/text-to-image",
};

const isWavespeedImageOnlyModel = (subModel: string): boolean => Boolean(WAVESPEED_IMAGE_MODEL_MAP[subModel]);

async function startVideoWavespeed(estabelecimentoId: string, params: any): Promise<{ taskId?: string; videoUrl?: string; error?: string }> {
  const model = (params.model as string) || "";
  const subModel = model.replace("wavespeed/", "");
  if (isWavespeedImageOnlyModel(subModel)) {
    return { error: `O modelo "${subModel}" é exclusivo para imagem e não pode ser usado em Gerar Vídeo. Selecione um modelo de vídeo como Seedance, Kling, Veo, Luma ou use Auto.` };
  }
  // Pre-generate hero frame if strict refs or brand identity exist (image-to-video models support 1 starting image)
  const _roles = (params.imageRoles || []) as string[];
  const _hasStrict = _roles.some(r => r === 'PRODUCT - DO NOT MODIFY' || r === 'PERSON/INFLUENCER - DO NOT MODIFY');
  const _hasVI = _roles.some(r => r === 'BRAND IDENTITY REFERENCE');
  if ((_hasStrict || _hasVI) && !params._heroFrameUsed) {
    try {
      const hero = await generateHeroFrame(params);
      if (hero) {
        console.log(`[wavespeed-video] Using hero frame as starting image (VI=${_hasVI})`);
        params.imageUrls = [hero];
        params._heroFrameUsed = true;
      } else if ((params.imageUrls || []).length > 1 || _roles.includes('PERSON/INFLUENCER - DO NOT MODIFY')) {
        return { error: "Não foi possível compor a cena inicial com produto, influencer e/ou identidade visual. O modelo WaveSpeed recebe apenas uma imagem inicial; para não ignorar a influencer, a geração foi interrompida. Tente novamente ou use um modelo que aceite múltiplas referências." };
      }
    } catch (e) {
      console.warn(`[wavespeed-video] hero frame failed:`, (e as Error)?.message);
      if ((params.imageUrls || []).length > 1 || _roles.includes('PERSON/INFLUENCER - DO NOT MODIFY')) {
        return { error: "Falha ao preparar a referência com a influencer. O vídeo não foi gerado para evitar ignorar a pessoa selecionada." };
      }
    }
  }
  const wsModelPath = WAVESPEED_VIDEO_MODEL_MAP[subModel];
  if (!wsModelPath) {
    return { error: `Modelo "${subModel}" não está mapeado no WaveSpeed. Modelos suportados: ${Object.keys(WAVESPEED_VIDEO_MODEL_MAP).join(', ')}` };
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !supabaseKey) {
    return { error: "Configuração do servidor incompleta." };
  }

  const wsParams: Record<string, any> = {
    model: wsModelPath,
    prompt: params.prompt || "",
  };

  const startImageUrl = params.imageUrls?.[0] || null;
  if (startImageUrl) {
    wsParams.image = startImageUrl;
  }

  // Truncate prompt for video models
  if (wsParams.prompt.length > 500) {
    wsParams.prompt = wsParams.prompt.substring(0, 500);
  }

  if (params.aspectRatio) wsParams.aspect_ratio = params.aspectRatio;
  if (params.duration) wsParams.duration = Number(params.duration) || 5;

  console.log(`[wavespeed-video] Submitting: model=${wsModelPath}, hasImage=${!!startImageUrl}`);

  const proxyUrl = `${supabaseUrl}/functions/v1/wavespeed-proxy`;
  const resp = await fetch(proxyUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${supabaseKey}`,
    },
    body: JSON.stringify({ action: "generate", estabelecimentoId, params: wsParams }),
  });

  const data = await resp.json().catch(() => ({}));
  if (!resp.ok || data?.error) {
    return { error: data?.error || `Erro WaveSpeed (${resp.status})` };
  }

  if (data.status === "completed" && data.videoUrl) {
    const videoResp = await fetch(data.videoUrl);
    const videoBytes = new Uint8Array(await videoResp.arrayBuffer());
    const storedUrl = await uploadVideoToStorage(videoBytes);
    return { videoUrl: storedUrl || data.videoUrl };
  }

  if (data.taskId) {
    console.log(`[wavespeed-video] Task started: ${data.taskId}`);
    return { taskId: data.taskId };
  }

  return { error: "WaveSpeed não retornou taskId nem videoUrl." };
}

async function fetchVideoWavespeed(estabelecimentoId: string, taskId: string): Promise<{ done: boolean; videoUrl?: string; error?: string; provider?: string; status?: string; message?: string }> {
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !supabaseKey) {
    return { done: true, error: "Configuração do servidor incompleta." };
  }

  const proxyUrl = `${supabaseUrl}/functions/v1/wavespeed-proxy`;
  const resp = await fetch(proxyUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${supabaseKey}`,
    },
    body: JSON.stringify({ action: "fetch", estabelecimentoId, params: { task_id: taskId } }),
  });

  const data = await resp.json().catch(() => ({}));
  if (!resp.ok || data?.error) {
    return { done: true, error: data?.error || `Falha ao consultar tarefa WaveSpeed (${resp.status}).` };
  }

  if (data.status === "completed") {
    const url = data.videoUrl || data.imageUrl || data.outputs?.[0];
    if (url) {
      // Try to mirror to our storage, but be resilient: provider CDN may drop the connection.
      // If download fails after retries, fall back to the original URL so the user still gets the video.
      let storedUrl: string | null = null;
      for (let attempt = 0; attempt < 3; attempt++) {
        try {
          const ctrl = new AbortController();
          const timer = setTimeout(() => ctrl.abort(), 45000);
          const videoResp = await fetch(url, { signal: ctrl.signal });
          if (!videoResp.ok) {
            clearTimeout(timer);
            throw new Error(`HTTP ${videoResp.status}`);
          }
          const videoBytes = new Uint8Array(await videoResp.arrayBuffer());
          clearTimeout(timer);
          storedUrl = await uploadVideoToStorage(videoBytes);
          break;
        } catch (e) {
          console.warn(`[fetchVideoWavespeed] download attempt ${attempt + 1} failed:`, (e as Error)?.message);
          if (attempt < 2) await new Promise(r => setTimeout(r, 1500 * (attempt + 1)));
        }
      }
      return { done: true, videoUrl: storedUrl || url };
    }
    return { done: true, error: "WaveSpeed concluiu mas não retornou URL." };
  }

  if (data.status === "failed") {
    return { done: true, error: data.error || "Geração falhou no WaveSpeed." };
  }

  return {
    done: false,
    provider: "wavespeed",
    status: data.status || "processing",
    message: data.status ? `WaveSpeed retornou status: ${data.status}` : "WaveSpeed está renderizando o vídeo",
  };
}

async function generateVideoWavespeed(estabelecimentoId: string, params: any): Promise<VideoGenerationResult> {
  const started = await startVideoWavespeed(estabelecimentoId, params);
  if (started.error) return { error: started.error };
  if (started.videoUrl) return { videoUrl: started.videoUrl, provider: "wavespeed" };
  if (!started.taskId) return { error: "WaveSpeed não retornou task_id." };

  const videoUrl = await pollUntilDone<string>(async () => {
    const poll = await fetchVideoWavespeed(estabelecimentoId, started.taskId!);
    if (poll.error) return { done: true, error: poll.error };
    if (poll.done && poll.videoUrl) return { done: true, result: poll.videoUrl };
    return { done: false };
  }, 5000, 120);

  return { videoUrl, provider: "wavespeed" };
}

// --- WaveSpeed image generation (async via proxy) ---
async function generateImageWavespeed(estabelecimentoId: string, prompt: string, model: string, size?: string): Promise<{ imageUrl?: string; text: string; wavespeedTaskId?: string }> {
  const subModel = model.replace("wavespeed/", "");
  const wsModelPath = WAVESPEED_IMAGE_MODEL_MAP[subModel];
  if (!wsModelPath) {
    throw new Error(`Modelo de imagem "${subModel}" não está mapeado no WaveSpeed.`);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !supabaseKey) {
    throw new Error("Configuração do servidor incompleta.");
  }

  const wsParams: Record<string, any> = {
    model: wsModelPath,
    prompt,
  };

  // Convert width x height to aspect_ratio for WaveSpeed models that use it
  if (size) {
    const [w, h] = size.split("x").map(Number);
    if (w && h) {
      // Models like gpt-image-2 use aspect_ratio + resolution instead of width/height
      const isAspectModel = wsModelPath.includes('gpt-image') || wsModelPath.includes('dall-e');
      if (isAspectModel) {
        const gcd = (a: number, b: number): number => b === 0 ? a : gcd(b, a % b);
        const d = gcd(w, h);
        const ratioW = w / d;
        const ratioH = h / d;
        const validRatios = ['1:1', '3:2', '2:3', '3:4', '4:3', '4:5', '5:4', '9:16', '16:9', '21:9'];
        const ratio = `${ratioW}:${ratioH}`;
        if (validRatios.includes(ratio)) {
          wsParams.aspect_ratio = ratio;
        }
        // Set resolution based on max dimension
        const maxDim = Math.max(w, h);
        wsParams.resolution = maxDim > 2048 ? '4k' : maxDim > 1024 ? '2k' : '1k';
        wsParams.quality = 'medium';
      } else {
        wsParams.width = w;
        wsParams.height = h;
      }
    }
  }

  console.log(`[wavespeed-image] Submitting: model=${wsModelPath}, promptLen=${prompt.length}`);

  const proxyUrl = `${supabaseUrl}/functions/v1/wavespeed-proxy`;
  const resp = await fetch(proxyUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${supabaseKey}`,
    },
    body: JSON.stringify({ action: "generate", estabelecimentoId, params: wsParams }),
  });

  const data = await resp.json().catch(() => ({}));
  if (!resp.ok || data?.error) {
    throw new Error(data?.error || `Erro WaveSpeed (${resp.status})`);
  }

  // Sync response — completed immediately
  if (data.status === "completed" && (data.imageUrl || data.outputs?.[0])) {
    let imageUrl = data.imageUrl || data.outputs[0];
    const publicUrl = await uploadBase64ToStorage(imageUrl);
    if (publicUrl) imageUrl = publicUrl;
    return { imageUrl, text: "" };
  }

  // Async — return taskId for client-side polling
  if (data.taskId) {
    console.log(`[wavespeed-image] Task queued: ${data.taskId} — returning for client polling`);
    return { wavespeedTaskId: data.taskId, text: "" };
  }

  throw new Error("WaveSpeed não retornou resultado nem taskId.");
}

// --- Generic handler for unsupported providers ---
async function generateVideoUnsupported(model: string): Promise<VideoGenerationResult> {
  return { error: `Provedor de vídeo "${model.split('/')[0]}" ainda não possui integração de API implementada. Configure uma chave válida para: Google (Veo), OpenAI (Sora), Runway, Kling, Luma, Stability, Replicate, Apiframe ou WaveSpeed.` };
}

// Pre-generate a "hero frame" compositing product/influencer into the scene
// This ensures the video starts from a frame with the REAL product and influencer
async function generateHeroFrame(params: any): Promise<string | null> {
  const imageUrls = (params.imageUrls || []) as string[];
  const imageRoles = (params.imageRoles || []) as string[];
  if (imageUrls.length === 0) return null;

  // Check if there are strict references (product/influencer) OR brand identity that need preservation/styling
  const strictRoles = ['PRODUCT - DO NOT MODIFY', 'PERSON/INFLUENCER - DO NOT MODIFY', 'LOGO - DO NOT MODIFY', 'CLOTHING - DO NOT MODIFY'];
  const hasStrictRefs = imageRoles.some(r => strictRoles.includes(r));
  const hasBrandIdentity = imageRoles.some(r => r === 'BRAND IDENTITY REFERENCE');
  if (!hasStrictRefs && !hasBrandIdentity) return null;

  console.log(`[hero-frame] Generating composed hero frame with ${imageUrls.length} references...`);

  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  if (!LOVABLE_API_KEY) return null;

  try {
    // Build content: subject images first, then prompt
    const editContent: any[] = [];
    
    // Collect strict and non-strict images separately, prioritize PRODUCT first
    const priorityOrder: Record<string, number> = {
      'PRODUCT - DO NOT MODIFY': 1,
      'PERSON/INFLUENCER - DO NOT MODIFY': 2,
      'LOGO - DO NOT MODIFY': 3,
      'CLOTHING - DO NOT MODIFY': 4,
    };
    
    // Build sorted list: strict refs first (product > influencer > others); BRAND IDENTITY appended at the end as style guide
    const sortedEntries: { url: string; role: string }[] = [];
    const brandIdentityEntries: { url: string; role: string }[] = [];
    for (let i = 0; i < imageUrls.length; i++) {
      const url = imageUrls[i];
      const role = imageRoles[i] || 'REFERENCE';
      if (!url) continue;
      if (!(url.startsWith('http') || url.startsWith('data:'))) continue;
      if (role === 'BRAND IDENTITY REFERENCE') {
        brandIdentityEntries.push({ url, role });
        continue;
      }
      sortedEntries.push({ url, role });
    }
    sortedEntries.sort((a, b) => (priorityOrder[a.role] || 99) - (priorityOrder[b.role] || 99));
    // Append brand identity at the end so it never overrides product/person but is always present
    sortedEntries.push(...brandIdentityEntries);
    console.log(`[hero-frame][VI] BRAND IDENTITY refs incluídas: ${brandIdentityEntries.length}`);
    
    for (const entry of sortedEntries) {
      editContent.push({ type: "image_url", image_url: { url: entry.url } });
      if (entry.role === 'PRODUCT - DO NOT MODIFY') {
        editContent.push({ type: "text", text: `↑ ⚠️ PRIORITY #1 — PRODUCT REFERENCE. ${PRODUCT_PACKAGING_LOCK} The output must NOT show this reference photo as a separate pasted layer, but the generated product package must match this reference exactly.` });
      } else if (entry.role === 'PERSON/INFLUENCER - DO NOT MODIFY') {
        editContent.push({ type: "text", text: `↑ ⚠️ PRIORITY #2 — PERSON. Reproduce this exact face, skin tone, hair, features.` });
      } else if (entry.role === 'BRAND IDENTITY REFERENCE') {
        editContent.push({ type: "text", text: `↑ BRAND IDENTITY REFERENCE — extract and apply these four pillars to the OUTPUT: (1) HAND-DRAWN SKETCH SYSTEM — reproduce any sketches, doodles, contour lines, arrows, highlighter marks, handwritten annotations with the exact same medium, stroke weight and organic irregularity; (2) TYPOGRAPHIC SYSTEM — replicate exact font families, weights, hierarchy, lettering treatments and hand-lettering style; (3) LIGHTING STYLE — match color temperature, direction, hardness and contrast of light; (4) COMPOSITION STYLE — match framing, negative space, grid logic, symmetry and visual density. NEVER overrides product, person, logo or clothing. NEVER copy the subjects from this image into the output — only the stylistic system.` });
      } else if (strictRoles.includes(entry.role)) {
        editContent.push({ type: "text", text: `↑ SUBJECT (${entry.role}). Preserve IDENTICALLY.` });
      } else {
        editContent.push({ type: "text", text: `↑ ${entry.role} — background/style inspiration only.` });
      }
    }

    // Extract a clean scene description from the prompt (remove fidelity instructions)
    let sceneDesc = params.prompt || '';
    const fidelityStart = sceneDesc.indexOf('⚠️ INSTRUÇÕES');
    if (fidelityStart > 0) sceneDesc = sceneDesc.substring(0, fidelityStart).trim();
    const instrStart = sceneDesc.indexOf('[INSTRUÇÃO PADRÃO]');
    if (instrStart > 0) {
      const instrEnd = sceneDesc.indexOf('\n\n', instrStart);
      const instrBlock = instrEnd > 0 ? sceneDesc.substring(instrStart, instrEnd) : sceneDesc.substring(instrStart);
      sceneDesc = sceneDesc.substring(0, instrStart) + instrBlock;
    }

    editContent.push({ type: "text", text: `TASK: Create a single realistic advertising photograph where the product is naturally part of the scene, not pasted on top.\n\n${PRODUCT_PACKAGING_LOCK}\n\n🚫 EXACTLY ONE INSTANCE OF THE PRODUCT IN THE FINAL IMAGE. Do NOT render a second copy, duplicate, mirrored copy, showcase copy, "product shot" beside the person, inset thumbnail, corner badge, side-by-side reference, before/after, or any additional floating instance of the product anywhere in the frame. The product appears ONE TIME ONLY, fully integrated where the person interacts with it.\n\n🚫 ABSOLUTELY FORBIDDEN: pasting the product reference as a flat sticker, cut-out, separate layer, framed photo, white-square object, floating catalog image or mismatched overlay. Equally forbidden: inventing a new label, changing package colors, replacing text/logo, simplifying artwork or generating a merely similar package.\n\n✅ REQUIRED: produce a real-looking product in the scene whose packaging is visually indistinguishable from the reference while allowing only scene-realistic perspective, lighting, shadow and scale. If holding it would hide, bend, deform or rewrite the packaging, place the unchanged product in the person's open hand or directly on a REAL EXISTING textured surface already visible in the scene and have the person point to or present it. Do NOT create a new table, pedestal, white base, clean platform, card, frame, sticker, blank caption bar, grey pill, rounded rectangle, or any artificial support/background behind or under the product. The person's FACE must be IDENTICAL.\n\nScene: ${sceneDesc}\nAspect ratio: ${params.aspectRatio || '16:9'}` });

    const data = await callGateway(LOVABLE_API_KEY, {
      model: "google/gemini-3-pro-image-preview",
      messages: [
        { role: "system", content: `You are a professional photo compositor. Your ABSOLUTE #1 RULE is PRODUCT PACKAGING FIDELITY. ${PRODUCT_PACKAGING_LOCK} Product fidelity beats hand interaction, lighting, prompt style and brand identity. The PERSON/INFLUENCER face must remain identical to the reference.` },
        { role: "user", content: editContent },
      ],
      modalities: ["image", "text"],
    });

    const msg = data.choices?.[0]?.message;
    let heroUrl = msg?.images?.[0]?.image_url?.url;
    if (!heroUrl && Array.isArray(msg?.content)) {
      for (const part of msg.content) {
        if (part.type === 'image_url' && part.image_url?.url) {
          heroUrl = part.image_url.url;
          break;
        }
        if (part.inline_data?.mime_type?.startsWith('image/')) {
          heroUrl = `data:${part.inline_data.mime_type};base64,${part.inline_data.data}`;
          break;
        }
      }
    }

    if (heroUrl) {
      // Upload to storage so video providers can access it via URL
      if (heroUrl.startsWith('data:')) {
        const publicUrl = await uploadBase64ToStorage(heroUrl);
        if (publicUrl) {
          console.log(`[hero-frame] Hero frame uploaded: ${publicUrl.substring(0, 80)}`);
          heroUrl = publicUrl;
        }
      }
      const productEntry = sortedEntries.find((entry) => entry.role === 'PRODUCT - DO NOT MODIFY');
      if (productEntry?.url) {
        console.log(`[hero-frame] Product reference preserved by model-guided composition (no flat overlay).`);
      }
      console.log(`[hero-frame] Hero frame generated (${heroUrl.substring(0, 50)}...)`);
      return heroUrl;
    }

    console.warn(`[hero-frame] No image in response`);
    return null;
  } catch (err) {
    console.error(`[hero-frame] Failed to generate hero frame:`, err);
    return null;
  }
}

// Route to correct provider
async function handleVideoGeneration(params: any): Promise<VideoGenerationResult> {
  const model = params.model as string;
  let provider = model.split("/")[0];
  const estabelecimentoId = params.estabelecimentoId;
  
  if (!estabelecimentoId) throw new Error("estabelecimentoId é obrigatório para geração de vídeo");

  // AUTO mode: detect first available provider
  if (model === "auto" || provider === "auto") {
    console.log(`[generate_video] AUTO mode: detecting available providers...`);
    // Priority order: google (veo), apiframe, openai, runway, stability, luma
    const providerPriority = [
      { provider: "google", model: "google/veo-3.1" },
      { provider: "apiframe", model: "apiframe/kling-2.6" },
      { provider: "openai", model: "openai/sora" },
      { provider: "runway", model: "runway/gen4" },
      { provider: "stability", model: "stability/stable-video" },
      { provider: "luma", model: "luma/dream-machine" },
    ];
    let foundProvider = false;
    for (const p of providerPriority) {
      if (p.provider === "apiframe") {
        // Apiframe uses its own proxy — check if key exists there
        const afKey = await fetchApiKey(estabelecimentoId, "apiframe");
        if (afKey) {
          console.log(`[generate_video] AUTO: Found apiframe key, using ${p.model}`);
          provider = "apiframe";
          params.model = p.model;
          foundProvider = true;
          break;
        }
      } else {
        const key = await fetchApiKey(estabelecimentoId, p.provider);
        if (key) {
          console.log(`[generate_video] AUTO: Found ${p.provider} key, using ${p.model}`);
          provider = p.provider;
          params.model = p.model;
          foundProvider = true;
          break;
        }
      }
    }
    if (!foundProvider) {
      throw new Error("Nenhum provedor de vídeo configurado. Configure uma chave de API em Configurações → APIs Pagas (Google, ApiFrame, OpenAI, Runway, etc.).");
    }
  }

  // Audio controls (default both ON for new behavior)
  const withAudio = params.withAudio !== false;
  const withMusic = withAudio ? params.withMusic !== false : false;
  params.withAudio = withAudio;
  params.withMusic = withMusic;

  const audioDirective = !withAudio
    ? "Generate a completely SILENT video. No speech, no music, no soundtrack, no ambient audio, no sound effects."
    : !withMusic
      ? "Audio is allowed, but DO NOT add any background music or soundtrack. Keep only natural non-musical audio."
      : "Include a subtle background music track that matches the scene naturally.";

  params.prompt = `${params.prompt || ""}\n\n[AUDIO DIRECTIVE]\n${audioDirective}`.trim();
  console.log(`[generate_video] Audio config: withAudio=${withAudio}, withMusic=${withMusic}`);

  const hasCorrectionVideoSource =
    params.correctionMode === true &&
    typeof params.sourceVideoUrl === "string" &&
    params.sourceVideoUrl.startsWith("http");

  // Prefer true video-to-video for correction when source video exists.
  if (hasCorrectionVideoSource && provider === "openai" && !params.sourceVideoId) {
    const runwayKey = await fetchApiKey(estabelecimentoId, "runway");
    if (runwayKey) {
      console.log(`[generate_video] AUTO-ROUTING correction: OpenAI -> Runway video_to_video for higher fidelity`);
      return await generateVideoRunway(runwayKey, {
        ...params,
        model: "runway/gen4",
        correctionMode: true,
      });
    }
    console.warn(`[generate_video] Correction source video provided, but Runway key not found. Proceeding with OpenAI fallback.`);
  }

  // Bridge mode needs both start and end frames; OpenAI Sora only uses one reference.
  // When available, route bridge requests to Google Veo which now receives a combined start/end reference image.
  if (params.bridgeMode === true && provider === "openai") {
    const googleKey = await fetchApiKey(estabelecimentoId, "google");
    if (googleKey) {
      console.log(`[generate_video] AUTO-ROUTING bridge mode: OpenAI -> Google Veo for dual-frame transition reference`);
      return await generateVideoGoogle(googleKey, {
        ...params,
        model: "google/veo-3.1",
      });
    }
    console.warn(`[generate_video] Bridge mode requested with OpenAI, but Google key not found. Proceeding with OpenAI fallback.`);
  }

  // Check if there are strict references (product/influencer) or brand identity that need preservation
  const imageRoles = (params.imageRoles || []) as string[];
  const strictRoles = ['PRODUCT - DO NOT MODIFY', 'PERSON/INFLUENCER - DO NOT MODIFY'];
  const hasStrictRefs = imageRoles.some(r => strictRoles.includes(r));
  const hasBrandIdentityVideo = imageRoles.some(r => r === 'BRAND IDENTITY REFERENCE');

  // AUTO-ROUTING: When strict references exist and provider is text-only (Sora),
  // automatically switch to Google Veo (image-to-video) if available
  if (hasStrictRefs && provider === "openai") {
    const googleKey = await fetchApiKey(estabelecimentoId, "google");
    if (googleKey) {
      console.log(`[generate_video] AUTO-ROUTING: Switching from Sora (text-only) to Google Veo (image-to-video) for better fidelity`);
      try {
        const savedModel = params.model;
        provider = "google";
        params.model = "google/veo-3";
        const heroFrameUrl = await generateHeroFrame(params);
        if (heroFrameUrl) {
          console.log(`[generate_video] Using hero frame as starting image for google`);
          params.imageUrls = [heroFrameUrl];
          params._heroFrameUsed = true;
        } else {
          // Hero frame failed — do NOT proceed with partial references (would generate low quality)
          throw new Error("hero_frame_failed:Não foi possível compor a imagem de referência com todos os elementos (produto, influencer, etc.). O servidor de composição está temporariamente indisponível. Tente novamente em alguns instantes.");
        }
        console.log(`[generate_video] Provider=google (auto-routed), Model=google/veo-3`);
        return await generateVideoGoogle(googleKey, params);
      } catch (veoErr: any) {
        const errMsg = veoErr?.message || "";
        const isRecoverable = errMsg.includes("429") || errMsg.includes("quota") || errMsg.includes("400") || errMsg.includes("billing") || errMsg.includes("exclusively available");
        if (isRecoverable) {
          console.warn(`[generate_video] Google Veo error (recoverable). Falling back to original provider (Sora). Error: ${errMsg.substring(0, 150)}`);
          provider = "openai";
          params.model = model;
          // Continue to Sora below
        } else {
          throw veoErr;
        }
      }
    } else {
      console.warn(`[generate_video] Sora is text-only and cannot use reference images. Google Veo key not found for fallback.`);
    }
  }

  // Apiframe handles its own key via the proxy edge function
  if (provider === "apiframe") {
    return generateVideoApiframe(estabelecimentoId, params);
  }

  const apiKey = await fetchApiKey(estabelecimentoId, provider);
  if (!apiKey) {
    // Fallback: try apiframe if available
    const afKey = await fetchApiKey(estabelecimentoId, "apiframe");
    if (afKey) {
      console.log(`[generate_video] Provider "${provider}" key not found. Falling back to apiframe.`);
      params.model = "apiframe/kling-2.6";
      return generateVideoApiframe(estabelecimentoId, params);
    }
    throw new Error(`Nenhum provedor de vídeo configurado. Configure uma chave de API em Configurações → APIs Pagas (Google, ApiFrame, OpenAI, Runway, etc.).`);
  }

  // Pre-generate hero frame only for providers that support image-to-video
  const imageToVideoProviders = ["google", "runway", "luma", "stability", "apiframe"];
  if ((hasStrictRefs || hasBrandIdentityVideo) && imageToVideoProviders.includes(provider)) {
    const heroFrameUrl = await generateHeroFrame(params);
    if (heroFrameUrl) {
      console.log(`[generate_video] Using hero frame as starting image for ${provider} (VI=${hasBrandIdentityVideo})`);
      params.imageUrls = [heroFrameUrl];
      params._heroFrameUsed = true;
    } else {
      // Hero frame failed — continue with original references instead of blocking
      console.warn(`[generate_video] Hero frame failed for ${provider}, proceeding with original references`);
    }
  }

  // AUTO-NORMALIZE duration per provider to avoid API validation errors
  const rawDur = Number(params.duration) || 6;
  switch (provider) {
    case "google":
      // Google Veo accepts 4-8 inclusive
      params.duration = Math.min(8, Math.max(4, Math.round(rawDur)));
      break;
    case "openai":
      // Sora accepts only 4, 8, or 12
      params.duration = [4, 8, 12].reduce((prev, curr) => Math.abs(curr - rawDur) < Math.abs(prev - rawDur) ? curr : prev);
      break;
    case "runway":
      // Runway accepts 5 or 10
      params.duration = rawDur <= 7 ? 5 : 10;
      break;
    case "kling":
      // Kling accepts 5 or 10
      params.duration = rawDur <= 7 ? 5 : 10;
      break;
     case "replicate":
       // LTX-Video accepts 2-10s
       params.duration = Math.min(10, Math.max(2, Math.round(rawDur)));
       break;
     case "apiframe": {
       // Apiframe normalizes internally per sub-model, pass reasonable default
       const sub = (params.model || "").replace("apiframe/", "");
       if (sub.includes("kling") || sub.includes("runway") || sub.includes("luma")) {
         params.duration = rawDur <= 7 ? 5 : 10;
       } else {
         params.duration = Math.max(4, Math.round(rawDur));
       }
       break;
     }
     case "luma":
       // Luma accepts 5 or 10
       params.duration = rawDur <= 7 ? 5 : 10;
       break;
     case "stability":
       // Stability SVD accepts ~2-4s
       params.duration = Math.min(4, Math.max(2, Math.round(rawDur)));
       break;
     default:
       params.duration = Math.max(4, Math.round(rawDur));
       break;
  }

  console.log(`[generate_video] Provider=${provider}, Model=${model}, Duration=${params.duration}s`);
  
  switch (provider) {
    case "google": return generateVideoGoogle(apiKey, params);
    case "openai": return generateVideoOpenAI(apiKey, params);
    case "runway": return generateVideoRunway(apiKey, params);
    case "kling": return generateVideoKling(apiKey, params);
    case "luma": return generateVideoLuma(apiKey, params);
    case "stability": return generateVideoStability(apiKey, params);
    case "replicate": return generateVideoReplicate(apiKey, params);
    case "apiframe": return generateVideoApiframe(estabelecimentoId, params);
    case "wavespeed": return generateVideoWavespeed(estabelecimentoId, params);
    case "pika":
    case "minimax":
    case "bytedance":
    case "aimlapi":
    case "polloai":
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
    const ext = mime.includes("svg") ? "svg" : mime.includes("webp") ? "webp" : mime.includes("jpeg") || mime.includes("jpg") ? "jpg" : "png";
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

function findLockedProductReference(imageUrls: string[] = [], imageRoles: string[] = []): string | null {
  const index = imageRoles.findIndex((role) => role === 'PRODUCT - DO NOT MODIFY');
  return index >= 0 ? imageUrls[index] || null : null;
}

const PRODUCT_PACKAGING_LOCK = [
  "PRODUCT PACKAGING LOCK: the product reference is the authoritative visual source for the real package.",
  "The final product must keep the exact same label artwork, printed text, typography, logo placement, colors, cap/lid, material, shape, proportions, seals and graphic elements from the reference.",
  "Do not paste the reference photo as a flat sticker or separate object; also do not create an approximate, redesigned, simplified, stylized or rebranded package.",
  "Only perspective, scale, shadow and lighting may change to fit the scene. These adjustments must not alter any package artwork, text, color, logo, cap/lid, material, shape or proportion.",
  "If exact packaging fidelity conflicts with a new angle, keep the product in the same front-facing package orientation from the reference and adapt the person/scene around it.",
  "If a hand, pose, scene style or brand identity would cover or distort the label/package, change the interaction instead: keep the package fully visible and intact.",
  "Ignore red annotations, masks, boxes, arrows, circles, painted correction marks and the original background of the reference image; they are not part of the package.",
  "Exactly one product appears in the final image, fully integrated as a real photographed object with packaging visually indistinguishable from the reference."
].join(" ");

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
  "google/gemini-2.5-flash-image", "google/gemini-3-pro-image-preview", "google/gemini-3.1-flash-image-preview",
  "chatgpt_image/gpt-image-1", "chatgpt_image/dall-e-3",
];

function validateModel(model: string, type: "llm" | "image"): string {
  const supported = type === "image" ? SUPPORTED_IMAGE_MODELS : SUPPORTED_LLM_MODELS;
  // Also allow chatgpt_image models to pass through
  if (supported.includes(model) || model.startsWith("chatgpt_image/") || model.startsWith("wavespeed/")) return model;
  if (supported.includes(model)) return model;
  // Fallback to default
  console.warn(`Unsupported model "${model}" for ${type}, using default`);
  return type === "image" ? "google/gemini-2.5-flash-image" : "google/gemini-3-flash-preview";
}

// Helper: edit image via OpenAI Images Edit API (for chatgpt_image provider with reference images)
async function editImageChatGPT(apiKey: string, prompt: string, model: string, imageUrls: string[], imageRoles: string[], size?: string): Promise<{ imageUrl: string; text: string }> {
  const openaiModel = model === "chatgpt_image/gpt-image-1" ? "gpt-image-1" : "dall-e-3";
  
  let openaiSize: string = "1024x1024";
  if (size) {
    const [w, h] = size.split("x").map(Number);
    if (w && h) {
      const ratio = w / h;
      if (ratio > 1.3) openaiSize = "1792x1024";
      else if (ratio < 0.77) openaiSize = "1024x1792";
    }
  }

  // Build priority-sorted images array: Product first, then Influencer, skip brand identity
  const priorityOrder: Record<string, number> = {
    'PRODUCT - DO NOT MODIFY': 1,
    'PERSON/INFLUENCER - DO NOT MODIFY': 2,
    'LOGO - DO NOT MODIFY': 3,
    'CLOTHING - DO NOT MODIFY': 4,
  };
  
  const entries: { url: string; role: string; priority: number }[] = [];
  for (let i = 0; i < imageUrls.length; i++) {
    const url = imageUrls[i];
    const role = imageRoles[i] || 'REFERENCE';
    if (!url) continue;
    if (!url.startsWith('http')) continue;
    // BRAND IDENTITY refs included as low-priority style guide (never skipped)
    const priority = role === 'BRAND IDENTITY REFERENCE' ? 95 : (priorityOrder[role] || 90);
    entries.push({ url, role, priority });
  }
  entries.sort((a, b) => a.priority - b.priority);
  console.log(`[edit-openai][VI] BRAND IDENTITY refs incluídas: ${entries.filter(e=>e.role==='BRAND IDENTITY REFERENCE').length}`);

  // Build images array for OpenAI edit endpoint
  const images = entries.map(e => ({ type: "image_url" as const, image_url: e.url }));
  
  // Build enriched prompt with priority instructions
  const maxLen = openaiModel === "dall-e-3" ? 4000 : 32000;
  let editPrompt = prompt;
  
  // Add priority context
  const productEntries = entries.filter(e => e.role === 'PRODUCT - DO NOT MODIFY');
  const personEntries = entries.filter(e => e.role === 'PERSON/INFLUENCER - DO NOT MODIFY');
  
  let priorityPrefix = '';
  if (productEntries.length > 0) {
    priorityPrefix += `\n\n⚠️ ABSOLUTE PRIORITY #1 — PRODUCT PHOTO: The first image is the REAL product. Integrate it naturally into the scene with the exact same packaging design — label, printed text, typography, colors, logo, cap/lid, material, shape and proportions. Do NOT paste as a flat sticker, redraw, reconstruct, recolor, simplify, stylize, rotate into an invented view, or let hands/shadows/reflections alter the package. If holding would hide or deform packaging, place the unchanged product directly on a real existing textured surface in the scene and have the person present it; do not create any pedestal, white base, card, caption bar, grey pill, rounded rectangle, or artificial support.`;
  }
  if (personEntries.length > 0) {
    priorityPrefix += `\n\n⚠️ PRIORITY #2 — PERSON: Reproduce the person's EXACT face, skin tone, hair, features identically.`;
  }
  
  editPrompt = editPrompt + priorityPrefix;
  if (editPrompt.length > maxLen) editPrompt = editPrompt.substring(0, maxLen);

  console.log(`[chatgpt_image_edit] Calling OpenAI Images Edit API: model=${openaiModel}, size=${openaiSize}, images=${images.length}, promptLen=${editPrompt.length}`);

  const body: any = {
    model: openaiModel,
    prompt: editPrompt,
    images,
    size: openaiSize,
    quality: "high",
  };

  const resp = await fetch("https://api.openai.com/v1/images/edits", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!resp.ok) {
    const errText = await resp.text();
    console.error(`[chatgpt_image_edit] OpenAI API error ${resp.status}:`, errText);
    throw new Error(`OpenAI Images Edit API error: ${resp.status} - ${errText.substring(0, 200)}`);
  }

  const result = await resp.json();
  const b64 = result.data?.[0]?.b64_json;
  if (!b64) throw new Error("No image returned from OpenAI Edit");

  let imageUrl = `data:image/png;base64,${b64}`;
  const publicUrl = await uploadBase64ToStorage(imageUrl);
  if (publicUrl) imageUrl = publicUrl;

  return { imageUrl, text: result.data?.[0]?.revised_prompt || "" };
}

// Helper: generate image via OpenAI Images API (for chatgpt_image provider, no reference images)
async function generateImageChatGPT(apiKey: string, prompt: string, model: string, size?: string): Promise<{ imageUrl: string; text: string }> {
  // Map model names
  const openaiModel = model === "chatgpt_image/gpt-image-1" ? "gpt-image-1" : "dall-e-3";
  
  // Determine size
  let openaiSize = "1024x1024";
  if (size) {
    const [w, h] = size.split("x").map(Number);
    if (w && h) {
      const ratio = w / h;
      if (ratio > 1.3) openaiSize = "1792x1024";
      else if (ratio < 0.77) openaiSize = "1024x1792";
    }
  }

  // DALL-E 3 has a 4000 char prompt limit, gpt-image-1 has 32k
  const maxLen = openaiModel === "dall-e-3" ? 4000 : 32000;
  const finalPrompt = prompt.length > maxLen ? prompt.substring(0, maxLen) : prompt;

  console.log(`[chatgpt_image] Calling OpenAI Images API: model=${openaiModel}, size=${openaiSize}, promptLen=${finalPrompt.length}`);

  const resp = await fetch("https://api.openai.com/v1/images/generations", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: openaiModel,
      prompt: finalPrompt,
      n: 1,
      size: openaiSize,
      response_format: "b64_json",
    }),
  });

  if (!resp.ok) {
    const errText = await resp.text();
    console.error(`[chatgpt_image] OpenAI API error ${resp.status}:`, errText);
    throw new Error(`OpenAI Images API error: ${resp.status} - ${errText.substring(0, 200)}`);
  }

  const result = await resp.json();
  const b64 = result.data?.[0]?.b64_json;
  if (!b64) throw new Error("No image returned from OpenAI");

  let imageUrl = `data:image/png;base64,${b64}`;
  
  // Upload to storage
  const publicUrl = await uploadBase64ToStorage(imageUrl);
  if (publicUrl) imageUrl = publicUrl;

  return { imageUrl, text: result.data?.[0]?.revised_prompt || "" };
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

Deno.serve(async (req) => {
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
        const imageSize = (params.imageSize || '') as string;
        const imagePlatformPreset = (params.imagePlatformPreset || '') as string;
        const carouselMode = (params.carouselMode || 'panoramic') as string;

        // === ChatGPT Image Creator: route to OpenAI API with user's own key ===
        if (model.startsWith("chatgpt_image/")) {
          const estabId = params.estabelecimentoId || params.estabelecimento_id;
          if (!estabId) {
            return new Response(JSON.stringify({ error: "estabelecimentoId é obrigatório para ChatGPT Image" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
          }
          const chatgptKey = await fetchApiKey(estabId, "chatgpt_image");
          if (!chatgptKey) {
            return new Response(JSON.stringify({ error: "Chave da API ChatGPT Image não configurada. Vá em Configurações > APIs e configure sua chave OpenAI para o ChatGPT Criador de Imagens." }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
          }
          try {
            // If reference images exist and model is gpt-image-1, use Edit API for compositing
            const hasRefImages = refImages.length > 0 && model.includes('gpt-image-1');
            let result;
            if (hasRefImages) {
              console.log(`[chatgpt_image] Using EDIT endpoint with ${refImages.length} reference images`);
              result = await editImageChatGPT(chatgptKey, params.prompt as string, model, refImages, imageRoles, imageSize);
            } else {
              result = await generateImageChatGPT(chatgptKey, params.prompt as string, model, imageSize);
            }
            if (findLockedProductReference(refImages, imageRoles)) {
              console.log(`[chatgpt_image] Product lock handled by model-guided composition (no flat overlay).`);
            }
            return new Response(JSON.stringify({ result }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
          } catch (err: any) {
            console.error("[chatgpt_image] Error:", err.message);
            return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
          }
        }

        // === WaveSpeed Image: route to wavespeed-proxy ===
        // IMPORTANT: WaveSpeed is TEXT-TO-IMAGE only — it does NOT accept reference images.
        // When strict references exist (product/influencer), we MUST skip WaveSpeed and use 
        // the Lovable AI Gateway which supports image editing with actual reference inputs.
        if (model.startsWith("wavespeed/")) {
          const wsStrictRoles = ['PRODUCT - DO NOT MODIFY', 'PERSON/INFLUENCER - DO NOT MODIFY', 'LOGO - DO NOT MODIFY', 'CLOTHING - DO NOT MODIFY'];
          const hasStrictRefs = refImages.length > 0 && refImages.some((_, i) => wsStrictRoles.includes(imageRoles[i] || ''));
          
          if (hasStrictRefs) {
            console.log(`[generate_image] WaveSpeed model requested but ${refImages.length} strict reference images found — redirecting to Lovable AI Gateway for proper image compositing`);
            // Fall through to Lovable AI Gateway path below which handles reference images properly
          } else {
            const estabId = params.estabelecimentoId || params.estabelecimento_id;
            if (!estabId) {
              return new Response(JSON.stringify({ error: "estabelecimentoId é obrigatório para WaveSpeed" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
            }
            try {
              const result = await generateImageWavespeed(estabId, params.prompt as string, model, imageSize);
              // If async task, return wavespeedTaskId + estabelecimentoId for client-side polling
              if (result.wavespeedTaskId) {
                return new Response(JSON.stringify({ result: { wavespeedTaskId: result.wavespeedTaskId, estabelecimentoId: estabId } }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
              }
              return new Response(JSON.stringify({ result }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
            } catch (err: any) {
              console.error("[wavespeed-image] Error:", err.message);
              return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
            }
          }
        }

        const isCarousel = imagePlatformPreset.startsWith('ig-carousel-');
        const isGrid = imagePlatformPreset.startsWith('ig-grid-');
        let totalSlides = 1;
        let slideW = 0;
        let slideH = 0;
        let gridCols = 1;
        let gridRows = 1;
        
        if (imageSize) {
          const [iw, ih] = imageSize.split('x').map(Number);
          if (iw && ih) {
            slideH = ih;
            if (isCarousel) {
              const match = imagePlatformPreset.match(/ig-carousel-(\d+)/);
              totalSlides = match ? parseInt(match[1]) : 2;
              slideW = Math.round(iw / totalSlides);
            } else if (isGrid) {
              const match = imagePlatformPreset.match(/ig-grid-(\d+)x(\d+)/);
              gridCols = match ? parseInt(match[1]) : 3;
              gridRows = match ? parseInt(match[2]) : 1;
              totalSlides = gridCols * gridRows;
              slideW = Math.round(iw / gridCols);
              slideH = Math.round(ih / gridRows);
            }
          }
        }

        // === INDEPENDENT MODE: Generate each slide separately ===
        if ((isGrid || isCarousel) && carouselMode === 'independent' && totalSlides > 1) {
          console.log(`[generate_image] INDEPENDENT MODE — ${totalSlides} slides, each ${slideW}x${slideH}px`);
          
          const slideImages: string[] = [];
          const basePrompt = params.prompt as string;
          
          for (let slideIdx = 0; slideIdx < totalSlides; slideIdx++) {
            const slideNum = slideIdx + 1;
            const slidePrompt = `[SLIDE ${slideNum} of ${totalSlides}] ${basePrompt}\n\n[FORMAT] Generate this as a SINGLE STANDALONE image at ${slideW}x${slideH}px (aspect ratio ${slideW}:${slideH}). This is slide ${slideNum} of a ${totalSlides}-slide ${isCarousel ? 'Instagram Carousel' : 'Instagram Grid'}. Make this a COMPLETE, self-contained, professionally composed image. It must be beautiful and impactful on its own. Maintain a consistent color palette and visual style that will look cohesive when placed alongside the other slides in the series. Fill the ENTIRE canvas.`;
            
            const slideDimInstruction = `\n\nOUTPUT FORMAT: Generate the image at ${slideW}x${slideH} pixels. This is a SINGLE STANDALONE image — fill the entire ${slideW}x${slideH} canvas with a complete composition.`;
            
            // Build messages based on refs
            const strictRoles = ['PRODUCT - DO NOT MODIFY', 'LOGO - DO NOT MODIFY', 'PERSON/INFLUENCER - DO NOT MODIFY', 'CLOTHING - DO NOT MODIFY'];
            const hasStrict = refImages.some((_, i) => strictRoles.includes(imageRoles[i] || ''));
            
            let slideData: any;
            if (hasStrict) {
              const editContent: any[] = [];
              const slideEntries: { url: string; role: string; priority: number }[] = [];
              const slidePriority: Record<string, number> = {
                'PRODUCT - DO NOT MODIFY': 1,
                'PERSON/INFLUENCER - DO NOT MODIFY': 2,
                'LOGO - DO NOT MODIFY': 3,
                'CLOTHING - DO NOT MODIFY': 4,
              };
              for (let i = 0; i < refImages.length; i++) {
                const safe = truncateImageUrl(refImages[i]);
                if (!safe) continue;
                const role = imageRoles[i] || 'REFERENCE';
                if (strictRoles.includes(role)) {
                  slideEntries.push({ url: safe, role, priority: slidePriority[role] || 99 });
                }
              }
              slideEntries.sort((a, b) => a.priority - b.priority);
              for (const entry of slideEntries) {
                editContent.push({ type: "image_url", image_url: { url: entry.url } });
                editContent.push({ type: "text", text: entry.role === 'PRODUCT - DO NOT MODIFY'
                  ? `↑ ⚠️ ABSOLUTE PRIORITY #1 — PRODUCT PHOTO. ${PRODUCT_PACKAGING_LOCK}`
                  : `↑ SUBJECT (${entry.role}). Preserve IDENTICALLY in output.` });
              }
              editContent.push({ type: "text", text: `${slidePrompt}\n\nPRODUCT FIDELITY OVERRIDES EVERYTHING: any connected product reference must remain unchanged and must not be affected by slide style, layout, hand interaction, scene or lighting.` });
              
              const slideModel = slideEntries.some(e => e.role === 'PRODUCT - DO NOT MODIFY')
                ? "google/gemini-3-pro-image-preview"
                : model;
              slideData = await callGateway(LOVABLE_API_KEY, {
                model: slideModel,
                messages: [
                  { role: "system", content: `You are a professional photo compositor. Preserve all strict reference subjects. Absolute #1 rule: ${PRODUCT_PACKAGING_LOCK}` + slideDimInstruction },
                  { role: "user", content: editContent },
                ],
                modalities: ["image", "text"],
              });
            } else {
              const content: any[] = [];
              for (let idx = 0; idx < refImages.length; idx++) {
                const safe = truncateImageUrl(refImages[idx]);
                if (safe) {
                  content.push({ type: "image_url", image_url: { url: safe } });
                }
              }
              content.push({ type: "text", text: slidePrompt });
              
              slideData = await callGateway(LOVABLE_API_KEY, {
                model,
                messages: [
                  { role: "system", content: "You are an image generator. Create high-quality images." + slideDimInstruction },
                  { role: "user", content },
                ],
                modalities: ["image", "text"],
              });
            }
            
            // Extract image from response
            const slideMsg = slideData.choices?.[0]?.message;
            let slideImageUrl = slideMsg?.images?.[0]?.image_url?.url;
            if (!slideImageUrl && Array.isArray(slideMsg?.content)) {
              for (const part of slideMsg.content) {
                if (part.type === 'image_url' && part.image_url?.url) { slideImageUrl = part.image_url.url; break; }
                if (part.inline_data?.mime_type?.startsWith('image/')) { slideImageUrl = `data:${part.inline_data.mime_type};base64,${part.inline_data.data}`; break; }
              }
            }
            
            if (slideImageUrl) {
              // Upload to storage
              if (slideImageUrl.startsWith('data:')) {
                const publicUrl = await uploadBase64ToStorage(slideImageUrl);
                if (publicUrl) slideImageUrl = publicUrl;
              }
              if (findLockedProductReference(refImages, imageRoles)) {
                console.log(`[generate_image] Slide product lock handled by model-guided composition (no flat overlay).`);
              }
              slideImages.push(slideImageUrl);
              console.log(`[generate_image] Slide ${slideNum}/${totalSlides} generated OK`);
            } else {
              console.warn(`[generate_image] Slide ${slideNum}/${totalSlides} failed to generate`);
            }
          }
          
          return new Response(JSON.stringify({ 
            result: { 
              imageUrl: slideImages[0] || '', 
              slideImages,
              text: `Generated ${slideImages.length} independent slides`,
              carouselMode: 'independent',
              slideWidth: slideW,
              slideHeight: slideH,
              gridCols,
              gridRows,
            } 
          }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        // === PANORAMIC MODE: Generate 1080x1080 square with content in safe zone strip ===
        if ((isGrid || isCarousel) && totalSlides > 1) {
          const [fullW, fullH] = imageSize.split('x').map(Number);
          const aspectRatio = fullW / fullH; // e.g. 5400/1080 = 5
          
          // Safe zone: a horizontal strip in the center of 1080x1080 that matches the panoramic ratio
          // For 5 slides: strip height = 1080/5 = 216px, centered vertically
          const squareSize = 1080;
          const safeZoneH = Math.round(squareSize / aspectRatio);
          const safeZoneTop = Math.round((squareSize - safeZoneH) / 2);
          const safeZoneTopPct = Math.round((safeZoneTop / squareSize) * 100);
          const safeZoneHeightPct = Math.round((safeZoneH / squareSize) * 100);
          
          console.log(`[generate_image] PANORAMIC SAFE-ZONE MODE — 1080x1080, safe zone: top=${safeZoneTopPct}% height=${safeZoneHeightPct}% (${safeZoneH}px strip for ${totalSlides} slides)`);
          
          const basePrompt = params.prompt as string;
          
          const panoramicPrompt = `${basePrompt}

CRITICAL FORMAT RULE: Generate a SQUARE 1080x1080 pixel image.
However, ALL important content (people, products, text, logos, focal points) MUST be placed ONLY within a narrow HORIZONTAL STRIP in the CENTER of the image.
This strip occupies from ${safeZoneTopPct}% to ${safeZoneTopPct + safeZoneHeightPct}% of the image height (approximately ${safeZoneH} pixels tall, centered vertically).
The areas ABOVE and BELOW this strip should be simple background, gradient, or empty space — NO important content there.

Think of it like a wide panoramic banner placed in the center of a square canvas.
Distribute all subjects and content HORIZONTALLY across the full width of the image within this strip.
All subjects must be FULLY VISIBLE and UNCROPPED — show people head-to-toe (scaled to fit within the strip), products in full, logos complete.

REFERENCE IMAGE PRESERVATION: Any reference images provided (product, influencer, person, logo, clothing) MUST appear FULLY VISIBLE and UNCROPPED within the center strip. Scale them proportionally to fit within the ${safeZoneH}px tall strip.`;

          const strictRolesPano = ['PRODUCT - DO NOT MODIFY', 'LOGO - DO NOT MODIFY', 'PERSON/INFLUENCER - DO NOT MODIFY', 'CLOTHING - DO NOT MODIFY'];
          const hasStrictPano = refImages.some((_, i) => strictRolesPano.includes(imageRoles[i] || ''));
          
          let panoData: any;
          
          if (hasStrictPano) {
            const editContent: any[] = [];
            for (let i = 0; i < refImages.length; i++) {
              const safe = truncateImageUrl(refImages[i]);
              if (!safe) continue;
              const role = imageRoles[i] || 'REFERENCE';
              // BRAND IDENTITY: still inject but as low-priority style guide at the end (handled by ordering below)
              editContent.push({ type: "image_url", image_url: { url: safe } });
              if (role === 'PRODUCT - DO NOT MODIFY') {
                editContent.push({ type: "text", text: `↑ ⚠️ ABSOLUTE PRIORITY #1 — PRODUCT PHOTO. ${PRODUCT_PACKAGING_LOCK} Place fully within center strip (${safeZoneTopPct}%-${safeZoneTopPct + safeZoneHeightPct}%).` });
              } else if (role === 'PERSON/INFLUENCER - DO NOT MODIFY') {
                editContent.push({ type: "text", text: `↑ ⚠️ PRIORITY #2 — PERSON. Exact same face. Place within center strip (${safeZoneTopPct}%-${safeZoneTopPct + safeZoneHeightPct}%).` });
              } else if (role === 'BRAND IDENTITY REFERENCE') {
                editContent.push({ type: "text", text: `↑ BRAND IDENTITY REFERENCE — extract and apply these four pillars to the OUTPUT: (1) HAND-DRAWN SKETCH SYSTEM — reproduce any sketches, doodles, contour lines, arrows, highlighter marks, handwritten annotations with the exact same medium, stroke weight and organic irregularity; (2) TYPOGRAPHIC SYSTEM — replicate exact font families, weights, hierarchy, lettering treatments and hand-lettering style; (3) LIGHTING STYLE — match color temperature, direction, hardness and contrast of light; (4) COMPOSITION STYLE — match framing, negative space, grid logic, symmetry and visual density. NEVER overrides product, person, logo or clothing. NEVER copy the subjects from this image into the output — only the stylistic system.` });
              } else if (strictRolesPano.includes(role)) {
                editContent.push({ type: "text", text: `↑ SUBJECT (${role}). Preserve IDENTICALLY within center strip.` });
              }
            }
            editContent.push({ type: "text", text: panoramicPrompt });
            
            const panoModel = refImages.some((_, i) => (imageRoles[i] || '') === 'PRODUCT - DO NOT MODIFY')
              ? "google/gemini-3-pro-image-preview"
              : model;
            panoData = await callGateway(LOVABLE_API_KEY, {
              model: panoModel,
              messages: [
                { role: "system", content: `You are a professional photo compositor. Your #1 ABSOLUTE RULE: ${PRODUCT_PACKAGING_LOCK} Priority #2: Person's face must be identical. Generate a SQUARE 1080x1080 image. Place ALL content within the center strip (${safeZoneTopPct}%-${safeZoneTopPct + safeZoneHeightPct}% of height). Top/bottom = simple background only.` },
                { role: "user", content: editContent },
              ],
              modalities: ["image", "text"],
            });
          } else {
            const content: any[] = [];
            for (let i = 0; i < refImages.length; i++) {
              const safe = truncateImageUrl(refImages[i]);
              if (safe) {
                content.push({ type: "image_url", image_url: { url: safe } });
                content.push({ type: "text", text: `[${imageRoles[i] || 'REFERENCE'}]` });
              }
            }
            content.push({ type: "text", text: panoramicPrompt });
            
            panoData = await callGateway(LOVABLE_API_KEY, {
              model,
              messages: [
                { role: "system", content: `You are an image generator. Generate a SQUARE 1080x1080 image. Place ALL important content within a horizontal strip in the center (from ${safeZoneTopPct}% to ${safeZoneTopPct + safeZoneHeightPct}% of height). Top and bottom areas should be simple background. ALL content must be FULLY VISIBLE and UNCROPPED within the strip.` },
                { role: "user", content },
              ],
              modalities: ["image", "text"],
            });
          }
          
          const panoMsg = panoData.choices?.[0]?.message;
          let panoImageUrl = panoMsg?.images?.[0]?.image_url?.url;
          if (!panoImageUrl && Array.isArray(panoMsg?.content)) {
            for (const part of panoMsg.content) {
              if (part.type === 'image_url' && part.image_url?.url) { panoImageUrl = part.image_url.url; break; }
              if (part.inline_data?.mime_type?.startsWith('image/')) { panoImageUrl = `data:${part.inline_data.mime_type};base64,${part.inline_data.data}`; break; }
            }
          }
          
            if (panoImageUrl && panoImageUrl.startsWith('data:')) {
             const publicUrl = await uploadBase64ToStorage(panoImageUrl);
             if (publicUrl) panoImageUrl = publicUrl;
           }
            if (panoImageUrl && findLockedProductReference(refImages, imageRoles)) {
              console.log(`[generate_image] Panoramic product lock handled by model-guided composition (no flat overlay).`);
            }
           
           console.log(`[generate_image] Panoramic safe-zone image generated: ${!!panoImageUrl}`);
          
          return new Response(JSON.stringify({ 
            result: { 
              imageUrl: panoImageUrl || '', 
              text: `Panorâmica gerada em 1080x1080 com zona segura de ${safeZoneHeightPct}%`,
              carouselMode: 'panoramic',
              slideWidth: fullW,
              slideHeight: fullH,
              gridCols: 1,
              gridRows: 1,
              totalSlides: totalSlides,
              originalSlideWidth: slideW,
              originalSlideHeight: slideH,
              originalTotalSlides: totalSlides,
              originalGridCols: gridCols,
              originalGridRows: gridRows,
              directPanoramic: true,
              safeZoneTopPct,
              safeZoneHeightPct,
            } 
          }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        // === SINGLE IMAGE MODE (non-carousel/grid presets) ===
        // If model was wavespeed/* but we fell through due to strict refs, remap to a Gateway-compatible image model
        const gatewayModel = model.startsWith("wavespeed/") ? "google/gemini-2.5-flash-image" : model;
        let dimensionInstruction = '';
        if (imageSize) {
          const [iw, ih] = imageSize.split('x').map(Number);
          if (iw && ih) {
            dimensionInstruction = `\n\nOUTPUT FORMAT: Generate the image at ${iw}x${ih} pixels aspect ratio. Fill the entire canvas.`;
          }
        }

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
        let lockedProductSourceUrl: string | null = null;

        if (strictImages.length > 0) {
          console.log(`[generate_image] EDIT MODE — ${strictImages.length} strict refs, ${flexibleImages.length} flexible refs, size=${imageSize}, preset=${imagePlatformPreset}`);
          const hasProductStrict = strictImages.some(s => s.role === 'PRODUCT - DO NOT MODIFY');
          const strictGatewayModel = hasProductStrict ? "google/gemini-3.1-flash-image-preview" : gatewayModel;
          lockedProductSourceUrl = strictImages.find(s => s.role === 'PRODUCT - DO NOT MODIFY')?.url || null;
          
          const editContent: any[] = [];
          
          // Sort strict images: PRODUCT first, then INFLUENCER, then others
          const priorityOrder: Record<string, number> = {
            'PRODUCT - DO NOT MODIFY': 1,
            'PERSON/INFLUENCER - DO NOT MODIFY': 2,
            'LOGO - DO NOT MODIFY': 3,
            'CLOTHING - DO NOT MODIFY': 4,
          };
          const sortedStrict = [...strictImages].sort((a, b) => (priorityOrder[a.role] || 99) - (priorityOrder[b.role] || 99));
          
          for (let i = 0; i < sortedStrict.length; i++) {
            const s = sortedStrict[i];
            editContent.push({ type: "image_url", image_url: { url: s.url } });
            if (s.role === 'PRODUCT - DO NOT MODIFY') {
              editContent.push({ type: "text", text: `↑ ⚠️ ABSOLUTE PRIORITY #1 — PRODUCT PHOTO (IMMUTABLE). ${PRODUCT_PACKAGING_LOCK}` });
            } else if (s.role === 'PERSON/INFLUENCER - DO NOT MODIFY') {
              editContent.push({ type: "text", text: `↑ ⚠️ PRIORITY #2 — PERSON/INFLUENCER. This is a REAL person. Reproduce their EXACT face, skin tone, hair, features.\nCOMPOSITION RULES:\n- Prefer the person holding the product naturally ONLY if the product packaging remains 100% intact, legible and unchanged.\n- Fingers may support only sides/base/back and must NEVER cover, bend, rewrite, deform, recolor or reinterpret label, logo, text, cap/lid, shape or colors.\n- If holding would alter/hide packaging, DO NOT force holding: place the unchanged product in the person's open hand or directly on a real existing textured surface in the scene and make the person touch, point to, or present it beside them. Do not create a pedestal, white base, table, card, caption bar, grey pill, rounded rectangle, or artificial support.\n- Interaction types (pick best fit): hold-and-show, demonstrate-use, present beside/on surface, point-to-product, offer with label fully visible.\n- Facial expression: confident smile, looking at camera or at the product.\n- The person and product must form a VISUAL UNIT — close together, never separated.\n- Product fidelity always beats hand interaction quality.` });

            } else {
              editContent.push({ type: "text", text: `↑ SUBJECT (${s.role}). Preserve IDENTICALLY in output.` });
            }
          }
          // Only send non-brand-identity flexible images as actual visual inputs
          // Brand identity images overwhelm the model and cause it to modify the product
          const nonBrandFlex = flexibleImages.filter(f => f.role !== 'BRAND IDENTITY REFERENCE');
          for (const flex of nonBrandFlex) {
            editContent.push({ type: "image_url", image_url: { url: flex.url } });
            editContent.push({ type: "text", text: `↑ STYLE/ENVIRONMENT REFERENCE (${flex.role}) — use ONLY for background/scenery inspiration. Do NOT let this change the product or person.` });
          }
          const subjectDescriptions = sortedStrict.map((s, i) => `Priority ${i + 1}: ${s.role}`).join(', ');
          const hasProductAndInfluencer = sortedStrict.some(s => s.role === 'PRODUCT - DO NOT MODIFY') && sortedStrict.some(s => s.role === 'PERSON/INFLUENCER - DO NOT MODIFY');
          const interactionBlock = hasProductAndInfluencer
            ? `\n\nCOMPOSITION & INTERACTION (MANDATORY when both product and person are present):\n- Generate the product, person, hands, setting and advertising scene as one realistic photo, while preserving the exact package design from the product reference.\n- Do NOT paste the original product photo as a flat overlay and DO NOT invent/redraw product labels.\n- Preferred composition: person close to the product, touching, pointing to, presenting, or standing beside the product.\n- If holding would require covering or deforming packaging, DO NOT force holding: use only an existing textured surface already present in the scene or the person's open hand and make the person present it; do not create a new table, pedestal, object, white base, caption bar, grey pill, rounded rectangle, or artificial support.\n- The product must be in the FOREGROUND or CENTER, sharp and well-lit, occupying 25-35% of the frame when possible.\n- Use RULE OF THIRDS: product at one intersection point, person at another.\n- The product and person must be CLOSE TOGETHER forming a VISUAL UNIT — never separated in different scenes.\n- Lighting: professional soft light, clean blurred background, premium brand advertising photography.\n- Product fidelity beats hand interaction quality.`
            : '';
           const editPrompt = `TASK: Generate ONE final advertising photograph. Use the reference images as visual sources for appearance, not as objects to display.\n\nSTRICT OUTPUT RULES:\n- ${PRODUCT_PACKAGING_LOCK}\n- The product must appear EXACTLY ONE time in the final scene.\n- Do NOT show the product reference photo itself anywhere in the image.\n- Do NOT create a second product beside the person, a comparison copy, a floating copy, a catalog cutout, a side-by-side reference, a thumbnail, a card, a label strip, a white box, or any extra isolated packaging.\n- Do NOT paste, overlay, splice, frame, or place the original product photo on top of the generated scene.\n- Do NOT generate a new/similar package: the final product must keep the reference package artwork and structure while being naturally photographed in the scene.\n\nPRIORITY ORDER:\n1. PRODUCT packaging fidelity.\n2. PERSON/INFLUENCER face identity.\n3. Background, style, lighting and identity visual.${interactionBlock}\n\nSubjects: ${subjectDescriptions}\n\nScene description:\n${params.prompt}`;
          editContent.push({ type: "text", text: editPrompt });

          const editSystemPrompt = `You generate a single seamless advertising photo from visual references. References are visual sources only; never render a reference image as a separate object in the output. ABSOLUTE RULE: ${PRODUCT_PACKAGING_LOCK} No duplicate product, no side product, no product photo stuck beside the person, no inset, no card, no frame, no white square, no label strip, no flat overlay, no catalog cutout, no before/after, no comparison layout. Person identity must match the reference. If holding would cause duplication or label damage, place the single product on an existing real surface or in an open hand, with the person presenting it.${dimensionInstruction}`;

          data = await callGateway(LOVABLE_API_KEY, {
            model: strictGatewayModel,
            messages: [
              { role: "system", content: editSystemPrompt },
              { role: "user", content: editContent },
            ],
            modalities: ["image", "text"],
          });
        } else {
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

          console.log(`[generate_image] GENERATION MODE — ${refImages.length} refs, size=${imageSize}, preset=${imagePlatformPreset}`);

          let systemMessage = refImages.length > 0
            ? "You are an image generator. Use reference images for style and environment inspiration. Create a high-quality image based on the prompt."
            : "You are an image generator. Create high-quality images based on the prompt.";
          systemMessage += dimensionInstruction;

          data = await callGateway(LOVABLE_API_KEY, {
            model: gatewayModel,
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
          if (lockedProductSourceUrl) {
            console.log(`[generate_image] Product reference preserved by model-guided composition (no flat overlay).`);
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

      case "start_apiframe_video": {
        // Auto-detect provider if model is 'auto'
        let videoParams = { ...params };
        if (videoParams.model === 'auto' || !videoParams.model) {
          const estabId = videoParams.estabelecimentoId;
          // Check apiframe first
          const afKey = await fetchApiKey(estabId, "apiframe");
          if (afKey) {
            videoParams.model = "apiframe/kling-2.6";
          } else {
            // Check google — start async (no internal long-poll)
            const googleKey = await fetchApiKey(estabId, "google");
            if (googleKey) {
              videoParams.model = "google/veo-3.1";
              const started = await startVideoGoogle(googleKey, videoParams);
              return new Response(JSON.stringify({ result: { ...started, _googleProvider: true } }), {
                headers: { ...corsHeaders, "Content-Type": "application/json" },
              });
            }
            return new Response(JSON.stringify({ result: { error: "Nenhum provedor de vídeo configurado. Configure uma API em Configurações → APIs Pagas." } }), {
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
          }
        }
        const started = await startVideoApiframe(videoParams.estabelecimentoId, videoParams);
        return new Response(JSON.stringify({ result: started }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      case "fetch_apiframe_video": {
        const result = await fetchVideoApiframe(params.estabelecimentoId, params.taskId);
        return new Response(JSON.stringify({ result }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      case "start_google_video": {
        const estabId = params.estabelecimentoId;
        const googleKey = await fetchApiKey(estabId, "google");
        if (!googleKey) {
          return new Response(JSON.stringify({ result: { error: "Chave da API Google não configurada. Configure em Configurações → APIs Pagas." } }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        const started = await startVideoGoogle(googleKey, params);
        return new Response(JSON.stringify({ result: started }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      case "fetch_google_video": {
        const estabId = params.estabelecimentoId;
        const googleKey = await fetchApiKey(estabId, "google");
        if (!googleKey) {
          return new Response(JSON.stringify({ result: { done: true, error: "Chave da API Google não configurada." } }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        const result = await fetchVideoGoogleOnce(googleKey, params.taskId);
        return new Response(JSON.stringify({ result }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      case "start_wavespeed_video": {
        const estabId = params.estabelecimentoId;
        // WaveSpeed does NOT host Google Veo models — auto-route to Google native
        const _model = (params.model as string) || "";
        const _sub = _model.replace("wavespeed/", "");
        if (_sub.startsWith("veo")) {
          const googleKey = await fetchApiKey(estabId, "google");
          if (!googleKey) {
            return new Response(JSON.stringify({ result: { error: "Veo é um modelo Google. Configure a chave Google em Configurações → APIs Pagas, ou escolha outro modelo (Seedance, Kling, Luma, etc)." } }), {
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
          }
          const googleParams = { ...params, model: _sub === "veo-3" ? "google/veo-3" : `google/${_sub}` };
          console.log(`[start_wavespeed_video] Re-routing to Google native: ${googleParams.model}`);
          const started = await startVideoGoogle(googleKey, googleParams);
          return new Response(JSON.stringify({ result: { ...started, _googleProvider: true } }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        const started = await startVideoWavespeed(estabId, params);
        return new Response(JSON.stringify({ result: started }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      case "fetch_wavespeed_video": {
        const result = await fetchVideoWavespeed(params.estabelecimentoId, params.taskId);
        return new Response(JSON.stringify({ result }), {
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
          // Tenta primeiro a chave salva no banco; se não houver, usa o secret/conector global (ELEVENLABS_API_KEY)
          const apiKey = (await fetchApiKey(estabId, "elevenlabs")) || Deno.env.get("ELEVENLABS_API_KEY") || "";
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
                language_code: params.lang || "pt-BR",
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
          // Use Gemini AI Studio TTS endpoint instead of Cloud TTS (avoids 403 billing issues)
          const langParam = (params.lang as string) || 'pt-BR';
          const langSuffix = (params.languageSuffix as string) || 'em português brasileiro / Brazilian Portuguese';
          const ttsResp = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              contents: [{ parts: [{ text: `Generate speech audio ${langSuffix}. Speak the following text naturally: "${text}"` }] }],
              generationConfig: { response_modalities: ["AUDIO"], speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: "Aoede" } } } },
            }),
          });
          if (!ttsResp.ok) {
            const errBody = await ttsResp.text().catch(() => "");
            console.error(`[generate_audio] Google Gemini TTS error ${ttsResp.status}: ${errBody.substring(0, 300)}`);
            // Fallback: use Lovable AI gateway
            throw new Error(`Google TTS error ${ttsResp.status}`);
          }
          const ttsData = await ttsResp.json();
          // Extract audio from Gemini response
          const audioPart = ttsData.candidates?.[0]?.content?.parts?.find((p: any) => p.inlineData?.mimeType?.startsWith("audio/"));
          if (!audioPart) throw new Error("No audio in Google response");
          const audioContent = audioPart.inlineData.data; // base64
          const audioBytes = base64Decode(audioContent);
          const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
          const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
          const sb = createClient(supabaseUrl, supabaseKey);
          const mimeType = audioPart.inlineData.mimeType || "audio/mpeg";
          const ext = mimeType.includes("wav") ? "wav" : mimeType.includes("ogg") ? "ogg" : "mp3";
          const fileName = `studio/${crypto.randomUUID()}.${ext}`;
          await sb.storage.from("marketing-audio").upload(fileName, audioBytes, { contentType: mimeType, upsert: true });
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

        if (provider === "wavespeed") {
          const apiKey = await fetchApiKey(estabId, "wavespeed");
          if (!apiKey) throw new Error("WaveSpeed API key not configured. Go to Settings → Paid APIs.");
          const wsModel = (params.wavespeedModel as string) || "wavespeed-ai/qwen3-tts/text-to-speech";
          const allowed = ["wavespeed-ai/qwen3-tts/text-to-speech"];
          const modelPath = allowed.includes(wsModel) ? wsModel : "wavespeed-ai/qwen3-tts/text-to-speech";

          // Submit
          const submitResp = await fetch(`https://api.wavespeed.ai/api/v3/${modelPath}`, {
            method: "POST",
            headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
            body: JSON.stringify({
              text,
              language: mapWavespeedLanguage(params.lang),
              voice: params.voice || "Vivian",
              style_instruction: params.styleInstruction || "Natural Brazilian Portuguese advertising narration, warm, clear and persuasive.",
            }),
          });
          if (!submitResp.ok) {
            const t = await submitResp.text().catch(() => "");
            throw new Error(`WaveSpeed TTS ${submitResp.status}: ${t.substring(0, 200)}`);
          }
          const submitData = await submitResp.json();
          const wsd = submitData.data || submitData;
          let outputs: any[] = wsd.outputs || [];
          let status = String(wsd.status || "").toLowerCase();
          const taskId = wsd.id;

          // Poll up to ~90s
          const startAt = Date.now();
          while (!["completed", "succeeded", "success", "finished"].includes(status) && Date.now() - startAt < 90000) {
            await new Promise((r) => setTimeout(r, 2500));
            const pr = await fetch(`https://api.wavespeed.ai/api/v3/predictions/${taskId}/result`, {
              headers: { Authorization: `Bearer ${apiKey}` },
            });
            if (pr.status === 404) continue;
            if (!pr.ok) {
              const t = await pr.text().catch(() => "");
              throw new Error(`WaveSpeed poll ${pr.status}: ${t.substring(0, 200)}`);
            }
            const pd = await pr.json();
            const d = pd.data || pd;
            status = String(d.status || "").toLowerCase();
            outputs = d.outputs || [];
            if (["failed", "error", "cancelled", "canceled"].includes(status)) {
              throw new Error(d.error || "WaveSpeed TTS falhou");
            }
          }
          const audioRemoteUrl = outputs[0];
          if (!audioRemoteUrl) throw new Error("WaveSpeed TTS timeout: nenhum áudio retornado");

          // Download and re-upload to our bucket
          const audioResp = await fetch(audioRemoteUrl);
          const audioBuffer = await audioResp.arrayBuffer();
          const ct = audioResp.headers.get("content-type") || "audio/mpeg";
          const ext = ct.includes("wav") ? "wav" : ct.includes("ogg") ? "ogg" : "mp3";
          const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
          const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
          const sb = createClient(supabaseUrl, supabaseKey);
          const fileName = `studio/${crypto.randomUUID()}.${ext}`;
          await sb.storage.from("marketing-audio").upload(fileName, new Uint8Array(audioBuffer), { contentType: ct, upsert: true });
          const { data: pubData } = sb.storage.from("marketing-audio").getPublicUrl(fileName);
          return new Response(JSON.stringify({ result: { audioUrl: pubData.publicUrl, provider: "wavespeed", model: modelPath } }), {
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
    const msg = e instanceof Error ? e.message : "Unknown error";
    const msgLower = msg.toLowerCase();
    let status = e?.status || 500;
    let friendlyMsg = msg;
    
    // Map billing/credit errors
    if (msgLower.includes("402") || msgLower.includes("billing") || msgLower.includes("payment") || 
        msgLower.includes("insufficient") || msgLower.includes("credits") || 
        msgLower.includes("exclusively available") || msgLower.includes("quota exceeded") ||
        msgLower.includes("balance") || msgLower.includes("subscription")) {
      status = 402;
      friendlyMsg = "Créditos insuficientes no provedor. Adicione saldo na sua conta do provedor de IA.";
    }
    // Map rate limit errors
    else if (msgLower.includes("429") || msgLower.includes("rate limit") || msgLower.includes("too many") || 
             msgLower.includes("quota") || msgLower.includes("throttl")) {
      status = 429;
      friendlyMsg = "Limite de requisições excedido. Aguarde alguns segundos e tente novamente.";
    }
    // Map auth errors
    else if (msgLower.includes("401") || msgLower.includes("unauthorized") || msgLower.includes("incorrect api key") || msgLower.includes("invalid api key") || msgLower.includes("invalid_api_key")) {
      status = 401;
      friendlyMsg = "Chave de API inválida ou expirada. Verifique sua chave em Configurações → APIs Pagas.";
    }
    // Map moderation/safety errors
    else if (msgLower.includes("blocked") || msgLower.includes("moderation") || msgLower.includes("safety") || msgLower.includes("content_policy") || msgLower.includes("nsfw")) {
      status = 400;
      friendlyMsg = "Conteúdo bloqueado pela moderação do provedor. Reformule o prompt e tente novamente.";
    }
    // Truncate unknown errors
    else {
      friendlyMsg = msg.substring(0, 300);
    }
    
    return new Response(JSON.stringify({ error: friendlyMsg }), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
