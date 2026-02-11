import React from 'react';
import { StudioNode, getNodeMeta } from './types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { X } from 'lucide-react';
import { Slider } from '@/components/ui/slider';

interface Props {
  node: StudioNode;
  onUpdateConfig: (nodeId: string, config: Record<string, any>) => void;
  onClose: () => void;
}

const LLM_MODELS = [
  // Google
  { value: 'google/gemini-2.5-flash', label: '🟦 Gemini 2.5 Flash', provider: 'Google' },
  { value: 'google/gemini-2.5-flash-lite', label: '🟦 Gemini 2.5 Flash Lite', provider: 'Google' },
  { value: 'google/gemini-2.5-pro', label: '🟦 Gemini 2.5 Pro', provider: 'Google' },
  { value: 'google/gemini-3-flash-preview', label: '🟦 Gemini 3 Flash', provider: 'Google' },
  { value: 'google/gemini-3-pro-preview', label: '🟦 Gemini 3 Pro', provider: 'Google' },
  // OpenAI
  { value: 'openai/gpt-5', label: '🟢 GPT-5', provider: 'OpenAI' },
  { value: 'openai/gpt-5-mini', label: '🟢 GPT-5 Mini', provider: 'OpenAI' },
  { value: 'openai/gpt-5-nano', label: '🟢 GPT-5 Nano', provider: 'OpenAI' },
  { value: 'openai/gpt-5.2', label: '🟢 GPT-5.2', provider: 'OpenAI' },
];

const IMAGE_MODELS = [
  // Lovable AI
  { value: 'google/gemini-2.5-flash-image', label: '🟦 Gemini Flash Image', provider: 'Google' },
  { value: 'google/gemini-3-pro-image-preview', label: '🟦 Gemini 3 Pro Image', provider: 'Google' },
  // OpenAI
  { value: 'openai/dall-e-3', label: '🟢 DALL·E 3', provider: 'OpenAI' },
  { value: 'openai/dall-e-4', label: '🟢 DALL·E 4', provider: 'OpenAI' },
  // Stability AI
  { value: 'stability/sdxl', label: '🟣 Stable Diffusion XL', provider: 'Stability AI' },
  { value: 'stability/sd3', label: '🟣 Stable Diffusion 3', provider: 'Stability AI' },
  { value: 'stability/sd3.5-turbo', label: '🟣 SD 3.5 Turbo', provider: 'Stability AI' },
  // Midjourney
  { value: 'midjourney/v6.1', label: '🔵 Midjourney v6.1', provider: 'Midjourney' },
  { value: 'midjourney/v7', label: '🔵 Midjourney v7', provider: 'Midjourney' },
  // Flux
  { value: 'flux/1.1-pro', label: '⚡ Flux 1.1 Pro', provider: 'Black Forest Labs' },
  { value: 'flux/schnell', label: '⚡ Flux Schnell', provider: 'Black Forest Labs' },
  // Ideogram
  { value: 'ideogram/v3', label: '🎨 Ideogram v3', provider: 'Ideogram' },
];

const VIDEO_MODELS = [
  // OpenAI
  { value: 'openai/sora-3', label: '🟢 Sora 3', provider: 'OpenAI' },
  { value: 'openai/sora-2', label: '🟢 Sora 2', provider: 'OpenAI' },
  // Google
  { value: 'google/veo-3', label: '🟦 Veo 3', provider: 'Google' },
  { value: 'google/veo-2', label: '🟦 Veo 2', provider: 'Google' },
  // Runway
  { value: 'runway/gen4', label: '🎬 Gen-4', provider: 'Runway' },
  { value: 'runway/gen3-alpha-turbo', label: '🎬 Gen-3 Alpha Turbo', provider: 'Runway' },
  // Kling
  { value: 'kling/v2.1', label: '🎥 Kling 2.1', provider: 'Kuaishou' },
  { value: 'kling/v1.6', label: '🎥 Kling 1.6', provider: 'Kuaishou' },
  // Pika
  { value: 'pika/v2.2', label: '🌊 Pika 2.2', provider: 'Pika' },
  // Minimax
  { value: 'minimax/video-01', label: '🟠 Hailuo MiniMax', provider: 'MiniMax' },
  // Luma
  { value: 'luma/dream-machine-1.5', label: '🌙 Dream Machine 1.5', provider: 'Luma' },
  // Stability
  { value: 'stability/stable-video', label: '🟣 Stable Video Diffusion', provider: 'Stability AI' },
];

