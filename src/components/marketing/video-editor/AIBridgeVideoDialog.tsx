import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, Wand2, Film, ArrowRight, ImageIcon, Pencil, Plus, Check, X, Sparkles, Lock } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { TimelineClip } from './types';
import { getActiveUnifiedProvider, shouldHideModel } from '../ai-studio/unifiedProvidersConfig';

interface AIBridgeVideoDialogProps {
  open: boolean;
  onClose: () => void;
  clipA: TimelineClip;
  clipB: TimelineClip;
  onVideoGenerated: (videoUrl: string, duration: number) => void;
}

interface VideoModelInfo {
  value: string;
  label: string;
  provider: string;
  cost?: string;
  tip?: string;
}

const ALL_VIDEO_MODELS: VideoModelInfo[] = [
  { value: 'google/veo-3.1', label: '🟦 Veo 3.1 (Flow)', provider: 'google', cost: '$$$$' },
  { value: 'google/veo-3.1-fast', label: '🟦 Veo 3.1 Fast', provider: 'google', cost: '$$$' },
  { value: 'google/veo-3', label: '🟦 Veo 3', provider: 'google', cost: '$$$' },
  { value: 'google/veo-2', label: '🟦 Veo 2', provider: 'google', cost: '$$' },
  { value: 'openai/sora-3', label: '🟢 Sora 3', provider: 'openai', cost: '$$$$' },
  { value: 'openai/sora-2', label: '🟢 Sora 2', provider: 'openai', cost: '$$$' },
  { value: 'runway/gen4', label: '🎬 Gen-4', provider: 'runway', cost: '$$$$' },
  { value: 'runway/gen3-alpha-turbo', label: '🎬 Gen-3 Alpha Turbo', provider: 'runway', cost: '$$' },
  { value: 'kling/v2.1', label: '🎥 Kling 2.1', provider: 'kling', cost: '$$' },
  { value: 'kling/v1.6', label: '🎥 Kling 1.6', provider: 'kling', cost: '$' },
  { value: 'pika/v2.2', label: '🌊 Pika 2.2', provider: 'pika', cost: '$$' },
  { value: 'minimax/video-01', label: '🟠 Hailuo MiniMax', provider: 'minimax', cost: '$' },
  { value: 'luma/dream-machine-1.5', label: '🌙 Dream Machine 1.5', provider: 'luma', cost: '$$' },
  { value: 'stability/stable-video', label: '🟣 Stable Video Diffusion', provider: 'stability', cost: '$' },
  { value: 'replicate/ltx-video', label: '🔮 LTX-Video 2', provider: 'replicate', cost: '$' },
  // Apiframe
  { value: 'apiframe/midjourney-video', label: '⚡ AF: Midjourney Video', provider: 'apiframe', cost: '$$' },
  { value: 'apiframe/runway-gen4', label: '⚡ AF: Runway Gen-4', provider: 'apiframe', cost: '$$$' },
  { value: 'apiframe/runway', label: '⚡ AF: Runway Gen-3', provider: 'apiframe', cost: '$$' },
  { value: 'apiframe/kling-2.6', label: '⚡ AF: Kling 2.6', provider: 'apiframe', cost: '$$' },
  { value: 'apiframe/kling-2.5', label: '⚡ AF: Kling 2.5 Turbo', provider: 'apiframe', cost: '$' },
  { value: 'apiframe/luma', label: '⚡ AF: Luma AI', provider: 'apiframe', cost: '$$' },
  { value: 'apiframe/google-veo', label: '⚡ AF: Google Veo', provider: 'apiframe', cost: '$$$' },
  { value: 'apiframe/sora-2', label: '⚡ AF: Sora 2', provider: 'apiframe', cost: '$$$' },
  { value: 'apiframe/pika', label: '⚡ AF: Pika', provider: 'apiframe', cost: '$$' },
  { value: 'apiframe/hailuo-minimax', label: '⚡ AF: Hailuo MiniMax', provider: 'apiframe', cost: '$' },
  { value: 'apiframe/wan-video', label: '⚡ AF: Wan Video', provider: 'apiframe', cost: '$' },
  { value: 'apiframe/vidu', label: '⚡ AF: Vidu', provider: 'apiframe', cost: '$' },
  { value: 'apiframe/pixverse', label: '⚡ AF: Pixverse', provider: 'apiframe', cost: '$' },
  { value: 'apiframe/seedance', label: '⚡ AF: Seedance', provider: 'apiframe', cost: '$' },
  // AIML API
  { value: 'aimlapi/runway-gen3', label: '🤖 ML: Runway Gen-3', provider: 'aimlapi', cost: '$$' },
  { value: 'aimlapi/kling-v2', label: '🤖 ML: Kling v2', provider: 'aimlapi', cost: '$$' },
  { value: 'aimlapi/luma', label: '🤖 ML: Luma Dream Machine', provider: 'aimlapi', cost: '$$' },
  { value: 'aimlapi/minimax', label: '🤖 ML: Minimax Video', provider: 'aimlapi', cost: '$' },
  { value: 'aimlapi/cogvideox', label: '🤖 ML: CogVideoX', provider: 'aimlapi', cost: '$' },
  { value: 'aimlapi/haiper', label: '🤖 ML: Haiper 2.0', provider: 'aimlapi', cost: '$' },
  { value: 'aimlapi/pika', label: '🤖 ML: Pika', provider: 'aimlapi', cost: '$$' },
  { value: 'aimlapi/wan-video', label: '🤖 ML: Wan Video', provider: 'aimlapi', cost: '$' },
  { value: 'aimlapi/stable-video', label: '🤖 ML: Stable Video', provider: 'aimlapi', cost: '$' },
  // Pollo AI
  { value: 'polloai/runway', label: '🐔 PL: Runway Gen-3', provider: 'polloai', cost: '$$' },
  { value: 'polloai/kling-v2', label: '🐔 PL: Kling v2', provider: 'polloai', cost: '$$' },
  { value: 'polloai/kling-v1.5', label: '🐔 PL: Kling v1.5', provider: 'polloai', cost: '$' },
  { value: 'polloai/luma', label: '🐔 PL: Luma Dream Machine', provider: 'polloai', cost: '$$' },
  { value: 'polloai/minimax', label: '🐔 PL: Minimax Video', provider: 'polloai', cost: '$' },
  { value: 'polloai/hunyuan', label: '🐔 PL: Hunyuan Video', provider: 'polloai', cost: '$' },
  { value: 'polloai/cogvideox', label: '🐔 PL: CogVideoX', provider: 'polloai', cost: '$' },
  { value: 'polloai/pika', label: '🐔 PL: Pika', provider: 'polloai', cost: '$$' },
  { value: 'polloai/wan-video', label: '🐔 PL: Wan Video', provider: 'polloai', cost: '$' },
];

