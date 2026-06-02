import { useState, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { StudioNode, StudioEdge, StudioNodeData, StudioNodeType } from './types';
import { nodeResultStore } from './useNodeResults';
import { toast } from 'sonner';
import { getStudioDefaults, getLanguagePromptSuffix } from './AISettingsPanel';
import { getActiveVisualIdentity } from './VisualIdentityPanel';

// Converte erros técnicos dos provedores (WaveSpeed, Google, Apiframe, etc.) em mensagens claras para o usuário.
function humanizeProviderError(raw: string, httpStatus?: number): string {
  const msg = String(raw || '').trim();
  const low = msg.toLowerCase();

  if (low.includes('model not found') || low.includes('model_not_found') || low.includes('not mapped') || low.includes('não está mapeado') || low.includes('modelo não disponível') || low.includes('não disponível no wavespeed')) {
    return '🧩 Este modelo de IA não está disponível no provedor selecionado. Troque para outro modelo (ex.: Seedance, Kling, Luma, Google Veo) ou use a opção "Auto".';
  }
  if (httpStatus === 401 || low.includes('401') || low.includes('unauthorized') || low.includes('incorrect api key') || low.includes('invalid api key') || low.includes('api key not configured') || low.includes('chave da api') || low.includes('not configured')) {
    return '🔑 Chave de API ausente ou inválida. Configure/atualize a chave do provedor em Configurações → APIs Pagas.';
  }
  if (httpStatus === 402 || low.includes('402') || low.includes('payment') || low.includes('insufficient') || low.includes('billing') || low.includes('quota') || low.includes('credits exhausted') || low.includes('exclusively available')) {
    return '💳 Créditos insuficientes na conta do provedor. Adicione saldo ou troque para um modelo gratuito.';
  }
  if (httpStatus === 429 || low.includes('429') || low.includes('rate limit') || low.includes('too many')) {
    return '⏳ Muitas requisições em pouco tempo. Aguarde 20–30 segundos e tente novamente.';
  }
  if (httpStatus === 403 || low.includes('403') || low.includes('forbidden')) {
    return '🚫 Sua conta não tem permissão para usar este modelo. Habilite o acesso no painel do provedor ou escolha outro modelo.';
  }
  if (low.includes('safety') || low.includes('content policy') || low.includes('blocked') || low.includes('moderation')) {
    return '⚠️ O conteúdo foi bloqueado por política de segurança do provedor. Reescreva o prompt com termos mais neutros e tente novamente.';
  }
  if (httpStatus === 400 || low.includes('bad request') || low.includes('(400)')) {
    const m = msg.match(/"message"\s*:\s*"([^"]+)"/);
    const detail = m ? m[1] : '';
    if (detail) return `🛠️ O provedor recusou esta requisição: ${detail}. Ajuste o modelo, o prompt ou as referências e tente novamente.`;
    return '🛠️ O provedor recusou esta requisição. Verifique o modelo escolhido e o prompt e tente novamente.';
  }
  if (low.includes('timeout') || low.includes('timed out') || low.includes('excedeu o tempo')) {
    return '⏱️ O provedor não respondeu a tempo. Isso costuma ser temporário — tente novamente em alguns instantes.';
  }
  if ((httpStatus && httpStatus >= 500) || low.includes(' 500') || low.includes(' 502') || low.includes(' 503') || low.includes(' 504') || low.includes('internal server error') || low.includes('service unavailable')) {
    return '🌐 O servidor do provedor está instável no momento. Tente novamente em alguns minutos.';
  }
  if (low.includes('não retornou') || low.includes('did not return') || low.includes('no url')) {
    return '📭 O provedor terminou a tarefa mas não devolveu o arquivo. Tente gerar novamente.';
  }
  if (low.includes('failed to fetch') || low.includes('network') || low.includes('econn')) {
    return '🌐 Falha de conexão com o provedor. Verifique sua internet e tente novamente.';
  }
  if (!msg) return '❌ Ocorreu um erro inesperado ao gerar. Tente novamente.';
  return `❌ ${msg.substring(0, 240)}`;
}
export { humanizeProviderError };

// Visual Identity emphasis directive — focus areas when VI is active
const VI_FOCUS_DIRECTIVE = [
  `\n\n🎨 [IDENTIDADE VISUAL — FOCO OBRIGATÓRIO]`,
  `Quando a identidade visual da marca está ativa, aplique-a com PRIORIDADE MÁXIMA nestes cinco pilares (sempre respeitando que PRODUTO e PESSOA/INFLUENCER continuam intocáveis):`,
  ``,
  `1. ✍️ SISTEMA DE ESBOÇO FEITO À MÃO (HAND-DRAWN SKETCH SYSTEM) — PRIORIDADE #1 DA IDENTIDADE:`,
  `   - Se as referências de identidade contiverem traços, rabiscos, contornos, anotações, setas, círculos, sublinhados, asteriscos, doodles, marcações tipo caneta/lápis/marca-texto, REPRODUZA esse mesmo estilo de mão na arte gerada.`,
  `   - Use a mesma espessura, pressão, irregularidade orgânica, textura de papel/tinta, mesmo material (giz, marcador, nanquim, lápis 6B, caneta esferográfica, etc.).`,
  `   - Aplique esses esboços como sobreposições gráficas reais ao redor/sobre o cenário — JAMAIS sobre o rótulo do produto e JAMAIS deformando o rosto da pessoa.`,
  `   - Mantenha a coerência: se o sistema é monocromático preto, não invente cor; se é colorido, respeite a paleta exata da identidade.`,
  `   - ⚠️ TEXTO DENTRO DOS RABISCOS/ANOTAÇÕES MANUSCRITAS: TODA palavra escrita à mão (anotações, setas com legenda, círculos com texto, asteriscos, badges desenhadas, marca-texto sobre palavra) DEVE ser uma palavra REAL em PORTUGUÊS DO BRASIL, gramaticalmente correta, com acentuação completa e ortografia perfeita. PROIBIDO ABSOLUTO: gibberish, palavras inventadas, letras soltas sem sentido, "lorem ipsum", frases em inglês, frases sem nexo, símbolos aleatórios que pareçam letras. Se não houver texto explícito definido pelo usuário, prefira rabiscos PURAMENTE GRÁFICOS (setas, círculos, traços, asteriscos) SEM nenhuma palavra escrita, em vez de inventar texto. Quando precisar escrever, use palavras curtas, simples e seguras em português ("novo", "veja", "agora", "top", "feito à mão", "exclusivo", etc.) — sempre coerentes com o conceito do anúncio.`,
  ``,
  `2. 🔤 SISTEMA TIPOGRÁFICO:`,
  `   - Use EXATAMENTE as famílias tipográficas, pesos, espaçamentos, hierarquia (display/título/corpo), tracking e leading observados nas referências da identidade.`,
  `   - Replique tratamentos especiais: caixa-alta/baixa, itálico manuscrito, lettering desenhado à mão, ligaduras, sublinhados orgânicos, destaques em marca-texto.`,
  `   - Nunca substitua por uma fonte genérica do modelo.`,
  ``,
  `3. 💡 ESTILO DE ILUMINAÇÃO:`,
  `   - Reproduza a temperatura de cor, direção de luz (lateral, contra-luz, zenital, etc.), dureza/suavidade das sombras, contraste, halos, godrays e qualidade de highlight observados nas imagens da identidade.`,
  `   - Mantenha consistência absoluta: se a marca usa luz natural difusa de janela, não invente flash duro; se usa neon noturno, não invente sol de meio-dia.`,
  ``,
  `4. 🧭 ESTILO DE COMPOSIÇÃO:`,
  `   - Replique enquadramento, regra de proporção, uso de negative space, alinhamento de grid, simetria/assimetria, camadas, profundidade, ângulo de câmera e crop característicos da marca.`,
  `   - Mantenha a mesma densidade visual (minimalista vs. maximalista) e a mesma lógica de hierarquia de elementos.`,
  ``,
  `5. 📝 TEXTOS EM PORTUGUÊS (BRASIL) — TOLERÂNCIA ZERO A ERROS:`,
  `   - TODO texto renderizado na imagem (títulos, subtítulos, chamadas, legendas, anotações manuscritas, selos, badges, CTAs) DEVE estar em português do Brasil, gramaticalmente correto, com ortografia perfeita, acentuação completa (á, â, ã, é, ê, í, ó, ô, õ, ú, ç) e pontuação adequada.`,
  `   - PROIBIDO: palavras inventadas, letras trocadas, sílabas duplicadas/faltando, espaçamento errado, hífens errados, gírias em inglês quando não solicitado, gibberish ou "lorem ipsum" disfarçado.`,
  `   - Concorde gênero e número corretamente (artigos, adjetivos, verbos). Use crase quando exigida. Respeite maiúsculas/minúsculas conforme o estilo da marca.`,
  `   - Antes de renderizar, revise mentalmente cada palavra letra por letra. Se houver dúvida sobre a grafia de qualquer palavra, prefira uma palavra mais simples e seguramente correta.`,
  `   - Mesmo em estilo manuscrito/sketch, a legibilidade e a correção ortográfica são obrigatórias.`,
  ``,
  `⚠️ Estes cinco pilares devem ser visivelmente reconhecíveis no resultado final. Se algum elemento gerado não refletir o sistema da marca (especialmente o sketch à mão, a tipografia e a correção dos textos em português), refaça internamente antes de entregar.`,
].join('\n');

export interface ExecutionLogEntry {
  nodeId: string;
  nodeLabel: string;
  nodeType: string;
  status: 'pending' | 'running' | 'success' | 'error' | 'skipped';
  startedAt?: number;
  completedAt?: number;
  elapsedMs?: number;
  errorMessage?: string;
}

export interface BatchReviewItem {
  imageUrl: string;
  productName: string;
  productId?: string;
}

type VideoProgressUpdate = {
  message: string;
  provider?: string;
  taskId?: string;
  attempt?: number;
  totalPolls?: number;
  elapsedSeconds?: number;
  estimatedRemainingSeconds?: number;
  status?: string;
  stalled?: boolean;
};

