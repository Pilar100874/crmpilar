import { createClient } from "npm:@supabase/supabase-js@2.49.1";

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
async function generateVideoGoogle(apiKey: string, params: any): Promise<VideoGenerationResult> {
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
  
  // In bridgeMode with 2 images, Veo only accepts ONE image.
  // Compose a single side-by-side SVG reference so the model can see both the exact start and end frames.
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
        console.log(`[generate_video] Google Veo bridge: side-by-side start/end reference attached (${(svgBytes.byteLength / 1024).toFixed(0)}KB SVG)`);
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
        console.log(`[generate_video] Google Veo: image attached (${(imgBuf.byteLength / 1024).toFixed(0)}KB, ${mimeType})`);
      }
    } catch (imgErr) {
      console.warn(`[generate_video] Google Veo: failed to attach image:`, imgErr);
    }
  }
  
  // Clean prompt for Veo
  let cleanPrompt = params.prompt || "";
  
  // For bridge mode, use a simplified prompt that focuses on the transition
  if (params.bridgeMode) {
    const directionMatch = cleanPrompt.match(/TRANSITION DIRECTION:\s*([\s\S]*?)(?:\n\nCRITICAL:|$)/);
    const userDirection = directionMatch?.[1]?.trim() || cleanPrompt;
    cleanPrompt = `The attached reference image contains two exact frames side by side: LEFT is the starting frame and RIGHT is the ending frame. Create a smooth cinematic transition from the LEFT frame to the RIGHT frame. ${userDirection}. The first moment must match the left frame and the last moment must match the right frame.`;
    console.log(`[generate_video] Veo bridge mode: simplified prompt: ${cleanPrompt.substring(0, 200)}`);
  } else {
    // Normal mode: remove fidelity/preservation instructions
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
  
  // If prompt is too short after cleaning, use a generic scene description
  if (cleanPrompt.length < 20) {
    cleanPrompt = "A cinematic product showcase video with smooth camera movement, professional lighting, and elegant composition.";
  }

  // Re-append audio directive after cleaning (it gets stripped by fidelity markers)
  const withAudio = params.withAudio !== false;
  const withMusic = withAudio ? (params.withMusic !== false) : false;
  if (!withAudio) {
    cleanPrompt += "\n\nGenerate a completely SILENT video. No speech, no music, no soundtrack, no ambient audio.";
  } else if (!withMusic) {
    cleanPrompt += "\n\nDo NOT add any background music or soundtrack. Keep only natural non-musical audio.";
  }

  console.log(`[generate_video] Veo clean prompt (${cleanPrompt.length} chars), audio=${withAudio}, music=${withMusic}: ${cleanPrompt.substring(0, 200)}`);

  // Submit generation request
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${modelId}:predictLongRunning?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        instances: [{
          prompt: cleanPrompt,
          ...imagePayload,
        }],
        parameters: {
          aspectRatio: params.aspectRatio || "16:9",
          durationSeconds: Math.min(8, Math.max(4, Math.round(Number(params.duration) || 6))),
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

  console.log(`[generate_video] Google Veo operation: ${operationName}`);

  // Poll for completion
  const result = await pollUntilDone<string>(async () => {
    const pollResp = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/${operationName}?key=${apiKey}`
    );
    const pollData = await pollResp.json();
    const isDone = pollData.done === true;
    const hasError = pollData.error != null;
    console.log(`[generate_video] Poll response done=${isDone}, hasError=${hasError}, keys=${JSON.stringify(Object.keys(pollData.response || {}))}`);
    
    // If the operation errored out
    if (hasError) {
      const errMsg = typeof pollData.error === 'object' ? (pollData.error.message || JSON.stringify(pollData.error)) : String(pollData.error);
      console.log(`[generate_video] Operation error: ${errMsg}`);
      return { done: true, error: `Google Veo error: ${errMsg.substring(0, 200)}` };
    }
    
    if (isDone) {
      const resp = pollData.response || pollData.result || pollData;
      console.log(`[generate_video] Response structure: ${JSON.stringify(resp).substring(0, 500)}`);
      
      // Check for safety/moderation filter
      const genResp = resp?.generateVideoResponse;
      if (genResp?.raiMediaFilteredCount > 0 || genResp?.raiMediaFilteredReasons?.length > 0) {
        const reasons = genResp.raiMediaFilteredReasons?.join("; ") || "Conteúdo bloqueado pela moderação";
        return { done: true, error: `blocked:${reasons}` };
      }
      
      // Helper to download from Google API and upload to our storage
      const downloadAndStore = async (uri: string): Promise<{ done: true; result?: string; error?: string }> => {
        try {
          const downloadUrl = uri.includes("?") ? `${uri}&key=${apiKey}` : `${uri}?key=${apiKey}`;
          console.log(`[generate_video] Downloading video from Google API...`);
          const dlResp = await fetch(downloadUrl);
          if (!dlResp.ok) {
            console.log(`[generate_video] Download failed: ${dlResp.status}`);
            return { done: true, error: `Failed to download video: ${dlResp.status}` };
          }
          const videoBytes = new Uint8Array(await dlResp.arrayBuffer());
          console.log(`[generate_video] Downloaded ${videoBytes.length} bytes, uploading to storage...`);
          const storedUrl = await uploadVideoToStorage(videoBytes);
          return { done: true, result: storedUrl || undefined };
        } catch (e) {
          console.log(`[generate_video] Download error: ${e.message}`);
          return { done: true, error: `Download error: ${e.message}` };
        }
      };

      // Try generateVideoResponse.generatedSamples first (confirmed structure)
      const genSamples = genResp?.generatedSamples;
      if (genSamples?.[0]?.video?.uri) {
        return await downloadAndStore(genSamples[0].video.uri);
      }
      if (genSamples?.[0]?.video?.bytesBase64Encoded) {
        const bytes = base64Decode(genSamples[0].video.bytesBase64Encoded);
        const url = await uploadVideoToStorage(new Uint8Array(bytes));
        return { done: true, result: url || undefined };
      }
      
      // Fallback: try top-level structures
      const samples = resp?.generatedSamples || resp?.videos || resp?.predictions || [];
      const video = samples?.[0]?.video || samples?.[0];
      if (video?.uri) return await downloadAndStore(video.uri);
      if (video?.bytesBase64Encoded) {
        const bytes = base64Decode(video.bytesBase64Encoded);
        const url = await uploadVideoToStorage(new Uint8Array(bytes));
        return { done: true, result: url || undefined };
      }
      if (typeof video === "string" && video.startsWith("http")) return await downloadAndStore(video);
      
      return { done: true, error: `No video in response: ${JSON.stringify(resp).substring(0, 300)}` };
    }
    return { done: false };
  }, 5000, 120);

  return { videoUrl: result };
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
async function generateVideoApiframe(estabelecimentoId: string, params: any): Promise<VideoGenerationResult> {
  const model = (params.model as string) || "";
  const subModel = model.replace("apiframe/", "");

  // Map sub-model to apiframe action
  const ACTION_MAP: Record<string, string> = {
    "midjourney-video": "midjourney-video",
    "runway-gen4": "runway-imagine",
    "runway": "runway-imagine",
    "kling-2.6": "kling-2.6",
    "kling-2.5": "kling-2.5-turbo",
    "luma": "luma-imagine",
    "google-veo": "google-veo",
    "sora-2": "sora-2",
  };

  const action = ACTION_MAP[subModel];
  if (!action) {
    return { error: `Modelo "${subModel}" não está disponível no Apiframe. Modelos suportados: Midjourney Video, Runway, Kling 2.6/2.5, Luma, Google Veo, Sora 2.` };
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !supabaseKey) {
    return { error: "Configuração do servidor incompleta (SUPABASE_URL/SERVICE_ROLE_KEY)." };
  }

  // Build apiframe params
  const afParams: Record<string, any> = {};
  if (params.prompt) afParams.prompt = params.prompt;
  if (params.imageUrls?.[0]) afParams.image_url = params.imageUrls[0];
  if (params.aspectRatio) afParams.aspect_ratio = params.aspectRatio;
  if (params.duration) afParams.seconds = params.duration;

  console.log(`[apiframe-video] Calling action="${action}" for model="${model}"`);

  // Call apiframe-proxy edge function
  const proxyUrl = `${supabaseUrl}/functions/v1/apiframe-proxy`;
  const startResp = await fetch(proxyUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${supabaseKey}`,
    },
    body: JSON.stringify({ action, estabelecimentoId, params: afParams }),
  });

  const startData = await startResp.json();
  if (!startResp.ok || startData.error) {
    return { error: startData.error || `Erro ao iniciar geração via Apiframe (${startResp.status})` };
  }

  const taskId = startData.task_id;
  if (!taskId) {
    // Some endpoints return the result directly
    if (startData.video_url) {
      const videoResp = await fetch(startData.video_url);
      const videoBytes = new Uint8Array(await videoResp.arrayBuffer());
      const storedUrl = await uploadVideoToStorage(videoBytes);
      return { videoUrl: storedUrl || startData.video_url, provider: "apiframe" };
    }
    return { error: "Apiframe não retornou task_id nem video_url." };
  }

  console.log(`[apiframe-video] Task started: ${taskId}. Polling...`);

  // Poll for completion
  const videoUrl = await pollUntilDone<string>(async () => {
    const pollResp = await fetch(proxyUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${supabaseKey}`,
      },
      body: JSON.stringify({ action: "fetch", estabelecimentoId, params: { task_id: taskId } }),
    });
    const pollData = await pollResp.json();

    if (pollData.status === "finished" || pollData.status === "completed" || pollData.status === "succeeded") {
      const url = pollData.video_url || pollData.result_url || pollData.output;
      if (url) return { done: true, result: url };
      return { done: true, error: "Apiframe concluiu mas não retornou URL do vídeo." };
    }
    if (pollData.status === "failed" || pollData.status === "error") {
      return { done: true, error: pollData.error || "Geração falhou no Apiframe." };
    }
    return { done: false };
  }, 5000, 120);

  // Download and store
  const videoResp = await fetch(videoUrl);
  const videoBytes = new Uint8Array(await videoResp.arrayBuffer());
  const storedUrl = await uploadVideoToStorage(videoBytes);
  return { videoUrl: storedUrl || videoUrl, provider: "apiframe" };
}

// --- Generic handler for unsupported providers ---
async function generateVideoUnsupported(model: string): Promise<VideoGenerationResult> {
  return { error: `Provedor de vídeo "${model.split('/')[0]}" ainda não possui integração de API implementada. Configure uma chave válida para: Google (Veo), OpenAI (Sora), Runway, Kling, Luma, Stability, Replicate ou Apiframe.` };
}

// Pre-generate a "hero frame" compositing product/influencer into the scene
// This ensures the video starts from a frame with the REAL product and influencer
async function generateHeroFrame(params: any): Promise<string | null> {
  const imageUrls = (params.imageUrls || []) as string[];
  const imageRoles = (params.imageRoles || []) as string[];
  if (imageUrls.length === 0) return null;

  // Check if there are strict references (product/influencer) that need preservation
  const strictRoles = ['PRODUCT - DO NOT MODIFY', 'PERSON/INFLUENCER - DO NOT MODIFY', 'LOGO - DO NOT MODIFY', 'CLOTHING - DO NOT MODIFY'];
  const hasStrictRefs = imageRoles.some(r => strictRoles.includes(r));
  if (!hasStrictRefs) return null;

  console.log(`[hero-frame] Generating composed hero frame with ${imageUrls.length} references...`);

  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  if (!LOVABLE_API_KEY) return null;

  try {
    // Build content: subject images first, then prompt
    const editContent: any[] = [];
    
    for (let i = 0; i < imageUrls.length; i++) {
      const url = imageUrls[i];
      const role = imageRoles[i] || 'REFERENCE';
      if (!url) continue;
      
      // Send image
      if (url.startsWith('http')) {
        editContent.push({ type: "image_url", image_url: { url } });
      } else if (url.startsWith('data:')) {
        editContent.push({ type: "image_url", image_url: { url } });
      } else {
        continue;
      }
      
      if (strictRoles.includes(role)) {
        editContent.push({ type: "text", text: `↑ SUBJECT: ${role}. This is a REAL PHOTOGRAPH. The person's face and the product's packaging MUST appear IDENTICALLY in the output.` });
      } else {
        editContent.push({ type: "text", text: `↑ ${role} — use for style/background inspiration only.` });
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

    editContent.push({ type: "text", text: `TASK: Create a single PHOTOMONTAGE image.\nYou MUST use the EXACT subjects from the photos above. The person's FACE must be IDENTICAL. The product PACKAGING must be IDENTICAL.\nYou are doing PHOTO EDITING — cut the subjects and paste them into the scene.\n\nScene: ${sceneDesc}\nAspect ratio: ${params.aspectRatio || '16:9'}` });

    const data = await callGateway(LOVABLE_API_KEY, {
      model: "google/gemini-3-pro-image-preview",
      messages: [
        { role: "system", content: "You are a professional photo compositor. Take REAL PHOTOGRAPHS of people and products and place them into new scenes WITHOUT changing their appearance. The face of any person MUST remain pixel-identical. The packaging of any product MUST remain pixel-identical. You NEVER redraw faces or redesign packaging." },
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
          return publicUrl;
        }
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

  // Check if there are strict references (product/influencer) that need preservation
  const imageRoles = (params.imageRoles || []) as string[];
  const strictRoles = ['PRODUCT - DO NOT MODIFY', 'PERSON/INFLUENCER - DO NOT MODIFY'];
  const hasStrictRefs = imageRoles.some(r => strictRoles.includes(r));

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
    throw new Error(`Chave de API não configurada para o provedor "${provider}". Configure em Configurações → APIs Pagas.`);
  }

  // Pre-generate hero frame only for providers that support image-to-video
  const imageToVideoProviders = ["google", "runway", "luma", "stability"];
  if (hasStrictRefs && imageToVideoProviders.includes(provider)) {
    const heroFrameUrl = await generateHeroFrame(params);
    if (heroFrameUrl) {
      console.log(`[generate_video] Using hero frame as starting image for ${provider}`);
      params.imageUrls = [heroFrameUrl];
      params._heroFrameUsed = true;
    } else {
      // Hero frame failed — do NOT proceed with partial references
      throw new Error("hero_frame_failed:Não foi possível compor a imagem de referência com todos os elementos (produto, influencer, etc.). O servidor de composição está temporariamente indisponível. Tente novamente em alguns instantes.");
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
    default:
      // Luma, Stability, etc. — keep as-is or default
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

          // CRITICAL: Send strict subject images FIRST so the model "sees" them before anything else
          for (let i = 0; i < strictImages.length; i++) {
            const s = strictImages[i];
            editContent.push({ type: "image_url", image_url: { url: s.url } });
            editContent.push({ type: "text", text: `↑ THIS IS SUBJECT ${i + 1} (${s.role}). This is a REAL PHOTOGRAPH. The person's face, skin tone, hair, body, and the product's exact packaging, label, colors, and typography MUST appear IDENTICALLY in the output. DO NOT redraw or reimagine.` });
          }

          // Then: flexible references as environment/style context
          for (const flex of flexibleImages) {
            editContent.push({ type: "image_url", image_url: { url: flex.url } });
            editContent.push({ type: "text", text: `↑ STYLE/ENVIRONMENT REFERENCE (${flex.role}) — use ONLY for background/scenery inspiration. Do NOT use this to change the subjects.` });
          }

          // Build the list of what must be preserved
          const subjectDescriptions = strictImages.map((s, i) => `Subject ${i + 1}: ${s.role}`).join(', ');
          
          // Finally: the edit instruction
          const editPrompt = `TASK: Create a PHOTOMONTAGE / COMPOSITE image.\n\nYou MUST use the EXACT subjects from the photos above (${subjectDescriptions}). This means:\n- The person's FACE must be IDENTICAL — same eyes, nose, mouth, skin tone, hair. Not similar. IDENTICAL.\n- The product PACKAGING must be IDENTICAL — same label, same colors, same logo, same shape. Not similar. IDENTICAL.\n- You are doing PHOTO EDITING, not generating new content. Cut the subjects from their photos and place them into the new scene.\n\nScene description:\n${params.prompt}`;
          editContent.push({ type: "text", text: editPrompt });

          data = await callGateway(LOVABLE_API_KEY, {
            model,
            messages: [
              { role: "system", content: "You are a professional photo compositor / retoucher. Your job is to take REAL PHOTOGRAPHS of people and products and place them into new scenes WITHOUT changing their appearance AT ALL. You work like Photoshop — you CUT subjects from their original photos and PASTE them into new backgrounds. The face of any person MUST remain pixel-identical to the input photo. The packaging/label of any product MUST remain pixel-identical to the input photo. You NEVER redraw faces. You NEVER redesign packaging. You ONLY change the background, lighting, and composition around the subjects." },
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
                language_code: params.lang || "pt",
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