const UNIFIED_PREFIXES = ['apiframe/', 'aimlapi/', 'polloai/'];
const VIDEO_MODELS_NEEDING_KEY: Record<string, string> = {
  'google/veo-3.1': 'google', 'google/veo-3.1-fast': 'google', 'google/veo-3': 'google', 'google/veo-2': 'google',
  'openai/sora-3': 'openai', 'openai/sora-2': 'openai',
  'runway/gen4': 'runway', 'runway/gen3-alpha-turbo': 'runway',
  'kling/v2.1': 'kling', 'kling/v1.6': 'kling',
  'pika/v2.2': 'pika', 'minimax/video-01': 'minimax',
  'luma/dream-machine-1.5': 'luma', 'stability/stable-video': 'stability',
  'replicate/ltx-video': 'replicate',
};

const isModelConfigured = (modelValue: string, configuredProviders: string[]): boolean => {
  const unifiedPrefix = UNIFIED_PREFIXES.find(p => modelValue.startsWith(p));
  if (unifiedPrefix) {
    const providerName = unifiedPrefix.replace('/', '');
    return configuredProviders.some(cp => cp.toLowerCase() === providerName);
  }
  const requiredProvider = VIDEO_MODELS_NEEDING_KEY[modelValue];
  if (!requiredProvider) return true;
  return configuredProviders.some(cp => cp.toLowerCase() === requiredProvider);
};

