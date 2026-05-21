import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import ReactCrop, { type Crop, type PixelCrop, centerCrop, makeAspectCrop } from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { CHANNEL_CONFIG, PublishChannel } from './types';
import { Check, ChevronLeft, ChevronRight, Loader2, Rocket, Move } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface PublishFormat {
  id: string;
  label: string;
  width: number;
  height: number;
  description?: string;
}

const aspectOf = (f: PublishFormat) => f.width / f.height;

// Mirrors AI Creative Studio's image/video presets
const FORMATS_BY_CHANNEL: Record<PublishChannel, PublishFormat[]> = {
  instagram: [
    { id: 'feed_square', label: '📸 Feed Quadrado (1:1)', width: 1080, height: 1080, description: '1080×1080' },
    { id: 'feed_portrait', label: '📸 Feed Retrato (4:5)', width: 1080, height: 1350, description: '1080×1350' },
    { id: 'feed_landscape', label: '📸 Feed Paisagem (1.91:1)', width: 1080, height: 566, description: '1080×566' },
    { id: 'story', label: '📖 Story (9:16)', width: 1080, height: 1920, description: '1080×1920' },
    { id: 'reel', label: '🎞️ Reel (9:16)', width: 1080, height: 1920, description: '1080×1920' },
    { id: 'carousel_sq', label: '🎠 Carrossel (1:1)', width: 1080, height: 1080, description: '1080×1080 por slide' },
    { id: 'carousel_pt', label: '🎠 Carrossel (4:5)', width: 1080, height: 1350, description: '1080×1350 por slide' },
    { id: 'grid_3x1', label: '📐 Grid 3×1', width: 3240, height: 1080, description: '3240×1080' },
    { id: 'grid_3x3', label: '📐 Grid 3×3', width: 3240, height: 3240, description: '3240×3240' },
  ],
  facebook: [
    { id: 'feed', label: '📘 Feed (1.91:1)', width: 1200, height: 630, description: '1200×630' },
    { id: 'feed_square', label: '📘 Feed Quadrado (1:1)', width: 1080, height: 1080, description: '1080×1080' },
    { id: 'story', label: '📘 Story (9:16)', width: 1080, height: 1920, description: '1080×1920' },
    { id: 'cover', label: '📘 Capa (2.63:1)', width: 820, height: 312, description: '820×312' },
    { id: 'carousel', label: '🎠 Carrossel (1:1)', width: 1080, height: 1080, description: '1080×1080' },
  ],
  whatsapp: [
    { id: 'status', label: '💬 Status (9:16)', width: 1080, height: 1920, description: '1080×1920' },
    { id: 'message', label: '💬 Mensagem (1:1)', width: 1080, height: 1080, description: '1080×1080' },
    { id: 'catalog', label: '🛍️ Catálogo (1:1)', width: 1080, height: 1080, description: '1080×1080' },
  ],
  twitter: [
    { id: 'post', label: '🐦 Post (16:9)', width: 1200, height: 675, description: '1200×675' },
    { id: 'square', label: '🐦 Quadrado (1:1)', width: 1080, height: 1080, description: '1080×1080' },
  ],
  linkedin: [
    { id: 'post', label: '💼 Post (1.91:1)', width: 1200, height: 627, description: '1200×627' },
    { id: 'square', label: '💼 Quadrado (1:1)', width: 1080, height: 1080, description: '1080×1080' },
    { id: 'story', label: '💼 Story (9:16)', width: 1080, height: 1920, description: '1080×1920' },
    { id: 'carousel', label: '🎠 Carrossel (1:1)', width: 1080, height: 1080, description: '1080×1080' },
  ],
  telegram: [
    { id: 'message', label: 'Mensagem (1:1)', width: 1080, height: 1080, description: '1080×1080' },
    { id: 'story', label: 'Story (9:16)', width: 1080, height: 1920, description: '1080×1920' },
  ],
  email: [
    { id: 'banner', label: 'Banner (16:9)', width: 1600, height: 900, description: '1600×900' },
    { id: 'square', label: 'Quadrado (1:1)', width: 1080, height: 1080, description: '1080×1080' },
  ],
  youtube: [
    { id: 'thumbnail', label: '▶️ Thumbnail (16:9)', width: 1280, height: 720, description: '1280×720' },
    { id: 'shorts', label: '⚡ Shorts (9:16)', width: 1080, height: 1920, description: '1080×1920' },
    { id: 'banner', label: '▶️ Banner (16:9)', width: 2560, height: 1440, description: '2560×1440' },
  ],
  pinterest: [
    { id: 'pin', label: '📌 Pin (2:3)', width: 1000, height: 1500, description: '1000×1500' },
    { id: 'square', label: '📌 Quadrado (1:1)', width: 1080, height: 1080, description: '1080×1080' },
    { id: 'story', label: '📌 Story (9:16)', width: 1080, height: 1920, description: '1080×1920' },
  ],
  tiktok: [
    { id: 'video', label: '🎵 Vídeo (9:16)', width: 1080, height: 1920, description: '1080×1920' },
    { id: 'cover', label: '🎵 Capa (1:1)', width: 1080, height: 1080, description: '1080×1080' },
  ],
};

