import React from 'react';
import { StudioNode, getNodeMeta } from './types';
import { useNodeResult } from './useNodeResults';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { X, Play, SkipForward } from 'lucide-react';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';

interface Props {
  node: StudioNode;
  onUpdateConfig: (nodeId: string, config: Record<string, any>) => void;
  onClose: () => void;
  onExecuteFromNode?: (nodeId: string) => void;
}

type ModelInfo = { value: string; label: string; provider: string; cost: '$' | '$$' | '$$$' | '$$$$'; quality: 1 | 2 | 3 | 4 | 5; tip: string };

const LLM_MODELS: ModelInfo[] = [
  { value: 'google/gemini-2.5-flash', label: '🟦 Gemini 2.5 Flash', provider: 'Google', cost: '$', quality: 4, tip: 'Rápido e econômico, ótimo custo-benefício' },
  { value: 'google/gemini-2.5-flash-lite', label: '🟦 Gemini 2.5 Flash Lite', provider: 'Google', cost: '$', quality: 3, tip: 'Mais barato, bom para tarefas simples' },
  { value: 'google/gemini-2.5-pro', label: '🟦 Gemini 2.5 Pro', provider: 'Google', cost: '$$$', quality: 5, tip: 'Top de linha Google, melhor raciocínio' },
  { value: 'google/gemini-3-flash-preview', label: '🟦 Gemini 3 Flash', provider: 'Google', cost: '$', quality: 4, tip: 'Nova geração, rápido e capaz' },
  { value: 'google/gemini-3-pro-preview', label: '🟦 Gemini 3 Pro', provider: 'Google', cost: '$$$', quality: 5, tip: 'Nova geração Pro, máxima qualidade' },
  { value: 'openai/gpt-5', label: '🟢 GPT-5', provider: 'OpenAI', cost: '$$$$', quality: 5, tip: 'Poderoso, caro, excelente raciocínio' },
  { value: 'openai/gpt-5-mini', label: '🟢 GPT-5 Mini', provider: 'OpenAI', cost: '$$', quality: 4, tip: 'Bom equilíbrio custo vs qualidade' },
  { value: 'openai/gpt-5-nano', label: '🟢 GPT-5 Nano', provider: 'OpenAI', cost: '$', quality: 3, tip: 'Econômico, tarefas simples e rápidas' },
  { value: 'openai/gpt-5.2', label: '🟢 GPT-5.2', provider: 'OpenAI', cost: '$$$$', quality: 5, tip: 'Mais recente OpenAI, raciocínio avançado' },
];

const IMAGE_MODELS: ModelInfo[] = [
  { value: 'google/imagefx', label: '🟦 Google ImageFX', provider: 'Google', cost: '$', quality: 3, tip: 'Gratuito, qualidade básica' },
  { value: 'google/gemini-2.5-flash-image', label: '🟦 Gemini Flash Image', provider: 'Google', cost: '$', quality: 4, tip: 'Rápido e econômico para imagens' },
  { value: 'google/gemini-3-pro-image-preview', label: '🟦 Gemini 3 Pro Image', provider: 'Google', cost: '$$', quality: 5, tip: 'Nova geração, alta qualidade' },
  { value: 'openai/dall-e-4', label: '🟢 DALL·E 4', provider: 'OpenAI', cost: '$$$$', quality: 5, tip: 'Máxima qualidade, mais caro' },
  { value: 'openai/dall-e-3', label: '🟢 DALL·E 3', provider: 'OpenAI', cost: '$$$', quality: 4, tip: 'Boa qualidade, custo moderado' },
  { value: 'stability/sd3.5-turbo', label: '🟣 SD 3.5 Turbo', provider: 'Stability AI', cost: '$', quality: 3, tip: 'Rápido e barato' },
  { value: 'stability/sd3', label: '🟣 Stable Diffusion 3', provider: 'Stability AI', cost: '$$', quality: 4, tip: 'Boa qualidade, open source' },
  { value: 'stability/sdxl', label: '🟣 Stable Diffusion XL', provider: 'Stability AI', cost: '$', quality: 3, tip: 'Versátil, custo baixo' },
  { value: 'midjourney/v7', label: '🔵 Midjourney v7', provider: 'Midjourney', cost: '$$$$', quality: 5, tip: 'Líder em estética, premium' },
  { value: 'midjourney/v6.1', label: '🔵 Midjourney v6.1', provider: 'Midjourney', cost: '$$$', quality: 5, tip: 'Excelente qualidade artística' },
  { value: 'flux/1.1-pro', label: '⚡ Flux 1.1 Pro', provider: 'Black Forest Labs', cost: '$$', quality: 4, tip: 'Alta qualidade, boa velocidade' },
  { value: 'flux/schnell', label: '⚡ Flux Schnell', provider: 'Black Forest Labs', cost: '$', quality: 3, tip: 'Ultra rápido, qualidade OK' },
  { value: 'ideogram/v3', label: '🎨 Ideogram v3', provider: 'Ideogram', cost: '$$', quality: 4, tip: 'Excelente com texto em imagens' },
  { value: 'adobe/firefly-3', label: '🔥 Adobe Firefly 3', provider: 'Adobe', cost: '$$$', quality: 4, tip: 'Comercialmente seguro, boa qualidade' },
];

const VIDEO_MODELS: ModelInfo[] = [
  { value: 'google/veo-3.1', label: '🟦 Veo 3.1 (Flow)', provider: 'Google', cost: '$$$$', quality: 5, tip: 'Melhor vídeo Google, com áudio' },
  { value: 'google/veo-3.1-fast', label: '🟦 Veo 3.1 Fast', provider: 'Google', cost: '$$$', quality: 4, tip: 'Versão rápida do Veo 3.1' },
  { value: 'google/veo-3', label: '🟦 Veo 3', provider: 'Google', cost: '$$$', quality: 5, tip: 'Alta qualidade com diálogos' },
  { value: 'google/veo-2', label: '🟦 Veo 2', provider: 'Google', cost: '$$', quality: 4, tip: 'Bom custo-benefício em vídeo' },
  { value: 'openai/sora-3', label: '🟢 Sora 3', provider: 'OpenAI', cost: '$$$$', quality: 5, tip: 'Referência em vídeo IA, premium' },
  { value: 'openai/sora-2', label: '🟢 Sora 2', provider: 'OpenAI', cost: '$$$', quality: 4, tip: 'Boa qualidade, custo alto' },
  { value: 'runway/gen4', label: '🎬 Gen-4', provider: 'Runway', cost: '$$$$', quality: 5, tip: 'Cinematográfico, controle preciso' },
  { value: 'runway/gen3-alpha-turbo', label: '🎬 Gen-3 Alpha Turbo', provider: 'Runway', cost: '$$', quality: 4, tip: 'Rápido, bom para iteração' },
  { value: 'kling/v2.1', label: '🎥 Kling 2.1', provider: 'Kuaishou', cost: '$$', quality: 4, tip: 'Bom com movimento, acessível' },
  { value: 'kling/v1.6', label: '🎥 Kling 1.6', provider: 'Kuaishou', cost: '$', quality: 3, tip: 'Econômico, qualidade aceitável' },
  { value: 'pika/v2.2', label: '🌊 Pika 2.2', provider: 'Pika', cost: '$$', quality: 4, tip: 'Criativo, bom para efeitos' },
  { value: 'minimax/video-01', label: '🟠 Hailuo MiniMax', provider: 'MiniMax', cost: '$', quality: 3, tip: 'Barato, vídeos curtos' },
  { value: 'luma/dream-machine-1.5', label: '🌙 Dream Machine 1.5', provider: 'Luma', cost: '$$', quality: 4, tip: 'Boa física e movimentos' },
  { value: 'stability/stable-video', label: '🟣 Stable Video Diffusion', provider: 'Stability AI', cost: '$', quality: 3, tip: 'Open source, econômico' },
  { value: 'bytedance/seedvideo', label: '🎯 Seed Video', provider: 'ByteDance', cost: '$', quality: 3, tip: 'Emergente, custo baixo' },
];

