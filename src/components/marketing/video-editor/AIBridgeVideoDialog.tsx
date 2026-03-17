import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Wand2, Film, ArrowRight, ImageIcon } from 'lucide-react';
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

const VIDEO_MODELS = [
  { value: 'google/veo-3.1', label: 'Google Veo 3.1', provider: 'google' },
  { value: 'google/veo-2', label: 'Google Veo 2', provider: 'google' },
  { value: 'openai/sora-2', label: 'OpenAI Sora 2', provider: 'openai' },
  { value: 'runway/gen4', label: 'Runway Gen-4', provider: 'runway' },
  { value: 'replicate/ltx-video-2', label: 'LTX-Video 2 (Replicate)', provider: 'replicate' },
  { value: 'kling/v2.1', label: 'Kling v2.1', provider: 'kling' },
];

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

  const extractFrame = useCallback(async (clip: TimelineClip, position: 'first' | 'last'): Promise<string> => {
    const canvas = document.createElement('canvas');
    canvas.width = 1280;
    canvas.height = 720;
    const ctx = canvas.getContext('2d')!;

    if (clip.type === 'image' || clip.type === 'canvas') {
      // For images, just load and draw
      const img = new Image();
      img.crossOrigin = 'anonymous';
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = () => reject(new Error(`Falha ao carregar imagem: ${clip.name}`));
        img.src = clip.src || '';
      });

      // Fit to canvas maintaining aspect ratio
      const scale = Math.min(canvas.width / img.width, canvas.height / img.height);
      const w = img.width * scale;
      const h = img.height * scale;
      ctx.fillStyle = '#000';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, (canvas.width - w) / 2, (canvas.height - h) / 2, w, h);
      return canvas.toDataURL('image/jpeg', 0.9);
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

      // Seek to the correct position
      const targetTime = position === 'last'
        ? Math.max(0, video.duration - 0.1)
        : clip.trimStart || 0;

      await new Promise<void>((resolve) => {
        video.onseeked = () => resolve();
        video.currentTime = targetTime;
      });

      // Wait one frame to ensure the video is painted
      await new Promise(r => setTimeout(r, 100));

      const scale = Math.min(canvas.width / video.videoWidth, canvas.height / video.videoHeight);
      const w = video.videoWidth * scale;
      const h = video.videoHeight * scale;
      ctx.fillStyle = '#000';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(video, (canvas.width - w) / 2, (canvas.height - h) / 2, w, h);
      return canvas.toDataURL('image/jpeg', 0.9);
    }

    // Fallback: solid frame
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    return canvas.toDataURL('image/jpeg', 0.9);
  }, []);

  const handleGenerate = useCallback(async () => {
    if (!frameA || !frameB) {
      toast.error('Aguarde a extração dos frames');
      return;
    }
    if (!prompt.trim()) {
      toast.error('Digite uma descrição para o vídeo de transição');
      return;
    }

    const estabId = localStorage.getItem('estabelecimentoId');
    if (!estabId) {
      toast.error('Estabelecimento não encontrado');
      return;
    }

    setIsGenerating(true);

    try {
      // Upload frames to storage so the AI can access them
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

      // Build prompt with frame context
      const fullPrompt = `Create a smooth transition video that connects these two scenes naturally.

STARTING FRAME (Image 1): This is the last frame of the previous scene.
ENDING FRAME (Image 2): This is the first frame of the next scene.

USER DIRECTION: ${prompt.trim()}

The video must start visually similar to Image 1 and end visually similar to Image 2, creating a fluid cinematic bridge between the two scenes. Make the transition feel natural, creative and professional.`;

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-creative-studio`,
        {
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
            },
          }),
        }
      );

      if (!response.ok) {
        const errData = await response.json().catch(() => ({ error: `HTTP ${response.status}` }));
        throw new Error(errData.error || `Erro ${response.status}`);
      }

      const data = await response.json();
      const result = data.result;

      if (result?.error) {
        throw new Error(result.error);
      }

      if (result?.videoUrl) {
        toast.success('Vídeo de transição gerado com sucesso!');
        onVideoGenerated(result.videoUrl, duration);
        onClose();
      } else {
        throw new Error('Nenhuma URL de vídeo retornada');
      }
    } catch (err: any) {
      const msg = err.message || 'Erro desconhecido';
      if (msg.includes('429') || msg.includes('quota')) {
        toast.error('Limite de requisições atingido. Aguarde e tente novamente.');
      } else if (msg.includes('402') || msg.includes('billing')) {
        toast.error('Créditos insuficientes. Recarregue na configuração do provedor.');
      } else {
        toast.error('Erro ao gerar vídeo: ' + msg);
      }
    } finally {
      setIsGenerating(false);
    }
  }, [frameA, frameB, prompt, model, duration, onVideoGenerated, onClose]);

  return (
    <Dialog open={open} onOpenChange={(o) => !o && !isGenerating && onClose()}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogTitle className="flex items-center gap-2 text-sm font-semibold">
          <Wand2 className="h-4 w-4 text-primary" />
          Gerar Vídeo de Transição AI
        </DialogTitle>

        {/* Frames preview */}
        <div className="flex items-center gap-3 mt-2">
          <div className="flex-1 text-center">
            <p className="text-[10px] text-muted-foreground mb-1 uppercase tracking-wider">Último frame — {clipA.name}</p>
            <div className="aspect-video bg-muted rounded-lg overflow-hidden border border-border/50 flex items-center justify-center">
              {extracting ? (
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              ) : frameA ? (
                <img src={frameA} alt="Frame A" className="w-full h-full object-contain" />
              ) : (
                <ImageIcon className="h-6 w-6 text-muted-foreground" />
              )}
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
              {extracting ? (
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              ) : frameB ? (
                <img src={frameB} alt="Frame B" className="w-full h-full object-contain" />
              ) : (
                <ImageIcon className="h-6 w-6 text-muted-foreground" />
              )}
            </div>
          </div>
        </div>

        {/* Controls */}
        <div className="space-y-3 mt-3">
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">
              Descreva o que deve acontecer entre as duas cenas
            </label>
            <Textarea
              placeholder="Ex: A câmera faz um zoom out suave revelando a paisagem ao redor, depois uma transição cinematográfica para a próxima cena..."
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              rows={3}
              className="text-sm resize-none"
              disabled={isGenerating}
            />
          </div>

          <div className="flex gap-3">
            <div className="flex-1">
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Modelo</label>
              <Select value={model} onValueChange={setModel} disabled={isGenerating}>
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {VIDEO_MODELS.map(m => (
                    <SelectItem key={m.value} value={m.value} className="text-xs">
                      {m.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="w-28">
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Duração (s)</label>
              <Select value={String(duration)} onValueChange={(v) => setDuration(Number(v))} disabled={isGenerating}>
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[2, 3, 4, 5, 6, 8, 10].map(d => (
                    <SelectItem key={d} value={String(d)} className="text-xs">{d}s</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-2 mt-4 pt-3 border-t">
          <Button variant="outline" size="sm" onClick={onClose} disabled={isGenerating}>
            Cancelar
          </Button>
          <Button
            size="sm"
            onClick={handleGenerate}
            disabled={isGenerating || extracting || !frameA || !frameB || !prompt.trim()}
            className="gap-1.5"
          >
            {isGenerating ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Gerando...
              </>
            ) : (
              <>
                <Wand2 className="h-3.5 w-3.5" />
                Gerar Vídeo de Transição
              </>
            )}
          </Button>
        </div>

        {isGenerating && (
          <div className="text-center py-2">
            <p className="text-xs text-muted-foreground animate-pulse">
              ⏳ Gerando vídeo de transição AI... Isso pode levar de 30s a 5min dependendo do modelo.
            </p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default AIBridgeVideoDialog;