export function useStudioExecution() {
  const [isExecuting, setIsExecuting] = useState(false);
  const [executionLog, setExecutionLog] = useState<ExecutionLogEntry[]>([]);
  const [currentNodeId, setCurrentNodeId] = useState<string | null>(null);
  const [batchReviewResults, setBatchReviewResults] = useState<BatchReviewItem[]>([]);
  const onNodesUpdateRef = useRef<((nodes: StudioNode[]) => void) | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const callStudio = async (action: string, params: Record<string, any>, timeoutMs: number = 300000, _retryCount = 0) => {
    const MAX_RETRIES = 2;
    console.log(`[Studio] Calling edge function: action=${action}${_retryCount > 0 ? ` (retry ${_retryCount})` : ''}`, params);
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    // Link global cancel to this fetch
    const onGlobalAbort = () => controller.abort();
    if (abortRef.current) {
      if (abortRef.current.signal.aborted) {
        clearTimeout(timer);
        throw new Error('Execução cancelada pelo usuário.');
      }
      abortRef.current.signal.addEventListener('abort', onGlobalAbort);
    }

    let response: Response;
    try {
      response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-creative-studio`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({ action, params }),
          signal: controller.signal,
        }
      );
    } catch (fetchErr: any) {
      clearTimeout(timer);
      abortRef.current?.signal.removeEventListener('abort', onGlobalAbort);
      if (fetchErr.name === 'AbortError') {
        if (abortRef.current?.signal.aborted) {
          throw new Error('Execução cancelada pelo usuário.');
        }
        // Timeout — retry if possible
        if (_retryCount < MAX_RETRIES) {
          console.warn(`[Studio] Timeout on attempt ${_retryCount + 1}, retrying...`);
          await new Promise(r => setTimeout(r, 2000));
          return callStudio(action, params, timeoutMs, _retryCount + 1);
        }
        throw new Error(`Timeout: a geração demorou mais de ${Math.round(timeoutMs / 1000)}s. Tente novamente.`);
      }
      // Network error (Failed to fetch) — retry if possible
      if (_retryCount < MAX_RETRIES) {
        console.warn(`[Studio] Network error on attempt ${_retryCount + 1}: ${fetchErr.message}, retrying in 3s...`);
        await new Promise(r => setTimeout(r, 3000));
        return callStudio(action, params, timeoutMs, _retryCount + 1);
      }
      throw new Error(`🌐 Falha de conexão após ${MAX_RETRIES + 1} tentativas. Verifique sua internet e tente novamente.`);
    }
    abortRef.current?.signal.removeEventListener('abort', onGlobalAbort);
    clearTimeout(timer);
    if (!response.ok) {
      const errText = await response.text().catch(() => 'Unknown error');
      console.error(`[Studio] Edge function error ${response.status}:`, errText);

      let rawError = errText.substring(0, 400);
      try {
        const errJson = JSON.parse(errText);
        rawError = errJson?.error || errJson?.message || rawError;
      } catch {}

      throw new Error(humanizeProviderError(rawError, response.status));
    }
    // Read as text first to handle large payloads safely
    const rawText = await response.text();
    console.log(`[Studio] Raw response length: ${rawText.length} chars`);
    let data: any;
    try {
      data = JSON.parse(rawText);
    } catch (parseErr) {
      console.error(`[Studio] Failed to parse JSON response (${rawText.length} chars):`, parseErr);
      throw new Error(`Failed to parse response (${rawText.length} chars)`);
    }
    const result = data?.result;
    console.log(`[Studio] Edge function result:`, {
      hasResult: !!result,
      type: typeof result,
      keys: result ? Object.keys(result) : 'none',
      hasImageUrl: !!result?.imageUrl,
      imageUrlLength: result?.imageUrl?.length || 0,
      hasText: !!result?.text,
    });
    if (data?.error) throw new Error(data.error);
    return result;
  };

  const waitForStudioDelay = (ms: number) => new Promise<void>((resolve, reject) => {
    const globalSignal = abortRef.current?.signal;
    if (globalSignal?.aborted) {
      reject(new Error('Execução cancelada pelo usuário.'));
      return;
    }

    const timer = window.setTimeout(() => {
      globalSignal?.removeEventListener('abort', handleAbort);
      resolve();
    }, ms);

    function handleAbort() {
      window.clearTimeout(timer);
      globalSignal?.removeEventListener('abort', handleAbort);
      reject(new Error('Execução cancelada pelo usuário.'));
    }

    globalSignal?.addEventListener('abort', handleAbort, { once: true });
  });

  const isValidVideoGenerationModel = (modelValue?: string | null): boolean => {
    const model = (modelValue || '').toLowerCase().trim();
    if (!model) return false;
    if (model === 'auto' || model === 'free/gif-animated') return true;

    const imageOnlyMarkers = [
      'gpt-image', 'dall-e', 'flux', 'seedream', 'nano-banana', 'imagefx',
      'ideogram', 'recraft', 'kolors', 'sd3', 'sdxl', 'firefly', 'faceswap', 'kling-image',
    ];
    if (imageOnlyMarkers.some((marker) => model.includes(marker))) return false;

    const videoMarkers = [
      'veo', 'sora', 'seedance', 'seedvideo', 'runway', 'gen3', 'gen4', 'kling',
      'luma', 'ray-2', 'wan-', 'minimax', 'hunyuan', 'cogvideo', 'ltx', 'pika',
      'stable-video', 'video-01', 'midjourney-video',
    ];
    return videoMarkers.some((marker) => model.includes(marker));
  };

  const generateAsyncStudioVideo = async (
    params: Record<string, any>,
    maxWaitMs: number = 600000,
    onProgress?: (progress: VideoProgressUpdate) => void,
  ) => {
    // Detect provider from model prefix
    const requestedModel = params.model || '';
    const model = isValidVideoGenerationModel(requestedModel) ? requestedModel : 'auto';
    if (model !== requestedModel) {
      console.warn('[Studio] Modelo incompatível ignorado para vídeo:', requestedModel);
      params = { ...params, model };
    }
    const isWavespeed = model.startsWith('wavespeed/');
    const isGoogle = model.startsWith('google/');
    let startAction: string;
    let fetchAction: string;
    let providerName: string;
    if (isWavespeed) {
      startAction = 'start_wavespeed_video';
      fetchAction = 'fetch_wavespeed_video';
      providerName = 'wavespeed';
    } else if (isGoogle) {
      startAction = 'start_google_video';
      fetchAction = 'fetch_google_video';
      providerName = 'google';
    } else {
      startAction = 'start_apiframe_video';
      fetchAction = 'fetch_apiframe_video';
      providerName = 'apiframe';
    }

    onProgress?.({ message: 'Enviando pedido para o provedor de vídeo...', provider: providerName });
    const started = await callStudio(startAction, params, 60000);

    if (started?.error) {
      throw new Error(humanizeProviderError(started.error));
    }

    if (started?.videoUrl) {
      return started;
    }

    // start_apiframe_video may auto-route to google async — switch fetch action accordingly
    const effectiveFetchAction = started?._googleProvider ? 'fetch_google_video' : fetchAction;
    const effectiveProvider = started?._googleProvider ? 'google' : providerName;

    const taskId = started?.taskId;
    if (!taskId) {
      throw new Error('📭 O provedor de vídeo aceitou o pedido mas não devolveu o identificador da tarefa. Tente novamente em alguns instantes.');
    }

    const totalPolls = Math.max(1, Math.ceil(maxWaitMs / 5000));
    const startedAt = Date.now();
    onProgress?.({
      message: `Tarefa iniciada no ${effectiveProvider}. Aguardando renderização...`,
      provider: effectiveProvider,
      taskId,
      attempt: 0,
      totalPolls,
      elapsedSeconds: 0,
      estimatedRemainingSeconds: Math.ceil(maxWaitMs / 1000),
      status: started?.status || 'processing',
    });

    for (let attempt = 0; attempt < totalPolls; attempt += 1) {
      await waitForStudioDelay(5000);

      const pollResult = await callStudio(effectiveFetchAction, {
        estabelecimentoId: params.estabelecimentoId,
        taskId,
      }, 60000);

      if (pollResult?.error) {
        throw new Error(humanizeProviderError(pollResult.error));
      }

      const elapsedSeconds = Math.round((Date.now() - startedAt) / 1000);
      const remainingSeconds = Math.max(0, Math.ceil(maxWaitMs / 1000) - elapsedSeconds);
      const status = pollResult?.status || (pollResult?.done ? 'completed' : 'processing');
      onProgress?.({
        message: pollResult?.message || `Renderizando no ${effectiveProvider} — consulta ${attempt + 1}/${totalPolls}`,
        provider: pollResult?.provider || started?.provider || effectiveProvider,
        taskId,
        attempt: attempt + 1,
        totalPolls,
        elapsedSeconds,
        estimatedRemainingSeconds: remainingSeconds,
        status,
        stalled: attempt + 1 >= 24 && !pollResult?.done,
      });

      if (pollResult?.done && pollResult?.videoUrl) {
        onProgress?.({
          message: 'Vídeo pronto. Salvando arquivo...',
          provider: pollResult.provider || started?.provider || effectiveProvider,
          taskId,
          attempt: attempt + 1,
          totalPolls,
          elapsedSeconds,
          estimatedRemainingSeconds: 0,
          status: 'completed',
        });
        return {
          videoUrl: pollResult.videoUrl,
          thumbnailUrl: pollResult.thumbnailUrl || started?.thumbnailUrl,
          provider: pollResult.provider || started?.provider || effectiveProvider,
          providerVideoId: pollResult.providerVideoId || started?.providerVideoId,
        };
      }

      if (pollResult?.done) {
        throw new Error('📭 A geração terminou mas o vídeo final não chegou. Tente gerar novamente.');
      }
    }

    throw new Error('timeout:⏱️ A geração de vídeo passou de 10 minutos. Modelos image-to-video (Seedance, Kling) são mais lentos — tente um modelo mais rápido (Google Veo ou Luma Ray) ou rode novamente.');
  };

  const getExecutionOrder = (nodes: StudioNode[], edges: StudioEdge[]): string[] => {
    const inDegree = new Map<string, number>();
    const adj = new Map<string, string[]>();

    nodes.forEach((n) => {
      inDegree.set(n.id, 0);
      adj.set(n.id, []);
    });

    edges.forEach((e) => {
      adj.get(e.source)?.push(e.target);
      inDegree.set(e.target, (inDegree.get(e.target) || 0) + 1);
    });

    const queue = nodes.filter((n) => (inDegree.get(n.id) || 0) === 0).map((n) => n.id);
    const order: string[] = [];

    while (queue.length > 0) {
      const id = queue.shift()!;
      order.push(id);
      for (const next of adj.get(id) || []) {
        const d = (inDegree.get(next) || 0) - 1;
        inDegree.set(next, d);
        if (d === 0) queue.push(next);
      }
    }

    return order;
  };

  const getInputResults = (nodeId: string, edges: StudioEdge[], results: Map<string, any>): any[] => {
    return edges
      .filter((e) => e.target === nodeId)
      .map((e) => results.get(e.source))
      .filter(Boolean);
  };

  const hasDownstreamRandomPick = (nodeId: string, edges: StudioEdge[], nodes: StudioNode[]): boolean => {
    return edges
      .filter(e => e.source === nodeId)
      .some(e => {
        const target = nodes.find(n => n.id === e.target);
        return target && (target.data as StudioNodeData).type === 'randomPick';
      });
  };

  const executeNode = async (
    node: StudioNode,
    inputs: any[],
    allEdges?: StudioEdge[],
    allNodes?: StudioNode[]
  ): Promise<any> => {
    const { type, config } = node.data;

    const textInputs = inputs
      .filter((i) => !i?._isSystemPrompt && !i?.imageUrls && !i?.imageUrl && !i?._isPlatformFormat && !i?._isVideoScript)
      .map((i) => (typeof i === 'string' ? i : i?.text || ''))
      .filter(Boolean);
    const combinedInput = textInputs.join('\n\n');

    // Detect platform format from inputs
    const formatInput = inputs.find((i) => i?._isPlatformFormat);
    const formatWidth = formatInput?._formatWidth;
    const formatHeight = formatInput?._formatHeight;
    const formatAspectRatio = formatInput?._formatAspectRatio;
    const formatPlatform = formatInput?._formatPlatform;
    const formatContentType = formatInput?._formatContentType;

    const systemPrompts = inputs.filter((i) => i?._isSystemPrompt).map((i) => i.text);
    const systemPrompt = systemPrompts.length > 0 ? systemPrompts.join('\n') : undefined;

    // Collect TEXT LOCK directives from imageCaption nodes — these MUST be rendered exactly as provided
    const textLockDirective = inputs
      .filter((i) => i?._textLockDirective)
      .map((i) => i._textLockDirective)
      .join('\n');

    // Collect VIDEO SCRIPT directives (frame-by-frame storyboard) — MUST be followed scene by scene
    const videoScriptDirective = inputs
      .filter((i) => i?._videoScriptDirective)
      .map((i) => i._videoScriptDirective)
      .join('\n');

    // Collect all image URLs from inputs, bucketed by role for priority ordering
    const imageInputs: string[] = [];
    const referenceDescs: string[] = [];
    // Priority buckets: produto > influencer > logo > roupa > pose > ambiente > others
    const rolePriority: Record<string, number> = {
      produto: 0, influencer: 1, logo: 2, roupa: 3, pose: 4,
      estilo: 5, paleta: 6, textura: 7, ambiente: 8, salvas: 9,
    };
    const bucketedImages: { role: string; urls: string[] }[] = [];
    const productImageUrls: string[] = [];
    inputs.forEach((i) => {
      const urls: string[] = [];
      if (i?.imageUrls && Array.isArray(i.imageUrls)) {
        urls.push(...i.imageUrls);
      } else if (i?.imageUrl) {
        urls.push(i.imageUrl);
      }
      const role = i?._referenceRole || '__none__';
      if (role === 'produto') productImageUrls.push(...urls);
      if (urls.length > 0) {
        bucketedImages.push({ role, urls });
      }
      imageInputs.push(...urls);
      if (i?._referenceDesc) {
        referenceDescs.push(i._referenceDesc);
      }
    });
    // Sort by priority: produto first, then influencer, logo, roupa, pose, ambiente, others last
    bucketedImages.sort((a, b) => {
      const pa = rolePriority[a.role] ?? 99;
      const pb = rolePriority[b.role] ?? 99;
      return pa - pb;
    });
    const orderedImageInputs = bucketedImages.flatMap((b) => b.urls);
    // Build role labels for each image in order (passed to edge function)
    const roleLabelsMap: Record<string, string> = {
      logo: 'LOGO - DO NOT MODIFY', produto: 'PRODUCT - DO NOT MODIFY',
      influencer: 'PERSON/INFLUENCER - DO NOT MODIFY', roupa: 'CLOTHING - DO NOT MODIFY',
      pose: 'POSE REFERENCE (flexible)', estilo: 'STYLE REFERENCE (flexible)',
      paleta: 'COLOR PALETTE (flexible)', textura: 'TEXTURE (flexible)',
      ambiente: 'ENVIRONMENT/BACKGROUND (flexible, use for scenery only)',
      salvas: 'SAVED IMAGE REFERENCE (flexible)',
      __none__: 'GENERAL REFERENCE',
    };
    const orderedImageRoles = bucketedImages.flatMap((b) => b.urls.map(() => roleLabelsMap[b.role] || 'REFERENCE'));

    switch (type) {
      case 'textInput':
        return config.text || '';

      case 'systemPrompt':
        return { _isSystemPrompt: true, text: config.systemPrompt || '' };

      case 'imageInput': {
        // Return all images as an array of imageUrl objects, with optional reference role
        const role = config.referenceRole;
        const roleDescMap: Record<string, string> = {
          influencer: '[PESSOA/INFLUENCER - NÃO ALTERAR] Você DEVE reproduzir esta pessoa EXATAMENTE como aparece: mesmo rosto, tom de pele, cabelo, traços faciais e aparência geral.',
          logo: '[LOGO - NÃO ALTERAR] Reproduza este logo/marca EXATAMENTE como aparece, sem modificar cores, tipografia ou elementos gráficos.',
          produto: '[PRODUTO - PROIBIDO MODIFICAR] Mantenha este produto EXATAMENTE como aparece na imagem de referência. NÃO altere cores, formato, rótulo, logotipo, tipografia, embalagem ou proporções. NÃO invente elementos novos, NÃO redesenhe, NÃO substitua. O produto na referência é REAL e deve ser reproduzido como uma fotografia fiel.',
          ambiente: '[AMBIENTE - REFERÊNCIA FLEXÍVEL] Use como inspiração para o cenário/fundo.',
          estilo: 'Use como referência de estilo visual.',
          paleta: 'Use como referência de paleta de cores.',
          textura: 'Use como referência de textura/material.',
          pose: 'Use como referência de pose corporal.',
          roupa: '[ROUPA - NÃO ALTERAR] Mantenha a roupa EXATAMENTE como aparece na referência.',
        };
        const images = config.images || [];
        if (images.length === 0 && !role) {
          return { imageUrls: [], imageUrl: undefined };
        }
        if (images.length === 0 && role) {
          // Optional reference block with no image — skip silently
          return null;
        }
        return {
          imageUrls: images,
          imageUrl: images[0],
          ...(role ? { _referenceRole: role, _referenceDesc: roleDescMap[role] || 'Use esta imagem como referência visual.' } : {}),
        };
      }

      case 'multiImageRef': {
        // Same logic as imageInput — return all images with optional reference role
        const role = config.referenceRole;
        const roleDescMap: Record<string, string> = {
          influencer: '[PESSOA/INFLUENCER - NÃO ALTERAR] Você DEVE reproduzir esta pessoa EXATAMENTE como aparece.',
          logo: '[LOGO - NÃO ALTERAR] Reproduza este logo/marca EXATAMENTE como aparece.',
          produto: '[PRODUTO - PROIBIDO MODIFICAR] Mantenha este produto EXATAMENTE como aparece na referência.',
          ambiente: '[AMBIENTE - REFERÊNCIA FLEXÍVEL] Use como inspiração para o cenário/fundo.',
          estilo: 'Use como referência de estilo visual.',
          paleta: 'Use como referência de paleta de cores.',
          textura: 'Use como referência de textura/material.',
          pose: 'Use como referência de pose corporal.',
          roupa: '[ROUPA - NÃO ALTERAR] Mantenha a roupa EXATAMENTE como aparece na referência.',
        };
        const mImages = config.images || [];
        if (mImages.length === 0) {
          return role ? null : { imageUrls: [], imageUrl: undefined };
        }
        return {
          imageUrls: mImages,
          imageUrl: mImages[0],
          ...(role ? { _referenceRole: role, _referenceDesc: roleDescMap[role] || 'Use estas imagens como referência visual.' } : {}),
        };
      }

      case 'videoInput': {
        const videos = config.videos || [];
        if (videos.length === 0) return null;
        return {
          videoUrl: videos[0],
          videoUrls: videos,
          _isVideo: true,
        };
      }

      case 'multiVideoRef': {
        const mVideos = config.videos || [];
        if (mVideos.length === 0) return null;
        return {
          videoUrl: mVideos[0],
          videoUrls: mVideos,
          _isVideo: true,
        };
      }

      case 'productImageSelect':
        // Return the selected product image as reference with role context
        if (config.selectedImageUrl) {
          return { 
            imageUrls: [config.selectedImageUrl], 
            imageUrl: config.selectedImageUrl,
            _referenceRole: 'produto',
            _referenceDesc: `[PRODUTO - PROIBIDO MODIFICAR] Este é o produto "${config.productName || 'selecionado'}". Você DEVE manter este produto EXATAMENTE como aparece na imagem de referência: mesmas cores, formato, detalhes, logotipo, tipografia e proporções. NÃO modifique, substitua, redesenhe ou reimagine o produto de forma alguma. NÃO invente elementos novos que não existem na foto original. Trate a imagem do produto como uma FOTOGRAFIA REAL que deve ser inserida na cena sem alterações.`,
          };
        }
        // If downstream has randomPick, skip validation - randomPick will load its own images
        if (allEdges && allNodes && hasDownstreamRandomPick(node.id, allEdges, allNodes)) {
          return { _referenceRole: 'produto', _referenceDesc: '[PRODUTO] Imagem aleatória da galeria de produtos.', _skipNoImage: true };
        }
        // Optional block — return null to skip silently
        return null;

      case 'galleryInfluencer':
      case 'galleryAmbiente':
      case 'galleryEstilo':
      case 'galleryPaleta':
      case 'galleryTextura':
      case 'galleryLogo':
      case 'galleryPose':
      case 'galleryRoupa':
      case 'gallerySalvas': {
        if (config.selectedImageUrl) {
          const roleMap: Record<string, string> = {
            galleryInfluencer: '[PESSOA/INFLUENCER - NÃO ALTERAR] Você DEVE reproduzir esta pessoa EXATAMENTE como aparece: mesmo rosto, tom de pele, cabelo, traços faciais e aparência geral. NÃO mude a identidade, etnia, cor de cabelo ou características faciais desta pessoa de forma alguma.',
            galleryAmbiente: '[AMBIENTE - REFERÊNCIA FLEXÍVEL] Use este cenário/ambiente como inspiração para o fundo e ambientação. Você pode ser criativo e adaptar o ambiente livremente, mantendo apenas a essência geral (interno/externo, clima, iluminação).',
            galleryEstilo: 'Use este estilo visual como referência artística para a imagem gerada (cores, mood, estética).',
            galleryPaleta: 'Use esta paleta de cores como referência para as cores dominantes na imagem.',
            galleryTextura: 'Use esta textura/material como referência para os materiais e superfícies na imagem.',
            galleryLogo: '[LOGO - NÃO ALTERAR] Reproduza este logo/marca EXATAMENTE como aparece, sem modificar cores, tipografia ou elementos gráficos.',
            galleryPose: 'Use esta pose/composição corporal como referência para a posição da pessoa na imagem.',
            galleryRoupa: '[ROUPA - NÃO ALTERAR] Você DEVE manter esta roupa/vestuário EXATAMENTE como aparece na referência: mesma cor, padrão, estampa, corte e estilo. NÃO substitua, modifique ou reimagine a peça de roupa.',
            gallerySalvas: 'Use esta imagem salva como referência visual para a geração.',
          };
          return { 
            imageUrls: [config.selectedImageUrl], 
            imageUrl: config.selectedImageUrl,
            _referenceRole: type.replace('gallery', '').toLowerCase(),
            _referenceDesc: roleMap[type] || 'Use esta imagem como referência visual.',
          };
        }
        // If downstream has randomPick, skip validation - randomPick will load its own images
        if (allEdges && allNodes && hasDownstreamRandomPick(node.id, allEdges, allNodes)) {
          const skipRoleMap: Record<string, string> = {
            galleryInfluencer: '[PESSOA/INFLUENCER - NÃO ALTERAR] Reproduza a pessoa EXATAMENTE como aparece.',
            galleryAmbiente: '[AMBIENTE - REFERÊNCIA FLEXÍVEL] Use como inspiração para o cenário.',
            galleryEstilo: 'Use como referência de estilo visual.',
            galleryPaleta: 'Use como referência de paleta de cores.',
            galleryTextura: 'Use como referência de textura.',
            galleryLogo: '[LOGO - NÃO ALTERAR] Reproduza o logo EXATAMENTE.',
            galleryPose: 'Use como referência de pose.',
            galleryRoupa: '[ROUPA - NÃO ALTERAR] Mantenha a roupa EXATAMENTE como aparece.',
            gallerySalvas: 'Use como referência visual.',
          };
          const role = type.replace('gallery', '').toLowerCase();
          return { _referenceRole: role, _referenceDesc: skipRoleMap[type] || 'Referência visual.', _skipNoImage: true };
        }
        // Optional block — return null to skip silently
        return null;
      }

      case 'mediaGallery': {
        if (config.selectedUrl) {
          const isVideo = config.mediaType === 'video';
          if (isVideo) {
            return { videoUrl: config.selectedUrl };
          }
          return { 
            imageUrls: [config.selectedUrl], 
            imageUrl: config.selectedUrl,
            _referenceDesc: 'Use esta mídia da galeria como referência.',
          };
        }
        return null;
      }

      case 'textStyle':
        return {
          text: config.text || '',
          textStyle: {
            fontFamily: config.fontFamily || 'Arial',
            fontSize: config.fontSize || 48,
            fontWeight: config.fontWeight || 'bold',
            color: config.color || '#ffffff',
            bgColor: config.bgColor || '',
            align: config.align || 'center',
            shadow: config.shadow ?? true,
            outline: config.outline ?? true,
          },
        };

      case 'textContent':
        return {
          text: [config.title, config.subtitle, config.body].filter(Boolean).join('\n'),
          _referenceDesc: `[TEXTO - NÃO ALTERAR] O conteúdo de texto deve ser mantido EXATAMENTE como fornecido: título="${config.title || ''}", subtítulo="${config.subtitle || ''}", corpo="${config.body || ''}". NÃO modifique, traduza ou reformule o texto.`,
          textContent: {
            title: config.title || '',
            subtitle: config.subtitle || '',
            body: config.body || '',
            templateId: config.templateId || 'heading-bold',
            titleFont: config.titleFont || 'Montserrat',
            titleSize: config.titleSize || 72,
            titleWeight: config.titleWeight || 'bold',
            titleColor: config.titleColor || '#000000',
            subtitleFont: config.subtitleFont || 'Montserrat',
            subtitleSize: config.subtitleSize || 42,
            subtitleWeight: config.subtitleWeight || '600',
            subtitleColor: config.subtitleColor || '#4A4A4A',
            bodyFont: config.bodyFont || 'Inter',
            bodySize: config.bodySize || 24,
            bodyWeight: config.bodyWeight || 'normal',
            bodyColor: config.bodyColor || '#666666',
            textAlign: config.textAlign || 'center',
          },
        };

      case 'imageCaption': {
        const capTitle = (config.title || '').trim();
        const capSubtitle = (config.subtitle || '').trim();
        const parts = [capTitle && `"${capTitle}"`, capSubtitle && `"${capSubtitle}"`].filter(Boolean).join(' | ');
        const lockText = `\n\n[TEXT LOCK — TEXTO OBRIGATÓRIO NA IMAGEM]\nA imagem/vídeo gerada DEVE conter EXATAMENTE estes textos literais, sem alterar uma única letra, sem traduzir, sem reformular, sem adicionar texto extra:\n${capTitle ? `• Texto principal (maior destaque visual): "${capTitle}"` : ''}\n${capSubtitle ? `• Texto secundário (menor destaque, abaixo do principal): "${capSubtitle}"` : ''}\n\n⚠️ PROIBIDO ABSOLUTO: NÃO renderize as palavras "Título", "Subtítulo", "Title", "Subtitle" nem qualquer rótulo/label/prefixo na imagem. Renderize APENAS o conteúdo entre aspas acima, sem rótulos descritivos antes deles. Proibido inventar palavras, abreviar, trocar acentos ou criar variações. Português (Brasil) correto. NÃO renderize nenhum outro texto além do conteúdo literal entre aspas.\n\n🎨 [ESTILO TIPOGRÁFICO — IDENTIDADE VISUAL] Se houver IDENTIDADE VISUAL ativa nesta geração, o texto principal e o texto secundário DEVEM seguir RIGOROSAMENTE o sistema tipográfico, pesos, tracking, leading, hierarquia, cores, contornos, sombras de texto, traços/rabiscos à mão, sublinhados, destaques e tratamentos gráficos definidos nas referências da identidade visual. Use EXATAMENTE as mesmas famílias tipográficas, estilo (serifa/sans/script/display/hand-drawn) e tratamento visual observados nas referências da identidade. Se a identidade usa texto rabiscado à mão, escreva à mão; se usa display bold, use display bold; se tem contorno/outline, aplique contorno. NÃO invente estilo próprio quando houver identidade visual ativa.`;
        return {
          text: parts,
          _isImageCaption: true,
          _textLockDirective: lockText,
          _referenceDesc: lockText,
          imageCaption: { title: capTitle, subtitle: capSubtitle },
        };
      }

      case 'reelScript':
      case 'videoScript': {
        const rawScenes: any[] = Array.isArray(config.scenes) ? config.scenes : [];
        const cleanScenes = rawScenes
          .map((s, i) => ({
            n: i + 1,
            description: (s?.description || '').trim(),
            duration: Number(s?.duration) || 0,
            narration: (s?.narration || '').trim(),
            cameraMovement: (s?.cameraMovement || '').trim(),
            soundtrack: (s?.soundtrack || '').trim(),
            soundtrackIntensity: (s?.soundtrackIntensity || '').trim(),
            sfx: Array.isArray(s?.sfx) ? s.sfx : (s?.sfx ? [String(s.sfx)] : []),
            ambientSound: (s?.ambientSound || '').trim(),
            voiceTone: (s?.voiceTone || '').trim(),
          }))
          .filter((s) => s.description || s.narration);
        const globalNotes = (config.globalNotes || '').trim();
        if (cleanScenes.length === 0 && !globalNotes) {
          return { text: '', _isVideoScript: true, _videoScriptDirective: '' };
        }
        const totalDuration = cleanScenes.reduce((a, s) => a + (s.duration || 0), 0);
        const sceneLines = cleanScenes
          .map((s) => {
            const parts = [`CENA ${s.n}${s.duration ? ` (${s.duration}s)` : ''}: ${s.description}`];
            if (s.cameraMovement) parts.push(`  • Câmera: ${s.cameraMovement}`);
            if (s.narration) parts.push(`  • Narração: ${s.narration}`);
            if (s.voiceTone) parts.push(`  • Tom de voz: ${s.voiceTone}`);
            if (s.soundtrack) parts.push(`  • Trilha: ${s.soundtrack}${s.soundtrackIntensity ? ` (intensidade ${s.soundtrackIntensity})` : ''}`);
            if (s.ambientSound) parts.push(`  • Ambiente sonoro: ${s.ambientSound}`);
            if (s.sfx && s.sfx.length) parts.push(`  • SFX: ${s.sfx.join(', ')}`);
            return parts.join('\n');
          })
          .join('\n');
        const directive = [
          `\n\n[ROTEIRO DO VÍDEO — QUADRO A QUADRO — OBRIGATÓRIO SEGUIR]`,
          `Você DEVE gerar o vídeo seguindo EXATAMENTE este roteiro cena por cena, na ordem indicada, respeitando descrições visuais, câmera, narração, trilha, SFX, ambiente sonoro e durações.`,
          globalNotes ? `\nObservações gerais: ${globalNotes}` : '',
          `\n${sceneLines}`,
          totalDuration > 0 ? `\nDuração total alvo: ~${totalDuration}s.` : '',
          `\n🎵 ÁUDIO: aplique a trilha, SFX e ambiente sonoro descritos em cada cena. Mantenha coerência sonora ao longo do vídeo. Locução em PT-BR natural com o tom indicado.`,
          `\n⚠️ Não invente cenas extras, não troque a ordem das cenas, não pule cenas. Cada cena deve aparecer no vídeo final.`,
          `Se a duração configurada do bloco de vídeo for menor que a soma das cenas, comprima proporcionalmente mantendo a ordem.`,
        ].filter(Boolean).join('\n');
        const summaryText = `🎞️ Roteiro: ${cleanScenes.length} cena(s)${totalDuration ? ` ~${totalDuration}s` : ''}`;
        return {
          text: summaryText,
          _isVideoScript: true,
          _videoScriptDirective: directive,
          _referenceDesc: directive,
          videoScript: { scenes: cleanScenes, globalNotes, totalDuration },
        };
      }


      case 'platformFormat': {
        const platformNames: Record<string, string> = {
          instagram: 'Instagram', facebook: 'Facebook', whatsapp: 'WhatsApp', telegram: 'Telegram', custom: 'Personalizado',
        };
        const w = config.width || 1080;
        const h = config.height || 1080;
        const platformLabel = platformNames[config.platform] || config.platform;
        const contentType = config.contentType || 'post';
        const aspectRatio = w > h ? `${Math.round(w/h * 100)/100}:1` : w < h ? `1:${Math.round(h/w * 100)/100}` : '1:1';
        return {
          _isPlatformFormat: true,
          _formatWidth: w,
          _formatHeight: h,
          _formatPlatform: config.platform,
          _formatContentType: contentType,
          _formatAspectRatio: aspectRatio,
          text: `📐 ${platformLabel} - ${contentType} (${w}×${h}px, ${aspectRatio})`,
        };
      }

      case 'llmProcess': {
        const llmEstabId = localStorage.getItem('estabelecimentoId') || '';
        const llmDefaults = getStudioDefaults(llmEstabId);
        const llmLangSuffix = getLanguagePromptSuffix(llmDefaults.defaultLanguage || 'pt-BR');
        const langSystemPrompt = systemPrompt 
          ? `${systemPrompt}\n\nIMPORTANT: Always respond ${llmLangSuffix}.`
          : `Always respond ${llmLangSuffix}.`;
        const result = await callStudio('generate_text', {
          prompt: combinedInput,
          systemPrompt: langSystemPrompt,
          model: config.model,
        });
        return { text: result };
      }

      case 'mediaCorrection': {
        // Gather media from input nodes (image or video)
        const correctionPrompt = config.correctionPrompt || '';
        if (!correctionPrompt.trim()) {
          throw new Error('Escreva a instrução de correção no bloco antes de executar.');
        }

        // Find the source media from inputs
        const sourceImageUrl = orderedImageInputs[0] || imageInputs[0];
        const sourceVideoInput = inputs.find(i => i?.videoUrl || i?._isVideo);
        const sourceVideoUrl = sourceVideoInput?.videoUrl;
        const sourceProvider = sourceVideoInput?._provider;
        const sourceProviderVideoId = sourceVideoInput?._providerVideoId;
        const sourceMedia = sourceVideoUrl || sourceImageUrl;

        if (!sourceMedia) {
          throw new Error('Conecte um bloco de Gerar Imagem ou Gerar Vídeo antes deste bloco de correção.');
        }

        // Build enriched correction context to pass forward
        const isVideo = !!sourceVideoUrl;
        const correctionText = [
          `[CORREÇÃO SOLICITADA]`,
          `Corrija/refine a ${isVideo ? 'cena do vídeo' : 'imagem'} anterior com as seguintes instruções:`,
          correctionPrompt,
          ``,
          `A ${isVideo ? 'cena' : 'imagem'} original deve ser mantida como base, aplicando APENAS as correções solicitadas acima.`,
          `Mantenha todos os outros elementos que não foram mencionados na correção exatamente como estão.`,
        ].join('\n');

        return {
          text: correctionText,
          ...(sourceImageUrl ? { imageUrl: sourceImageUrl, imageUrls: [sourceImageUrl] } : {}),
          ...(sourceVideoUrl ? { videoUrl: sourceVideoUrl, _isVideo: true } : {}),
          ...(sourceProvider ? { _provider: sourceProvider } : {}),
          ...(sourceProviderVideoId ? { _providerVideoId: sourceProviderVideoId } : {}),
          _isCorrection: true,
          _correctionPrompt: correctionPrompt,
        };
      }

      case 'imageGen': {
        // Validate multi-ref compatibility for image models
        const hasProductImg = inputs.some((i) => i?._referenceRole === 'produto');
        const hasInfluencerImg = inputs.some((i) => i?._referenceRole === 'influencer');
        const selectedImageModel = config.model || 'google/gemini-2.5-flash-image';
        
        const multiRefImageModels = [
          'google/gemini-2.5-flash-image', 'google/gemini-3-pro-image-preview',
          'openai/dall-e-4', 'apiframe/gpt-image',
        ];
        
        if (hasProductImg && hasInfluencerImg && !multiRefImageModels.includes(selectedImageModel)) {
          throw new Error(
            '⚠️ O modelo de imagem selecionado não suporta múltiplas referências visuais (produto + influencer). ' +
            'Modelos como Stable Diffusion, Flux e Midjourney geram apenas a partir de texto e não conseguem compor duas imagens de referência. ' +
            'Use Gemini Flash Image, Gemini 3 Pro Image, DALL·E 4 ou AF: GPT Image que aceitam múltiplas referências, ou conecte apenas uma (produto OU influencer).'
          );
        }

        // Check if this is a correction/refinement pass
        const isCorrectionImage = inputs.some(i => i?._isCorrection);
        const correctionInputImage = inputs.find(i => i?._isCorrection);
        const correctionOnlyPromptImage = correctionInputImage?._correctionPrompt || '';
        const correctionSourceImage = correctionInputImage?.imageUrl;

        // Get configured language for image generation
        const imgEstabId = localStorage.getItem('estabelecimentoId') || '';
        const imgDefaults = getStudioDefaults(imgEstabId);
        const imgLangSuffix = getLanguagePromptSuffix(imgDefaults.defaultLanguage || 'pt-BR');

        // Auto-detect product + influencer without explicit placement prompt → default to holding
        const hasProduct = inputs.some((i) => i?._referenceRole === 'produto');
        const hasInfluencer = inputs.some((i) => i?._referenceRole === 'influencer');
        const promptLower = (combinedInput || '').toLowerCase();
        const hasPlacementHint = /mesa|chão|prateleira|vitrine|cenário|cena|fundo|background|scene|table|shelf|display|flat\s*lay/i.test(promptLower);
        
        let enrichedPrompt = combinedInput || 'Uma cena bonita';

        // Check if Visual Identity is active — if so, skip imageStyle (VI takes precedence)
        const viCheck = await getActiveVisualIdentity(imgEstabId);
        console.log('[Studio][VI] imageGen ativa?', !!(viCheck && (viCheck.images.length>0 || viCheck.prompt)), { images: viCheck?.images?.length || 0, hasPrompt: !!viCheck?.prompt, preferredModel: viCheck?.preferredModel });
        const viIsActive = !!(viCheck && (viCheck.images.length > 0 || viCheck.prompt));
        // If VI has a preferred model, override the block's model
        const viModelOverride = viIsActive && viCheck?.preferredModel ? viCheck.preferredModel : null;

        // Inject imageStyle into the prompt (only when VI is NOT active)
        const imageStyleValue = config.imageStyle || 'natural';
        if (!viIsActive && imageStyleValue && imageStyleValue !== 'natural') {
          const imageStyleMap: Record<string, string> = {
            'vivid': 'Vivid, highly saturated colors with bold contrast.',
            'anime': 'Anime / Manga art style with cel-shading and stylized features.',
            'digital-art': 'Digital art illustration, clean lines, vibrant digital painting.',
            'oil-painting': 'Oil painting style with visible brush strokes and rich textures.',
            'watercolor': 'Delicate watercolor painting style with soft washes and organic blending.',
            'pixel-art': 'Pixel art / retro 8-bit style with visible pixels and limited palette.',
            '3d-render': '3D rendered scene with realistic materials, lighting and depth of field.',
            'cinematic': 'Cinematic look with dramatic lighting, film grain, and anamorphic lens flare.',
            'comic': 'Comic book / graphic novel style with bold outlines and halftone shading.',
            'minimalist': 'Minimalist style with clean composition, few elements, ample negative space.',
            'sketch': 'Hand-drawn sketch style with pencil or charcoal strokes.',
            'fantasy': 'Fantasy art style with magical, ethereal atmosphere and otherworldly elements.',
            'isometric': 'Isometric perspective with clean geometric shapes and balanced composition.',
            'neon': 'Neon / Cyberpunk aesthetic with glowing lights, dark backgrounds, and futuristic vibes.',
          };
          const styleDesc = imageStyleMap[imageStyleValue] || '';
          if (styleDesc) {
            enrichedPrompt = `[VISUAL STYLE] ${styleDesc}\n\n${enrichedPrompt}`;
          }
        }

        // If correction mode, override prompt to be edit-only
        if (isCorrectionImage && correctionSourceImage) {
          enrichedPrompt = [
            `🔒 MODO CORREÇÃO — EDIÇÃO MÍNIMA OBRIGATÓRIA`,
            ``,
            `A imagem fornecida é a BASE ORIGINAL. Você DEVE manter esta imagem EXATAMENTE como está, alterando SOMENTE o que foi solicitado abaixo.`,
            ``,
            `✏️ CORREÇÃO SOLICITADA:`,
            correctionOnlyPromptImage,
            ``,
            `⚠️ REGRAS ABSOLUTAS:`,
            `- NÃO regenere a imagem do zero. EDITE a imagem existente.`,
            `- NÃO mude composição, enquadramento, iluminação, cores ou elementos que NÃO foram mencionados na correção.`,
            `- NÃO mude rostos, produtos, logos ou qualquer elemento que NÃO foi explicitamente solicitado para correção.`,
            `- A imagem resultante deve ser IDÊNTICA à original, exceto pela correção aplicada.`,
            `- Se a correção pedir "mudar cor do fundo", SOMENTE o fundo muda. Todo o resto permanece pixel a pixel.`,
          ].join('\n');
          // Force the source image as input for editing
          if (!imageInputs.includes(correctionSourceImage)) {
            imageInputs.unshift(correctionSourceImage);
            orderedImageInputs.unshift(correctionSourceImage);
          }
        }
        // Inject platform format dimensions into prompt (from connected platformFormat node)
        if (formatWidth && formatHeight) {
          enrichedPrompt = `${enrichedPrompt}\n\n[FORMAT] Generate this image optimized for ${formatPlatform || 'social media'} ${formatContentType || 'post'}, aspect ratio ${formatAspectRatio || '1:1'} (${formatWidth}x${formatHeight}px). Compose the image to fit this exact aspect ratio perfectly.`;
        }
        // Inject imageSize from node config (platform preset or manual selection)
        const cfgImageSize = config.imageSize;
        const imgPresetKey = config.imagePlatformPreset || '';
        if (cfgImageSize && !formatWidth) {
          const [iw, ih] = cfgImageSize.split('x').map(Number);
          if (iw && ih) {
            const isGrid = imgPresetKey.startsWith('ig-grid-');
            const isCarousel = imgPresetKey.startsWith('ig-carousel-');
            const carouselMode = config.carouselMode || 'panoramic';
            const panoramicStyle = config.panoramicStyle || 'classic';
            let formatNote = `${iw}x${ih}px`;

            const buildPanoramicNote = (type: string, dims: string, cellDesc: string, cellCount: number) => {
              if (panoramicStyle === 'collage') {
                return `${type} (${dims}). Create ONE image at ${iw}x${ih}px styled as a PREMIUM MOODBOARD / COLLAGE. Place ${cellCount} overlapping photographs with subtle rotations (-5° to +5°), soft drop shadows, and torn/rounded edges on a warm neutral background (beige, cream, soft gray). Include decorative elements like dried flowers, film strips, or tape. Each photo within the collage must be a unique, beautiful composition. The overall arrangement must feel organic, artistic, and curated — like a designer scrapbook spread. When sliced into ${cellCount} equal parts, each segment should still look visually balanced and interesting.`;
              } else if (panoramicStyle === 'editorial') {
                return `${type} (${dims}). Create ONE image at ${iw}x${ih}px in a BOLD EDITORIAL / FASHION MAGAZINE layout. Use strong geometric blocks of color, bold typography overlays (fashion words like "STYLE", "VOGUE", "BOLD", brand-related text), high-contrast color palette (black, white, and 1-2 accent colors like yellow, red, or electric blue). Mix photographs with graphic design elements — color blocks, lines, dots, diagonal dividers. Each ${cellDesc} section should feel like a magazine spread page. The overall composition must be visually striking, modern, and high-fashion. Include percentage badges, social media icons, or promotional text naturally integrated.`;
              } else if (panoramicStyle === 'overlay') {
                return `${type} (${dims}). Create ONE image at ${iw}x${ih}px as a CONTINUOUS PANORAMIC PHOTOGRAPH with OVERLAID SMALLER PHOTOS on top. The base layer is one flowing wide-angle scenic/lifestyle photograph spanning the entire canvas. On top of this panorama, place ${cellCount} smaller polaroid-style or rounded-frame photographs at varying sizes and slight rotations, creating depth and visual interest. These overlay photos should show close-up details, portraits, or alternate angles related to the main scene. The composition should feel like a photographer's contact sheet merged with their hero shot. When sliced into ${cellCount} parts, each segment reveals both the panoramic base and unique overlay photos.`;
              }
              // classic (default)
              return `${type} (${dims}). Create ONE SINGLE CONTINUOUS panoramic image where EACH ${cellDesc} is a COMPLETE, INDEPENDENTLY BEAUTIFUL composition. Every section must work as a standalone stunning image with proper framing, subject placement and visual balance. At the same time, when ALL parts are viewed together as one unified image, they must form a cohesive panoramic scene with flowing colors, lighting and atmosphere. Think of it like a mosaic — each piece is art on its own, but together they reveal a grander picture. DO NOT create separate panels or borders. The transition between sections must be seamless.`;
            };

            if (isGrid) {
              const match = imgPresetKey.match(/ig-grid-(\d+)x(\d+)/);
              const gc = match ? match[1] : '3';
              const gr = match ? match[2] : '1';
              const cellCount = parseInt(gc) * parseInt(gr);
              if (carouselMode === 'independent') {
                formatNote = `Instagram Grid ${gc}×${gr} (${iw}x${ih}px total, ${cellCount} posts). Create ONE image at ${iw}x${ih}px where EACH CELL is a COMPLETELY INDEPENDENT, SELF-CONTAINED photograph — as if each was shot separately as its own professional photo session. Each cell must have its OWN unique background, lighting, composition, and visual story. They should look like ${cellCount} individual premium photos placed side by side. HOWEVER, maintain a consistent color palette, mood, and visual theme across all cells so that when viewed together as a grid, they form a harmonious, aesthetically pleasing collection (like a curated Instagram profile). NO shared backgrounds flowing between cells. Each cell is its own world.`;
              } else {
                formatNote = buildPanoramicNote(`Instagram Grid ${gc}×${gr}`, `${iw}x${ih}px total, ${cellCount} posts`, 'CELL', cellCount);
              }
            } else if (isCarousel) {
              const match = imgPresetKey.match(/ig-carousel-(\d+)/);
              const slides = match ? parseInt(match[1]) : 2;
              const slideW = Math.round(iw / slides);
              if (carouselMode === 'independent') {
                formatNote = `Instagram Carousel ${slides} slides (${iw}x${ih}px total, each slide ${slideW}x${ih}px). Create ONE image at ${iw}x${ih}px where EACH ${slideW}x${ih}px vertical slice is a COMPLETELY INDEPENDENT, SELF-CONTAINED photograph — as if each slide was its own separate professional photo shoot. Each slide must have its OWN unique scene, background, composition and visual focus. They should look like ${slides} individual premium photos placed side by side. HOWEVER, maintain a consistent color palette, mood, artistic style and visual theme so that when swiped through as a carousel, they feel like a curated photo series telling a cohesive story. NO shared backgrounds flowing between slides. Each slide is its own world.`;
              } else {
                formatNote = buildPanoramicNote(`Instagram Carousel ${slides} slides`, `${iw}x${ih}px total, each slide ${slideW}x${ih}px`, 'SLIDE', slides);
              }
            }
            enrichedPrompt = `[CRITICAL FORMAT REQUIREMENT] Generate EXACTLY ONE image at ${iw}x${ih} pixels. ${formatNote}. Fill the ENTIRE canvas — no letterboxing, no black bars, no padding.\n\n${enrichedPrompt}`;
          }
        }
        // 🔒 ABSOLUTE PRODUCT LOCK — applies whenever a product image is connected,
        // regardless of influencer presence. Product packaging graphics are INVIOLABLE.
        if (hasProduct) {
          enrichedPrompt = [
            `🔒 BLOQUEIO ABSOLUTO DO PRODUTO (PRIORIDADE MÁXIMA — NÃO NEGOCIÁVEL):`,
            `   - A imagem de PRODUTO conectada é a referência REAL. Trate-a como FOTOGRAFIA do produto físico.`,
            `   - A EMBALAGEM é SAGRADA e INTOCÁVEL: o produto final deve ter o MESMO design gráfico da referência, com as mesmas cores, rótulo, tipografia, logotipo, formato, proporções, material, tampa, selo, textos e elementos visuais.`,
            `   - NÃO cole a foto original como uma sobreposição plana. Também NÃO crie uma embalagem nova “parecida”. Transfira fielmente a aparência real da embalagem de referência para o produto fotografado na cena.`,
            `   - A IA pode ajustar SOMENTE perspectiva, escala, sombra e iluminação para encaixar o produto na cena; esses ajustes não podem trocar, redesenhar, simplificar ou reinterpretar nenhuma arte/texto/cor da embalagem.`,
            `   - NÃO redesenhe, NÃO estilize, NÃO simplifique, NÃO reimagine, NÃO substitua o produto.`,
            `   - NÃO adicione nem remova textos, selos, rótulos, marcas ou elementos que não existam na referência.`,
            `   - NÃO altere cor, brilho, acabamento, formato ou proporções da embalagem.`,
            `   - Se a referência tiver marcações/anotações vermelhas, círculos, setas, rabiscos, destaques, áreas pintadas, tarjas ou qualquer indicação visual de correção, IGNORE totalmente: isso NÃO faz parte do produto nem da cena e NUNCA deve aparecer no resultado final.`,
            `   - NÃO deixe mão, dedo, roupa, sombra, reflexo, estilo visual, identidade visual ou preset deformar, cobrir, reescrever ou reinterpretar o rótulo/embalagem.`,
            `   - Interação com pessoa é SECUNDÁRIA: se segurar exigir mudar a embalagem, deixe o produto em contato físico com a pessoa (mão aberta/lateral/base) ou apoiado diretamente sobre uma superfície REAL JÁ EXISTENTE e visível do próprio cenário, com textura/cor do ambiente, sem criar nenhum suporte novo.`,
            `   - 🚫 PROIBIDO ABSOLUTAMENTE: NÃO insira o produto dentro de QUADRADO, CAIXA, CARD, MOLDURA, ADESIVO, STICKER, FUNDO BRANCO/COLORIDO ARTIFICIAL, FAIXA, BARRA, TARJA, RÓTULO EXTRA, PLACA ou RETÂNGULO ARREDONDADO sobreposto à cena. NÃO crie suporte novo, pedestal, bancada branca, base branca, mesa falsa ou área limpa artificial atrás/embaixo do produto. NÃO recorte e cole o produto como figurinha. IGNORE o fundo branco da foto de referência — extraia APENAS o produto e integre-o organicamente ao cenário com perspectiva, escala, sombra e iluminação coerentes com o resto da imagem.`,
            `   - Se houver conflito entre o prompt e a fidelidade do produto, a FIDELIDADE DO PRODUTO VENCE SEMPRE.`,
            `   - É preferível mostrar o produto MENOR ou em outro ângulo natural da cena, do que modificá-lo ou colá-lo como sticker.`,
            ``,
            enrichedPrompt,
          ].join('\n');
        }

        if (hasProduct && hasInfluencer && !hasPlacementHint) {
          enrichedPrompt = [
            `🎯 OBJETIVO PRINCIPAL DA IMAGEM: Criar uma foto publicitária profissional onde a pessoa/influencer apresenta o produto sem jamais alterar a embalagem.`,
            ``,
            `📦 PRIORIDADE #1 — PRODUTO (PROTAGONISTA ABSOLUTO):`,
            `   - O produto DEVE ocupar pelo menos 25-35% da área visual da imagem`,
            `   - Posicione o produto em PRIMEIRO PLANO ou no CENTRO da composição`,
            `   - O produto deve estar BEM ILUMINADO, NÍTIDO e com todos os detalhes visíveis (rótulo, logo, cores)`,
            `   - A embalagem é SAGRADA — copie-a EXATAMENTE como na referência, sem nenhuma alteração`,
            `   - O produto deve parecer um produto real fotografado na cena, NÃO uma imagem original colada por cima; porém o design gráfico da embalagem deve permanecer igual ao da referência`,
            `   - Se a IA não conseguir manter a embalagem em outro ângulo, mantenha o produto no mesmo ângulo frontal da referência e adapte a pessoa/cenário ao produto`,
            `   - O produto NUNCA deve ficar pequeno, desfocado, parcialmente oculto ou em segundo plano`,
            ``,
            `👤 PRIORIDADE #2 — INFLUENCER/PESSOA (APRESENTADOR DO PRODUTO):`,
            `   - Preferencialmente coloque o produto na mão aberta da pessoa ou apoiado diretamente em uma SUPERFÍCIE REAL JÁ EXISTENTE do cenário, com textura/cor coerente do ambiente e com a pessoa apresentando/tocando ao lado — NUNCA crie mesa, pedestal, base branca, quadrado, caixa, moldura ou faixa nova para encaixar o produto.`,
            `   - A pessoa só pode segurar o produto se a embalagem continuar 100% intacta, legível e fiel; na dúvida, NÃO segure`,
            `   - TIPOS DE INTERAÇÃO (escolha o mais adequado ao contexto):`,
            `     • APOIAR EM SUPERFÍCIE REAL DA CENA: produto intacto sobre uma superfície que já existe no ambiente, sem base branca ou suporte novo, pessoa ao lado apontando ou sorrindo`,
            `     • TOCAR SEM COBRIR: Pessoa encosta na lateral/base sem passar dedos na frente do rótulo`,
            `     • SEGURAR E MOSTRAR: somente se dedos ficarem atrás/laterais e a frente da embalagem ficar inteira`,
            `   - A expressão facial deve ser POSITIVA: sorriso confiante, olhar direto para câmera ou para o produto`,
            `   - O corpo da pessoa deve estar PARCIALMENTE VISÍVEL (do peito para cima, ou meio corpo)`,
            ``,
            `📐 COMPOSIÇÃO E ENQUADRAMENTO:`,
            `   - Use a REGRA DOS TERÇOS: produto em um ponto de intersecção, pessoa no outro`,
            `   - O produto e a pessoa devem estar PRÓXIMOS, criando uma UNIDADE VISUAL`,
            `   - Iluminação profissional: luz suave que destaca o produto sem criar sombras duras`,
            `   - Fundo LIMPO e DESFOCADO (bokeh) para destacar produto e pessoa`,
            `   - Estilo de FOTOGRAFIA PUBLICITÁRIA de marca premium`,
            ``,
            `❌ PROIBIDO:`,
            `   - NÃO coloque o produto e a pessoa separados ou distantes`,
            `   - NÃO gere a pessoa sem TOCAR/APONTAR/APRESENTAR o produto`,
            `   - NÃO force a mão segurando se isso mudar ou esconder rótulo, logo, textos, tampa, formato ou cores da embalagem`,
            `   - NÃO esconda o produto atrás da pessoa, do braço ou em segundo plano`,
            `   - NÃO faça o produto parecer pequeno demais ou irrelevante`,
            `   - NÃO coloque o produto em uma superfície longe da pessoa; a superfície de apoio deve estar visualmente colada à pessoa`,
            `   - 🚫 NÃO insira o produto dentro de QUADRADO/CAIXA/CARD/MOLDURA/ADESIVO/STICKER, sobre fundo branco artificial, base branca, faixa, barra cinza, legenda vazia ou retângulo arredondado. NÃO crie pedestal, mesa falsa ou suporte artificial. Ignore o fundo branco da foto-referência: extraia somente o produto e funda na cena com sombra, perspectiva e iluminação reais.`,
            `   - NÃO gere mãos deformadas ou com dedos incorretos`,
            ``,
            enrichedPrompt,
          ].join('\n');
        }
        if (referenceDescs.length > 0) {
          const positionLabels = bucketedImages.map((b, idx) => {
            const roleLabel: Record<string, string> = {
              logo: 'LOGO — FONTE VISUAL OBRIGATÓRIA, NÃO MOSTRAR A FOTO SEPARADA', produto: 'PRODUTO/EMBALAGEM — FONTE VISUAL OBRIGATÓRIA DA EMBALAGEM, NÃO MOSTRAR A FOTO SEPARADA',
              influencer: 'PESSOA/INFLUENCER — COPIAR ROSTO E CORPO EXATAMENTE desta imagem', roupa: 'ROUPA — COPIAR EXATAMENTE desta imagem',
              pose: 'REFERÊNCIA DE POSE (flexível)', estilo: 'REFERÊNCIA DE ESTILO (flexível)', paleta: 'PALETA DE CORES (flexível)',
              textura: 'REFERÊNCIA DE TEXTURA (flexível)', ambiente: 'AMBIENTE/CENÁRIO (flexível, apenas fundo)',
            };
            return `Imagem ${idx + 1}: ${roleLabel[b.role] || 'REFERÊNCIA'}`;
          });
          const imagePositionHint = positionLabels.length > 0
            ? `\n\n🔒 ORDEM DAS IMAGENS:\n${positionLabels.join('\n')}`
            : '';
          enrichedPrompt = `${enrichedPrompt}\n\n` + [
            `⚠️ INSTRUÇÕES ABSOLUTAS DE FIDELIDADE (VIOLAÇÃO = ERRO):`,
            ``,
            `1. PESSOA/INFLUENCER: A pessoa na imagem de referência É a pessoa real que DEVE aparecer na imagem.`,
            `   - Use EXATAMENTE o mesmo rosto, tom de pele, formato do rosto, cabelo, sobrancelhas, olhos, nariz, boca.`,
            `   - NÃO gere uma pessoa parecida. NÃO altere nenhuma característica facial. É a MESMA pessoa.`,
            ``,
            `2. PRODUTO/EMBALAGEM: O produto na imagem de referência É o produto real com sua embalagem real. A embalagem é SAGRADA e INTOCÁVEL.`,
            `   - Use EXATAMENTE a mesma embalagem: cores, rótulo, formato, tipografia, logo, proporções, material, tampa, selo.`,
            `   - Integre o produto naturalmente na nova cena sem colar a foto original por cima; ao mesmo tempo, a embalagem final deve ser visualmente igual à referência, não uma versão redesenhada ou aproximada.`,
            `   - Se houver conflito entre realismo e fidelidade, mantenha o produto no mesmo ângulo/orientação da referência; NUNCA redesenhe a embalagem para encaixar na pose.`,
            `   - Ajuste apenas perspectiva, escala, sombra e iluminação para encaixe realista. Esses ajustes não podem mudar rótulo, logo, textos, cores, formato, tampa, materiais ou proporções.`,
            `   - NÃO crie uma embalagem similar. NÃO redesenhe o produto. NÃO invente elementos novos. É o MESMO produto.`,
            `   - NÃO adicione, remova ou modifique textos, rótulos, selos ou marcas que não existam na foto original.`,
            `   - NÃO mude a cor da tampa, rótulo, embalagem ou qualquer parte do produto.`,
            `   - IGNORE marcações/anotações vermelhas, círculos, setas, rabiscos, destaques, áreas pintadas ou qualquer sinal visual de revisão presente nas referências. Esses elementos são instruções externas, NÃO pertencem ao produto/cena e NUNCA devem ser renderizados.`,
            `   - NÃO simplifique ou estilize detalhes da embalagem. COPIE literalmente.`,
            `   - NÃO permita que mão, dedo, cenário, identidade visual, preset ou estilo cubra/deforme/reinterprete a embalagem.`,
            `   - Se a IA gerar qualquer diferença visual no produto em relação à referência, o resultado está ERRADO.`,
            `   - É preferível mostrar o produto menor ou em contato com a mão da pessoa ou apoiado numa SUPERFÍCIE REAL JÁ EXISTENTE do cenário, sem fundo branco/base artificial, do que modificá-lo.`,
            `   - 🚫 NUNCA renderize o produto dentro de QUADRADO/CAIXA/CARD/MOLDURA/ADESIVO/STICKER ou sobre fundo branco/colorido artificial. NÃO use pedestal flutuante. IGNORE o fundo branco da foto-referência e funda o produto na cena com sombra, perspectiva e iluminação consistentes.`,
            ``,
            `3. LOGO: Reproduza pixel a pixel. Mesmas cores, mesma tipografia, mesmo layout.`,
            `4. AMBIENTE/CENÁRIO: ÚNICO elemento que pode ser adaptado livremente.`,
            ``,
            hasProduct && hasInfluencer
              ? `5. COMPOSIÇÃO OBRIGATÓRIA: A pessoa DEVE estar SEGURANDO, USANDO, APONTANDO ou DEMONSTRANDO o produto. Eles devem estar JUNTOS na mesma cena. Porém, a interação NUNCA pode alterar embalagem/rótulo/logo/textos/formato: se segurar modificar o produto, coloque o produto intacto sobre uma SUPERFÍCIE REAL do próprio cenário (nunca em quadrado branco, base branca, faixa/barra cinza ou suporte artificial) com a pessoa apresentando ao lado. O produto é o FOCO PRINCIPAL da imagem.`
              : '',
            ``,
            `TÉCNICA: Trate as imagens de referência como FOTOGRAFIAS REAIS. Componha a cena integrando esses sujeitos de forma realista${hasProduct && hasInfluencer ? ', com a pessoa apresentando/segurando o produto' : ''}, sem sobreposição plana da foto original, sem fundo branco residual e sem tarjas/retângulos decorativos vazios.`,
            imagePositionHint,
            ``,
            referenceDescs.join('\n'),
          ].join('\n');
        }
        // Inject language instruction into image prompt
        enrichedPrompt = `${enrichedPrompt}\n\n[IDIOMA] Todos os textos, legendas, títulos e elementos textuais na imagem devem estar ${imgLangSuffix}. Nunca use inglês a menos que explicitamente solicitado.`;

        // Inject visual identity references if active (reuse viCheck from above)
        const vi = viCheck;
        if (vi && (vi.images.length > 0 || vi.prompt)) {
          const viPromptText = vi.prompt ? `\n${vi.prompt}` : '';
          enrichedPrompt = `${enrichedPrompt}\n\n[IDENTIDADE VISUAL] As seguintes imagens e instruções representam a identidade visual da marca. Use para manter consistência visual, cores, estilo e branding.\n⚠️ PRIORIDADE: A identidade visual é SECUNDÁRIA. NUNCA sobreponha, altere ou substitua o PRODUTO e o INFLUENCER/PESSOA. Produto e Influencer têm prioridade ABSOLUTA e devem ser preservados EXATAMENTE como nas referências. A identidade visual serve apenas para guiar cores, estilo e atmosfera do CENÁRIO/FUNDO.${viPromptText}${VI_FOCUS_DIRECTIVE}`;
          for (const viUrl of vi.images) {
            orderedImageInputs.push(viUrl);
            orderedImageRoles.push('BRAND IDENTITY REFERENCE');
          }
        }

        if (textLockDirective) {
          enrichedPrompt = `${enrichedPrompt}${textLockDirective}`;
        }


        const result = await callStudio('generate_image', {
          prompt: enrichedPrompt,
          model: viModelOverride || config.model,
          imageUrls: orderedImageInputs.length > 0 ? orderedImageInputs : undefined,
          imageRoles: orderedImageRoles.length > 0 ? orderedImageRoles : undefined,
          imageSize: cfgImageSize || undefined,
          imagePlatformPreset: imgPresetKey || undefined,
          carouselMode: config.carouselMode || 'panoramic',
          panoramicStyle: config.panoramicStyle || 'classic',
          estabelecimentoId: imgEstabId || undefined,
        });

        // WaveSpeed async: poll wavespeed-proxy until done
        if (result?.wavespeedTaskId) {
          const wsEstabId = result.estabelecimentoId || imgEstabId;
          console.log(`[Studio] WaveSpeed async task ${result.wavespeedTaskId}, polling...`);
          const maxPolls = 120;
          const pollInterval = 3000;
          for (let i = 0; i < maxPolls; i++) {
            if (abortRef.current?.signal.aborted) throw new Error('Execução cancelada pelo usuário.');
            await new Promise(r => setTimeout(r, pollInterval));
            const pollResp = await fetch(
              `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/wavespeed-proxy`,
              {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
                },
                body: JSON.stringify({ action: 'fetch', estabelecimentoId: wsEstabId, params: { task_id: result.wavespeedTaskId } }),
              }
            );
            const pollData = await pollResp.json().catch(() => ({}));
            if (pollData.status === 'completed') {
              const url = pollData.imageUrl || pollData.outputs?.[0];
              if (url) return { imageUrl: url, text: '' };
              throw new Error('📭 O provedor terminou a geração mas não devolveu a imagem. Tente novamente.');
            }
            if (pollData.status === 'failed') {
              throw new Error(humanizeProviderError(pollData.error || 'Geração falhou no provedor.'));
            }
            console.log(`[Studio] WaveSpeed poll ${i + 1}/${maxPolls}: status=${pollData.status}`);
          }
          throw new Error('⏱️ A geração da imagem passou de 6 minutos sem resposta. Tente novamente ou troque para um modelo mais rápido.');
        }

        return result;
      }

      case 'imageEdit': {
        const editEstabId = localStorage.getItem('estabelecimentoId') || '';
        const editDefaults = getStudioDefaults(editEstabId);
        const editLangSuffix = getLanguagePromptSuffix(editDefaults.defaultLanguage || 'pt-BR');
        const editPromptText = config.editPrompt || combinedInput || 'Melhore esta imagem';
        let editPromptWithLang = `${editPromptText}\n\n[IDIOMA] Todos os textos na imagem devem estar ${editLangSuffix}.`;

        // Inject Visual Identity for image edit
        const viEdit = await getActiveVisualIdentity(editEstabId);
        console.log('[Studio][VI] imageEdit ativa?', !!(viEdit && (viEdit.images.length>0 || viEdit.prompt)), { images: viEdit?.images?.length || 0, hasPrompt: !!viEdit?.prompt });
        const viEditActive = !!(viEdit && (viEdit.images.length > 0 || viEdit.prompt));
        const editImageInputs = [...imageInputs];
        if (viEditActive && viEdit) {
          const viEText = viEdit.prompt ? `\n${viEdit.prompt}` : '';
          editPromptWithLang = `${editPromptWithLang}\n\n[IDENTIDADE VISUAL] Use as referências e instruções da marca para manter consistência de cores, estilo, atmosfera e branding na edição.\n⚠️ PRIORIDADE: A identidade visual é SECUNDÁRIA. NUNCA sobreponha, altere ou substitua PRODUTO e INFLUENCER/PESSOA presentes na imagem editada. A identidade visual guia apenas cores, estilo e atmosfera do CENÁRIO/FUNDO.${viEText}${VI_FOCUS_DIRECTIVE}`;
          for (const viUrl of viEdit.images) {
            if (!editImageInputs.includes(viUrl)) editImageInputs.push(viUrl);
          }
        }

        if (textLockDirective) {
          editPromptWithLang = `${editPromptWithLang}${textLockDirective}`;
        }



        const result = await callStudio('edit_image', {
          prompt: editPromptWithLang,
          imageUrls: editImageInputs,
          model: (viEditActive && viEdit?.preferredModel) || config.model,
        });
        return result;
      }

      case 'productComposite': {
        const compEstabId = localStorage.getItem('estabelecimentoId') || '';
        const compDefaults = getStudioDefaults(compEstabId);
        const compLangSuffix = getLanguagePromptSuffix(compDefaults.defaultLanguage || 'pt-BR');
        const modeDescriptions: Record<string, string> = {
          clothing: 'Vista esta roupa na pessoa da foto.',
          holding: 'Insira o produto original na mão da pessoa sem redesenhar a embalagem; a mão deve apoiar pelas laterais/base e nunca cobrir ou alterar rótulo, logo, formato ou cores.',
          wearing: 'Coloque este acessório na pessoa da foto.',
          scene: 'Insira o produto original na cena com a pessoa, preservando a embalagem exatamente como na referência.',
        };
        const modePrompt = modeDescriptions[config.compositeMode] || modeDescriptions.clothing;
        const userPrompt = config.prompt || combinedInput || '';
        let fullPrompt = `${modePrompt} ${userPrompt}`.trim();
        const hasProductComp = inputs.some((i) => i?._referenceRole === 'produto');
        if (hasProductComp) {
          fullPrompt = [
            `🔒 BLOQUEIO ABSOLUTO DO PRODUTO (PRIORIDADE MÁXIMA — NÃO NEGOCIÁVEL):`,
            `   - A imagem de PRODUTO conectada é a referência REAL. Trate-a como FOTOGRAFIA do produto físico.`,
            `   - A EMBALAGEM é SAGRADA e INTOCÁVEL: o produto final deve manter exatamente as mesmas cores, rótulo, tipografia, logotipo, formato, proporções, material, tampa, selo, textos e elementos gráficos da referência.`,
            `   - O produto deve ser integrado naturalmente na nova cena com a MESMA embalagem da referência: não pode ser sobreposição plana e também não pode virar produto novo inventado pela IA.`,
            `   - Se não for possível integrar em outro ângulo sem mudar a arte da embalagem, mantenha a orientação frontal/exata da referência e mude a pose/interação da pessoa.`,
            `   - Ajustes de perspectiva, escala, sombra e luz são permitidos apenas para realismo; rótulo, logo, textos, cores, formato, tampa, materiais e proporções devem permanecer iguais.`,
            `   - NÃO redesenhe, NÃO estilize, NÃO simplifique, NÃO reimagine, NÃO substitua o produto.`,
            `   - NÃO adicione nem remova textos, selos, rótulos, marcas ou elementos que não existam na referência.`,
            `   - NÃO altere cor, brilho, acabamento, formato ou proporções da embalagem.`,
            `   - NÃO deixe dedos, roupa, sombra, reflexo ou cenário deformarem, cobrirem ou reinterpretarem rótulo, logo e textos da embalagem.`,
            `   - Se a pessoa estiver segurando, a mão deve apoiar apenas laterais/base/tampa, mantendo a frente da embalagem totalmente legível e fiel.`,
            `   - Se segurar o produto exigir mudar a embalagem, NÃO segure: apoie o produto intacto sobre uma SUPERFÍCIE REAL EXISTENTE do cenário (bancada, mesa do ambiente, prateleira) com a pessoa tocando/apontando/apresentando ao lado.`,
            `   - 🚫 PROIBIDO ABSOLUTAMENTE: NÃO insira o produto dentro de QUADRADO/CAIXA/CARD/MOLDURA/ADESIVO/STICKER nem sobre fundo branco/colorido artificial. NÃO desenhe pedestal flutuante. IGNORE o fundo branco da foto-referência — extraia somente o produto e funda-o à cena com sombra, perspectiva e iluminação coerentes.`,
            `   - Se houver conflito entre o prompt e a fidelidade do produto, a FIDELIDADE DO PRODUTO VENCE SEMPRE.`,
            `   - É preferível mostrar o produto menor ou em outro ângulo natural da cena do que modificar a embalagem ou colá-lo como sticker.`,
            ``,
            fullPrompt,
          ].join('\n');
        }
        if (formatWidth && formatHeight) {
          fullPrompt = `${fullPrompt}\n\n[FORMAT] Otimizado para ${formatPlatform || 'redes sociais'} ${formatContentType || 'post'}, proporção ${formatAspectRatio || '1:1'} (${formatWidth}x${formatHeight}px).`;
        }
        const compImageSize = formatWidth && formatHeight
          ? `${formatWidth}x${formatHeight}`
          : (config.imageSize || undefined);
        if (referenceDescs.length > 0) {
          const positionLabels = bucketedImages.map((b, idx) => {
            const roleLabel: Record<string, string> = {
              logo: 'LOGO (preservar exatamente)', produto: 'PRODUTO (preservar exatamente)',
              influencer: 'PESSOA (preservar exatamente)', roupa: 'ROUPA (preservar exatamente)',
              pose: 'REFERÊNCIA DE POSE', ambiente: 'AMBIENTE (flexível)',
            };
            return `Imagem ${idx + 1}: ${roleLabel[b.role] || 'REFERÊNCIA'}`;
          });
          const imagePositionHint = positionLabels.length > 0 ? `\n\n🔒 ORDEM DAS IMAGENS:\n${positionLabels.join('\n')}` : '';
          fullPrompt = `${fullPrompt}\n\n⚠️ INSTRUÇÕES CRÍTICAS DE REFERÊNCIA:\nReferências de ambiente afetam APENAS o fundo, NUNCA o produto, pessoa ou roupa.${imagePositionHint}\n\n${referenceDescs.join('\n')}`;
        }
        fullPrompt = `${fullPrompt}\n\n[IDIOMA] Todos os textos na imagem devem estar ${compLangSuffix}.`;
        
        // Inject visual identity for compose
        const viComposeId = localStorage.getItem('estabelecimentoId') || '';
        const viCompose = await getActiveVisualIdentity(viComposeId);
        console.log('[Studio][VI] productComposite ativa?', !!(viCompose && (viCompose.images.length>0 || viCompose.prompt)), { images: viCompose?.images?.length || 0, hasPrompt: !!viCompose?.prompt, preferredModel: viCompose?.preferredModel });
        if (viCompose && (viCompose.images.length > 0 || viCompose.prompt)) {
          const viPText = viCompose.prompt ? `\n${viCompose.prompt}` : '';
          fullPrompt = `${fullPrompt}\n\n[IDENTIDADE VISUAL] Use as referências visuais e instruções da marca para manter consistência de estilo.\n⚠️ PRIORIDADE: A identidade visual é SECUNDÁRIA. NUNCA sobreponha, altere ou substitua o PRODUTO e o INFLUENCER/PESSOA. Produto e Influencer têm prioridade ABSOLUTA. A identidade visual guia apenas cores, estilo e atmosfera do CENÁRIO/FUNDO.${viPText}${VI_FOCUS_DIRECTIVE}`;
          for (const viUrl of viCompose.images) {
            orderedImageInputs.push(viUrl);
            orderedImageRoles.push('BRAND IDENTITY REFERENCE');
          }
        }

        if (textLockDirective) {
          fullPrompt = `${fullPrompt}${textLockDirective}`;
        }



        const result = await callStudio('generate_image', {
          prompt: fullPrompt,
          model: (viCompose?.preferredModel) || config.model || 'google/gemini-2.5-flash-image',
          imageUrls: orderedImageInputs.length > 0 ? orderedImageInputs : undefined,
          imageRoles: orderedImageRoles.length > 0 ? orderedImageRoles : undefined,
          imageSize: compImageSize,
          estabelecimentoId: viComposeId || undefined,
        });

        // WaveSpeed async: poll wavespeed-proxy until done
        if (result?.wavespeedTaskId) {
          const wsEstabId = result.estabelecimentoId || viComposeId;
          console.log(`[Studio] WaveSpeed compose async task ${result.wavespeedTaskId}, polling...`);
          const maxPolls = 120;
          const pollInterval = 3000;
          for (let i = 0; i < maxPolls; i++) {
            if (abortRef.current?.signal.aborted) throw new Error('Execução cancelada pelo usuário.');
            await new Promise(r => setTimeout(r, pollInterval));
            const pollResp = await fetch(
              `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/wavespeed-proxy`,
              {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
                },
                body: JSON.stringify({ action: 'fetch', estabelecimentoId: wsEstabId, params: { task_id: result.wavespeedTaskId } }),
              }
            );
            const pollData = await pollResp.json().catch(() => ({}));
            if (pollData.status === 'completed') {
              const url = pollData.imageUrl || pollData.outputs?.[0];
              if (url) return { imageUrl: url, text: '' };
              throw new Error('📭 O provedor terminou a geração mas não devolveu a imagem. Tente novamente.');
            }
            if (pollData.status === 'failed') {
              throw new Error(humanizeProviderError(pollData.error || 'Geração falhou no provedor.'));
            }
          }
          throw new Error('⏱️ A geração da imagem passou de 6 minutos sem resposta. Tente novamente ou troque para um modelo mais rápido.');
        }

        return result;
      }

      case 'imageAnalyze': {
        const imageUrl = imageInputs[0];
        const analyzeEstabId = localStorage.getItem('estabelecimentoId') || '';
        const analyzeDefaults = getStudioDefaults(analyzeEstabId);
        const analyzeLangSuffix = getLanguagePromptSuffix(analyzeDefaults.defaultLanguage || 'pt-BR');
        const analyzePrompt = `${config.prompt || combinedInput || 'Descreva esta imagem'}\n\n[IDIOMA] Responda ${analyzeLangSuffix}.`;
        const result = await callStudio('analyze_image', {
          prompt: analyzePrompt,
          imageUrl,
          model: config.model,
        });
        return result;
      }

      case 'videoGen': {
        // ============================================================
        // 🎞️ ROTEIRO MULTI-CENA: gera um vídeo por cena e une no final
        // ============================================================
        const anyScriptInput = inputs.find((i) => i?._isVideoScript);
        const videoScriptInput = inputs.find(
          (i) => i?._isVideoScript && Array.isArray(i?.videoScript?.scenes) && i.videoScript.scenes.length >= 1,
        );
        const isCorrectionForMultiScene = inputs.some((i) => i?._isCorrection);
        console.log('[Studio][videoGen] script detection', {
          totalInputs: inputs.length,
          inputKinds: inputs.map((i) => ({ isScript: !!i?._isVideoScript, scenes: i?.videoScript?.scenes?.length ?? 0 })),
          hasAnyScript: !!anyScriptInput,
          hasValidScript: !!videoScriptInput,
          isCorrection: isCorrectionForMultiScene,
        });
        if (anyScriptInput && !videoScriptInput) {
          toast.error('Roteiro do Vídeo conectado, mas sem cenas válidas. Adicione pelo menos uma cena com descrição.', { duration: 7000 });
        }
        if (videoScriptInput && !isCorrectionForMultiScene) {
          const scenesPreview = videoScriptInput.videoScript.scenes as any[];
          if (scenesPreview.length === 1) {
            toast.warning('Roteiro com apenas 1 cena detectado. Para gerar um vídeo com várias cenas e transições, adicione mais cenas no bloco de Roteiro/Reels.', { duration: 8000 });
          }

          const scenes = videoScriptInput.videoScript.scenes as Array<{
            n: number; description: string; duration: number; narration: string; cameraMovement: string;
            soundtrack?: string; soundtrackIntensity?: string; sfx?: string[]; ambientSound?: string; voiceTone?: string;
          }>;

          const globalNotes = (videoScriptInput.videoScript.globalNotes || '').trim();
          const aspectRatioMS = config.aspectRatio || '16:9';
          const baseVideoModelMS = isValidVideoGenerationModel(config.videoModel)
            ? config.videoModel
            : 'auto';
          const estabIdMS = localStorage.getItem('estabelecimentoId');

          // VI references (one fetch)
          let viImagesMS: string[] = [];
          let viPromptMS = '';
          let viPreferredModelMS: string | null = null;
          try {
            const vi = await getActiveVisualIdentity(estabIdMS || '');
            if (vi && (vi.images.length > 0 || vi.prompt)) {
              viImagesMS = vi.images || [];
              viPromptMS = vi.prompt || '';
              if (vi.preferredModel && isValidVideoGenerationModel(vi.preferredModel)) {
                viPreferredModelMS = vi.preferredModel;
              }
            }
          } catch {}

          const effectiveModelMS = viPreferredModelMS || (baseVideoModelMS === 'free/gif-animated' ? 'auto' : baseVideoModelMS);
          const orderedImageInputsMS = orderedImageInputs.length > 0 ? [...orderedImageInputs, ...viImagesMS] : [...imageInputs, ...viImagesMS];
          const orderedImageRolesMS = orderedImageRoles.length > 0
            ? [...orderedImageRoles, ...viImagesMS.map(() => 'BRAND IDENTITY REFERENCE')]
            : [...imageInputs.map(() => 'REFERENCE'), ...viImagesMS.map(() => 'BRAND IDENTITY REFERENCE')];

          const sceneVideoUrls: string[] = [];
          const sceneDurationsApplied: number[] = [];
          const sceneRegenParams: Record<string, any>[] = [];

          // 🔒 TRAVA DE FIDELIDADE — aplicada em TODAS as cenas quando há referências visuais
          const hasProductRefMS = orderedImageRolesMS.some(r => /produto/i.test(r));
          const hasInfluencerRefMS = orderedImageRolesMS.some(r => /influencer|pessoa/i.test(r));
          const fidelityLockMS = (orderedImageInputsMS.length > 0) ? [
            ``,
            `⚠️ INSTRUÇÕES ABSOLUTAS DE FIDELIDADE (VIOLAÇÃO = ERRO) — válidas para TODAS as cenas:`,
            hasProductRefMS ? `📦 PRODUTO/EMBALAGEM: É PROIBIDO modificar, redesenhar, traduzir, reinterpretar ou recriar a embalagem. Mantenha EXATAMENTE as mesmas cores, rótulo, tipografia, logotipo, formato, proporções e textos da imagem de referência. NÃO invente novos elementos gráficos. NÃO altere o idioma do rótulo. NÃO crie variações da arte. Trate a embalagem como uma fotografia real preservada na cena — apenas ângulo e iluminação podem variar de forma sutil, sem distorcer rótulo, logo ou textos. O produto deve aparecer IDÊNTICO em todas as cenas.` : '',
            hasInfluencerRefMS ? `👤 PESSOA/INFLUENCER: Mesmo rosto, tom de pele, cabelo e traços faciais da referência. NÃO gere uma pessoa parecida — é a MESMA pessoa, consistente em todas as cenas.` : '',
            `🎨 Apenas o CENÁRIO/AMBIENTE pode ser livremente adaptado.`,
          ].filter(Boolean).join('\n') : '';

          for (let s = 0; s < scenes.length; s++) {
            const scene = scenes[s];
            if (abortRef.current?.signal.aborted) throw new Error('Cancelado pelo usuário');

            nodeResultStore.setResult(node.id, {
              text: `🎬 Gerando cena ${s + 1}/${scenes.length}: ${scene.description.substring(0, 60)}...`,
              _multiSceneProgress: { current: s + 1, total: scenes.length, urls: [...sceneVideoUrls] },
              _videoProgress: { scene: s + 1, totalScenes: scenes.length, status: 'starting' },
            });

            const sceneDuration = Math.min(10, Math.max(5, Number(scene.duration) || 5));
            const scenePromptParts = [
              `🎬 CENA ${scene.n} de ${scenes.length} (parte de um roteiro maior — esta cena é INDEPENDENTE e será unida às outras na pós-produção).`,
              ``,
              `📝 DESCRIÇÃO DA CENA: ${scene.description}`,
              scene.cameraMovement ? `\n🎥 MOVIMENTO DE CÂMERA: ${scene.cameraMovement}` : '',
              scene.narration ? `\n🔊 NARRAÇÃO: ${scene.narration}` : '',
              scene.voiceTone ? `\n🎙️ TOM DE VOZ: ${scene.voiceTone}` : '',
              scene.soundtrack ? `\n🎵 TRILHA SONORA: ${scene.soundtrack}${scene.soundtrackIntensity ? ` (intensidade ${scene.soundtrackIntensity})` : ''}` : '',
              scene.ambientSound ? `\n🌬️ AMBIENTE SONORO: ${scene.ambientSound}` : '',
              (scene.sfx && scene.sfx.length) ? `\n💥 SFX: ${scene.sfx.join(', ')}` : '',
              globalNotes ? `\n📝 OBSERVAÇÕES GERAIS DO ROTEIRO: ${globalNotes}` : '',
              `\n⏱️ Duração: ${sceneDuration}s. Gere APENAS esta cena, não o roteiro inteiro.`,
              fidelityLockMS,
              viPromptMS ? `\n\n🎨 [IDENTIDADE VISUAL DA MARCA]\n${viPromptMS}${VI_FOCUS_DIRECTIVE}` : '',
            ].filter(Boolean).join('\n');


            try {
              const sceneParams = {
                prompt: scenePromptParts,
                model: effectiveModelMS,
                aspectRatio: aspectRatioMS,
                resolution: config.resolution || '1080p',
                duration: sceneDuration,
                style: config.videoStyle || 'realistic',
                cameraMovement: scene.cameraMovement || config.cameraMovement || 'none',
                cameraSpeed: config.cameraSpeed ?? 1,
                fps: config.fps || '24',
                loop: false,
                withAudio: config.withAudio ?? true,
                withMusic: s === 0 ? (config.withMusic ?? true) : false, // música só na primeira cena
                negativePrompt: config.videoNegativePrompt || '',
                seed: config.videoSeed,
                cfgScale: config.cfgScale ?? 7,
                imageUrls: orderedImageInputsMS.length > 0 ? orderedImageInputsMS : undefined,
                imageRoles: orderedImageRolesMS.length > 0 ? orderedImageRolesMS : undefined,
                estabelecimentoId: estabIdMS,
              };

              const usesAsync = effectiveModelMS === 'auto' || effectiveModelMS.startsWith('apiframe/') || effectiveModelMS.startsWith('wavespeed/') || effectiveModelMS.startsWith('google/');
              const isSlowModel = effectiveModelMS.includes('seedance') || effectiveModelMS.includes('image-to-video');
              const sceneTimeoutMs = isSlowModel ? 900000 : 600000;
              const sceneResult = usesAsync
                ? await generateAsyncStudioVideo(sceneParams, sceneTimeoutMs, (progress) => {
                    const elapsed = progress.elapsedSeconds ? ` • ${Math.floor(progress.elapsedSeconds / 60)}m${progress.elapsedSeconds % 60}s` : '';
                    const stallText = progress.stalled ? ' • provedor ainda renderizando (image-to-video pode levar 5-15min/cena)' : '';
                    nodeResultStore.setResult(node.id, {
                      text: `🎬 Cena ${s + 1}/${scenes.length}: ${progress.message}${elapsed}${stallText}`,
                      _multiSceneProgress: { current: s + 1, total: scenes.length, urls: [...sceneVideoUrls] },
                      _videoProgress: { ...progress, scene: s + 1, totalScenes: scenes.length },
                    });
                  })
                : await callStudio('generate_video', sceneParams, 300000);

              if (!sceneResult?.videoUrl) {
                throw new Error(sceneResult?.error || `O provedor terminou a cena ${s + 1} mas não devolveu o vídeo. Tente novamente.`);
              }
              sceneVideoUrls.push(sceneResult.videoUrl);
              sceneDurationsApplied.push(sceneDuration);
              nodeResultStore.setResult(node.id, {
                text: `✅ Cena ${s + 1}/${scenes.length} pronta. ${s + 1 < scenes.length ? 'Iniciando próxima cena...' : 'Preparando união final...'}`,
                _multiSceneProgress: { current: s + 1, total: scenes.length, urls: [...sceneVideoUrls] },
                _videoProgress: { scene: s + 1, totalScenes: scenes.length, status: 'completed' },
              });
            } catch (sceneErr: any) {
              console.error(`[Studio] Cena ${s + 1} falhou:`, sceneErr);
              throw new Error(`🎬 Falha na cena ${s + 1} de ${scenes.length} — ${humanizeProviderError(sceneErr?.message || '')}`);
            }
          }

          // Unir todos os vídeos em um único MP4
          if (sceneVideoUrls.length === 1) {
            return {
              videoUrl: sceneVideoUrls[0],
              text: `🎬 Vídeo gerado (1 cena)`,
              _isVideo: true,
              _sceneUrls: sceneVideoUrls,
              _sceneDurations: sceneDurationsApplied,
            };
          }

          const sceneTransition = (config.sceneTransition || 'fade') as any;
          const sceneTransitionDuration = Number(config.sceneTransitionDuration) || 0.5;

          try {
            nodeResultStore.setResult(node.id, {
              text: `🎞️ Unindo ${sceneVideoUrls.length} cenas em vídeo único...`,
              _multiSceneProgress: { current: scenes.length, total: scenes.length, urls: sceneVideoUrls },
            });
            const { concatVideos, uploadConcatVideo } = await import('./videoConcat');
            const unifiedBlob = await concatVideos(
              sceneVideoUrls,
              (p) => {
                nodeResultStore.setResult(node.id, {
                  text: `🎞️ ${p.message || 'Unindo cenas...'}`,
                  _multiSceneProgress: { current: scenes.length, total: scenes.length, urls: sceneVideoUrls },
                });
              },
              {
                transition: sceneTransition,
                transitionDurationSec: sceneTransitionDuration,
                sceneDurationsSec: sceneDurationsApplied,
              },
            );
            const unifiedUrl = await uploadConcatVideo(unifiedBlob, estabIdMS || '', supabase);
            return {
              videoUrl: unifiedUrl,
              _finalVideoUrl: unifiedUrl,
              text: `🎬 Vídeo unificado gerado a partir de ${sceneVideoUrls.length} cenas`,
              _isVideo: true,
              _sceneUrls: sceneVideoUrls,
              _sceneDurations: sceneDurationsApplied,
              _sceneTransition: sceneTransition,
              _sceneTransitionDuration: sceneTransitionDuration,
              _unified: true,
            };
          } catch (concatErr: any) {
            console.error('[Studio] Falha ao unir vídeos:', concatErr);
            // Fallback: retorna o primeiro vídeo e lista as URLs para download manual
            toast.error(`Falha ao unir cenas: ${concatErr.message}. As cenas ficaram disponíveis individualmente.`, { duration: 8000 });
            return {
              videoUrl: sceneVideoUrls[0],
              text: `⚠️ ${sceneVideoUrls.length} cenas geradas, mas a união falhou. URLs individuais salvas.`,
              _isVideo: true,
              _sceneUrls: sceneVideoUrls,
              _sceneDurations: sceneDurationsApplied,
              _sceneTransition: sceneTransition,
              _sceneTransitionDuration: sceneTransitionDuration,
              _unified: false,
            };
          }
        }

        // ============================================================
        // 🎬 GERAÇÃO PADRÃO (uma cena única / sem roteiro multi-cena)
        // ============================================================
        // Multi-ref: product + influencer are handled via enriched text prompt, no blocking needed
        const hasProductRef = inputs.some((i) => i?._referenceRole === 'produto');
        const hasInfluencerRef = inputs.some((i) => i?._referenceRole === 'influencer');
        const selectedVideoModel = config.videoModel || 'free/gif-animated';

        // Check if this is a correction/refinement pass
        const isCorrectionVideo = inputs.some(i => i?._isCorrection);
        const correctionInputVideo = inputs.find(i => i?._isCorrection);
        const correctionOnlyPromptVideo = correctionInputVideo?._correctionPrompt || '';
        const correctionSourceVideo = correctionInputVideo?.videoUrl || correctionInputVideo?.imageUrl;
        const correctionSourceVideoUrl = correctionInputVideo?.videoUrl;
        const correctionSourceProvider = correctionInputVideo?._provider;
        const correctionSourceProviderVideoId = correctionInputVideo?._providerVideoId;

        let videoPrompt = combinedInput || 'Uma cena cinematográfica';
        if (videoScriptDirective) {
          videoPrompt = `${videoScriptDirective}\n\n${videoPrompt}`;
        }
        const aspectRatio = config.aspectRatio || '16:9';

        // Inject videoStyle into the prompt
        const videoStyleValue = config.videoStyle || 'realistic';
        if (videoStyleValue && videoStyleValue !== 'realistic') {
          const videoStyleMap: Record<string, string> = {
            'cinematic': 'Cinematic style with dramatic lighting, shallow depth of field, and film-grade color grading.',
            'anime': 'Anime animation style with vibrant colors, expressive characters and dynamic action.',
            'cartoon': 'Cartoon animation style with exaggerated expressions, bright colors and playful motion.',
            '3d-animation': '3D animated style with smooth rendering, realistic materials and polished motion.',
            'stop-motion': 'Stop-motion animation style with tactile textures and frame-by-frame character.',
            'slow-motion': 'Slow-motion cinematic capture revealing fine details and dramatic tension.',
            'timelapse': 'Timelapse photography style showing accelerated passage of time with smooth transitions.',
            'noir': 'Film noir style with high-contrast black and white, dramatic shadows and moody atmosphere.',
            'vintage': 'Vintage / retro film look with warm tones, grain, light leaks and nostalgic feeling.',
            'documentary': 'Documentary style with natural lighting, handheld camera feel and authentic atmosphere.',
            'music-video': 'Music video style with dynamic editing, creative angles and visually striking compositions.',
          };
          const styleDesc = videoStyleMap[videoStyleValue] || '';
          if (styleDesc) {
            videoPrompt = `[VISUAL STYLE] ${styleDesc}\n\n${videoPrompt}`;
          }
        }

        // If correction mode, override prompt to preserve original and only apply the fix
        if (isCorrectionVideo && correctionSourceVideo) {
          const isVideoSource = !!correctionInputVideo?.videoUrl;
          videoPrompt = [
            `🔒 MODO CORREÇÃO — EDIÇÃO MÍNIMA OBRIGATÓRIA`,
            ``,
            `O ${isVideoSource ? 'vídeo' : 'conteúdo visual'} fornecido é a BASE ORIGINAL. Você DEVE manter ${isVideoSource ? 'o vídeo' : 'a cena'} EXATAMENTE como está, alterando SOMENTE o que foi solicitado abaixo.`,
            ``,
            `✏️ CORREÇÃO SOLICITADA:`,
            correctionOnlyPromptVideo,
            ``,
            `⚠️ REGRAS ABSOLUTAS:`,
            `- NÃO regenere ${isVideoSource ? 'o vídeo' : 'a cena'} do zero. EDITE ${isVideoSource ? 'o vídeo' : 'a cena'} existente.`,
            `- NÃO mude composição, enquadramento, iluminação, cores, movimentos de câmera ou elementos que NÃO foram mencionados na correção.`,
            `- NÃO mude rostos, produtos, logos, cenário ou qualquer elemento que NÃO foi explicitamente solicitado para correção.`,
            `- O resultado deve ser IDÊNTICO ao original, exceto pela correção aplicada.`,
            `- Mantenha a mesma duração, ritmo e estilo do original.`,
          ].join('\n');
          // Ensure source media is passed as reference
          if (correctionInputVideo?.videoUrl && !inputs.some(i => i?.videoUrl === correctionInputVideo.videoUrl)) {
            // videoUrl is already in the input
          }
          if (correctionInputVideo?.imageUrl && !imageInputs.includes(correctionInputVideo.imageUrl)) {
            imageInputs.unshift(correctionInputVideo.imageUrl);
            orderedImageInputs.unshift(correctionInputVideo.imageUrl);
          }
        }
        const videoModel = config.videoModel || 'free/gif-animated';

        // Auto-detect product + influencer without explicit placement prompt → default to holding (same as imageGen)
        const hasProductVideo = inputs.some((i) => i?._referenceRole === 'produto');
        const hasInfluencerVideo = inputs.some((i) => i?._referenceRole === 'influencer');
        const promptLowerVideo = (combinedInput || '').toLowerCase();
        const hasPlacementHintVideo = /mesa|chão|prateleira|vitrine|cenário|cena|fundo|background|scene|table|shelf|display|flat\s*lay/i.test(promptLowerVideo);

        if (hasProductVideo && hasInfluencerVideo && !hasPlacementHintVideo) {
          videoPrompt = [
            `🎯 OBJETIVO PRINCIPAL DO VÍDEO: A pessoa/influencer deve estar INTERAGINDO ATIVAMENTE com o produto durante todo o vídeo.`,
            ``,
            `📦 PRIORIDADE #1 — PRODUTO: O produto é o PROTAGONISTA. Ele DEVE:`,
            `   - Estar em DESTAQUE VISUAL (posição central ou primeiro plano)`,
            `   - Ser mostrado de forma clara, nítido e bem iluminado`,
            `   - Estar sendo SEGURADO, DEMONSTRADO ou APRESENTADO pela pessoa`,
            `   - Manter TODAS as características visuais da referência`,
            ``,
            `👤 PRIORIDADE #2 — INFLUENCER/PESSOA: A pessoa apresenta o produto. Ela DEVE:`,
            `   - Estar SEGURANDO, USANDO ou DEMONSTRANDO o produto durante o vídeo`,
            `   - Interagir fisicamente com o produto (não apenas estar ao lado)`,
            `   - Manter o mesmo rosto e aparência da referência`,
            ``,
            videoPrompt,
          ].join('\n');
        }

        // Inject platform format dimensions
        if (formatWidth && formatHeight) {
          videoPrompt = `${videoPrompt}\n\n[FORMAT] Gere este vídeo otimizado para ${formatPlatform || 'redes sociais'} ${formatContentType || 'post'}, proporção ${formatAspectRatio || '1:1'} (${formatWidth}x${formatHeight}px).`;
        }
        // Inject reference descriptions with STRICT fidelity instructions
        if (referenceDescs.length > 0) {
          const positionLabels = bucketedImages.map((b, idx) => {
            const roleLabel: Record<string, string> = {
              logo: 'LOGO — FONTE VISUAL OBRIGATÓRIA, NÃO INSERIR A FOTO ORIGINAL', produto: 'PRODUTO/EMBALAGEM — FONTE VISUAL OBRIGATÓRIA DA EMBALAGEM, NÃO INSERIR A FOTO ORIGINAL',
              influencer: 'PESSOA/INFLUENCER — COPIAR ROSTO E CORPO EXATAMENTE desta imagem', roupa: 'ROUPA — COPIAR EXATAMENTE desta imagem',
              pose: 'REFERÊNCIA DE POSE (flexível)', estilo: 'REFERÊNCIA DE ESTILO (flexível)', paleta: 'PALETA DE CORES (flexível)',
              textura: 'REFERÊNCIA DE TEXTURA (flexível)', ambiente: 'AMBIENTE/CENÁRIO (flexível, apenas fundo)',
            };
            return `Imagem ${idx + 1}: ${roleLabel[b.role] || 'REFERÊNCIA'}`;
          });
          const imagePositionHint = positionLabels.length > 0
            ? `\n\n🔒 ORDEM DAS IMAGENS:\n${positionLabels.join('\n')}`
            : '';
          videoPrompt = `${videoPrompt}\n\n` + [
            `⚠️ INSTRUÇÕES ABSOLUTAS DE FIDELIDADE (VIOLAÇÃO = ERRO):`,
            ``,
            `1. PESSOA/INFLUENCER: A pessoa na imagem de referência É a pessoa real que DEVE aparecer no vídeo.`,
            `   - Use EXATAMENTE o mesmo rosto, tom de pele, formato do rosto, cabelo, sobrancelhas, olhos, nariz, boca.`,
            `   - NÃO gere uma pessoa parecida. NÃO altere nenhuma característica facial. É a MESMA pessoa.`,
            `   - Se a IA gerar um rosto diferente, o resultado está ERRADO.`,
            ``,
            `2. PRODUTO/EMBALAGEM: REGENERE o produto do zero como uma nova fotografia dentro da cena.`,
            `   - 🚫 PROIBIDO ABSOLUTAMENTE colar, sobrepor, recortar ou inserir a foto original do produto por cima da imagem gerada. NÃO faça composição "sticker", "cut-out", "paste-over" ou colagem.`,
            `   - 🚫 PROIBIDO mostrar o produto como uma figura flutuante, recortada, com borda visível, em uma camada separada ou com iluminação diferente do cenário.`,
            `   - ✅ O produto deve parecer uma foto única e contínua na cena, mas a embalagem/rótulo deve continuar visualmente igual à referência.`,
            `   - Se o novo ângulo/perspectiva mudar a arte da embalagem, mantenha o produto no mesmo ângulo frontal da referência e adapte a cena ao produto.`,
            `   - Use a foto de referência como FONTE VISUAL OBRIGATÓRIA da embalagem (cores, rótulo, tipografia, logo, formato, proporções), não como inspiração aproximada.`,
            `   - NÃO redesenhe a marca/rótulo. NÃO invente textos. NÃO altere cores ou logotipo. NÃO crie embalagem similar — é o MESMO produto, mas REPINTADO na cena.`,
            `   - Mãos, sombras e reflexos podem interagir naturalmente desde que não distorçam rótulo, logo, textos, tampa, formato ou cores.`,
            ``,
            `3. LOGO: Reproduza pixel a pixel. Mesmas cores, mesma tipografia, mesmo layout.`,
            ``,
            `4. AMBIENTE/CENÁRIO: Este é o ÚNICO elemento que pode ser adaptado livremente.`,
            ``,
            `TÉCNICA: Trate as imagens de referência apenas como GUIAS VISUAIS dos sujeitos reais.`,
            `Gere uma foto única e contínua; NUNCA renderize a foto de referência como imagem solta, cartão, miniatura, cópia lateral ou segundo produto.`,
            imagePositionHint,
            ``,
            referenceDescs.join('\n'),
          ].join('\n');
        }
        
        // === PAID VIDEO MODEL PATH ===
        {
        // Get configured language for video generation
        const vidEstabId = localStorage.getItem('estabelecimentoId') || '';
        const vidDefaults = getStudioDefaults(vidEstabId);
        const vidLangSuffix = getLanguagePromptSuffix(vidDefaults.defaultLanguage || 'pt-BR');

        // Inject language instruction into video prompt
        videoPrompt = `${videoPrompt}\n\n[IDIOMA] Todos os textos, legendas, narrações e elementos textuais no vídeo devem estar ${vidLangSuffix}. Nunca use inglês a menos que explicitamente solicitado.`;
        }

        // Inject visual identity references for video generation
        let viVideoModelOverride: string | null = null;
        {
          const viEstabId = localStorage.getItem('estabelecimentoId') || '';
          const viVideo = await getActiveVisualIdentity(viEstabId);
          const viVideoActive = !!(viVideo && (viVideo.images.length > 0 || viVideo.prompt));
          console.log('[Studio][VI] videoGen ativa?', viVideoActive, { preferredModel: viVideo?.preferredModel });
          if (viVideo && (viVideo.images.length > 0 || viVideo.prompt)) {
            const viVText = viVideo.prompt ? `\n${viVideo.prompt}` : '';
            videoPrompt = `${videoPrompt}\n\n[IDENTIDADE VISUAL] Referências e instruções da identidade visual da marca. Mantenha consistência visual, cores, estilo e branding.\n⚠️ PRIORIDADE: A identidade visual é SECUNDÁRIA. NUNCA sobreponha, altere ou substitua o PRODUTO e o INFLUENCER/PESSOA. Produto e Influencer têm prioridade ABSOLUTA. A identidade visual guia apenas cores, estilo e atmosfera do CENÁRIO/FUNDO.${viVText}${VI_FOCUS_DIRECTIVE}`;
            for (const viUrl of viVideo.images) {
              orderedImageInputs.push(viUrl);
              orderedImageRoles.push('BRAND IDENTITY REFERENCE');
            }
            if (viVideo.preferredModel) {
              // Only override if the preferred model is actually a VIDEO model.
              // VI's "Modelo Preferido" is configured against image models, so
              // applying it to video generation would send an image model (e.g.
              // gpt-image-2) to a video provider and fail with "model not mapped".
              if (isValidVideoGenerationModel(viVideo.preferredModel)) {
                viVideoModelOverride = viVideo.preferredModel;
              } else {
                console.warn('[Studio][VI] preferredModel ignorado para vídeo (é modelo de imagem):', viVideo.preferredModel);
              }
            }
          }
        }

        if (textLockDirective) {
          videoPrompt = `${videoPrompt}${textLockDirective}`;
        }

        // When model is free/gif-animated (default), try auto-detecting a paid provider first
        // VI preferred model takes priority over block-configured model
        const baseVideoModel = isValidVideoGenerationModel(viVideoModelOverride || videoModel)
          ? (viVideoModelOverride || videoModel)
          : 'auto';
        const effectiveVideoModel = baseVideoModel === 'free/gif-animated' ? 'auto' : baseVideoModel;
        {
          nodeResultStore.setResult(node.id, { 
            text: `🎬 Gerando vídeo${effectiveVideoModel === 'auto' ? ' (detectando provedor disponível)' : ` com ${effectiveVideoModel.split('/').pop()}`}...${orderedImageInputs.length > 0 ? ` (${orderedImageInputs.length} imagem(ns) de referência)` : ''}`, 
          });
          
          try {
            const estabId = localStorage.getItem('estabelecimentoId');
            const effectiveWithAudio = config.withAudio ?? true;
            const effectiveWithMusic = effectiveWithAudio ? (config.withMusic ?? true) : false;

            const videoRequestParams = {
              prompt: videoPrompt,
              model: effectiveVideoModel,
              aspectRatio,
              resolution: config.resolution || '1080p',
              duration: config.duration || 5,
              style: config.videoStyle || 'realistic',
              cameraMovement: config.cameraMovement || 'none',
              cameraSpeed: config.cameraSpeed ?? 1,
              fps: config.fps || '24',
              loop: config.loop ?? false,
              withAudio: effectiveWithAudio,
              withMusic: effectiveWithMusic,
              negativePrompt: config.videoNegativePrompt || '',
              seed: config.videoSeed,
              cfgScale: config.cfgScale ?? 7,
              imageUrls: orderedImageInputs.length > 0 ? orderedImageInputs : (imageInputs.length > 0 ? imageInputs : undefined),
              imageRoles: orderedImageRoles.length > 0 ? orderedImageRoles : undefined,
              correctionMode: isCorrectionVideo,
              sourceVideoUrl: correctionSourceVideoUrl,
              sourceVideoId: correctionSourceProviderVideoId,
              sourceProvider: correctionSourceProvider,
              estabelecimentoId: estabId,
            };

            const usesAsyncVideoTask = effectiveVideoModel === 'auto' || effectiveVideoModel.startsWith('apiframe/') || effectiveVideoModel.startsWith('wavespeed/') || effectiveVideoModel.startsWith('google/');
            const result = usesAsyncVideoTask
              ? await generateAsyncStudioVideo(videoRequestParams, 600000, (progress) => {
                  const elapsed = progress.elapsedSeconds ? ` • ${Math.floor(progress.elapsedSeconds / 60)}m${progress.elapsedSeconds % 60}s` : '';
                  const stallText = progress.stalled ? ' • ainda processando no provedor' : '';
                  nodeResultStore.setResult(node.id, {
                    text: `🎬 ${progress.message}${elapsed}${stallText}`,
                    _videoProgress: progress,
                  });
                })
              : await callStudio('generate_video', videoRequestParams, 300000);
            
            if (result?.videoUrl) {
              return {
                videoUrl: result.videoUrl,
                ...(result.thumbnailUrl ? { imageUrl: result.thumbnailUrl } : {}),
                ...(result.provider ? { _provider: result.provider } : { _provider: (effectiveVideoModel || '').split('/')[0] }),
                ...(result.providerVideoId ? { _providerVideoId: result.providerVideoId } : {}),
                text: `🎬 Vídeo gerado${result.provider ? ` com ${result.provider}` : ''} para: "${videoPrompt.substring(0, 60)}"`,
                _isVideo: true,
              };
            } else {
              throw new Error(result?.error || 'Nenhum vídeo retornado');
            }
          } catch (videoErr: any) {
            console.error('[Studio] Video generation failed:', videoErr);
            const msg = videoErr.message || '';
            const modelLabel = (effectiveVideoModel || 'desconhecido').split('/').pop();
            
            // If auto mode found no provider, fall through to free GIF path
            if (effectiveVideoModel === 'auto' && (msg.includes('Nenhum provedor') || msg.includes('configurado'))) {
              console.log('[Studio] No paid video provider available, falling back to free GIF animated path');
              // Fall through to GIF path below
            } else {
              if (msg.includes('hero_frame_failed') || msg.includes('compor a imagem de referência')) {
                throw new Error(`🖼️ Não foi possível compor a cena com todos os elementos de referência (produto, influencer, etc.). O servidor de composição está temporariamente indisponível. Tente novamente em alguns instantes.`);
              }
              if (msg.includes('moderation') || msg.includes('blocked') || msg.includes('content policy') || msg.includes('safety')) {
                throw new Error(`⚠️ O modelo ${modelLabel} bloqueou o conteúdo por política de segurança. Reformule a descrição com termos mais neutros.`);
              }
              if (msg.includes('rate limit') || msg.includes('429') || msg.includes('too many')) {
                throw new Error(`⏳ O modelo ${modelLabel} está com muitas solicitações. Aguarde alguns segundos e tente novamente.`);
              }
              if (msg.includes('402') || msg.includes('payment') || msg.includes('quota') || msg.includes('billing')) {
                throw new Error(`💳 Limite de uso do modelo ${modelLabel} atingido. Verifique seu plano ou créditos.`);
              }
              if (msg.includes('timeout') || msg.includes('timed out') || msg.includes('Failed to fetch') || msg.includes('NetworkError') || msg.includes('network') || msg.includes('ECONNREFUSED') || msg.includes('Falha de conexão') || msg.includes('excedeu o tempo limite')) {
                throw new Error(`🌐 O servidor do modelo ${modelLabel} não respondeu a tempo. Isso é um problema temporário do provedor, tente novamente mais tarde.`);
              }
              throw new Error(`❌ O servidor do modelo ${modelLabel} retornou um erro. Isso não é um problema no seu prompt. Tente novamente em alguns instantes.`);
            }
          }
        }
        
        // === FREE GIF ANIMATED PATH ===
        const frameCount = config.frameCount || 4;
        const motionStages = [
          'opening shot, beginning of movement',
          'early progression, slight camera movement forward',
          'building momentum, increasing intensity',
          'mid-action, peak of the motion, dynamic angle',
          'continuation, evolving perspective',
          'transition, shifting focus',
          'climax approaching, tension building',
          'final frame, concluding the movement, dramatic resolution',
          'aftermath, calm settling shot',
          'wide establishing shot, full reveal',
        ];

        const frames: string[] = [];
        const perFrameTimeout = 90000; // 90s per frame
        const hasReferenceImages = orderedImageInputs.length > 0 || imageInputs.length > 0;
        
        for (let i = 0; i < frameCount; i++) {
          const stage = motionStages[i % motionStages.length];
          const isFollowUpFrame = i > 0 && frames.length > 0;
          
          // SIMPLIFIED PROMPT: Only describe the SCENE.
          // The edge function EDIT MODE already handles subject preservation via system message + image labels.
          // Redundant fidelity instructions in the prompt CONFUSE the model.
          let framePrompt: string;
          
          // Extract just the user's scene description (before fidelity instructions were appended)
          const sceneDescription = combinedInput || 'Uma cena cinematográfica';
          
          if (hasReferenceImages) {
            const parts: string[] = [];
            if (isFollowUpFrame) {
              parts.push(`EDIT the first image (frame reference): keep the EXACT same person and product, only change the pose/angle slightly for animation.`);
              parts.push(`Scene: ${sceneDescription}`);
            } else {
              parts.push(`Create a realistic PHOTOMONTAGE integrating the person and product from the provided photos into this scene: ${sceneDescription}`);
              parts.push(`The person's face must be IDENTICAL to the photo. The product is absolute priority #1: integrate it naturally while keeping packaging IDENTICAL — label, printed text, typography, logo, colors, cap/lid, shape and proportions. EXACTLY ONE instance of the product in the frame: never a duplicate copy beside the person, showcase copy, mirrored copy, inset thumbnail, corner badge or side-by-side reference. Do not paste the original photo as a flat overlay. If holding would hide or deform packaging, place the unchanged product directly on a real existing textured surface in the scene and have the person present it. Do not create a pedestal, white base, card, bar, label strip, or artificial support.`);
            }
            parts.push(`Style: Cinematic photography, professional lighting, aspect ratio ${aspectRatio}`);
            parts.push(`Animation sequence: Frame ${i + 1} of ${frameCount} — ${stage}`);
            if (formatWidth && formatHeight) {
              parts.push(`Format: ${formatPlatform || 'social media'} ${formatContentType || 'post'}, ${formatAspectRatio || '1:1'} (${formatWidth}x${formatHeight}px)`);
            }
            framePrompt = parts.join('\n');
          } else {
            framePrompt = `Cinematic photography, professional lighting, aspect ratio ${aspectRatio}, photorealistic, frame ${i + 1} of ${frameCount} — ${stage}: ${sceneDescription}`;
          }
          
          nodeResultStore.setResult(node.id, { 
            text: `🎬 Gerando frame ${i + 1}/${frameCount}...`, 
            _animFrames: frames.length > 0 ? [...frames] : undefined,
            _totalFrames: frameCount,
          });

          // Build image references: for follow-up frames, prepend the first frame as consistency anchor
          let frameImageUrls: string[];
          let frameImageRoles: string[];
          if (isFollowUpFrame && orderedImageInputs.length > 0) {
            frameImageUrls = [frames[0], ...orderedImageInputs];
            frameImageRoles = ['PERSON/INFLUENCER - DO NOT MODIFY', ...orderedImageRoles];
          } else if (orderedImageInputs.length > 0) {
            frameImageUrls = orderedImageInputs;
            frameImageRoles = orderedImageRoles;
          } else if (isFollowUpFrame) {
            frameImageUrls = [frames[0], ...imageInputs];
            frameImageRoles = ['PERSON/INFLUENCER - DO NOT MODIFY', ...imageInputs.map(() => 'REFERENCE')];
          } else {
            frameImageUrls = imageInputs.length > 0 ? imageInputs : [];
            frameImageRoles = [];
          }

          try {
            const result = await callStudio('generate_image', {
              prompt: framePrompt,
              model: 'google/gemini-3-pro-image-preview',
              imageUrls: frameImageUrls.length > 0 ? frameImageUrls : undefined,
              imageRoles: frameImageRoles.length > 0 ? frameImageRoles : undefined,
            }, perFrameTimeout);
            if (result?.imageUrl) {
              frames.push(result.imageUrl);
            }
          } catch (frameErr: any) {
            if (abortRef.current?.signal.aborted) throw frameErr;
            console.warn(`[Studio] Frame ${i + 1} failed, skipping:`, frameErr.message);
            toast.error(`Frame ${i + 1} falhou: ${frameErr.message?.substring(0, 80)}`, { duration: 4000 });
          }
        }

        // Generate real animated GIF from frames
        const fps = config.fps || 2;
        let gifUrl: string | undefined;
        if (frames.length > 1) {
          nodeResultStore.setResult(node.id, { 
            text: `🎬 Montando GIF animado (0/${frames.length} frames)...`, 
            _animFrames: [...frames],
            _totalFrames: frameCount,
          });
          try {
            const { createAnimatedGif } = await import('./gifEncoder');
            const gifPromise = createAnimatedGif(frames, fps, 192, (current, total) => {
              nodeResultStore.setResult(node.id, { 
                text: `🎬 Montando GIF animado (${current}/${total} frames)...`, 
                _animFrames: [...frames],
                _totalFrames: frameCount,
              });
            });
            const timeoutPromise = new Promise<string>((_, reject) => 
              setTimeout(() => reject(new Error('GIF encoding timeout')), 60000)
            );
            gifUrl = await Promise.race([gifPromise, timeoutPromise]);
          } catch (gifErr: any) {
            console.error('Error creating GIF:', gifErr);
            toast.error('GIF demorou demais, usando primeira imagem como resultado.', { duration: 4000 });
          }
        }

        return { 
          _animFrames: frames,
          _totalFrames: frameCount,
          _fps: fps,
          imageUrl: gifUrl || frames[0],
          _gifUrl: gifUrl,
          text: gifUrl 
            ? `🎬 GIF animado gerado com ${frames.length} frames (${fps} fps) para: "${videoPrompt.substring(0, 60)}"`
            : `🎬 Animação gerada com ${frames.length} frames para: "${videoPrompt.substring(0, 60)}"`,
        };
      }

      case 'audioGen': {
        // Always use config.text or a default — ignore audio from connected prompt blocks
        let textToSpeak = config.text || combinedInput || 'Olá! Este é um exemplo de áudio gerado pelo AI Creative Studio.';

        // Get default language from studio config
        const estabId = localStorage.getItem('estabelecimentoId') || '';
        const studioDefaults = getStudioDefaults(estabId);
        const defaultLang = studioDefaults.defaultLanguage || 'pt-BR';

        // IMPORTANT: prefer new `language` field from node config and fallback to global default.
        // Ignore legacy `lang` when it is English and global default is non-English.
        const legacyLang = typeof config.lang === 'string' ? config.lang : undefined;
        const effectiveLanguage =
          (typeof config.language === 'string' && config.language) ||
          (legacyLang && !legacyLang.startsWith('en') ? legacyLang : defaultLang);

        const langSuffix = getLanguagePromptSuffix(effectiveLanguage);
        const langCode = effectiveLanguage.split('-')[0]; // e.g. "pt"

        // ALWAYS translate/rewrite text to the configured language before TTS
        // This ensures audio is NEVER in the wrong language regardless of prompt language
        const targetLangPrefix = langCode;
        const wordCount = textToSpeak.split(/\s+/).length;
        
        if (targetLangPrefix !== 'en' && wordCount > 3) {
          // Always rewrite to target language via LLM (handles English, mixed, or any other language)
          try {
            const translated = await callStudio('generate_text', {
              prompt: `Rewrite/translate the following text to ${langSuffix}. If it's already in the target language, just clean it up and return it. Return ONLY the final text, nothing else:\n\n${textToSpeak}`,
              systemPrompt: `You are a professional translator and copywriter. Your ONLY job is to output text ${langSuffix}. Never output in English. Do not add explanations, quotes, labels, or any extra text. Return only the final text in the target language.`,
              model: 'google/gemini-2.5-flash-lite',
            });
            if (translated && typeof translated === 'string' && translated.trim().length > 5) {
              textToSpeak = translated.trim();
              console.log('[Studio] Text rewritten/translated to', defaultLang);
            }
          } catch (err) {
            console.warn('[Studio] Auto-translation failed, using original text:', err);
          }
        }
        
        // Check if user has a paid TTS provider configured
        let paidProvider: string | null = null;

        if (estabId) {
          // Check for ElevenLabs, Google, or OpenAI TTS keys
          for (const provider of ['elevenlabs', 'google', 'openai']) {
            const { data } = await supabase
              .from('ai_api_keys')
              .select('api_key, is_active')
              .eq('estabelecimento_id', estabId)
              .eq('provider', provider)
              .eq('is_active', true)
              .maybeSingle();
            if (data?.api_key) {
              paidProvider = provider;
              break;
            }
          }
        }

        if (paidProvider && estabId) {
          // PAID: Route through edge function (secure - no API key exposed)
          try {
            const result = await callStudio('generate_audio', {
              text: textToSpeak,
              provider: paidProvider,
              voiceId: config.voiceId,
              audioModel: config.audioModel,
              lang: langCode,
              voice: config.voice,
              estabelecimentoId: estabId,
              languageSuffix: langSuffix,
            }, 120000);

            return {
              audioUrl: result.audioUrl,
              text: `🔊 Áudio gerado com ${paidProvider.charAt(0).toUpperCase() + paidProvider.slice(1)} (pago)!\nIdioma: ${effectiveLanguage}\nTexto: "${textToSpeak.substring(0, 80)}"`,
            };
          } catch (err: any) {
            console.error('[Studio] Paid TTS error:', err);
            // Fall through to free Web Speech API
          }
        }

        // FREE: Web Speech API (browser built-in TTS)
        try {
          const audioUrl = await new Promise<string>((resolve, reject) => {
            if (!('speechSynthesis' in window)) {
              reject(new Error('Web Speech API não suportada neste navegador'));
              return;
            }

            const utterance = new SpeechSynthesisUtterance(textToSpeak);
            utterance.lang = effectiveLanguage;
            utterance.rate = config.speed || 1.0;
            utterance.pitch = config.pitch || 1.0;

            const voices = speechSynthesis.getVoices();
            const langPrefix = effectiveLanguage.split('-')[0];
            const matchedVoice = voices.find(v => v.lang.startsWith(langPrefix)) || voices[0];
            if (matchedVoice) utterance.voice = matchedVoice;

            utterance.onend = () => resolve('__webspeech__');
            utterance.onerror = (e) => reject(new Error(`Speech error: ${e.error}`));

            speechSynthesis.cancel();
            speechSynthesis.speak(utterance);
          });

          return {
            text: `🔊 Áudio gerado gratuitamente (Web Speech API)\nIdioma: ${effectiveLanguage} | Velocidade: ${config.speed || 1.0}x\nTexto: "${textToSpeak.substring(0, 80)}"`,
            _webSpeechText: textToSpeak,
            _webSpeechLang: effectiveLanguage,
            _webSpeechRate: config.speed || 1.0,
            _webSpeechPitch: config.pitch || 1.0,
          };
        } catch (err: any) {
          return {
            text: `🔊 Texto para fala: "${textToSpeak.substring(0, 100)}"\n\n⚠️ Web Speech API indisponível. Configure ElevenLabs para áudio de alta qualidade.`,
          };
        }
      }

      case 'musicGen': {
        // Always use config.prompt or a default — ignore audio from connected prompt blocks
        const rawMusicPrompt = config.prompt || combinedInput || 'Uma trilha sonora alegre e energética para marketing digital';

        const musicEstabId = localStorage.getItem('estabelecimentoId') || '';
        const musicDefaults = getStudioDefaults(musicEstabId);
        const musicLang = musicDefaults.defaultLanguage || 'pt-BR';
        const musicLangSuffix = getLanguagePromptSuffix(musicLang);
        const musicPrompt = rawMusicPrompt.match(/portugu[eê]s|pt-br|brazilian|brasil|english|español|french|deutsch/i) ? rawMusicPrompt : `${rawMusicPrompt} (${musicLangSuffix})`;
        const estabId = musicEstabId;
        let musicProvider: string | null = null;

        if (estabId) {
          for (const provider of ['elevenlabs', 'suno']) {
            const { data } = await supabase
              .from('ai_api_keys')
              .select('api_key, is_active')
              .eq('estabelecimento_id', estabId)
              .eq('provider', provider)
              .eq('is_active', true)
              .maybeSingle();
            if (data?.api_key) {
              musicProvider = provider;
              break;
            }
          }
        }

        if (musicProvider && estabId) {
          try {
            const result = await callStudio('generate_music', {
              prompt: musicPrompt,
              duration: config.duration || 30,
              provider: musicProvider,
              genre: config.genre,
              instrumental: config.instrumental,
              estabelecimentoId: estabId,
            }, 180000);

            return {
              audioUrl: result.audioUrl,
              text: `🎵 Música gerada com ${musicProvider.charAt(0).toUpperCase() + musicProvider.slice(1)}!\nPrompt: "${musicPrompt.substring(0, 80)}"\nDuração: ${result.duration || config.duration}s`,
            };
          } catch (err: any) {
            console.error('[Studio] Music generation error:', err);
            return {
              text: `🎵 Erro ao gerar música: ${err.message}\n\n⚠️ Verifique sua chave de API em Configurações → APIs Pagas.`,
            };
          }
        }

        return {
          text: `🎵 Música (${config.genre || 'ambient'}) - "${musicPrompt.substring(0, 80)}"\nDuração: ${config.duration || 30}s\n\n⚠️ Configure ElevenLabs ou Suno em Configurações → APIs Pagas para gerar música real.`,
        };
      }

      case 'lipSync':
        return {
          text: `👄 Sincronismo labial aplicado.\n\n⚠️ Para lip sync real, conecte o ElevenLabs Conversational AI.`,
        };

      case 'videoMerge':
        return {
          text: `🔗 Vídeos unidos com transição "${config.transition}" (${config.transitionDuration}s).\n\n⚠️ Para merge real de vídeo, conecte uma API de edição de vídeo.`,
        };

      case 'multiProductSelect': {
        const products = config.products || [];
        if (products.length === 0) throw new Error('Nenhum produto selecionado no bloco de múltiplos produtos.');
        return {
          _isMultiProduct: true,
          products: products.map((p: any) => ({
            id: p.id,
            nome: p.nome,
            foto_url: p.foto_url,
            imageUrl: p.foto_url,
            imageUrls: [p.foto_url],
            _referenceRole: 'produto',
            _referenceDesc: `[PRODUTO - PROIBIDO MODIFICAR] Este é o produto "${p.nome}". Você DEVE manter este produto EXATAMENTE como aparece na imagem de referência: mesmas cores, formato, detalhes, logotipo, tipografia e proporções. NÃO modifique, substitua, redesenhe ou reimagine o produto de forma alguma. NÃO invente elementos novos que não existem na foto original. Trate a imagem do produto como uma FOTOGRAFIA REAL que deve ser inserida na cena sem alterações. PROIBIDO renderizar uma segunda cópia, duplicata, miniatura ou versão de vitrine do produto — aparece UMA ÚNICA VEZ na cena. PROIBIDO faixa, barra, tarja, rótulo extra, placa, retângulo arredondado, quadrado branco ou moldura artificial em volta do produto.`,
          })),
        };
      }

      case 'randomPick': {
        // randomPick inherits gallery from connected input block OR uses its own config
        const estabId = localStorage.getItem('estabelecimentoId');
        let galleryImages: string[] = [];
        let inheritedRole = '';
        let inheritedDesc = '';

        // Check if there's a connected input with a gallery role (e.g. galleryInfluencer or _skipNoImage)
        const inputWithRole = inputs.find((i) => i?._referenceRole);
        if (inputWithRole?._referenceRole) {
          // Load ALL images from the same gallery category as the connected block
          inheritedRole = inputWithRole._referenceRole;
          const category = inheritedRole;

          if (category === 'salvas') {
            const { data } = await supabase
              .from('media_gallery')
              .select('public_url')
              .eq('estabelecimento_id', estabId || '')
              .in('tipo', ['image', 'gif'])
              .order('created_at', { ascending: false })
              .limit(100);
            galleryImages = (data || []).map((d: any) => d.public_url).filter(Boolean);
          } else {
            const { data } = await supabase
              .from('studio_gallery_images')
              .select('image_url')
              .eq('estabelecimento_id', estabId || '')
              .eq('categoria', category)
              .order('created_at', { ascending: false })
              .limit(100);
            galleryImages = (data || []).map((d: any) => d.image_url).filter(Boolean);
          }

          // Build desc from the connected block's desc pattern
          inheritedDesc = inputWithRole._referenceDesc || `Imagem aleatória da galeria "${category}" — use como referência visual.`;
        } else {
          // Fallback: use own galleryCategory config
          const category = config.galleryCategory || 'salvas';
          inheritedRole = category;

          if (category === 'salvas') {
            const { data } = await supabase
              .from('media_gallery')
              .select('public_url')
              .eq('estabelecimento_id', estabId || '')
              .in('tipo', ['image', 'gif'])
              .order('created_at', { ascending: false })
              .limit(100);
            galleryImages = (data || []).map((d: any) => d.public_url).filter(Boolean);
          } else {
            const { data } = await supabase
              .from('studio_gallery_images')
              .select('image_url')
              .eq('estabelecimento_id', estabId || '')
              .eq('categoria', category)
              .order('created_at', { ascending: false })
              .limit(100);
            galleryImages = (data || []).map((d: any) => d.image_url).filter(Boolean);
          }
          inheritedDesc = `Imagem aleatória da galeria "${category}" — use como referência visual.`;
        }

        if (galleryImages.length === 0) throw new Error(`Nenhuma imagem encontrada na galeria "${inheritedRole}".`);

        // Pick a random one for single execution; loop runner will override per iteration
        const randomUrl = galleryImages[Math.floor(Math.random() * galleryImages.length)];
        return {
          _isRandomPick: true,
          _galleryImages: galleryImages,
          _inheritedRole: inheritedRole,
          _inheritedDesc: inheritedDesc,
          imageUrl: randomUrl,
          imageUrls: [randomUrl],
          _referenceRole: inheritedRole,
          _referenceDesc: inheritedDesc,
        };
      }

      case 'loopOutput':
        // loopOutput is handled specially in executeWorkflow; here just return inputs
        return inputs[inputs.length - 1] || { text: 'Aguardando execução em lote...' };

      case 'output':
        return inputs[inputs.length - 1] || { text: 'Nenhuma entrada recebida' };

      default:
        return { text: `Tipo desconhecido: ${type}` };
    }
  };

  const executeWorkflow = useCallback(async (
    nodes: StudioNode[],
    edges: StudioEdge[],
    startFromNodeId?: string,
    onNodesUpdate?: (nodes: StudioNode[]) => void
  ): Promise<StudioNode[]> => {
    setIsExecuting(true);
    abortRef.current = new AbortController();
    onNodesUpdateRef.current = onNodesUpdate || null;

    const order = getExecutionOrder(nodes, edges);
    console.log('[Studio] Execution order:', order.map(id => {
      const n = nodes.find(nn => nn.id === id);
      return `${id} (${(n?.data as any)?.type || '?'})`;
    }));
    console.log('[Studio] Total nodes:', nodes.length, 'Total edges:', edges.length);
    const results = new Map<string, any>();
    let updatedNodes = [...nodes];

    let startIndex = 0;
    if (startFromNodeId) {
      startIndex = order.indexOf(startFromNodeId);
      if (startIndex < 0) startIndex = 0;
      for (let i = 0; i < startIndex; i++) {
        const node = nodes.find((n) => n.id === order[i]);
        if (node?.data.result) {
          results.set(order[i], node.data.result);
        }
      }
    }

    // Build initial log
    const initialLog: ExecutionLogEntry[] = order.map((nodeId, idx) => {
      const node = nodes.find((n) => n.id === nodeId);
      const nd = node?.data as StudioNodeData;
      const isPaused = !!nd?.config?._paused;
      return {
        nodeId,
        nodeLabel: nd?.label || nodeId,
        nodeType: nd?.type || 'unknown',
        status: idx < startIndex ? 'skipped' : isPaused ? 'skipped' : 'pending',
      };
    });
    setExecutionLog(initialLog);

    const updateLog = (nodeId: string, partial: Partial<ExecutionLogEntry>) => {
      setExecutionLog((prev) =>
        prev.map((e) => (e.nodeId === nodeId ? { ...e, ...partial } : e))
      );
    };

    const updateNode = (id: string, partial: Partial<StudioNodeData>) => {
      updatedNodes = updatedNodes.map((n) =>
        n.id === id ? { ...n, data: { ...n.data, ...partial } } : n
      );
      // Emit real-time update
      if (onNodesUpdateRef.current) {
        onNodesUpdateRef.current([...updatedNodes]);
      }
    };

    // Helper: find all ancestor node IDs for a given node
    const getAncestors = (nodeId: string): Set<string> => {
      const ancestors = new Set<string>();
      const visit = (id: string) => {
        edges.filter(e => e.target === id).forEach(e => {
          if (!ancestors.has(e.source)) {
            ancestors.add(e.source);
            visit(e.source);
          }
        });
      };
      visit(nodeId);
      return ancestors;
    };

    try {
      for (let i = startIndex; i < order.length; i++) {
        // Check if execution was cancelled
        if (abortRef.current?.signal.aborted) {
          // Mark remaining nodes as skipped
          for (let j = i; j < order.length; j++) {
            updateLog(order[j], { status: 'skipped' });
          }
          toast.info('⏹️ Execução cancelada pelo usuário.');
          break;
        }

        const nodeId = order[i];
        const node = nodes.find((n) => n.id === nodeId);
        if (!node) continue;

        const nd = node.data as StudioNodeData;

        // Skip paused nodes
        if (nd.config?._paused) {
          updateLog(nodeId, { status: 'skipped' });
          updateNode(nodeId, { isProcessing: false });
          continue;
        }

        // ====== LOOP OUTPUT SPECIAL HANDLING ======
        if (nd.type === 'loopOutput') {
          setCurrentNodeId(nodeId);
          const startTime = Date.now();
          updateNode(nodeId, { isProcessing: true, error: undefined });
          nodeResultStore.setProcessing(nodeId, true);
          nodeResultStore.clearError(nodeId);
          updateLog(nodeId, { status: 'running', startedAt: startTime });

          try {
            // 1. Find the multiProductSelect ancestor
            const ancestors = getAncestors(nodeId);
            const multiProductNodeId = order.find(id => {
              const n = nodes.find(nn => nn.id === id);
              return n && (n.data as StudioNodeData).type === 'multiProductSelect' && ancestors.has(id);
            });

            if (!multiProductNodeId) throw new Error('Bloco "Múltiplos Produtos" não encontrado conectado a este bloco de Saída em Lote.');

            const multiResult = results.get(multiProductNodeId);
            if (!multiResult?._isMultiProduct || !multiResult.products?.length) {
              throw new Error('O bloco de Múltiplos Produtos não tem produtos. Selecione pelo menos um produto.');
            }

            const products = multiResult.products;

            // 2. Find intermediate nodes between multiProduct and loopOutput
            const directInputEdges = edges.filter(e => e.target === nodeId);
            const intermediateNodes = order.filter(id => {
              if (id === multiProductNodeId || id === nodeId) return false;
              const n = nodes.find(nn => nn.id === id);
              if (!n) return false;
              const nType = (n.data as StudioNodeData).type;
              // Only re-execute processing nodes in the path, not pure inputs or galleries
              const inputTypes = ['textInput', 'systemPrompt', 'imageInput', 'multiImageRef', 'productImageSelect', 'multiProductSelect',
                'galleryInfluencer', 'galleryAmbiente', 'galleryEstilo', 'galleryPaleta', 'galleryTextura',
                'galleryLogo', 'galleryPose', 'galleryRoupa', 'gallerySalvas', 'mediaGallery'];
              return ancestors.has(id) && !inputTypes.includes(nType);
            });

            // 3. Find randomPick nodes in the chain
            const randomPickNodes = intermediateNodes.filter(id => {
              const n = nodes.find(nn => nn.id === id);
              return n && (n.data as StudioNodeData).type === 'randomPick';
            });

            // Pre-load randomPick galleries
            for (const rpId of randomPickNodes) {
              if (!results.has(rpId)) {
                const rpNode = nodes.find(n => n.id === rpId)!;
                const rpInputs = getInputResults(rpId, edges, results);
                const rpResult = await executeNode(rpNode, rpInputs, edges, nodes);
                results.set(rpId, rpResult);
              }
            }

      const loopResults: any[] = [];

            // 4. Loop through each product
            for (let pi = 0; pi < products.length; pi++) {
              // Check cancellation inside batch loop
              if (abortRef.current?.signal.aborted) {
                toast.info(`⏹️ Lote cancelado após ${pi}/${products.length} produtos.`);
                break;
              }
              const product = products[pi];
              const productName = product.nome || `Produto ${pi + 1}`;

              nodeResultStore.setResult(nodeId, {
                text: `🔄 Processando ${pi + 1}/${products.length}: ${productName}...`,
                loopResults,
              });

              // Override multiProductSelect result with single product for this iteration
              // Mirror EXACTLY the shape produced by productImageSelect so the generation
              // block applies all product-lock / VI / anti-duplicate rules the same way
              // as the single "Gerar Imagem" flow.
              const singleProductResult = {
                imageUrl: product.foto_url,
                imageUrls: [product.foto_url],
                productId: product.id,
                productName: product.nome,
                _referenceRole: 'produto',
                _referenceDesc: product._referenceDesc,
              };
              results.set(multiProductNodeId, singleProductResult);

              // Override randomPick with new random each iteration
              for (const rpId of randomPickNodes) {
                const rpResult = results.get(rpId);
                if (rpResult?._galleryImages?.length > 0) {
                  const randomUrl = rpResult._galleryImages[Math.floor(Math.random() * rpResult._galleryImages.length)];
                  results.set(rpId, {
                    ...rpResult,
                    imageUrl: randomUrl,
                    imageUrls: [randomUrl],
                  });
                }
              }

              // Re-execute intermediate nodes
              let lastResult: any = null;
              for (const intId of intermediateNodes) {
                const intNode = nodes.find(n => n.id === intId)!;
                const intNd = intNode.data as StudioNodeData;

                // Skip randomPick (already set above) and paused
                if (intNd.type === 'randomPick' || intNd.config?._paused) continue;

                try {
                  const intInputs = getInputResults(intId, edges, results);
                  const intResult = await executeNode(intNode, intInputs, edges, nodes);
                  results.set(intId, intResult);
                  nodeResultStore.setResult(intId, intResult);
                  lastResult = intResult;
                } catch (intErr: any) {
                  if (abortRef.current?.signal.aborted) throw intErr;
                  console.error(`[Studio Loop] Node ${intId} failed for product ${pi}:`, intErr.message);
                  toast.error(`Loop ${pi + 1}: ${intErr.message?.substring(0, 80)}`, { duration: 4000 });
                }
              }

              // Get the direct input to loopOutput
              const loopInputs = getInputResults(nodeId, edges, results);
              const finalResult = loopInputs[loopInputs.length - 1] || lastResult;

              if (finalResult?.imageUrl) {
                loopResults.push({ imageUrl: finalResult.imageUrl, productName, productId: product.id });
                toast.success(`✅ ${pi + 1}/${products.length}: ${productName} concluído!`, { duration: 3000 });
              }
            }

            // Restore multiProduct result
            results.set(multiProductNodeId, multiResult);

            const finalLoopResult = {
              text: `🔄 Lote concluído! ${loopResults.length}/${products.length} imagens geradas. Revise e selecione quais salvar.`,
              loopResults,
              _needsReview: true,
            };
            const elapsed = Date.now() - startTime;
            results.set(nodeId, finalLoopResult);
            updateNode(nodeId, { isProcessing: false, result: finalLoopResult });
            nodeResultStore.setResult(nodeId, finalLoopResult);
            nodeResultStore.setProcessing(nodeId, false);
            updateLog(nodeId, { status: 'success', completedAt: Date.now(), elapsedMs: elapsed });
            
            // Open review dialog instead of auto-saving
            if (loopResults.length > 0) {
              setBatchReviewResults(loopResults);
            }
            toast.success(`🎉 Lote finalizado! ${loopResults.length} imagens geradas. Revise e salve.`, { duration: 6000 });

          } catch (err: any) {
            if (abortRef.current?.signal.aborted) break;
            const elapsed = Date.now() - startTime;
            const errMsg = err.message || 'Erro desconhecido';
            updateNode(nodeId, { isProcessing: false, error: errMsg });
            nodeResultStore.setProcessing(nodeId, false);
            nodeResultStore.setError(nodeId, errMsg);
            updateLog(nodeId, { status: 'error', completedAt: Date.now(), elapsedMs: elapsed, errorMessage: errMsg });
            toast.error(`Erro no lote: ${errMsg.substring(0, 100)}`, { duration: 6000 });
          }
          continue;
        }

        // ====== NORMAL NODE EXECUTION ======
        setCurrentNodeId(nodeId);
        const startTime = Date.now();
        updateNode(nodeId, { isProcessing: true, error: undefined });
        nodeResultStore.setProcessing(nodeId, true);
        nodeResultStore.clearError(nodeId);
        updateLog(nodeId, { status: 'running', startedAt: startTime });

        try {
          const inputs = getInputResults(nodeId, edges, results);
          console.log(`[Studio] Node ${nodeId} (${nd.type}) inputs:`, inputs.length, 'items');
          const result = await executeNode(node, inputs, edges, nodes);
          console.log(`[Studio] Node ${nodeId} (${nd.type}) result:`, typeof result, result?.imageUrl ? 'has imageUrl' : 'no imageUrl', result?.videoUrl ? 'has videoUrl' : '');
          const elapsed = Date.now() - startTime;
          results.set(nodeId, result);
          updateNode(nodeId, { isProcessing: false, result });
          nodeResultStore.setResult(nodeId, result);
          nodeResultStore.setProcessing(nodeId, false);
          updateLog(nodeId, { status: 'success', completedAt: Date.now(), elapsedMs: elapsed });
          // Notify user of image generation success
          if (result?.imageUrl) {
            toast.success('🎨 Imagem gerada com sucesso!', { duration: 4000 });
          }
        } catch (err: any) {
          if (abortRef.current?.signal.aborted) break;
          const elapsed = Date.now() - startTime;
          const errMsg = err.message || 'Erro desconhecido';
          console.error(`[Studio] Node ${nodeId} (${nd.type}) failed:`, errMsg);
          updateNode(nodeId, { isProcessing: false, error: errMsg });
          nodeResultStore.setProcessing(nodeId, false);
          nodeResultStore.setError(nodeId, errMsg);
          updateLog(nodeId, { status: 'error', completedAt: Date.now(), elapsedMs: elapsed, errorMessage: errMsg });
          toast.error(`Erro no bloco "${nd.label}": ${errMsg.substring(0, 100)}`, { duration: 6000 });
          // Stop execution on error
          break;
        }
      }
    } finally {
      setIsExecuting(false);
      setCurrentNodeId(null);
      abortRef.current = null;
    }

    return updatedNodes;
  }, []);

  const cancelExecution = useCallback(() => {
    if (abortRef.current) {
      abortRef.current.abort();
    }
    setIsExecuting(false);
    setCurrentNodeId(null);
  }, []);

  const clearLog = useCallback(() => {
    setExecutionLog([]);
  }, []);

  return { executeWorkflow, isExecuting, executionLog, currentNodeId, clearLog, cancelExecution, batchReviewResults, setBatchReviewResults };
}