const AUDIO_MODELS: ModelInfo[] = [
  { value: 'elevenlabs/v3', label: '🔊 ElevenLabs v3', provider: 'ElevenLabs', cost: '$$$', quality: 5, tip: 'Melhor qualidade de voz, realista' },
  { value: 'elevenlabs/turbo-v2.5', label: '🔊 ElevenLabs Turbo', provider: 'ElevenLabs', cost: '$$', quality: 4, tip: 'Rápido, boa qualidade' },
  { value: 'openai/tts-1-hd', label: '🟢 OpenAI TTS HD', provider: 'OpenAI', cost: '$$', quality: 4, tip: 'HD, vozes naturais' },
  { value: 'openai/tts-1', label: '🟢 OpenAI TTS', provider: 'OpenAI', cost: '$', quality: 3, tip: 'Econômico, qualidade boa' },
  { value: 'google/wavenet', label: '🟦 Google WaveNet', provider: 'Google', cost: '$', quality: 4, tip: 'Bom PT-BR, acessível' },
  { value: 'google/neural2', label: '🟦 Google Neural2', provider: 'Google', cost: '$', quality: 4, tip: 'Neural, natural em PT-BR' },
  { value: 'google/studio', label: '🟦 Google Studio', provider: 'Google', cost: '$$', quality: 5, tip: 'Máxima qualidade Google' },
  { value: 'suno/bark', label: '🐕 Bark', provider: 'Suno', cost: '$', quality: 3, tip: 'Open source, expressivo' },
  { value: 'microsoft/azure-tts', label: '🔵 Azure Neural TTS', provider: 'Microsoft', cost: '$$', quality: 4, tip: 'Muitas vozes, boa qualidade' },
  { value: 'amazon/polly-neural', label: '🟡 Amazon Polly Neural', provider: 'AWS', cost: '$', quality: 3, tip: 'Estável, integração AWS' },
];

const MUSIC_MODELS: ModelInfo[] = [
  { value: 'suno/v4', label: '🎵 Suno v4', provider: 'Suno', cost: '$$$', quality: 5, tip: 'Líder em música IA, com vocal' },
  { value: 'suno/v3.5', label: '🎵 Suno v3.5', provider: 'Suno', cost: '$$', quality: 4, tip: 'Boa qualidade, mais barato' },
  { value: 'udio/v2', label: '🎶 Udio v2', provider: 'Udio', cost: '$$$', quality: 5, tip: 'Alta fidelidade, produção pro' },
  { value: 'udio/v1.5', label: '🎶 Udio v1.5', provider: 'Udio', cost: '$$', quality: 4, tip: 'Bom para prototipagem' },
  { value: 'stability/stable-audio-2', label: '🟣 Stable Audio 2.0', provider: 'Stability AI', cost: '$', quality: 3, tip: 'Open source, instrumental' },
  { value: 'google/musicfx', label: '🟦 MusicFX', provider: 'Google', cost: '$', quality: 3, tip: 'Gratuito, experimental' },
  { value: 'meta/musicgen-large', label: '🔵 MusicGen Large', provider: 'Meta', cost: '$', quality: 3, tip: 'Open source, versátil' },
  { value: 'meta/musicgen-melody', label: '🔵 MusicGen Melody', provider: 'Meta', cost: '$', quality: 3, tip: 'Segue melodias de referência' },
];

// Voices / Locutores
const ELEVENLABS_VOICES = [
  { value: 'CwhRBWXzGAHq8TQ4Fs17', label: 'Roger (Masculino)', lang: 'en' },
  { value: 'EXAVITQu4vr4xnSDxMaL', label: 'Sarah (Feminino)', lang: 'en' },
  { value: 'FGY2WhTYpPnrIDTdsKH5', label: 'Laura (Feminino)', lang: 'en' },
  { value: 'IKne3meq5aSn9XLyUdCD', label: 'Charlie (Masculino)', lang: 'en' },
  { value: 'JBFqnCBsd6RMkjVDRZzb', label: 'George (Masculino)', lang: 'en' },
  { value: 'N2lVS1w4EtoT3dr4eOWO', label: 'Callum (Masculino)', lang: 'en' },
  { value: 'SAz9YHcvj6GT2YYXdXww', label: 'River (Não-binário)', lang: 'en' },
  { value: 'TX3LPaxmHKxFdv7VOQHJ', label: 'Liam (Masculino)', lang: 'en' },
  { value: 'Xb7hH8MSUJpSbSDYk0k2', label: 'Alice (Feminino)', lang: 'en' },
  { value: 'XrExE9yKIg1WjnnlVkGX', label: 'Matilda (Feminino)', lang: 'en' },
  { value: 'bIHbv24MWmeRgasZH58o', label: 'Will (Masculino)', lang: 'en' },
  { value: 'cgSgspJ2msm6clMCkdW9', label: 'Jessica (Feminino)', lang: 'en' },
  { value: 'cjVigY5qzO86Huf0OWal', label: 'Eric (Masculino)', lang: 'en' },
  { value: 'iP95p4xoKVk53GoZ742B', label: 'Chris (Masculino)', lang: 'en' },
  { value: 'nPczCjzI2devNBz1zQrb', label: 'Brian (Masculino)', lang: 'en' },
  { value: 'onwK4e9ZLuTAKqWW03F9', label: 'Daniel (Masculino)', lang: 'en' },
  { value: 'pFZP5JQG7iQjIQuC4Bku', label: 'Lily (Feminino)', lang: 'en' },
  { value: 'pqHfZKP75CvOlQylNhV4', label: 'Bill (Masculino)', lang: 'en' },
];

const OPENAI_VOICES = [
  { value: 'alloy', label: 'Alloy (Neutro)' },
  { value: 'ash', label: 'Ash (Masculino)' },
  { value: 'ballad', label: 'Ballad (Masculino)' },
  { value: 'coral', label: 'Coral (Feminino)' },
  { value: 'echo', label: 'Echo (Masculino)' },
  { value: 'fable', label: 'Fable (Masculino)' },
  { value: 'nova', label: 'Nova (Feminino)' },
  { value: 'onyx', label: 'Onyx (Masculino)' },
  { value: 'sage', label: 'Sage (Feminino)' },
  { value: 'shimmer', label: 'Shimmer (Feminino)' },
];