const AUDIO_MODELS = [
  // ElevenLabs
  { value: 'elevenlabs/v3', label: '🔊 ElevenLabs v3', provider: 'ElevenLabs' },
  { value: 'elevenlabs/turbo-v2.5', label: '🔊 ElevenLabs Turbo', provider: 'ElevenLabs' },
  // OpenAI
  { value: 'openai/tts-1-hd', label: '🟢 OpenAI TTS HD', provider: 'OpenAI' },
  { value: 'openai/tts-1', label: '🟢 OpenAI TTS', provider: 'OpenAI' },
  // Google
  { value: 'google/wavenet', label: '🟦 Google WaveNet', provider: 'Google' },
  // Bark
  { value: 'suno/bark', label: '🐕 Bark', provider: 'Suno' },
];

const MUSIC_MODELS = [
  // Suno
  { value: 'suno/v4', label: '🎵 Suno v4', provider: 'Suno' },
  { value: 'suno/v3.5', label: '🎵 Suno v3.5', provider: 'Suno' },
  // Udio
  { value: 'udio/v2', label: '🎶 Udio v2', provider: 'Udio' },
  { value: 'udio/v1.5', label: '🎶 Udio v1.5', provider: 'Udio' },
  // Stable Audio
  { value: 'stability/stable-audio-2', label: '🟣 Stable Audio 2.0', provider: 'Stability AI' },
  // Google
  { value: 'google/musicfx', label: '🟦 MusicFX', provider: 'Google' },
];

