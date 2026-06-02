// Shared client to (re)generate a single video scene from the UI.
// Replicates the same edge function invocation logic used by useStudioExecution,
// so a node can re-run a specific scene without re-running the whole workflow.

export interface SceneRegenProgress {
  message: string;
  attempt?: number;
  totalPolls?: number;
  elapsedSeconds?: number;
}

const VIDEO_MODEL_MARKERS = [
  'veo', 'sora', 'seedance', 'seedvideo', 'runway', 'gen3', 'gen4', 'kling',
  'luma', 'ray-2', 'wan-', 'minimax', 'hunyuan', 'cogvideo', 'ltx', 'pika',
  'stable-video', 'video-01', 'midjourney-video',
];

const isValidVideoModel = (model?: string) => {
  const m = (model || '').toLowerCase().trim();
  if (!m) return false;
  if (m === 'auto' || m === 'free/gif-animated') return true;
  return VIDEO_MODEL_MARKERS.some((marker) => m.includes(marker));
};

async function callEdge(action: string, params: Record<string, any>, timeoutMs = 300000): Promise<any> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const resp = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-creative-studio`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({ action, params }),
        signal: controller.signal,
      },
    );
    clearTimeout(timer);
    if (!resp.ok) {
      const text = await resp.text().catch(() => '');
      throw new Error(text.substring(0, 300) || `HTTP ${resp.status}`);
    }
    const data = await resp.json();
    if (data?.error) throw new Error(data.error);
    return data?.result;
  } catch (err: any) {
    clearTimeout(timer);
    if (err.name === 'AbortError') throw new Error(`Timeout após ${Math.round(timeoutMs / 1000)}s`);
    throw err;
  }
}

export async function regenerateSceneVideo(
  sceneParams: Record<string, any>,
  onProgress?: (p: SceneRegenProgress) => void,
): Promise<string> {
  const requested = sceneParams.model || '';
  const model = isValidVideoModel(requested) ? requested : 'auto';
  const params = { ...sceneParams, model };

  const usesAsync = model === 'auto' || model.startsWith('apiframe/') || model.startsWith('wavespeed/') || model.startsWith('google/');

  if (!usesAsync) {
    onProgress?.({ message: 'Gerando cena...' });
    const result = await callEdge('generate_video', params, 300000);
    if (!result?.videoUrl) throw new Error(result?.error || 'Provedor não retornou vídeo.');
    return result.videoUrl;
  }

  const isWavespeed = model.startsWith('wavespeed/');
  const isGoogle = model.startsWith('google/');
  const startAction = isWavespeed ? 'start_wavespeed_video' : isGoogle ? 'start_google_video' : 'start_apiframe_video';
  let fetchAction = isWavespeed ? 'fetch_wavespeed_video' : isGoogle ? 'fetch_google_video' : 'fetch_apiframe_video';

  onProgress?.({ message: 'Enviando pedido ao provedor...' });
  const started = await callEdge(startAction, params, 60000);
  if (started?.error) throw new Error(started.error);
  if (started?.videoUrl) return started.videoUrl;
  if (started?._googleProvider) fetchAction = 'fetch_google_video';

  const taskId = started?.taskId;
  if (!taskId) throw new Error('Provedor não devolveu o identificador da tarefa.');

  const isSlowModel = model.includes('seedance') || model.includes('image-to-video');
  const maxWaitMs = isSlowModel ? 900000 : 600000;
  const totalPolls = Math.max(1, Math.ceil(maxWaitMs / 5000));
  const startedAt = Date.now();

  for (let attempt = 0; attempt < totalPolls; attempt += 1) {
    await new Promise((r) => setTimeout(r, 5000));
    const poll = await callEdge(fetchAction, {
      estabelecimentoId: params.estabelecimentoId,
      taskId,
    }, 60000);
    if (poll?.error) throw new Error(poll.error);
    const elapsedSeconds = Math.round((Date.now() - startedAt) / 1000);
    onProgress?.({
      message: poll?.message || `Renderizando — consulta ${attempt + 1}/${totalPolls}`,
      attempt: attempt + 1,
      totalPolls,
      elapsedSeconds,
    });
    if (poll?.done && poll?.videoUrl) return poll.videoUrl;
    if (poll?.done) throw new Error('Geração terminou mas o vídeo final não chegou.');
  }
  throw new Error('Timeout: a geração da cena passou do tempo limite.');
}