const GOOGLE_VOICES_PT = [
  { value: 'pt-BR-Wavenet-A', label: 'Feminino A (WaveNet)' },
  { value: 'pt-BR-Wavenet-B', label: 'Masculino B (WaveNet)' },
  { value: 'pt-BR-Wavenet-C', label: 'Feminino C (WaveNet)' },
  { value: 'pt-BR-Neural2-A', label: 'Feminino A (Neural2)' },
  { value: 'pt-BR-Neural2-B', label: 'Masculino B (Neural2)' },
  { value: 'pt-BR-Neural2-C', label: 'Feminino C (Neural2)' },
  { value: 'pt-BR-Studio-A', label: 'Feminino A (Studio)' },
  { value: 'pt-BR-Studio-B', label: 'Masculino B (Studio)' },
];

const LANGUAGES = [
  { value: 'pt-BR', label: '🇧🇷 Português (BR)' },
  { value: 'pt-PT', label: '🇵🇹 Português (PT)' },
  { value: 'en-US', label: '🇺🇸 Inglês (US)' },
  { value: 'en-GB', label: '🇬🇧 Inglês (UK)' },
  { value: 'es-ES', label: '🇪🇸 Espanhol' },
  { value: 'fr-FR', label: '🇫🇷 Francês' },
  { value: 'de-DE', label: '🇩🇪 Alemão' },
  { value: 'it-IT', label: '🇮🇹 Italiano' },
  { value: 'ja-JP', label: '🇯🇵 Japonês' },
  { value: 'ko-KR', label: '🇰🇷 Coreano' },
  { value: 'zh-CN', label: '🇨🇳 Chinês (Simplificado)' },
  { value: 'ar-SA', label: '🇸🇦 Árabe' },
  { value: 'hi-IN', label: '🇮🇳 Hindi' },
  { value: 'ru-RU', label: '🇷🇺 Russo' },
];

const IMAGE_STYLES = [
  { value: 'natural', label: 'Natural / Fotorrealista' },
  { value: 'vivid', label: 'Vívido / Saturado' },
  { value: 'anime', label: 'Anime / Mangá' },
  { value: 'digital-art', label: 'Arte Digital' },
  { value: 'oil-painting', label: 'Pintura a Óleo' },
  { value: 'watercolor', label: 'Aquarela' },
  { value: 'pixel-art', label: 'Pixel Art' },
  { value: '3d-render', label: 'Render 3D' },
  { value: 'cinematic', label: 'Cinematográfico' },
  { value: 'comic', label: 'Quadrinhos / HQ' },
  { value: 'minimalist', label: 'Minimalista' },
  { value: 'sketch', label: 'Esboço / Rascunho' },
  { value: 'fantasy', label: 'Fantasia' },
  { value: 'isometric', label: 'Isométrico' },
  { value: 'neon', label: 'Neon / Cyberpunk' },
];

const IMAGE_SIZES = [
  { value: '1024x1024', label: '1024×1024 (1:1)' },
  { value: '1792x1024', label: '1792×1024 (16:9)' },
  { value: '1024x1792', label: '1024×1792 (9:16)' },
  { value: '1536x1024', label: '1536×1024 (3:2)' },
  { value: '1024x1536', label: '1024×1536 (2:3)' },
  { value: '512x512', label: '512×512 (Rápido)' },
  { value: '2048x2048', label: '2048×2048 (Ultra HD)' },
];

const CAMERA_MOVEMENTS = [
  { value: 'none', label: 'Nenhum (Estático)' },
  { value: 'pan-left', label: 'Pan Esquerda' },
  { value: 'pan-right', label: 'Pan Direita' },
  { value: 'pan-up', label: 'Tilt Cima' },
  { value: 'pan-down', label: 'Tilt Baixo' },
  { value: 'zoom-in', label: 'Zoom In' },
  { value: 'zoom-out', label: 'Zoom Out' },
  { value: 'orbit', label: 'Órbita' },
  { value: 'dolly-forward', label: 'Dolly Forward' },
  { value: 'dolly-backward', label: 'Dolly Backward' },
  { value: 'crane-up', label: 'Grua Subindo' },
  { value: 'crane-down', label: 'Grua Descendo' },
  { value: 'tracking', label: 'Tracking (Seguir Objeto)' },
  { value: 'handheld', label: 'Câmera na Mão' },
  { value: 'steadicam', label: 'Steadicam' },
];

const VIDEO_STYLES = [
  { value: 'realistic', label: 'Realista' },
  { value: 'cinematic', label: 'Cinematográfico' },
  { value: 'anime', label: 'Anime' },
  { value: 'cartoon', label: 'Cartoon' },
  { value: '3d-animation', label: 'Animação 3D' },
  { value: 'stop-motion', label: 'Stop Motion' },
  { value: 'slow-motion', label: 'Câmera Lenta' },
  { value: 'timelapse', label: 'Timelapse' },
  { value: 'noir', label: 'Film Noir' },
  { value: 'vintage', label: 'Vintage / Retro' },
  { value: 'documentary', label: 'Documentário' },
  { value: 'music-video', label: 'Clipe Musical' },
];

const VIDEO_FPS = [
  { value: '24', label: '24 fps (Cinema)' },
  { value: '25', label: '25 fps (PAL)' },
  { value: '30', label: '30 fps (Padrão)' },
  { value: '48', label: '48 fps (Alta)' },
  { value: '60', label: '60 fps (Smooth)' },
];

const AUDIO_FORMATS = [
  { value: 'mp3', label: 'MP3' },
  { value: 'wav', label: 'WAV (Lossless)' },
  { value: 'ogg', label: 'OGG Vorbis' },
  { value: 'flac', label: 'FLAC (Lossless)' },
  { value: 'aac', label: 'AAC' },
];

const AUDIO_SAMPLE_RATES = [
  { value: '22050', label: '22.05 kHz (Leve)' },
  { value: '44100', label: '44.1 kHz (CD Quality)' },
  { value: '48000', label: '48 kHz (Studio)' },
];

const MUSIC_MOODS = [
  { value: 'happy', label: 'Alegre' },
  { value: 'sad', label: 'Triste' },
  { value: 'energetic', label: 'Energético' },
  { value: 'calm', label: 'Calmo' },
  { value: 'dark', label: 'Sombrio' },
  { value: 'epic', label: 'Épico' },
  { value: 'romantic', label: 'Romântico' },
  { value: 'mysterious', label: 'Misterioso' },
  { value: 'suspense', label: 'Suspense' },
  { value: 'uplifting', label: 'Inspirador' },
  { value: 'melancholic', label: 'Melancólico' },
  { value: 'aggressive', label: 'Agressivo' },
  { value: 'peaceful', label: 'Pacífico' },
  { value: 'nostalgic', label: 'Nostálgico' },
];

