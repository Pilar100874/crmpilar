import React, { useState, useCallback, useMemo } from 'react';
import Cropper from 'react-easy-crop';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { CHANNEL_CONFIG, PublishChannel } from './types';
import { Check, ChevronLeft, ChevronRight, Loader2, Rocket } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface PublishFormat {
  id: string;
  label: string;
  aspectRatio: number; // width / height
  description?: string;
}

const FORMATS_BY_CHANNEL: Record<PublishChannel, PublishFormat[]> = {
  instagram: [
    { id: 'feed_square', label: 'Feed Quadrado', aspectRatio: 1, description: '1080x1080' },
    { id: 'feed_portrait', label: 'Feed Retrato', aspectRatio: 4 / 5, description: '1080x1350' },
    { id: 'story', label: 'Story', aspectRatio: 9 / 16, description: '1080x1920' },
    { id: 'reel', label: 'Reel', aspectRatio: 9 / 16, description: '1080x1920' },
    { id: 'carousel', label: 'Carrossel', aspectRatio: 1, description: '1080x1080' },
  ],
  facebook: [
    { id: 'feed', label: 'Feed', aspectRatio: 1.91, description: '1200x628' },
    { id: 'feed_square', label: 'Feed Quadrado', aspectRatio: 1, description: '1080x1080' },
    { id: 'story', label: 'Story', aspectRatio: 9 / 16, description: '1080x1920' },
    { id: 'carousel', label: 'Carrossel', aspectRatio: 1, description: '1080x1080' },
  ],
  whatsapp: [
    { id: 'status', label: 'Status', aspectRatio: 9 / 16, description: '1080x1920' },
    { id: 'message', label: 'Mensagem', aspectRatio: 1, description: 'Imagem padrão' },
  ],
  twitter: [
    { id: 'post', label: 'Post', aspectRatio: 16 / 9, description: '1600x900' },
    { id: 'square', label: 'Quadrado', aspectRatio: 1, description: '1080x1080' },
  ],
  linkedin: [
    { id: 'post', label: 'Post', aspectRatio: 1.91, description: '1200x628' },
    { id: 'square', label: 'Quadrado', aspectRatio: 1, description: '1080x1080' },
    { id: 'carousel', label: 'Carrossel', aspectRatio: 1, description: '1080x1080' },
  ],
  telegram: [
    { id: 'message', label: 'Mensagem', aspectRatio: 1, description: 'Imagem padrão' },
    { id: 'story', label: 'Story', aspectRatio: 9 / 16, description: '1080x1920' },
  ],
  email: [
    { id: 'banner', label: 'Banner', aspectRatio: 16 / 9, description: '1600x900' },
    { id: 'square', label: 'Quadrado', aspectRatio: 1, description: '1080x1080' },
  ],
};

const TARGET_DIMENSIONS: Record<string, { w: number; h: number }> = {
  '1': { w: 1080, h: 1080 },
  '0.5625': { w: 1080, h: 1920 }, // 9/16
  '0.8': { w: 1080, h: 1350 }, // 4/5
  '1.91': { w: 1200, h: 628 },
  '1.7777777777777777': { w: 1600, h: 900 }, // 16/9
};

interface Area {
  x: number;
  y: number;
  width: number;
  height: number;
}

async function getCroppedBlob(imageSrc: string, pixelCrop: Area, target: { w: number; h: number }): Promise<Blob> {
  const image = await new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = imageSrc;
  });
  const canvas = document.createElement('canvas');
  canvas.width = target.w;
  canvas.height = target.h;
  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(image, pixelCrop.x, pixelCrop.y, pixelCrop.width, pixelCrop.height, 0, 0, target.w, target.h);
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
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [postUrl, setPostUrl] = useState('');
  const [publishing, setPublishing] = useState(false);

  const reset = () => {
    setStep(1);
    setChannel(null);
    setFormat(null);
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setCroppedAreaPixels(null);
    setPostUrl('');
  };

  const handleClose = () => {
    if (publishing) return;
    reset();
    onClose();
  };

  const formats = useMemo(() => (channel ? FORMATS_BY_CHANNEL[channel] : []), [channel]);

  const onCropComplete = useCallback((_: Area, areaPixels: Area) => {
    setCroppedAreaPixels(areaPixels);
  }, []);

  const handlePublish = async () => {
    if (!channel || !format || !croppedAreaPixels) {
      toast.error('Ajuste a imagem antes de publicar');
      return;
    }
    setPublishing(true);
    try {
      const targetKey = format.aspectRatio.toString();
      const target = TARGET_DIMENSIONS[targetKey] || { w: 1080, h: Math.round(1080 / format.aspectRatio) };
      const blob = await getCroppedBlob(imageUrl, croppedAreaPixels, target);
      const estabId = localStorage.getItem('estabelecimentoId') || 'default';
      const path = `${estabId}/published/${channel}_${format.id}_${Date.now()}.jpg`;
      const { error: upErr } = await supabase.storage.from('marketing-images').upload(path, blob, { contentType: 'image/jpeg', upsert: false });
      if (upErr) throw upErr;
      const { data: pub } = supabase.storage.from('marketing-images').getPublicUrl(path);
      const croppedUrl = pub.publicUrl;

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
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Rocket className="h-5 w-5" />
            Publicar mídia — Etapa {step} de 3
          </DialogTitle>
          <DialogDescription>
            {step === 1 && 'Escolha o canal e o formato de publicação'}
            {step === 2 && 'Ajuste a imagem para o formato escolhido'}
            {step === 3 && 'Confira e publique'}
          </DialogDescription>
        </DialogHeader>

        {step === 1 && (
          <div className="space-y-4">
            <div>
              <Label className="mb-2 block">Canal</Label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {(Object.keys(CHANNEL_CONFIG) as PublishChannel[]).map((ch) => (
                  <button
                    key={ch}
                    onClick={() => { setChannel(ch); setFormat(null); }}
                    className={cn(
                      'border rounded-lg p-3 text-center text-sm transition-all hover:border-primary',
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
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
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
            <div className="relative w-full h-[400px] bg-muted rounded-lg overflow-hidden">
              <Cropper
                image={imageUrl}
                crop={crop}
                zoom={zoom}
                aspect={format.aspectRatio}
                onCropChange={setCrop}
                onZoomChange={setZoom}
                onCropComplete={onCropComplete}
                showGrid
              />
            </div>
            <div>
              <Label className="mb-2 block text-xs">Zoom</Label>
              <Slider value={[zoom]} min={1} max={3} step={0.01} onValueChange={(v) => setZoom(v[0])} />
            </div>
            <div className="flex justify-between gap-2 pt-2">
              <Button variant="outline" onClick={() => setStep(1)}>
                <ChevronLeft className="h-4 w-4 mr-1" /> Voltar
              </Button>
              <Button onClick={() => setStep(3)} disabled={!croppedAreaPixels}>
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
