import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, Wand2, Film, ArrowRight, ImageIcon, Pencil, Plus, Check, X, Sparkles, Lock, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { TimelineClip } from './types';


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
  bridgeSupport: 'full' | 'start-only';
}

const ALL_VIDEO_MODELS: VideoModelInfo[] = [
  // Google Veo (I2V — uses side-by-side composite for bridge)
  { value: 'google/veo-3.1', label: '🟦 Veo 3.1 (Flow)', provider: 'google', cost: '$$$$', bridgeSupport: 'full' },
  { value: 'google/veo-3.1-fast', label: '🟦 Veo 3.1 Fast', provider: 'google', cost: '$$$', bridgeSupport: 'full' },
  { value: 'google/veo-3', label: '🟦 Veo 3', provider: 'google', cost: '$$$', bridgeSupport: 'full' },
  { value: 'google/veo-2', label: '🟦 Veo 2', provider: 'google', cost: '$$', bridgeSupport: 'full' },
  // Runway Gen-3: suporta lastFrame
  { value: 'runway/gen3-alpha-turbo', label: '🎬 Gen-3 Alpha Turbo', provider: 'runway', cost: '$$', bridgeSupport: 'full' },
  // Kling (suporta image_tail)
  { value: 'kling/v2.1', label: '🎥 Kling 2.1', provider: 'kling', cost: '$$', bridgeSupport: 'full' },
  { value: 'kling/v1.6', label: '🎥 Kling 1.6', provider: 'kling', cost: '$', bridgeSupport: 'full' },
  // Luma (suporta frame0 + frame1)
  { value: 'luma/dream-machine-1.5', label: '🌙 Dream Machine 1.5', provider: 'luma', cost: '$$', bridgeSupport: 'full' },
  // Apiframe — Runway Gen-3: suporta end_image_url
  { value: 'apiframe/runway', label: '⚡ AF: Runway Gen-3', provider: 'apiframe', cost: '$$', bridgeSupport: 'full' },
  // Apiframe — Kling: suporta end_image
  { value: 'apiframe/kling-2.6', label: '⚡ AF: Kling 2.6', provider: 'apiframe', cost: '$$', bridgeSupport: 'full' },
  { value: 'apiframe/kling-2.5', label: '⚡ AF: Kling 2.5 Turbo', provider: 'apiframe', cost: '$', bridgeSupport: 'full' },
  // Apiframe — Luma: suporta end_image_url
  { value: 'apiframe/luma', label: '⚡ AF: Luma AI', provider: 'apiframe', cost: '$$', bridgeSupport: 'full' },
];

const UNIFIED_PREFIXES = ['apiframe/'];
const VIDEO_MODELS_NEEDING_KEY: Record<string, string> = {
  'google/veo-3.1': 'google', 'google/veo-3.1-fast': 'google', 'google/veo-3': 'google', 'google/veo-2': 'google',
  'runway/gen4': 'runway', 'runway/gen3-alpha-turbo': 'runway',
  'kling/v2.1': 'kling', 'kling/v1.6': 'kling',
  'luma/dream-machine-1.5': 'luma', 'stability/stable-video': 'stability',
};

const normalizeProvider = (provider: string): string => {
  const compact = provider.toLowerCase().trim().replace(/[\s._-]/g, '');
  if (compact === 'apiframe' || compact === 'apiframeai') return 'apiframe';
  if (compact === 'aimlapi' || compact === 'aiml') return 'aimlapi';
  if (compact === 'polloai' || compact === 'pollo') return 'polloai';
  return compact;
};

const isModelConfigured = (modelValue: string, configuredProviders: string[]): boolean => {
  const normalizedProviders = configuredProviders.map(normalizeProvider);
  const unifiedPrefix = UNIFIED_PREFIXES.find((p) => modelValue.startsWith(p));
  if (unifiedPrefix) {
    const providerName = normalizeProvider(unifiedPrefix.replace('/', ''));
    return normalizedProviders.includes(providerName);
  }
  const requiredProvider = VIDEO_MODELS_NEEDING_KEY[modelValue];
  if (!requiredProvider) return true;
  return normalizedProviders.includes(normalizeProvider(requiredProvider));
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
      const map = new Map(DEFAULT_TRANSITION_PROMPTS.map((p) => [p.id, p]));
      parsed.forEach((p: any) => map.set(p.id, p));
      return Array.from(map.values());
    }
  } catch {}
  return [...DEFAULT_TRANSITION_PROMPTS];
}