const StudioNodeConfigPanel: React.FC<Props> = ({ node, onUpdateConfig, onClose }) => {
  const meta = getNodeMeta(node.data.type);
  const config = node.data.config;

  const update = (key: string, value: any) => {
    onUpdateConfig(node.id, { [key]: value });
  };

  const renderConfig = () => {
    switch (node.data.type) {
      case 'textInput':
        return (
          <div className="space-y-3">
            <div>
              <Label className="text-xs">Texto / Prompt</Label>
              <Textarea
                value={config.text || ''}
                onChange={(e) => update('text', e.target.value)}
                placeholder="Escreva seu prompt aqui..."
                rows={6}
                className="mt-1"
              />
            </div>
          </div>
        );

      case 'systemPrompt':
        return (
          <div className="space-y-3">
            <div>
              <Label className="text-xs">Instruções do Sistema</Label>
              <Textarea
                value={config.systemPrompt || ''}
                onChange={(e) => update('systemPrompt', e.target.value)}
                placeholder="Defina como o modelo deve se comportar..."
                rows={6}
                className="mt-1"
              />
            </div>
          </div>
        );

      case 'llmProcess':
        return (
          <div className="space-y-3">
            <div>
              <Label className="text-xs">Modelo</Label>
              <Select value={config.model || 'google/gemini-2.5-flash'} onValueChange={(v) => update('model', v)}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {LLM_MODELS.map((m) => (
                    <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Temperatura ({config.temperature ?? 0.7})</Label>
              <Slider
                value={[config.temperature ?? 0.7]}
                onValueChange={([v]) => update('temperature', v)}
                min={0}
                max={2}
                step={0.1}
                className="mt-2"
              />
            </div>
          </div>
        );

      case 'imageGen':
      case 'imageEdit':
        return (
          <div className="space-y-3">
            <div>
              <Label className="text-xs">Modelo de Imagem</Label>
              <Select value={config.model || 'google/gemini-2.5-flash-image'} onValueChange={(v) => update('model', v)}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {IMAGE_MODELS.map((m) => (
                    <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {node.data.type === 'imageEdit' && (
              <div>
                <Label className="text-xs">Instrução de Edição</Label>
                <Textarea
                  value={config.editPrompt || ''}
                  onChange={(e) => update('editPrompt', e.target.value)}
                  placeholder="Ex: Torne a cena mais dramática..."
                  rows={3}
                  className="mt-1"
                />
              </div>
            )}
          </div>
        );

      case 'videoGen':
        return (
          <div className="space-y-3">
            <div>
              <Label className="text-xs">Modelo de Vídeo</Label>
              <Select value={config.videoModel || 'openai/sora-3'} onValueChange={(v) => update('videoModel', v)}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {VIDEO_MODELS.map((m) => (
                    <SelectItem key={m.value} value={m.value}>
                      <span className="flex items-center gap-1">{m.label} <span className="text-[10px] text-muted-foreground">({m.provider})</span></span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Duração (segundos)</Label>
              <Select value={String(config.duration || 5)} onValueChange={(v) => update('duration', Number(v))}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="5">5 segundos</SelectItem>
                  <SelectItem value="10">10 segundos</SelectItem>
                  <SelectItem value="15">15 segundos</SelectItem>
                  <SelectItem value="20">20 segundos</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Resolução</Label>
              <Select value={config.resolution || '1080p'} onValueChange={(v) => update('resolution', v)}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="480p">480p (Rápido)</SelectItem>
                  <SelectItem value="720p">720p (Balanceado)</SelectItem>
                  <SelectItem value="1080p">1080p (HD)</SelectItem>
                  <SelectItem value="4k">4K (Ultra HD)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Aspecto</Label>
              <Select value={config.aspectRatio || '16:9'} onValueChange={(v) => update('aspectRatio', v)}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="16:9">16:9 (Paisagem)</SelectItem>
                  <SelectItem value="9:16">9:16 (Retrato/Reels)</SelectItem>
                  <SelectItem value="1:1">1:1 (Quadrado)</SelectItem>
                  <SelectItem value="4:3">4:3 (Clássico)</SelectItem>
                  <SelectItem value="21:9">21:9 (Cinemascope)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        );

      case 'audioGen':
        return (
          <div className="space-y-3">
            <div>
              <Label className="text-xs">Modelo de Áudio</Label>
              <Select value={config.audioModel || 'elevenlabs/v3'} onValueChange={(v) => update('audioModel', v)}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {AUDIO_MODELS.map((m) => (
                    <SelectItem key={m.value} value={m.value}>
                      <span className="flex items-center gap-1">{m.label} <span className="text-[10px] text-muted-foreground">({m.provider})</span></span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Tipo</Label>
              <Select value={config.type || 'sfx'} onValueChange={(v) => update('type', v)}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="sfx">Efeito Sonoro</SelectItem>
                  <SelectItem value="narration">Narração</SelectItem>
                  <SelectItem value="ambient">Ambiente</SelectItem>
                  <SelectItem value="voiceover">Voice Over</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Duração ({config.duration || 5}s)</Label>
              <Slider
                value={[config.duration || 5]}
                onValueChange={([v]) => update('duration', v)}
                min={1}
                max={60}
                step={1}
                className="mt-2"
              />
            </div>
          </div>
        );

      case 'musicGen':
        return (
          <div className="space-y-3">
            <div>
              <Label className="text-xs">Modelo de Música</Label>
              <Select value={config.musicModel || 'suno/v4'} onValueChange={(v) => update('musicModel', v)}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {MUSIC_MODELS.map((m) => (
                    <SelectItem key={m.value} value={m.value}>
                      <span className="flex items-center gap-1">{m.label} <span className="text-[10px] text-muted-foreground">({m.provider})</span></span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Gênero</Label>
              <Select value={config.genre || 'ambient'} onValueChange={(v) => update('genre', v)}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ambient">Ambient</SelectItem>
                  <SelectItem value="cinematic">Cinematográfico</SelectItem>
                  <SelectItem value="electronic">Eletrônico</SelectItem>
                  <SelectItem value="pop">Pop</SelectItem>
                  <SelectItem value="rock">Rock</SelectItem>
                  <SelectItem value="jazz">Jazz</SelectItem>
                  <SelectItem value="lofi">Lo-Fi</SelectItem>
                  <SelectItem value="hiphop">Hip-Hop</SelectItem>
                  <SelectItem value="classical">Clássico</SelectItem>
                  <SelectItem value="rnb">R&B</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Duração ({config.duration || 30}s)</Label>
              <Slider
                value={[config.duration || 30]}
                onValueChange={([v]) => update('duration', v)}
                min={5}
                max={240}
                step={5}
                className="mt-2"
              />
            </div>
          </div>
        );

      case 'videoMerge':
        return (
          <div className="space-y-3">
            <div>
              <Label className="text-xs">Transição</Label>
              <Select value={config.transition || 'fade'} onValueChange={(v) => update('transition', v)}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="fade">Fade</SelectItem>
                  <SelectItem value="crossfade">Crossfade</SelectItem>
                  <SelectItem value="cut">Corte Seco</SelectItem>
                  <SelectItem value="slide">Slide</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Duração da transição ({config.transitionDuration || 1}s)</Label>
              <Slider
                value={[config.transitionDuration || 1]}
                onValueChange={([v]) => update('transitionDuration', v)}
                min={0.5}
                max={3}
                step={0.5}
                className="mt-2"
              />
            </div>
          </div>
        );

      case 'lipSync':
        return (
          <div className="space-y-3">
            <p className="text-xs text-muted-foreground">
              Conecte um nó de áudio e um nó de vídeo/imagem como entrada para sincronizar os lábios automaticamente.
            </p>
          </div>
        );

      case 'imageAnalyze':
        return (
          <div className="space-y-3">
            <div>
              <Label className="text-xs">Modelo</Label>
              <Select value={config.model || 'google/gemini-2.5-flash'} onValueChange={(v) => update('model', v)}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {LLM_MODELS.map((m) => (
                    <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Prompt de Análise</Label>
              <Textarea
                value={config.prompt || ''}
                onChange={(e) => update('prompt', e.target.value)}
                placeholder="Descreva o que quer analisar..."
                rows={3}
                className="mt-1"
              />
            </div>
          </div>
        );

      case 'output':
        return (
          <div className="space-y-3">
            <div>
              <Label className="text-xs">Formato de Saída</Label>
              <Select value={config.format || 'auto'} onValueChange={(v) => update('format', v)}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="auto">Automático</SelectItem>
                  <SelectItem value="image">Imagem</SelectItem>
                  <SelectItem value="video">Vídeo</SelectItem>
                  <SelectItem value="audio">Áudio</SelectItem>
                  <SelectItem value="text">Texto</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        );

      default:
        return <p className="text-xs text-muted-foreground">Sem configurações adicionais</p>;
    }
  };

  return (
    <div className="w-72 border-l bg-card flex flex-col shrink-0">
      <div className="p-3 border-b flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span>{meta?.icon}</span>
          <h3 className="font-semibold text-sm truncate">{node.data.label}</h3>
        </div>
        <Button size="icon" variant="ghost" onClick={onClose} className="h-7 w-7">
          <X className="h-4 w-4" />
        </Button>
      </div>
      <ScrollArea className="flex-1 p-3">
        {renderConfig()}

        {/* Result preview */}
        {node.data.result && (
          <div className="mt-4 pt-4 border-t">
            <Label className="text-xs font-semibold">Resultado</Label>
            <div className="mt-2 rounded-lg border bg-muted/30 p-2">
              {typeof node.data.result === 'string' && (
                <p className="text-xs whitespace-pre-wrap">{node.data.result}</p>
              )}
              {node.data.result?.imageUrl && (
                <img src={node.data.result.imageUrl} alt="Result" className="w-full rounded" />
              )}
              {node.data.result?.text && (
                <p className="text-xs whitespace-pre-wrap mt-2">{node.data.result.text}</p>
              )}
            </div>
          </div>
        )}
      </ScrollArea>
    </div>
  );
};

export default StudioNodeConfigPanel;