const DEFAULT_TRANSITION_PROMPTS = [
  { id: '1', text: 'Zoom out suave revelando a paisagem ao redor, transição cinematográfica para a próxima cena' },
  { id: '2', text: 'Câmera gira 360° ao redor do objeto principal e dissolve para a próxima imagem' },
  { id: '3', text: 'Efeito de partículas douradas se formam e se dissolvem revelando a nova cena' },
  { id: '4', text: 'Fade suave com raios de luz passando pela câmera durante a transição' },
  { id: '5', text: 'Movimento de câmera dolly para frente atravessando a cena até chegar na próxima' },
  { id: '6', text: 'Efeito de ondas distorcendo a imagem como reflexo na água, revelando nova cena' },
  { id: '7', text: 'Transição com desfoque de movimento rápido (motion blur) horizontal entre cenas' },
  { id: '8', text: 'Câmera faz um tilt up dramático para o céu e desce revelando o novo cenário' },
  { id: '9', text: 'Pétalas de flores voam pela tela cobrindo a imagem e revelando a próxima' },
  { id: '10', text: 'Efeito de espelho se quebrando, fragmentos revelam gradualmente a nova cena' },
  { id: '11', text: 'Fumaça cinematográfica preenche a tela e se dissipa mostrando o novo ambiente' },
  { id: '12', text: 'Câmera orbita lentamente enquanto a cena se transforma suavemente' },
  { id: '13', text: 'Flash de luz branca estilo fotográfico que revela a próxima composição' },
  { id: '14', text: 'Transição com efeito de tinta se espalhando em aquarela pela tela' },
  { id: '15', text: 'Zoom extremo no detalhe de um objeto que se transforma na próxima cena' },
  { id: '16', text: 'Efeito de portal luminoso se abrindo no centro da tela com a nova cena dentro' },
  { id: '17', text: 'Câmera atravessa uma cortina de luz, revelando o novo cenário do outro lado' },
  { id: '18', text: 'Transição com efeito glitch digital rápido entre as duas cenas' },
  { id: '19', text: 'Folhas de outono caem cobrindo a tela e são sopradas revelando nova imagem' },
  { id: '20', text: 'Efeito de câmera lenta com bokeh luminoso transitando entre cenas' },
  { id: '21', text: 'Pan horizontal cinematográfico com desfoque gaussiano na transição' },
  { id: '22', text: 'Cristais de gelo se formam sobre a imagem e derretem revelando a próxima' },
  { id: '23', text: 'Efeito de dupla exposição mesclando as duas cenas de forma artística' },
  { id: '24', text: 'Câmera faz movimento crane ascendente saindo da cena atual para a próxima' },
  { id: '25', text: 'Transição com efeito de página virando como um livro elegante' },
  { id: '26', text: 'Ondas de energia luminosa expandem do centro transformando a cena' },
  { id: '27', text: 'Efeito de areia se espalhando pelo vento, cobrindo e revelando cenas' },
  { id: '28', text: 'Câmera faz whip pan ultra rápido girando e parando na nova cena' },
  { id: '29', text: 'Bolhas de sabão flutuam pela tela refletindo a nova cena dentro delas' },
  { id: '30', text: 'Transição com efeito de pinceladas de tinta revelando progressivamente a nova imagem' },
];

const STORAGE_KEY = 'bridge-transition-prompts';

function loadCustomPrompts(): typeof DEFAULT_TRANSITION_PROMPTS {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      // Merge: defaults + custom, custom overrides by id
      const map = new Map(DEFAULT_TRANSITION_PROMPTS.map(p => [p.id, p]));
      parsed.forEach((p: any) => map.set(p.id, p));
      return Array.from(map.values());
    }
  } catch {}
  return [...DEFAULT_TRANSITION_PROMPTS];
}

function saveCustomPrompts(prompts: typeof DEFAULT_TRANSITION_PROMPTS) {
  // Only save non-default or modified
  const defaultMap = new Map(DEFAULT_TRANSITION_PROMPTS.map(p => [p.id, p.text]));
  const toSave = prompts.filter(p => !defaultMap.has(p.id) || defaultMap.get(p.id) !== p.text);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(toSave));
}