function saveCustomPrompts(prompts: typeof DEFAULT_TRANSITION_PROMPTS) {
  const defaultMap = new Map(DEFAULT_TRANSITION_PROMPTS.map((p) => [p.id, p.text]));
  const toSave = prompts.filter((p) => !defaultMap.has(p.id) || defaultMap.get(p.id) !== p.text);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(toSave));
}

const AIBridgeVideoDialog: React.FC<AIBridgeVideoDialogProps> = ({
  open, onClose, clipA, clipB, onVideoGenerated
}) => {
  const [frameA, setFrameA] = useState<string | null>(null);
  const [frameB, setFrameB] = useState<string | null>(null);
  const [generatedVideoUrl, setGeneratedVideoUrl] = useState<string | null>(null);
  const [generatedDuration, setGeneratedDuration] = useState<number>(0);
  const [prompt, setPrompt] = useState('');
   const [model, setModel] = useState('google/veo-3.1');

    const getDurationOptionsForModel = (m: string): number[] => {
      // Kling (direto ou via Apiframe) aceita apenas 5 ou 10
      if (m.startsWith('kling/') || m.includes('kling')) return [5, 10];
      // Runway (direto ou via Apiframe) aceita apenas 5 ou 10
      if (m.startsWith('runway/') || m.includes('runway')) return [5, 10];
      // OpenAI Sora aceita apenas 4, 8 ou 12
      if (m.startsWith('openai/sora')) return [4, 8, 12];
      // Google Veo aceita 4 a 8
      if (m.startsWith('google/')) return [4, 5, 6, 7, 8];
      // Luma (direto ou via Apiframe) aceita 5 ou 10
      if (m.startsWith('luma/') || m.includes('luma')) return [5, 10];
      // Stability aceita 2 a 4
      if (m.startsWith('stability/')) return [2, 3, 4];
      // Replicate LTX aceita 2 a 10
      if (m.startsWith('replicate/')) return [2, 3, 4, 5, 6, 7, 8, 9, 10];
      return [4, 5, 6, 8, 10];
    };
   const durationOptions = getDurationOptionsForModel(model);
   const [duration, setDuration] = useState(() => getDurationOptionsForModel('google/veo-3.1')[0]);

   // Auto-adjust duration when model changes
   const handleModelChange = (newModel: string) => {
     setModel(newModel);
     const opts = getDurationOptionsForModel(newModel);
     if (!opts.includes(duration)) {
       setDuration(opts[0]);
     }
   };
  const [isGenerating, setIsGenerating] = useState(false);
  const [extracting, setExtracting] = useState(false);
  const [configuredProviders, setConfiguredProviders] = useState<string[]>([]);

  const estabelecimentoId = localStorage.getItem('estabelecimentoId') || '';

  // Load configured providers (with fallback to auth-based estabelecimento lookup)
  useEffect(() => {
    let mounted = true;

    (async () => {
      let estabId = estabelecimentoId;

      if (!estabId) {
        const { data: rpcEstab } = await supabase.rpc('get_auth_user_estabelecimento_id');
        if (typeof rpcEstab === 'string') estabId = rpcEstab;
      }

      if (!estabId) {
        if (mounted) setConfiguredProviders([]);
        return;
      }

      const { data } = await supabase
        .from('ai_api_keys')
        .select('provider')
        .eq('estabelecimento_id', estabId)
        .eq('is_active', true);

      if (mounted && data) {
        setConfiguredProviders(data.map((d) => normalizeProvider(d.provider)));
      }
    })();

    return () => {
      mounted = false;
    };
  }, [estabelecimentoId]);

  const filteredModels = useMemo(() => {
    const withStatus = ALL_VIDEO_MODELS.map((m) => ({ ...m, disabled: !isModelConfigured(m.value, configuredProviders) }));
    return withStatus.sort((a, b) => Number(a.disabled) - Number(b.disabled));
  }, [configuredProviders]);

  // Prompt suggestions state
  const [suggestions, setSuggestions] = useState(loadCustomPrompts);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [newText, setNewText] = useState('');

  useEffect(() => {
    if (open) setSuggestions(loadCustomPrompts());
  }, [open]);

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
    const tolerance = 0.01;

    await new Promise<void>((resolve, reject) => {
      if (Math.abs(video.currentTime - safeTime) <= tolerance && video.readyState >= 2) {
        resolve();
        return;
      }

      let settled = false;
      let timeoutId: number | undefined;
      let frameCbId: number | undefined;

      const cleanup = () => {
        if (timeoutId) window.clearTimeout(timeoutId);
        video.removeEventListener('seeked', afterSeek);
        video.removeEventListener('error', onError);
        if (frameCbId !== undefined && 'cancelVideoFrameCallback' in video) {
          (video as HTMLVideoElement & { cancelVideoFrameCallback?: (id: number) => void }).cancelVideoFrameCallback?.(frameCbId);
        }
      };

      const done = () => {
        if (settled) return;
        settled = true;
        cleanup();
        resolve();
      };

      const onError = () => {
        if (settled) return;
        settled = true;
        cleanup();
        reject(new Error('Falha ao posicionar o frame do vídeo'));
      };

      const afterSeek = () => {
        if ('requestVideoFrameCallback' in video) {
          frameCbId = (video as HTMLVideoElement & { requestVideoFrameCallback: (cb: () => void) => number })
            .requestVideoFrameCallback(() => done());
        } else {
          requestAnimationFrame(() => done());
        }
      };

      timeoutId = window.setTimeout(() => done(), 900);
      video.addEventListener('seeked', afterSeek, { once: true });
      video.addEventListener('error', onError, { once: true });
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
      video.poster = '';

      let blobUrl: string | null = null;
      try {
        const resp = await fetch(clip.src || '', { mode: 'cors' });
        const blob = await resp.blob();
        blobUrl = URL.createObjectURL(blob);
      } catch {
        blobUrl = null;
      }

      const videoSrc = blobUrl || clip.src || '';

      await new Promise<void>((resolve, reject) => {
        const onReady = () => {
          video.removeEventListener('loadeddata', onReady);
          video.removeEventListener('error', onFail);
          resolve();
        };
        const onFail = () => {
          video.removeEventListener('loadeddata', onReady);
          video.removeEventListener('error', onFail);
          reject(new Error(`Falha ao carregar vídeo: ${clip.name}`));
        };
        video.addEventListener('loadeddata', onReady, { once: true });
        video.addEventListener('error', onFail, { once: true });
        video.src = videoSrc;
        video.load();
      });

      if (!Number.isFinite(video.duration) || video.duration === Infinity) {
        video.currentTime = 1e101;
        await new Promise<void>(r => { video.ontimeupdate = () => { video.ontimeupdate = null; r(); }; });
      }

      const trimStart = Math.max(0, clip.trimStart || 0);
      const trimEnd = Math.max(0, clip.trimEnd || 0);
      const maxVideoTime = Math.max(0, video.duration - 0.001);
      const mediaEnd = Math.max(trimStart, video.duration - trimEnd);
      const visibleEnd = Math.max(trimStart, Math.min(mediaEnd, trimStart + Math.max(clip.duration, 0)));
      const clampedVisibleEnd = Math.max(trimStart, Math.min(maxVideoTime, visibleEnd));
      const captureCandidates = position === 'first'
        ? [Math.max(0, Math.min(maxVideoTime, trimStart + 0.001)), Math.max(0, Math.min(maxVideoTime, trimStart))]
        : Array.from(new Set([
            clampedVisibleEnd,
            Math.max(trimStart, clampedVisibleEnd - 0.001),
            Math.max(trimStart, clampedVisibleEnd - 1 / 240),
            Math.max(trimStart, clampedVisibleEnd - 1 / 120),
            Math.max(trimStart, clampedVisibleEnd - 1 / 60),
            Math.max(trimStart, clampedVisibleEnd - 1 / 30),
          ].map((time) => Number(time.toFixed(6)))));

      let selectedTime = captureCandidates[0] ?? 0;
      let captured = false;

      for (const candidateTime of captureCandidates) {
        await seekVideoPrecisely(video, candidateTime);
        video.pause();
        await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));

        if (!video.videoWidth || !video.videoHeight) continue;

        selectedTime = candidateTime;

        try {
          const bitmap = await createImageBitmap(video);
          drawContain(ctx, bitmap, bitmap.width, bitmap.height);
          bitmap.close();
          captured = true;
          break;
        } catch {
          drawContain(ctx, video, video.videoWidth || canvas.width, video.videoHeight || canvas.height);
          captured = true;
          break;
        }
      }

      console.log('[AI Bridge] frame capture', {
        clipName: clip.name,
        position,
        captureCandidates,
        selectedTime,
        currentTime: video.currentTime,
        duration: video.duration,
        trimStart,
        trimEnd,
        visibleEnd,
        clampedVisibleEnd,
        readyState: video.readyState,
        videoWidth: video.videoWidth,
        videoHeight: video.videoHeight,
        src: clip.src,
      });

      if (!captured) {
        throw new Error(`Vídeo sem frame decodificado: ${clip.name}`);
      }

      const dataUrl = canvas.toDataURL('image/jpeg', 0.92);

      if (blobUrl) URL.revokeObjectURL(blobUrl);
      return dataUrl;
    }

    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    return canvas.toDataURL('image/jpeg', 0.92);
  }, [drawContain, loadImage, seekVideoPrecisely]);





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

      toast.success('Vídeo de transição gerado! Confira o resultado abaixo.');
      setGeneratedVideoUrl(result.videoUrl);
      setGeneratedDuration(duration);
    } catch (err: any) {
      const msg = err?.message || 'Erro desconhecido';
      if (msg.includes('429') || msg.includes('quota') || msg.includes('Rate limit') || msg.includes('too many')) toast.error('Limite de requisições atingido. Aguarde e tente novamente.');
      else if (msg.includes('402') || msg.includes('billing') || msg.includes('insufficient') || msg.includes('Credits') || msg.includes('exclusively available')) toast.error('Créditos insuficientes. Adicione saldo no provedor.');
      else toast.error('Erro ao gerar vídeo: ' + msg.substring(0, 120));
    } finally {
      setIsGenerating(false);
    }
  }, [duration, frameA, frameB, model, prompt]);

  const handleInsert = useCallback(() => {
    if (generatedVideoUrl && generatedDuration > 0) {
      onVideoGenerated(generatedVideoUrl, generatedDuration);
      onClose();
    }
  }, [generatedVideoUrl, generatedDuration, onVideoGenerated, onClose]);

  const handleDiscardPreview = useCallback(() => {
    setGeneratedVideoUrl(null);
    setGeneratedDuration(0);
  }, []);

  return (
    <Dialog open={open} onOpenChange={(o) => !o && !isGenerating && onClose()}>
      <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogTitle className="flex items-center gap-2 text-sm font-semibold">
          <Wand2 className="h-4 w-4 text-primary" />
          Gerar Vídeo de Transição AI
        </DialogTitle>

        {/* Generated Video Preview */}
        {generatedVideoUrl && (
          <div className="mt-2 space-y-3">
            <div className="rounded-lg border-2 border-primary/50 bg-muted/30 overflow-hidden">
              <div className="p-2 bg-primary/10 flex items-center gap-2">
                <Film className="h-4 w-4 text-primary" />
                <span className="text-xs font-semibold text-primary">Prévia do Vídeo de Transição</span>
                <span className="text-[10px] text-muted-foreground ml-auto">{generatedDuration}s</span>
              </div>
              <div className="aspect-video bg-black flex items-center justify-center">
                <video
                  src={generatedVideoUrl}
                  controls
                  autoPlay
                  loop
                  className="w-full h-full object-contain"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleDiscardPreview}
                className="gap-1.5"
              >
                <X className="h-3.5 w-3.5" />
                Descartar e Tentar Novamente
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={onClose}
              >
                Cancelar
              </Button>
              <Button
                size="sm"
                onClick={handleInsert}
                className="gap-1.5"
                variant="success"
              >
                <Check className="h-3.5 w-3.5" />
                Inserir na Timeline
              </Button>
            </div>
          </div>
        )}

        {/* Frames preview — hide when showing generated video */}
        {!generatedVideoUrl && (
          <>
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
                <Select value={model} onValueChange={handleModelChange} disabled={isGenerating}>
                  <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent className="max-h-[300px]">
                    {filteredModels.map(m => (
                      <SelectItem
                        key={m.value}
                        value={m.value}
                        className="text-xs"
                        disabled={m.disabled}
                      >
                         <span className={`flex items-center gap-1.5 ${m.disabled ? 'opacity-50' : ''}`}>
                          {m.label}
                          {m.cost && <span className="text-muted-foreground text-[9px]">{m.cost}</span>}
                          {m.disabled && (
                            <span className="flex items-center gap-0.5 text-destructive/70 text-[9px] font-medium ml-1">
                              <Lock className="h-2.5 w-2.5" />
                              sem créditos
                            </span>
                          )}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="w-28">
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Duração (s)</label>
                 <Select value={String(duration)} onValueChange={(v) => setDuration(Number(v))} disabled={isGenerating}>
                  <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {durationOptions.map(d => <SelectItem key={d} value={String(d)} className="text-xs">{d}s</SelectItem>)}
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
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default AIBridgeVideoDialog;