const MUSIC_INSTRUMENTS = [
  { value: 'piano', label: '🎹 Piano' },
  { value: 'guitar', label: '🎸 Guitarra' },
  { value: 'acoustic-guitar', label: '🎸 Violão' },
  { value: 'drums', label: '🥁 Bateria' },
  { value: 'bass', label: '🎸 Baixo' },
  { value: 'strings', label: '🎻 Cordas (Orquestra)' },
  { value: 'synth', label: '🎹 Sintetizador' },
  { value: 'flute', label: '🎵 Flauta' },
  { value: 'saxophone', label: '🎷 Saxofone' },
  { value: 'trumpet', label: '🎺 Trompete' },
  { value: 'violin', label: '🎻 Violino' },
  { value: 'cello', label: '🎻 Violoncelo' },
  { value: 'harp', label: '🎵 Harpa' },
  { value: 'ukulele', label: '🎸 Ukulele' },
  { value: 'organ', label: '🎹 Órgão' },
];

const MUSIC_TEMPOS = [
  { value: 'very-slow', label: 'Muito Lento (< 60 BPM)' },
  { value: 'slow', label: 'Lento (60-80 BPM)' },
  { value: 'moderate', label: 'Moderado (80-110 BPM)' },
  { value: 'fast', label: 'Rápido (110-140 BPM)' },
  { value: 'very-fast', label: 'Muito Rápido (> 140 BPM)' },
];

const QualityStars = ({ level }: { level: number }) => (
  <span className="text-[10px] leading-none">
    {Array.from({ length: 5 }, (_, i) => (
      <span key={i} className={i < level ? 'text-amber-500' : 'text-muted-foreground/30'}>★</span>
    ))}
  </span>
);

const CostBadge = ({ cost }: { cost: string }) => {
  const color = cost.length <= 1 ? 'text-emerald-600 bg-emerald-500/10' : cost.length === 2 ? 'text-blue-600 bg-blue-500/10' : cost.length === 3 ? 'text-orange-600 bg-orange-500/10' : 'text-red-600 bg-red-500/10';
  return <span className={`text-[9px] font-bold px-1 py-0.5 rounded ${color}`}>{cost}</span>;
};

const ModelSelectItem = ({ model }: { model: ModelInfo }) => (
  <SelectItem key={model.value} value={model.value}>
    <div className="flex flex-col gap-0.5 py-0.5">
      <div className="flex items-center gap-2">
        <span>{model.label}</span>
        <CostBadge cost={model.cost} />
        <QualityStars level={model.quality} />
      </div>
      <span className="text-[10px] text-muted-foreground">{model.tip}</span>
    </div>
  </SelectItem>
);

const SectionTitle = ({ children }: { children: React.ReactNode }) => (
  <div className="flex items-center gap-2 mt-4 mb-2">
    <Separator className="flex-1" />
    <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold whitespace-nowrap">{children}</span>
    <Separator className="flex-1" />
  </div>
);