async function getCroppedBlob(
  imageEl: HTMLImageElement,
  pixelCrop: PixelCrop,
  target: { w: number; h: number },
): Promise<Blob> {
  const scaleX = imageEl.naturalWidth / imageEl.width;
  const scaleY = imageEl.naturalHeight / imageEl.height;
  const sx = pixelCrop.x * scaleX;
  const sy = pixelCrop.y * scaleY;
  const sw = pixelCrop.width * scaleX;
  const sh = pixelCrop.height * scaleY;

  const canvas = document.createElement('canvas');
  canvas.width = target.w;
  canvas.height = target.h;
  const ctx = canvas.getContext('2d')!;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(imageEl, sx, sy, sw, sh, 0, 0, target.w, target.h);
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Falha ao gerar imagem'))), 'image/jpeg', 0.92);
  });
}

interface Props {
  open: boolean;
  onClose: () => void;
  itemId: string;
  imageUrl: string;
  itemName: string;
  mediaType?: 'image' | 'video';
  existingChannels?: any[];
  onPublished: (entry: { channel: PublishChannel; format: string; url?: string; cropped_url: string; published_at: string }) => void;
}

const PublishWizardDialog: React.FC<Props> = ({ open, onClose, itemId, imageUrl, itemName, mediaType = 'image', existingChannels = [], onPublished }) => {
  const [step, setStep] = useState(1);
  const [channel, setChannel] = useState<PublishChannel | null>(null);
  const [format, setFormat] = useState<PublishFormat | null>(null);
  const [crop, setCrop] = useState<Crop>();
  const [completedCrop, setCompletedCrop] = useState<PixelCrop | null>(null);
  const [lockAspect, setLockAspect] = useState(true);
  const [postUrl, setPostUrl] = useState('');
  const [publishing, setPublishing] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);

  const isVideo = mediaType === 'video';

  const reset = () => {
    setStep(1);
    setChannel(null);
    setFormat(null);
    setCrop(undefined);
    setCompletedCrop(null);
    setLockAspect(true);
    setPostUrl('');
  };

  const handleClose = () => {
    if (publishing) return;
    reset();
    onClose();
  };

  const formats = useMemo(() => (channel ? FORMATS_BY_CHANNEL[channel] : []), [channel]);
  const aspect = format ? aspectOf(format) : 1;

  const initCropForAspect = useCallback((mediaWidth: number, mediaHeight: number, ratio: number) => {
    return centerCrop(
      makeAspectCrop({ unit: '%', width: 90 }, ratio, mediaWidth, mediaHeight),
      mediaWidth,
      mediaHeight,
    );
  }, []);

  const onImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    if (!format) return;
    const { width, height } = e.currentTarget;
    const c = initCropForAspect(width, height, lockAspect ? aspect : 16 / 9);
    setCrop(c);
  };

  // Re-init crop when toggling aspect or changing format
  useEffect(() => {
    if (step !== 2 || isVideo || !imgRef.current || !format) return;
    const { width, height } = imgRef.current;
    if (!width || !height) return;
    const c = lockAspect
      ? initCropForAspect(width, height, aspect)
      : { unit: '%' as const, x: 5, y: 5, width: 90, height: 90 };
    setCrop(c);
  }, [lockAspect, format, step, isVideo, aspect, initCropForAspect]);

  const handlePublish = async () => {
    if (!channel || !format || (!isVideo && (!completedCrop || !imgRef.current))) {
      toast.error('Ajuste a mídia antes de publicar');
      return;
    }
    setPublishing(true);
    try {
      let croppedUrl = imageUrl;
      if (!isVideo) {
        const target = { w: format.width, h: format.height };
        const blob = await getCroppedBlob(imgRef.current!, completedCrop!, target);
        const estabId = localStorage.getItem('estabelecimentoId') || 'default';
        const path = `${estabId}/published/${channel}_${format.id}_${Date.now()}.jpg`;
        const { error: upErr } = await supabase.storage.from('marketing-images').upload(path, blob, { contentType: 'image/jpeg', upsert: false });
        if (upErr) throw upErr;
        const { data: pub } = supabase.storage.from('marketing-images').getPublicUrl(path);
        croppedUrl = pub.publicUrl;
      }

      const now = new Date().toISOString();
      const newEntry = {
        channel,
        format: format.id,
        format_label: format.label,
        url: postUrl.trim() || undefined,
        cropped_url: croppedUrl,
        published_at: now,
      };
      const next = [...existingChannels.filter((e: any) => !(e.channel === channel && e.format === format.id)), newEntry];

      const { error } = await supabase.from('media_gallery').update({ published_channels: next } as any).eq('id', itemId);
      if (error) throw error;

      toast.success(`Publicado em ${CHANNEL_CONFIG[channel].label} (${format.label})`);
      onPublished(newEntry as any);
      handleClose();
    } catch (err: any) {
      console.error('Erro ao publicar:', err);
      toast.error('Erro ao publicar: ' + (err?.message || 'desconhecido'));
    } finally {
      setPublishing(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Rocket className="h-5 w-5" />
            Publicar mídia — Etapa {step} de 3
          </DialogTitle>
          <DialogDescription>
            {step === 1 && 'Escolha o canal e o formato de publicação (mesmas opções do AI Creative Studio)'}
            {step === 2 && (isVideo ? 'Pré-visualização do vídeo no formato escolhido' : 'Ajuste a imagem arrastando os cantos do recorte ou movendo-o')}
            {step === 3 && 'Confira e publique'}
          </DialogDescription>
        </DialogHeader>

        {step === 1 && (
          <div className="space-y-4">
            <div>
              <Label className="mb-2 block">Canal</Label>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                {(Object.keys(CHANNEL_CONFIG) as PublishChannel[]).map((ch) => (
                  <button
                    key={ch}
                    onClick={() => { setChannel(ch); setFormat(null); }}
                    className={cn(
                      'border rounded-lg p-3 text-center text-xs transition-all hover:border-primary',
                      channel === ch ? 'border-primary bg-primary/10' : 'border-border'
                    )}
                  >
                    <div className={cn('w-8 h-8 rounded-full mx-auto mb-1', CHANNEL_CONFIG[ch].color)} />
                    {CHANNEL_CONFIG[ch].label}
                  </button>
                ))}
              </div>
            </div>

            {channel && (
              <div>
                <Label className="mb-2 block">Formato</Label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-[340px] overflow-y-auto pr-1">
                  {formats.map((f) => (
                    <button
                      key={f.id}
                      onClick={() => setFormat(f)}
                      className={cn(
                        'border rounded-lg p-3 text-left transition-all hover:border-primary',
                        format?.id === f.id ? 'border-primary bg-primary/10' : 'border-border'
                      )}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-medium text-sm">{f.label}</span>
                        {format?.id === f.id && <Check className="h-4 w-4 text-primary" />}
                      </div>
                      <Badge variant="outline" className="text-xs">{f.description}</Badge>
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={handleClose}>Cancelar</Button>
              <Button onClick={() => setStep(2)} disabled={!channel || !format}>
                Próximo <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </div>
        )}

        {step === 2 && format && (
          <div className="space-y-4">
            {isVideo ? (
              <div className="flex flex-col items-center gap-3">
                <div
                  className="relative bg-black rounded-lg overflow-hidden border-2 border-primary/50"
                  style={{
                    aspectRatio: aspect,
                    maxHeight: 400,
                    width: aspect >= 1 ? 'min(100%, 640px)' : 'auto',
                    height: aspect < 1 ? 400 : 'auto',
                  }}
                >
                  <video src={imageUrl} controls className="w-full h-full object-cover" />
                </div>
                <p className="text-xs text-muted-foreground text-center max-w-md">
                  O vídeo será exibido recortado (cover) na proporção {format.label} ({format.description}).
                </p>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between rounded-lg border border-border p-2.5 bg-muted/30">
                  <div className="flex items-center gap-2 text-xs">
                    <Move className="h-4 w-4 text-muted-foreground" />
                    <span>Arraste os <strong>4 cantos</strong> para redimensionar ou mova o recorte</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Label htmlFor="lockAspect" className="text-xs cursor-pointer">Travar proporção {format.width}×{format.height}</Label>
                    <Switch id="lockAspect" checked={lockAspect} onCheckedChange={setLockAspect} />
                  </div>
                </div>
                <div className="flex justify-center bg-muted/40 rounded-lg p-3 max-h-[520px] overflow-auto">
                  <ReactCrop
                    crop={crop}
                    onChange={(_, percentCrop) => setCrop(percentCrop)}
                    onComplete={(c) => setCompletedCrop(c)}
                    aspect={lockAspect ? aspect : undefined}
                    keepSelection
                    ruleOfThirds
                  >
                    <img
                      ref={imgRef}
                      src={imageUrl}
                      onLoad={onImageLoad}
                      crossOrigin="anonymous"
                      alt="Recorte"
                      style={{ maxHeight: 460, maxWidth: '100%' }}
                    />
                  </ReactCrop>
                </div>
                <p className="text-[11px] text-muted-foreground text-center">
                  Saída final: <strong>{format.width}×{format.height}px</strong> ({format.label})
                </p>
              </>
            )}
            <div className="flex justify-between gap-2 pt-2">
              <Button variant="outline" onClick={() => setStep(1)}>
                <ChevronLeft className="h-4 w-4 mr-1" /> Voltar
              </Button>
              <Button onClick={() => setStep(3)} disabled={!isVideo && !completedCrop}>
                Próximo <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </div>
        )}

        {step === 3 && channel && format && (
          <div className="space-y-4">
            <div className="rounded-lg border border-border p-4 bg-muted/30">
              <div className="text-sm space-y-1">
                <div><strong>Mídia:</strong> {itemName}</div>
                <div><strong>Canal:</strong> {CHANNEL_CONFIG[channel].label}</div>
                <div><strong>Formato:</strong> {format.label} ({format.description})</div>
              </div>
            </div>
            <div>
              <Label htmlFor="postUrl">Link da publicação (opcional)</Label>
              <Input
                id="postUrl"
                value={postUrl}
                onChange={(e) => setPostUrl(e.target.value)}
                placeholder="https://..."
              />
              <p className="text-xs text-muted-foreground mt-1">
                Cole o link do post após publicar manualmente no canal.
              </p>
            </div>
            <div className="flex justify-between gap-2 pt-2">
              <Button variant="outline" onClick={() => setStep(2)} disabled={publishing}>
                <ChevronLeft className="h-4 w-4 mr-1" /> Voltar
              </Button>
              <Button onClick={handlePublish} disabled={publishing}>
                {publishing ? (
                  <><Loader2 className="h-4 w-4 mr-1 animate-spin" /> Publicando...</>
                ) : (
                  <><Rocket className="h-4 w-4 mr-1" /> Publicar</>
                )}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default PublishWizardDialog;