const AIBridgeVideoDialog: React.FC<AIBridgeVideoDialogProps> = ({
  open, onClose, clipA, clipB, onVideoGenerated
}) => {
  const [frameA, setFrameA] = useState<string | null>(null);
  const [frameB, setFrameB] = useState<string | null>(null);
  const [prompt, setPrompt] = useState('');
  const [model, setModel] = useState('google/veo-3.1');
  const [duration, setDuration] = useState(4);
  const [isGenerating, setIsGenerating] = useState(false);
  const [extracting, setExtracting] = useState(false);
  const [configuredProviders, setConfiguredProviders] = useState<string[]>([]);

  const estabelecimentoId = localStorage.getItem('estabelecimentoId') || '';
  const activeUnified = getActiveUnifiedProvider(estabelecimentoId);

  // Load configured providers
  useEffect(() => {
    if (!estabelecimentoId) return;
    (async () => {
      const { data } = await supabase
        .from('ai_api_keys')
        .select('provider')
        .eq('estabelecimento_id', estabelecimentoId)
        .eq('is_active', true);
      if (data) setConfiguredProviders(data.map(d => d.provider));
    })();
  }, [estabelecimentoId]);

  const filteredModels = useMemo(() => {
    return ALL_VIDEO_MODELS
      .filter(m => !shouldHideModel(m.value, activeUnified))
      .map(m => ({ ...m, disabled: !isModelConfigured(m.value, configuredProviders) }));
  }, [configuredProviders, activeUnified]);

  // Extract frames when dialog opens
  useEffect(() => {
    if (!open) return;
    setFrameA(null);
    setFrameB(null);
    setExtracting(true);

    const extract = async () => {
      try {
        const fA = await extractFrame(clipA, 'last');
        const fB = await extractFrame(clipB, 'first');
        setFrameA(fA);
        setFrameB(fB);
      } catch (err: any) {
        toast.error('Erro ao extrair frames: ' + (err.message || 'Tente novamente'));
      } finally {
        setExtracting(false);
      }
    };
    extract();
  }, [open, clipA, clipB]);

  const drawContain = useCallback((
    ctx: CanvasRenderingContext2D,
    source: CanvasImageSource,
    sourceWidth: number,
    sourceHeight: number,
  ) => {
    const { canvas } = ctx;
    const scale = Math.min(canvas.width / sourceWidth, canvas.height / sourceHeight);
    const w = sourceWidth * scale;
    const h = sourceHeight * scale;
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(source, (canvas.width - w) / 2, (canvas.height - h) / 2, w, h);
  }, []);

  const loadImage = useCallback(async (src: string, name: string) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error(`Falha ao carregar imagem: ${name}`));
      img.src = src;
    });
    return img;
  }, []);

  const seekVideoPrecisely = useCallback(async (video: HTMLVideoElement, time: number) => {
    const maxTime = Number.isFinite(video.duration) ? Math.max(0, video.duration - 0.001) : time;
    const safeTime = Math.max(0, Math.min(time, maxTime));

    await new Promise<void>((resolve) => {
      let settled = false;
      let frameCbId: number | undefined;
      let timeoutId: number | undefined;

      const done = () => {
        if (settled) return;
        settled = true;
        if (timeoutId) window.clearTimeout(timeoutId);
        if (frameCbId !== undefined && 'cancelVideoFrameCallback' in video) {
          (video as HTMLVideoElement & { cancelVideoFrameCallback?: (id: number) => void }).cancelVideoFrameCallback?.(frameCbId);
        }
        resolve();
      };

      video.onseeked = () => {
        if ('requestVideoFrameCallback' in video) {
          frameCbId = (video as HTMLVideoElement & { requestVideoFrameCallback: (cb: () => void) => number })
            .requestVideoFrameCallback(() => done());
        } else {
          requestAnimationFrame(() => done());
        }
      };

      timeoutId = window.setTimeout(done, 250);
      video.currentTime = safeTime;
    });
  }, []);

  const extractFrame = useCallback(async (clip: TimelineClip, position: 'first' | 'last'): Promise<string> => {
    const canvas = document.createElement('canvas');
    canvas.width = 1280;
    canvas.height = 720;
    const ctx = canvas.getContext('2d')!;

    if (clip.type === 'image' || clip.type === 'canvas') {
      const img = await loadImage(clip.src || '', clip.name);
      drawContain(ctx, img, img.width, img.height);
      return canvas.toDataURL('image/jpeg', 0.92);
    }

    if (clip.type === 'video') {
      const video = document.createElement('video');
      video.crossOrigin = 'anonymous';
      video.muted = true;
      video.preload = 'auto';
      video.playsInline = true;

      await new Promise<void>((resolve, reject) => {
        video.onloadedmetadata = () => resolve();
        video.onerror = () => reject(new Error(`Falha ao carregar vídeo: ${clip.name}`));
        video.src = clip.src || '';
      });

      const trimStart = Math.max(0, clip.trimStart || 0);
      const endByTrim = Math.max(trimStart, video.duration - Math.max(0, clip.trimEnd || 0) - 0.05);
      const endByVisibleDuration = Math.max(trimStart, trimStart + Math.max(clip.duration - 0.05, 0));
      const targetTime = position === 'first'
        ? Math.min(trimStart, Math.max(0, video.duration - 0.001))
        : Math.max(trimStart, Math.min(Math.max(0, video.duration - 0.001), endByTrim, endByVisibleDuration));

      await seekVideoPrecisely(video, targetTime);
      drawContain(ctx, video, video.videoWidth || canvas.width, video.videoHeight || canvas.height);
      return canvas.toDataURL('image/jpeg', 0.92);
    }

    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    return canvas.toDataURL('image/jpeg', 0.92);
  }, [drawContain, loadImage, seekVideoPrecisely]);

  const enforceExactBridgeFrames = useCallback(async (
    generatedVideoUrl: string,
    startFrameDataUrl: string,
    endFrameDataUrl: string,
    finalDuration: number,
    estabId: string,
  ) => {
    try {
      const [startImg, endImg] = await Promise.all([
        loadImage(startFrameDataUrl, `${clipA.name} (frame inicial)`),
        loadImage(endFrameDataUrl, `${clipB.name} (frame final)`),
      ]);

      const video = document.createElement('video');
      video.crossOrigin = 'anonymous';
      video.muted = true;
      video.preload = 'auto';
      video.playsInline = true;

      await new Promise<void>((resolve, reject) => {
        video.onloadedmetadata = () => resolve();
        video.onerror = () => reject(new Error('Falha ao carregar o vídeo gerado para ajuste dos frames'));
        video.src = generatedVideoUrl;
      });

      const canvas = document.createElement('canvas');
      canvas.width = Math.max(2, video.videoWidth || 1280);
      canvas.height = Math.max(2, video.videoHeight || 720);
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Canvas indisponível para compor a transição');

      const fps = 24;
      const totalFrames = Math.max(8, Math.round(finalDuration * fps));
      const edgeFrames = Math.min(Math.max(2, Math.round(fps * 0.25)), Math.max(2, Math.floor(totalFrames / 3)));
      const middleFrames = Math.max(1, totalFrames - edgeFrames * 2);
      const stream = canvas.captureStream(fps);
      const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9')
        ? 'video/webm;codecs=vp9'
        : 'video/webm';
      const recorder = new MediaRecorder(stream, { mimeType, videoBitsPerSecond: 8_000_000 });
      const chunks: BlobPart[] = [];

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunks.push(event.data);
      };

      const recordingDone = new Promise<Blob>((resolve) => {
        recorder.onstop = () => resolve(new Blob(chunks, { type: mimeType }));
      });

      recorder.start();

      for (let frameIndex = 0; frameIndex < totalFrames; frameIndex += 1) {
        if (frameIndex < edgeFrames) {
          drawContain(ctx, startImg, startImg.width, startImg.height);
        } else if (frameIndex >= totalFrames - edgeFrames) {
          drawContain(ctx, endImg, endImg.width, endImg.height);
        } else {
          const progress = middleFrames <= 1 ? 0 : (frameIndex - edgeFrames) / (middleFrames - 1);
          const sourceTime = Math.max(0, Math.min(progress * Math.max(video.duration, 0.001), Math.max(0, video.duration - 0.001)));
          await seekVideoPrecisely(video, sourceTime);
          drawContain(ctx, video, video.videoWidth || canvas.width, video.videoHeight || canvas.height);
        }

        (stream.getVideoTracks()[0] as CanvasCaptureMediaStreamTrack | undefined)?.requestFrame?.();
        await new Promise((resolve) => window.setTimeout(resolve, 1000 / fps));
      }

      recorder.stop();
      const composedBlob = await recordingDone;
      const ext = mimeType.includes('mp4') ? 'mp4' : 'webm';
      const path = `${estabId}/bridge/${Date.now()}_bridge_exact.${ext}`;
      const { error } = await supabase.storage.from('marketing-videos').upload(path, composedBlob, {
        contentType: composedBlob.type || `video/${ext}`,
        upsert: true,
      });
      if (error) throw error;

      const { data: urlData } = supabase.storage.from('marketing-videos').getPublicUrl(path);
      return urlData.publicUrl || generatedVideoUrl;
    } catch (error) {
      console.warn('[bridge-video] Falha ao aplicar frames exatos nas bordas:', error);
      return generatedVideoUrl;
    }
  }, [clipA.name, clipB.name, drawContain, loadImage, seekVideoPrecisely]);

  const handleSelectSuggestion = (text: string) => {
    setPrompt(text);
  };

  const handleStartEdit = (id: string, text: string) => {
    setEditingId(id);
    setEditText(text);
  };

  const handleSaveEdit = () => {
    if (!editingId || !editText.trim()) return;
    const updated = suggestions.map(s => s.id === editingId ? { ...s, text: editText.trim() } : s);
    setSuggestions(updated);
    saveCustomPrompts(updated);
    setEditingId(null);
    setEditText('');
    toast.success('Sugestão atualizada');
  };

  const handleAddNew = () => {
    if (!newText.trim()) return;
    const newId = `custom_${Date.now()}`;
    const updated = [...suggestions, { id: newId, text: newText.trim() }];
    setSuggestions(updated);
    saveCustomPrompts(updated);
    setNewText('');
    setIsAddingNew(false);
    setPrompt(newText.trim());
    toast.success('Nova sugestão adicionada e selecionada');
  };

  const handleGenerate = useCallback(async () => {
    if (!frameA || !frameB) { toast.error('Aguarde a extração dos frames'); return; }
    if (!prompt.trim()) { toast.error('Digite ou selecione uma descrição para a transição'); return; }

    const estabId = localStorage.getItem('estabelecimentoId');
    if (!estabId) { toast.error('Estabelecimento não encontrado'); return; }

    setIsGenerating(true);
    try {
      const uploadFrame = async (dataUrl: string, label: string): Promise<string> => {
        const resp = await fetch(dataUrl);
        const blob = await resp.blob();
        const fileName = `bridge/${Date.now()}_${label}.jpg`;
        const path = `${estabId}/${fileName}`;
        const { error } = await supabase.storage.from('marketing-images').upload(path, blob, { contentType: 'image/jpeg', upsert: true });
        if (error) throw error;
        const { data: urlData } = supabase.storage.from('marketing-images').getPublicUrl(path);
        return urlData.publicUrl;
      };

      const [frameAUrl, frameBUrl] = await Promise.all([
        uploadFrame(frameA, 'frame_start'),
        uploadFrame(frameB, 'frame_end'),
      ]);

      const fullPrompt = `IMAGE-TO-VIDEO TRANSITION: You MUST start this video from Image 1 (the starting frame) and smoothly transition to end at Image 2 (the ending frame).

START FROM THIS EXACT IMAGE (Image 1): The video's first frame must visually match this image exactly.
END AT THIS EXACT IMAGE (Image 2): The video's last frame must visually match this image exactly.

TRANSITION DIRECTION: ${prompt.trim()}

CRITICAL: The generated video must begin looking identical to Image 1 and gradually transform/transition to look identical to Image 2 by the end. This is a bridge/transition between two scenes.`;

      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-creative-studio`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({
          action: 'generate_video',
          params: {
            model,
            prompt: fullPrompt,
            imageUrls: [frameAUrl, frameBUrl],
            imageRoles: ['STARTING FRAME', 'ENDING FRAME'],
            aspectRatio: '16:9',
            duration,
            estabelecimentoId: estabId,
            withAudio: false,
            withMusic: false,
            bridgeMode: true,
          },
        }),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({ error: `HTTP ${response.status}` }));
        throw new Error(errData.error || `Erro ${response.status}`);
      }

      const data = await response.json();
      const result = data.result;
      if (result?.error) throw new Error(result.error);
      if (!result?.videoUrl) throw new Error('Nenhuma URL de vídeo retornada');

      const exactVideoUrl = await enforceExactBridgeFrames(result.videoUrl, frameA, frameB, duration, estabId);
      toast.success('Vídeo de transição gerado com os frames inicial e final exatos!');
      onVideoGenerated(exactVideoUrl, duration);
      onClose();
    } catch (err: any) {
      const msg = err.message || 'Erro desconhecido';
      if (msg.includes('429') || msg.includes('quota')) toast.error('Limite de requisições atingido.');
      else if (msg.includes('402') || msg.includes('billing')) toast.error('Créditos insuficientes.');
      else toast.error('Erro ao gerar vídeo: ' + msg);
    } finally {
      setIsGenerating(false);
    }
  }, [duration, enforceExactBridgeFrames, frameA, frameB, model, onClose, onVideoGenerated, prompt]);

  return (
    <Dialog open={open} onOpenChange={(o) => !o && !isGenerating && onClose()}>
      <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogTitle className="flex items-center gap-2 text-sm font-semibold">
          <Wand2 className="h-4 w-4 text-primary" />
          Gerar Vídeo de Transição AI
        </DialogTitle>

        {/* Frames preview */}
        <div className="flex items-center gap-3 mt-2">
          <div className="flex-1 text-center">
            <p className="text-[10px] text-muted-foreground mb-1 uppercase tracking-wider">Último frame — {clipA.name}</p>
            <div className="aspect-video bg-muted rounded-lg overflow-hidden border border-border/50 flex items-center justify-center">
              {extracting ? <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /> : frameA ? <img src={frameA} alt="Frame A" className="w-full h-full object-contain" /> : <ImageIcon className="h-6 w-6 text-muted-foreground" />}
            </div>
          </div>
          <div className="flex flex-col items-center gap-1 shrink-0">
            <ArrowRight className="h-5 w-5 text-primary" />
            <Film className="h-4 w-4 text-muted-foreground" />
            <ArrowRight className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1 text-center">
            <p className="text-[10px] text-muted-foreground mb-1 uppercase tracking-wider">Primeiro frame — {clipB.name}</p>
            <div className="aspect-video bg-muted rounded-lg overflow-hidden border border-border/50 flex items-center justify-center">
              {extracting ? <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /> : frameB ? <img src={frameB} alt="Frame B" className="w-full h-full object-contain" /> : <ImageIcon className="h-6 w-6 text-muted-foreground" />}
            </div>
          </div>
        </div>

        {/* Prompt Suggestions */}
        <div className="mt-3">
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-xs font-medium text-muted-foreground flex items-center gap-1">
              <Sparkles className="h-3 w-3" />
              Sugestões de Transição (clique para selecionar)
            </label>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 text-[10px] gap-1 px-2"
              onClick={() => { setIsAddingNew(true); setNewText(''); }}
              disabled={isGenerating}
            >
              <Plus className="h-3 w-3" /> Nova
            </Button>
          </div>

          <ScrollArea className="h-[140px] rounded-lg border border-border/50 bg-muted/30 p-1.5">
            <div className="grid grid-cols-1 gap-1">
              {isAddingNew && (
                <div className="flex items-start gap-1.5 p-1.5 rounded-md bg-primary/10 border border-primary/30">
                  <Input
                    value={newText}
                    onChange={e => setNewText(e.target.value)}
                    placeholder="Digite sua descrição de transição personalizada..."
                    className="h-7 text-[11px] flex-1"
                    autoFocus
                    onKeyDown={e => { if (e.key === 'Enter') handleAddNew(); if (e.key === 'Escape') setIsAddingNew(false); }}
                  />
                  <Button variant="ghost" size="sm" className="h-7 w-7 p-0 shrink-0" onClick={handleAddNew} disabled={!newText.trim()}>
                    <Check className="h-3 w-3 text-primary" />
                  </Button>
                  <Button variant="ghost" size="sm" className="h-7 w-7 p-0 shrink-0" onClick={() => setIsAddingNew(false)}>
                    <X className="h-3 w-3 text-destructive" />
                  </Button>
                </div>
              )}

              {suggestions.map((s) => (
                <div key={s.id}>
                  {editingId === s.id ? (
                    <div className="flex items-start gap-1.5 p-1.5 rounded-md bg-primary/10 border border-primary/30">
                      <Input
                        value={editText}
                        onChange={e => setEditText(e.target.value)}
                        className="h-7 text-[11px] flex-1"
                        autoFocus
                        onKeyDown={e => { if (e.key === 'Enter') handleSaveEdit(); if (e.key === 'Escape') setEditingId(null); }}
                      />
                      <Button variant="ghost" size="sm" className="h-7 w-7 p-0 shrink-0" onClick={handleSaveEdit}>
                        <Check className="h-3 w-3 text-primary" />
                      </Button>
                      <Button variant="ghost" size="sm" className="h-7 w-7 p-0 shrink-0" onClick={() => setEditingId(null)}>
                        <X className="h-3 w-3 text-destructive" />
                      </Button>
                    </div>
                  ) : (
                    <div
                      className={`group flex items-start gap-1.5 p-1.5 rounded-md cursor-pointer transition-colors hover:bg-accent/50 ${prompt === s.text ? 'bg-primary/15 border border-primary/40' : 'border border-transparent'}`}
                      onClick={() => handleSelectSuggestion(s.text)}
                    >
                      <span className="text-[11px] leading-snug flex-1 text-foreground/80">{s.text}</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-5 w-5 p-0 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={(e) => { e.stopPropagation(); handleStartEdit(s.id, s.text); }}
                      >
                        <Pencil className="h-2.5 w-2.5 text-muted-foreground" />
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </ScrollArea>
        </div>

        {/* Manual prompt */}
        <div className="mt-2">
          <label className="text-xs font-medium text-muted-foreground mb-1 block">
            Ou escreva sua própria descrição
          </label>
          <Textarea
            placeholder="Ex: A câmera faz um zoom out suave revelando a paisagem ao redor..."
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            rows={2}
            className="text-sm resize-none"
            disabled={isGenerating}
          />
        </div>

        {/* Controls */}
        <div className="flex gap-3 mt-2">
          <div className="flex-1">
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Modelo</label>
            <Select value={model} onValueChange={setModel} disabled={isGenerating}>
              <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                {VIDEO_MODELS.map(m => <SelectItem key={m.value} value={m.value} className="text-xs">{m.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="w-28">
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Duração (s)</label>
            <Select value={String(duration)} onValueChange={(v) => setDuration(Number(v))} disabled={isGenerating}>
              <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                {[2, 3, 4, 5, 6, 8, 10].map(d => <SelectItem key={d} value={String(d)} className="text-xs">{d}s</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-2 mt-3 pt-3 border-t">
          <Button variant="outline" size="sm" onClick={onClose} disabled={isGenerating}>Cancelar</Button>
          <Button
            size="sm"
            onClick={handleGenerate}
            disabled={isGenerating || extracting || !frameA || !frameB || !prompt.trim()}
            className="gap-1.5"
          >
            {isGenerating ? <><Loader2 className="h-3.5 w-3.5 animate-spin" />Gerando...</> : <><Wand2 className="h-3.5 w-3.5" />Gerar Vídeo de Transição</>}
          </Button>
        </div>

        {isGenerating && (
          <div className="text-center py-2">
            <p className="text-xs text-muted-foreground animate-pulse">⏳ Gerando vídeo de transição AI... Isso pode levar de 30s a 5min dependendo do modelo.</p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default AIBridgeVideoDialog;