const StudioNodeConfigPanel: React.FC<Props> = ({ node, onUpdateConfig, onClose, onExecuteFromNode }) => {
  const meta = getNodeMeta(node.data.type);
  const config = node.data.config;
  const { result: storeResult } = useNodeResult(node.id);
  const activeResult = storeResult ?? node.data.result;

  const update = (key: string, value: any) => {
    onUpdateConfig(node.id, { [key]: value });
  };

  const isElevenLabs = (config.audioModel || '').startsWith('elevenlabs');
  const isOpenAITTS = (config.audioModel || '').startsWith('openai/tts');
  const isGoogleTTS = (config.audioModel || '').startsWith('google/');

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

      case 'imageInput':
        return (
          <div className="space-y-3">
            <div>
              <Label className="text-xs">Imagens de Referência</Label>
              <p className="text-[10px] text-muted-foreground mb-2">Cole URLs de imagens ou imagens base64. Cada linha é uma imagem.</p>
              <Textarea
                value={(config.images || []).join('\n')}
                onChange={(e) => {
                  const lines = e.target.value.split('\n').filter((l: string) => l.trim());
                  update('images', lines);
                }}
                placeholder="https://example.com/image1.jpg&#10;https://example.com/image2.jpg&#10;data:image/png;base64,..."
                rows={4}
                className="mt-1 font-mono text-[10px]"
              />
            </div>
            <div>
              <Label className="text-xs">Ou carregue um arquivo</Label>
              <input
                type="file"
                accept="image/*"
                multiple
                className="mt-1 text-xs w-full"
                onChange={(e) => {
                  const files = Array.from(e.target.files || []);
                  files.forEach((file) => {
                    const reader = new FileReader();
                    reader.onload = () => {
                      const base64 = reader.result as string;
                      update('images', [...(config.images || []), base64]);
                    };
                    reader.readAsDataURL(file);
                  });
                }}
              />
            </div>
            {(config.images || []).length > 0 && (
              <div>
                <Label className="text-xs">{config.images.length} imagem(ns) carregada(s)</Label>
                <div className="grid grid-cols-3 gap-1 mt-1">
                  {config.images.map((img: string, idx: number) => (
                    <div key={idx} className="relative group rounded-md overflow-hidden border border-border aspect-square">
                      <img src={img} alt={`Ref ${idx + 1}`} className="w-full h-full object-cover" />
                      <button
                        onClick={() => update('images', config.images.filter((_: any, i: number) => i !== idx))}
                        className="absolute top-0.5 right-0.5 p-0.5 rounded bg-black/60 text-white opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
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
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent className="max-h-[400px]">
                  {LLM_MODELS.map((m) => (
                    <ModelSelectItem key={m.value} model={m} />
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Temperatura ({config.temperature ?? 0.7})</Label>
              <Slider
                value={[config.temperature ?? 0.7]}
                onValueChange={([v]) => update('temperature', v)}
                min={0} max={2} step={0.1}
                className="mt-2"
              />
            </div>
            <div>
              <Label className="text-xs">Max Tokens ({config.maxTokens ?? 2048})</Label>
              <Slider
                value={[config.maxTokens ?? 2048]}
                onValueChange={([v]) => update('maxTokens', v)}
                min={256} max={16384} step={256}
                className="mt-2"
              />
            </div>
            <div>
              <Label className="text-xs">Top P ({config.topP ?? 1})</Label>
              <Slider
                value={[config.topP ?? 1]}
                onValueChange={([v]) => update('topP', v)}
                min={0} max={1} step={0.05}
                className="mt-2"
              />
            </div>
            <div>
              <Label className="text-xs">Frequência Penalty ({config.frequencyPenalty ?? 0})</Label>
              <Slider
                value={[config.frequencyPenalty ?? 0]}
                onValueChange={([v]) => update('frequencyPenalty', v)}
                min={-2} max={2} step={0.1}
                className="mt-2"
              />
            </div>
            <div>
              <Label className="text-xs">Presença Penalty ({config.presencePenalty ?? 0})</Label>
              <Slider
                value={[config.presencePenalty ?? 0]}
                onValueChange={([v]) => update('presencePenalty', v)}
                min={-2} max={2} step={0.1}
                className="mt-2"
              />
            </div>
            <SectionTitle>Formato de Resposta</SectionTitle>
            <div>
              <Label className="text-xs">Formato</Label>
              <Select value={config.responseFormat || 'text'} onValueChange={(v) => update('responseFormat', v)}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="text">Texto Livre</SelectItem>
                  <SelectItem value="json">JSON</SelectItem>
                  <SelectItem value="markdown">Markdown</SelectItem>
                  <SelectItem value="code">Código</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center justify-between">
              <Label className="text-xs">Streaming</Label>
              <Switch checked={config.streaming ?? false} onCheckedChange={(v) => update('streaming', v)} />
            </div>
          </div>
        );

      case 'imageGen':
      case 'imageEdit':
      case 'productComposite':
        return (
          <div className="space-y-3">
            <div>
              <Label className="text-xs">Modelo de Imagem</Label>
              <Select value={config.model || 'google/gemini-2.5-flash-image'} onValueChange={(v) => update('model', v)}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent className="max-h-[400px]">
                  {IMAGE_MODELS.map((m) => (
                    <ModelSelectItem key={m.value} model={m} />
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
            <SectionTitle>Estilo & Tamanho</SectionTitle>
            <div>
              <Label className="text-xs">Estilo Visual</Label>
              <Select value={config.imageStyle || 'natural'} onValueChange={(v) => update('imageStyle', v)}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {IMAGE_STYLES.map((s) => (
                    <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Tamanho</Label>
              <Select value={config.imageSize || '1024x1024'} onValueChange={(v) => update('imageSize', v)}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {IMAGE_SIZES.map((s) => (
                    <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Qualidade</Label>
              <Select value={config.quality || 'standard'} onValueChange={(v) => update('quality', v)}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Rascunho (Rápido)</SelectItem>
                  <SelectItem value="standard">Padrão</SelectItem>
                  <SelectItem value="hd">HD (Alta Qualidade)</SelectItem>
                  <SelectItem value="ultra">Ultra HD</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <SectionTitle>Ajustes Avançados</SectionTitle>
            <div>
              <Label className="text-xs">Número de Variações ({config.numImages ?? 1})</Label>
              <Slider
                value={[config.numImages ?? 1]}
                onValueChange={([v]) => update('numImages', v)}
                min={1} max={4} step={1}
                className="mt-2"
              />
            </div>
            <div>
              <Label className="text-xs">Guidance Scale ({config.guidanceScale ?? 7.5})</Label>
              <Slider
                value={[config.guidanceScale ?? 7.5]}
                onValueChange={([v]) => update('guidanceScale', v)}
                min={1} max={20} step={0.5}
                className="mt-2"
              />
            </div>
            <div>
              <Label className="text-xs">Steps ({config.steps ?? 30})</Label>
              <Slider
                value={[config.steps ?? 30]}
                onValueChange={([v]) => update('steps', v)}
                min={10} max={150} step={5}
                className="mt-2"
              />
            </div>
            <div>
              <Label className="text-xs">Seed (Semente)</Label>
              <Input
                type="number"
                value={config.seed || ''}
                onChange={(e) => update('seed', e.target.value ? Number(e.target.value) : undefined)}
                placeholder="Aleatório"
                className="mt-1"
              />
            </div>
            <div>
              <Label className="text-xs">Prompt Negativo</Label>
              <Textarea
                value={config.negativePrompt || ''}
                onChange={(e) => update('negativePrompt', e.target.value)}
                placeholder="O que NÃO incluir na imagem..."
                rows={2}
                className="mt-1"
              />
            </div>
            {node.data.type === 'imageEdit' && (
              <>
                <SectionTitle>Opções de Edição</SectionTitle>
                <div>
                  <Label className="text-xs">Força da Edição ({config.editStrength ?? 0.75})</Label>
                  <Slider
                    value={[config.editStrength ?? 0.75]}
                    onValueChange={([v]) => update('editStrength', v)}
                    min={0.1} max={1} step={0.05}
                    className="mt-2"
                  />
                </div>
                <div>
                  <Label className="text-xs">Tipo de Edição</Label>
                  <Select value={config.editType || 'general'} onValueChange={(v) => update('editType', v)}>
                    <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="general">Geral</SelectItem>
                      <SelectItem value="inpaint">Inpainting (Preencher área)</SelectItem>
                      <SelectItem value="outpaint">Outpainting (Expandir)</SelectItem>
                      <SelectItem value="upscale">Upscale (Aumentar resolução)</SelectItem>
                      <SelectItem value="remove-bg">Remover Fundo</SelectItem>
                      <SelectItem value="colorize">Colorizar</SelectItem>
                      <SelectItem value="style-transfer">Transferir Estilo</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </>
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
                <SelectContent className="max-h-[400px]">
                  {VIDEO_MODELS.map((m) => (
                    <ModelSelectItem key={m.value} model={m} />
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Estilo de Vídeo</Label>
              <Select value={config.videoStyle || 'realistic'} onValueChange={(v) => update('videoStyle', v)}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {VIDEO_STYLES.map((s) => (
                    <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <SectionTitle>Animação (GIF Gratuito)</SectionTitle>
            <div>
              <Label className="text-xs">Quantidade de Frames</Label>
              <Select value={String(config.frameCount || 4)} onValueChange={(v) => update('frameCount', Number(v))}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="2">2 frames (Rápido)</SelectItem>
                  <SelectItem value="3">3 frames</SelectItem>
                  <SelectItem value="4">4 frames (Padrão)</SelectItem>
                  <SelectItem value="5">5 frames</SelectItem>
                  <SelectItem value="6">6 frames (Detalhado)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Velocidade (FPS)</Label>
              <Select value={String(config.fps || 2)} onValueChange={(v) => update('fps', Number(v))}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="0.5">0.5 fps (Muito lento — 2s/frame)</SelectItem>
                  <SelectItem value="1">1 fps (Lento — 1s/frame)</SelectItem>
                  <SelectItem value="2">2 fps (Normal — 0.5s/frame)</SelectItem>
                  <SelectItem value="3">3 fps (Rápido)</SelectItem>
                  <SelectItem value="4">4 fps (Muito rápido)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Duração total estimada</Label>
              <p className="text-xs text-muted-foreground mt-1">
                ~{((config.frameCount || 4) / (config.fps || 2)).toFixed(1)}s ({config.frameCount || 4} frames × {(1 / (config.fps || 2)).toFixed(1)}s)
              </p>
            </div>
            <div>
              <Label className="text-xs">Resolução</Label>
              <Select value={config.resolution || '1080p'} onValueChange={(v) => update('resolution', v)}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="480p">480p (Rápido)</SelectItem>
                  <SelectItem value="720p">720p (Balanceado)</SelectItem>
                  <SelectItem value="1080p">1080p (Full HD)</SelectItem>
                  <SelectItem value="2k">2K (QHD)</SelectItem>
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
                  <SelectItem value="3:4">3:4 (Retrato Clássico)</SelectItem>
                  <SelectItem value="21:9">21:9 (Cinemascope)</SelectItem>
                  <SelectItem value="2.35:1">2.35:1 (Anamórfico)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <SectionTitle>Câmera</SectionTitle>
            <div>
              <Label className="text-xs">Movimento de Câmera</Label>
              <Select value={config.cameraMovement || 'none'} onValueChange={(v) => update('cameraMovement', v)}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CAMERA_MOVEMENTS.map((c) => (
                    <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Velocidade da Câmera ({config.cameraSpeed ?? 1}x)</Label>
              <Slider
                value={[config.cameraSpeed ?? 1]}
                onValueChange={([v]) => update('cameraSpeed', v)}
                min={0.25} max={4} step={0.25}
                className="mt-2"
              />
            </div>
            <SectionTitle>Qualidade & FPS</SectionTitle>
            <div>
              <Label className="text-xs">Frames por Segundo</Label>
              <Select value={config.fps || '24'} onValueChange={(v) => update('fps', v)}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {VIDEO_FPS.map((f) => (
                    <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">CFG Scale ({config.cfgScale ?? 7})</Label>
              <Slider
                value={[config.cfgScale ?? 7]}
                onValueChange={([v]) => update('cfgScale', v)}
                min={1} max={20} step={0.5}
                className="mt-2"
              />
            </div>
            <div>
              <Label className="text-xs">Seed (Semente)</Label>
              <Input
                type="number"
                value={config.videoSeed || ''}
                onChange={(e) => update('videoSeed', e.target.value ? Number(e.target.value) : undefined)}
                placeholder="Aleatório"
                className="mt-1"
              />
            </div>
            <SectionTitle>Opções</SectionTitle>
            <div className="flex items-center justify-between">
              <Label className="text-xs">Loop Infinito</Label>
              <Switch checked={config.loop ?? false} onCheckedChange={(v) => update('loop', v)} />
            </div>
            <div className="flex items-center justify-between">
              <Label className="text-xs">Gerar com Áudio</Label>
              <Switch checked={config.withAudio ?? false} onCheckedChange={(v) => update('withAudio', v)} />
            </div>
            <div>
              <Label className="text-xs">Prompt Negativo</Label>
              <Textarea
                value={config.videoNegativePrompt || ''}
                onChange={(e) => update('videoNegativePrompt', e.target.value)}
                placeholder="O que evitar no vídeo..."
                rows={2}
                className="mt-1"
              />
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
                <SelectContent className="max-h-[400px]">
                  {AUDIO_MODELS.map((m) => (
                    <ModelSelectItem key={m.value} model={m} />
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Tipo</Label>
              <Select value={config.type || 'sfx'} onValueChange={(v) => update('type', v)}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="sfx">Efeito Sonoro (SFX)</SelectItem>
                  <SelectItem value="narration">Narração</SelectItem>
                  <SelectItem value="ambient">Som Ambiente</SelectItem>
                  <SelectItem value="voiceover">Voice Over</SelectItem>
                  <SelectItem value="dialogue">Diálogo</SelectItem>
                  <SelectItem value="foley">Foley (Ruído de Cena)</SelectItem>
                  <SelectItem value="podcast">Podcast</SelectItem>
                  <SelectItem value="audiobook">Audiobook</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <SectionTitle>Locutor / Voz</SectionTitle>
            <div>
              <Label className="text-xs">Idioma</Label>
              <Select value={config.language || 'pt-BR'} onValueChange={(v) => update('language', v)}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {LANGUAGES.map((l) => (
                    <SelectItem key={l.value} value={l.value}>{l.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {isElevenLabs && (
              <div>
                <Label className="text-xs">Voz (ElevenLabs)</Label>
                <Select value={config.voiceId || ELEVENLABS_VOICES[0].value} onValueChange={(v) => update('voiceId', v)}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {ELEVENLABS_VOICES.map((v) => (
                      <SelectItem key={v.value} value={v.value}>{v.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {isOpenAITTS && (
              <div>
                <Label className="text-xs">Voz (OpenAI)</Label>
                <Select value={config.voiceId || 'alloy'} onValueChange={(v) => update('voiceId', v)}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {OPENAI_VOICES.map((v) => (
                      <SelectItem key={v.value} value={v.value}>{v.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {isGoogleTTS && (
              <div>
                <Label className="text-xs">Voz (Google pt-BR)</Label>
                <Select value={config.voiceId || GOOGLE_VOICES_PT[0].value} onValueChange={(v) => update('voiceId', v)}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {GOOGLE_VOICES_PT.map((v) => (
                      <SelectItem key={v.value} value={v.value}>{v.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <SectionTitle>Configurações de Voz</SectionTitle>
            <div>
              <Label className="text-xs">Estabilidade ({config.stability ?? 0.5})</Label>
              <Slider
                value={[config.stability ?? 0.5]}
                onValueChange={([v]) => update('stability', v)}
                min={0} max={1} step={0.05}
                className="mt-2"
              />
            </div>
            <div>
              <Label className="text-xs">Similaridade ({config.similarityBoost ?? 0.75})</Label>
              <Slider
                value={[config.similarityBoost ?? 0.75]}
                onValueChange={([v]) => update('similarityBoost', v)}
                min={0} max={1} step={0.05}
                className="mt-2"
              />
            </div>
            <div>
              <Label className="text-xs">Estilo ({config.style ?? 0.5})</Label>
              <Slider
                value={[config.style ?? 0.5]}
                onValueChange={([v]) => update('style', v)}
                min={0} max={1} step={0.05}
                className="mt-2"
              />
            </div>
            <div>
              <Label className="text-xs">Velocidade ({config.speed ?? 1}x)</Label>
              <Slider
                value={[config.speed ?? 1]}
                onValueChange={([v]) => update('speed', v)}
                min={0.5} max={2} step={0.1}
                className="mt-2"
              />
            </div>
            <div className="flex items-center justify-between">
              <Label className="text-xs">Speaker Boost</Label>
              <Switch checked={config.speakerBoost ?? true} onCheckedChange={(v) => update('speakerBoost', v)} />
            </div>

            <SectionTitle>Duração & Formato</SectionTitle>
            <div>
              <Label className="text-xs">Duração ({config.duration || 5}s)</Label>
              <Slider
                value={[config.duration || 5]}
                onValueChange={([v]) => update('duration', v)}
                min={1} max={300} step={1}
                className="mt-2"
              />
            </div>
            <div>
              <Label className="text-xs">Formato de Saída</Label>
              <Select value={config.audioFormat || 'mp3'} onValueChange={(v) => update('audioFormat', v)}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {AUDIO_FORMATS.map((f) => (
                    <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Sample Rate</Label>
              <Select value={config.sampleRate || '44100'} onValueChange={(v) => update('sampleRate', v)}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {AUDIO_SAMPLE_RATES.map((r) => (
                    <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Prompt Influence ({config.promptInfluence ?? 0.3})</Label>
              <Slider
                value={[config.promptInfluence ?? 0.3]}
                onValueChange={([v]) => update('promptInfluence', v)}
                min={0} max={1} step={0.05}
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
                <SelectContent className="max-h-[400px]">
                  {MUSIC_MODELS.map((m) => (
                    <ModelSelectItem key={m.value} model={m} />
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
                  <SelectItem value="edm">EDM</SelectItem>
                  <SelectItem value="house">House</SelectItem>
                  <SelectItem value="techno">Techno</SelectItem>
                  <SelectItem value="pop">Pop</SelectItem>
                  <SelectItem value="rock">Rock</SelectItem>
                  <SelectItem value="metal">Metal</SelectItem>
                  <SelectItem value="jazz">Jazz</SelectItem>
                  <SelectItem value="blues">Blues</SelectItem>
                  <SelectItem value="lofi">Lo-Fi</SelectItem>
                  <SelectItem value="hiphop">Hip-Hop</SelectItem>
                  <SelectItem value="trap">Trap</SelectItem>
                  <SelectItem value="classical">Clássico</SelectItem>
                  <SelectItem value="rnb">R&B</SelectItem>
                  <SelectItem value="soul">Soul</SelectItem>
                  <SelectItem value="funk">Funk</SelectItem>
                  <SelectItem value="sertanejo">Sertanejo</SelectItem>
                  <SelectItem value="bossa-nova">Bossa Nova</SelectItem>
                  <SelectItem value="samba">Samba</SelectItem>
                  <SelectItem value="mpb">MPB</SelectItem>
                  <SelectItem value="forro">Forró</SelectItem>
                  <SelectItem value="reggae">Reggae</SelectItem>
                  <SelectItem value="country">Country</SelectItem>
                  <SelectItem value="folk">Folk</SelectItem>
                  <SelectItem value="gospel">Gospel</SelectItem>
                  <SelectItem value="indie">Indie</SelectItem>
                  <SelectItem value="kpop">K-Pop</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <SectionTitle>Humor & Tom</SectionTitle>
            <div>
              <Label className="text-xs">Humor</Label>
              <Select value={config.mood || 'calm'} onValueChange={(v) => update('mood', v)}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {MUSIC_MOODS.map((m) => (
                    <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Tempo</Label>
              <Select value={config.tempo || 'moderate'} onValueChange={(v) => update('tempo', v)}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {MUSIC_TEMPOS.map((t) => (
                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">BPM Específico ({config.bpm || 'Auto'})</Label>
              <Slider
                value={[config.bpm ?? 120]}
                onValueChange={([v]) => update('bpm', v)}
                min={40} max={200} step={5}
                className="mt-2"
              />
            </div>
            <SectionTitle>Instrumentos</SectionTitle>
            <div>
              <Label className="text-xs">Instrumento Principal</Label>
              <Select value={config.mainInstrument || 'piano'} onValueChange={(v) => update('mainInstrument', v)}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {MUSIC_INSTRUMENTS.map((i) => (
                    <SelectItem key={i.value} value={i.value}>{i.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Instrumento Secundário</Label>
              <Select value={config.secondaryInstrument || ''} onValueChange={(v) => update('secondaryInstrument', v)}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Nenhum" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Nenhum</SelectItem>
                  {MUSIC_INSTRUMENTS.map((i) => (
                    <SelectItem key={i.value} value={i.value}>{i.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <SectionTitle>Duração & Tom</SectionTitle>
            <div>
              <Label className="text-xs">Duração ({config.duration || 30}s)</Label>
              <Slider
                value={[config.duration || 30]}
                onValueChange={([v]) => update('duration', v)}
                min={5} max={300} step={5}
                className="mt-2"
              />
            </div>
            <div>
              <Label className="text-xs">Tonalidade</Label>
              <Select value={config.key || 'auto'} onValueChange={(v) => update('key', v)}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="auto">Automática</SelectItem>
                  <SelectItem value="C">Dó Maior (C)</SelectItem>
                  <SelectItem value="Cm">Dó Menor (Cm)</SelectItem>
                  <SelectItem value="D">Ré Maior (D)</SelectItem>
                  <SelectItem value="Dm">Ré Menor (Dm)</SelectItem>
                  <SelectItem value="E">Mi Maior (E)</SelectItem>
                  <SelectItem value="Em">Mi Menor (Em)</SelectItem>
                  <SelectItem value="F">Fá Maior (F)</SelectItem>
                  <SelectItem value="G">Sol Maior (G)</SelectItem>
                  <SelectItem value="Gm">Sol Menor (Gm)</SelectItem>
                  <SelectItem value="A">Lá Maior (A)</SelectItem>
                  <SelectItem value="Am">Lá Menor (Am)</SelectItem>
                  <SelectItem value="Bb">Si♭ Maior (Bb)</SelectItem>
                  <SelectItem value="B">Si Maior (B)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <SectionTitle>Opções</SectionTitle>
            <div className="flex items-center justify-between">
              <Label className="text-xs">Incluir Vocal</Label>
              <Switch checked={config.withVocals ?? false} onCheckedChange={(v) => update('withVocals', v)} />
            </div>
            <div className="flex items-center justify-between">
              <Label className="text-xs">Loop (Repetível)</Label>
              <Switch checked={config.loopable ?? false} onCheckedChange={(v) => update('loopable', v)} />
            </div>
            <div className="flex items-center justify-between">
              <Label className="text-xs">Fade In/Out</Label>
              <Switch checked={config.fadeInOut ?? true} onCheckedChange={(v) => update('fadeInOut', v)} />
            </div>
            <div>
              <Label className="text-xs">Formato de Saída</Label>
              <Select value={config.musicFormat || 'mp3'} onValueChange={(v) => update('musicFormat', v)}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {AUDIO_FORMATS.map((f) => (
                    <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
                  <SelectItem value="slide-left">Slide Esquerda</SelectItem>
                  <SelectItem value="slide-right">Slide Direita</SelectItem>
                  <SelectItem value="slide-up">Slide Cima</SelectItem>
                  <SelectItem value="slide-down">Slide Baixo</SelectItem>
                  <SelectItem value="zoom">Zoom</SelectItem>
                  <SelectItem value="dissolve">Dissolve</SelectItem>
                  <SelectItem value="wipe">Wipe</SelectItem>
                  <SelectItem value="spin">Spin</SelectItem>
                  <SelectItem value="blur">Blur</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Duração da transição ({config.transitionDuration || 1}s)</Label>
              <Slider
                value={[config.transitionDuration || 1]}
                onValueChange={([v]) => update('transitionDuration', v)}
                min={0.1} max={5} step={0.1}
                className="mt-2"
              />
            </div>
            <SectionTitle>Saída</SectionTitle>
            <div>
              <Label className="text-xs">Resolução Final</Label>
              <Select value={config.mergeResolution || 'source'} onValueChange={(v) => update('mergeResolution', v)}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="source">Manter Original</SelectItem>
                  <SelectItem value="720p">720p</SelectItem>
                  <SelectItem value="1080p">1080p</SelectItem>
                  <SelectItem value="4k">4K</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">FPS Final</Label>
              <Select value={config.mergeFps || 'source'} onValueChange={(v) => update('mergeFps', v)}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="source">Manter Original</SelectItem>
                  {VIDEO_FPS.map((f) => (
                    <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center justify-between">
              <Label className="text-xs">Manter Áudio Original</Label>
              <Switch checked={config.keepAudio ?? true} onCheckedChange={(v) => update('keepAudio', v)} />
            </div>
          </div>
        );

      case 'lipSync':
        return (
          <div className="space-y-3">
            <p className="text-xs text-muted-foreground">
              Conecte um nó de áudio e um nó de vídeo/imagem como entrada para sincronizar os lábios automaticamente.
            </p>
            <SectionTitle>Configurações</SectionTitle>
            <div>
              <Label className="text-xs">Modelo de Lip Sync</Label>
              <Select value={config.lipSyncModel || 'wav2lip'} onValueChange={(v) => update('lipSyncModel', v)}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="wav2lip">Wav2Lip (Rápido)</SelectItem>
                  <SelectItem value="wav2lip-hq">Wav2Lip HQ</SelectItem>
                  <SelectItem value="sadtalker">SadTalker (Expressivo)</SelectItem>
                  <SelectItem value="videoretalking">VideoReTalking (Realista)</SelectItem>
                  <SelectItem value="museTalk">MuseTalk (Alta Qualidade)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Qualidade</Label>
              <Select value={config.lipSyncQuality || 'standard'} onValueChange={(v) => update('lipSyncQuality', v)}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="fast">Rápido (Prévia)</SelectItem>
                  <SelectItem value="standard">Padrão</SelectItem>
                  <SelectItem value="high">Alta Qualidade</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Intensidade ({config.lipSyncIntensity ?? 1})</Label>
              <Slider
                value={[config.lipSyncIntensity ?? 1]}
                onValueChange={([v]) => update('lipSyncIntensity', v)}
                min={0.5} max={1.5} step={0.1}
                className="mt-2"
              />
            </div>
            <div className="flex items-center justify-between">
              <Label className="text-xs">Manter Expressão Original</Label>
              <Switch checked={config.keepExpression ?? true} onCheckedChange={(v) => update('keepExpression', v)} />
            </div>
            <div className="flex items-center justify-between">
              <Label className="text-xs">Smooth (Suavizar)</Label>
              <Switch checked={config.smoothLipSync ?? true} onCheckedChange={(v) => update('smoothLipSync', v)} />
            </div>
          </div>
        );

      case 'imageAnalyze':
        return (
          <div className="space-y-3">
            <div>
              <Label className="text-xs">Modelo</Label>
              <Select value={config.model || 'google/gemini-2.5-flash'} onValueChange={(v) => update('model', v)}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent className="max-h-[400px]">
                  {LLM_MODELS.map((m) => (
                    <ModelSelectItem key={m.value} model={m} />
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
            <SectionTitle>Tipo de Análise</SectionTitle>
            <div>
              <Label className="text-xs">Modo de Análise</Label>
              <Select value={config.analysisMode || 'describe'} onValueChange={(v) => update('analysisMode', v)}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="describe">Descrever em Detalhes</SelectItem>
                  <SelectItem value="caption">Gerar Legenda</SelectItem>
                  <SelectItem value="ocr">Extrair Texto (OCR)</SelectItem>
                  <SelectItem value="objects">Detectar Objetos</SelectItem>
                  <SelectItem value="faces">Detectar Rostos</SelectItem>
                  <SelectItem value="colors">Extrair Paleta de Cores</SelectItem>
                  <SelectItem value="sentiment">Sentimento/Emoção</SelectItem>
                  <SelectItem value="nsfw">Classificar Conteúdo</SelectItem>
                  <SelectItem value="similar">Buscar Semelhantes</SelectItem>
                  <SelectItem value="alt-text">Gerar Alt Text (Acessibilidade)</SelectItem>
                  <SelectItem value="tags">Gerar Tags/Keywords</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Idioma da Resposta</Label>
              <Select value={config.analysisLanguage || 'pt-BR'} onValueChange={(v) => update('analysisLanguage', v)}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {LANGUAGES.slice(0, 6).map((l) => (
                    <SelectItem key={l.value} value={l.value}>{l.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Nível de Detalhe</Label>
              <Select value={config.detailLevel || 'standard'} onValueChange={(v) => update('detailLevel', v)}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="brief">Breve (1-2 frases)</SelectItem>
                  <SelectItem value="standard">Padrão</SelectItem>
                  <SelectItem value="detailed">Detalhado</SelectItem>
                  <SelectItem value="exhaustive">Exaustivo</SelectItem>
                </SelectContent>
              </Select>
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
                  <SelectItem value="json">JSON</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <SectionTitle>Exportação</SectionTitle>
            <div>
              <Label className="text-xs">Nome do Arquivo</Label>
              <Input
                value={config.fileName || ''}
                onChange={(e) => update('fileName', e.target.value)}
                placeholder="resultado-final"
                className="mt-1"
              />
            </div>
            <div className="flex items-center justify-between">
              <Label className="text-xs">Auto-download</Label>
              <Switch checked={config.autoDownload ?? false} onCheckedChange={(v) => update('autoDownload', v)} />
            </div>
            <div className="flex items-center justify-between">
              <Label className="text-xs">Salvar no Storage</Label>
              <Switch checked={config.saveToStorage ?? false} onCheckedChange={(v) => update('saveToStorage', v)} />
            </div>
          </div>
        );

      default:
        return <p className="text-xs text-muted-foreground">Sem configurações adicionais</p>;
    }
  };

  return (
    <div className="w-80 border-l border-border bg-card flex flex-col shrink-0">
      <div className="p-3 border-b border-border flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span>{meta?.icon}</span>
          <h3 className="font-semibold text-sm truncate text-foreground">{node.data.label}</h3>
        </div>
        <Button size="icon" variant="ghost" onClick={onClose} className="h-7 w-7">
          <X className="h-4 w-4" />
        </Button>
      </div>

      {onExecuteFromNode && (
        <div className="px-3 py-2 border-b border-border">
          <Button
            size="sm"
            onClick={() => onExecuteFromNode(node.id)}
            className="w-full gap-2 bg-primary hover:bg-primary/90 text-primary-foreground border-0 rounded-lg text-xs"
          >
            <SkipForward className="h-3.5 w-3.5" />
            Executar deste ponto
          </Button>
        </div>
      )}
      <ScrollArea className="flex-1 p-3">
        {renderConfig()}

        {activeResult && (
          <div className="mt-4 pt-4 border-t border-border">
            <Label className="text-xs font-semibold text-muted-foreground">Resultado</Label>
            <div className="mt-2 rounded-lg border border-border bg-muted/30 p-2">
              {typeof activeResult === 'string' && (
                <p className="text-xs whitespace-pre-wrap text-foreground/60">{activeResult}</p>
              )}
              {activeResult?.imageUrl && (
                <img src={activeResult.imageUrl} alt="Result" className="w-full rounded" />
              )}
              {activeResult?.text && (
                <p className="text-xs whitespace-pre-wrap mt-2 text-foreground/60">{activeResult.text}</p>
              )}
            </div>
          </div>
        )}
      </ScrollArea>
    </div>
  );
};

export default StudioNodeConfigPanel;
