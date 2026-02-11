import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { X, Settings2, Key, Check, Lock, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';

interface AIProvider {
  id: string;
  name: string;
  icon: string;
  available: boolean;
  description: string;
  category: 'text' | 'image' | 'video' | 'audio' | 'music';
  models: {
    id: string;
    name: string;
    available: boolean;
    description?: string;
  }[];
  apiKeyConfigured?: boolean;
  website?: string;
}

const AI_PROVIDERS: AIProvider[] = [
  // TEXT / LLM
  {
    id: 'google',
    name: 'Google (Gemini)',
    icon: '🟦',
    available: true,
    description: 'Modelos Gemini via Lovable AI — sem necessidade de API key.',
    category: 'text',
    apiKeyConfigured: true,
    website: 'https://ai.google.dev',
    models: [
      { id: 'google/gemini-3-flash-preview', name: 'Gemini 3 Flash', available: true, description: 'Rápido e eficiente' },
      { id: 'google/gemini-3-pro-preview', name: 'Gemini 3 Pro', available: true, description: 'Raciocínio avançado' },
      { id: 'google/gemini-2.5-pro', name: 'Gemini 2.5 Pro', available: true, description: 'Multimodal completo' },
      { id: 'google/gemini-2.5-flash', name: 'Gemini 2.5 Flash', available: true, description: 'Balanceado' },
      { id: 'google/gemini-2.5-flash-lite', name: 'Gemini 2.5 Flash Lite', available: true, description: 'Ultra rápido' },
    ],
  },
  {
    id: 'openai',
    name: 'OpenAI (GPT)',
    icon: '🟢',
    available: true,
    description: 'Modelos GPT via Lovable AI — sem necessidade de API key.',
    category: 'text',
    apiKeyConfigured: true,
    website: 'https://openai.com',
    models: [
      { id: 'openai/gpt-5.2', name: 'GPT-5.2', available: true, description: 'Mais recente e poderoso' },
      { id: 'openai/gpt-5', name: 'GPT-5', available: true, description: 'Raciocínio avançado' },
      { id: 'openai/gpt-5-mini', name: 'GPT-5 Mini', available: true, description: 'Custo-benefício' },
      { id: 'openai/gpt-5-nano', name: 'GPT-5 Nano', available: true, description: 'Ultra rápido' },
    ],
  },
  // IMAGE
  {
    id: 'google-image',
    name: 'Google ImageFX',
    icon: '🟦',
    available: true,
    description: 'Geração de imagens via Gemini — disponível via Lovable AI.',
    category: 'image',
    apiKeyConfigured: true,
    website: 'https://labs.google/fx',
    models: [
      { id: 'google/gemini-3-pro-image-preview', name: 'Gemini 3 Pro Image', available: true },
      { id: 'google/gemini-2.5-flash-image', name: 'Gemini Flash Image', available: true },
      { id: 'google/imagefx', name: 'ImageFX', available: true },
    ],
  },
  {
    id: 'openai-image',
    name: 'OpenAI DALL·E',
    icon: '🟢',
    available: false,
    description: 'Geração de imagens com DALL·E. Requer API key da OpenAI.',
    category: 'image',
    website: 'https://openai.com/dall-e',
    models: [
      { id: 'openai/dall-e-4', name: 'DALL·E 4', available: false },
      { id: 'openai/dall-e-3', name: 'DALL·E 3', available: false },
    ],
  },
  {
    id: 'midjourney',
    name: 'Midjourney',
    icon: '🔵',
    available: false,
    description: 'Imagens artísticas de alta qualidade. Requer API key.',
    category: 'image',
    website: 'https://midjourney.com',
    models: [
      { id: 'midjourney/v7', name: 'Midjourney v7', available: false },
      { id: 'midjourney/v6.1', name: 'Midjourney v6.1', available: false },
    ],
  },
  {
    id: 'stability-image',
    name: 'Stability AI',
    icon: '🟣',
    available: false,
    description: 'Stable Diffusion e variantes. Requer API key.',
    category: 'image',
    website: 'https://stability.ai',
    models: [
      { id: 'stability/sd3.5-turbo', name: 'SD 3.5 Turbo', available: false },
      { id: 'stability/sd3', name: 'Stable Diffusion 3', available: false },
      { id: 'stability/sdxl', name: 'Stable Diffusion XL', available: false },
    ],
  },
  {
    id: 'flux',
    name: 'Black Forest Labs (Flux)',
    icon: '⚡',
    available: false,
    description: 'Modelos Flux de alta qualidade. Requer API key.',
    category: 'image',
    website: 'https://blackforestlabs.ai',
    models: [
      { id: 'flux/1.1-pro', name: 'Flux 1.1 Pro', available: false },
      { id: 'flux/schnell', name: 'Flux Schnell', available: false },
    ],
  },
  {
    id: 'ideogram',
    name: 'Ideogram',
    icon: '🎨',
    available: false,
    description: 'Especialista em texto em imagens. Requer API key.',
    category: 'image',
    website: 'https://ideogram.ai',
    models: [
      { id: 'ideogram/v3', name: 'Ideogram v3', available: false },
    ],
  },
  {
    id: 'adobe',
    name: 'Adobe Firefly',
    icon: '🔥',
    available: false,
    description: 'Geração criativa Adobe. Requer API key.',
    category: 'image',
    website: 'https://firefly.adobe.com',
    models: [
      { id: 'adobe/firefly-3', name: 'Firefly 3', available: false },
    ],
  },
  // VIDEO
  {
    id: 'google-video',
    name: 'Google Veo (Flow)',
    icon: '🟦',
    available: false,
    description: 'Geração de vídeos com Veo. Em breve via Lovable AI.',
    category: 'video',
    website: 'https://labs.google/flow',
    models: [
      { id: 'google/veo-3.1', name: 'Veo 3.1 (Flow)', available: false },
      { id: 'google/veo-3.1-fast', name: 'Veo 3.1 Fast', available: false },
      { id: 'google/veo-3', name: 'Veo 3', available: false },
      { id: 'google/veo-2', name: 'Veo 2', available: false },
    ],
  },
  {
    id: 'openai-video',
    name: 'OpenAI Sora',
    icon: '🟢',
    available: false,
    description: 'Geração de vídeos com Sora. Requer API key.',
    category: 'video',
    website: 'https://openai.com/sora',
    models: [
      { id: 'openai/sora-3', name: 'Sora 3', available: false },
      { id: 'openai/sora-2', name: 'Sora 2', available: false },
    ],
  },
  {
    id: 'runway',
    name: 'Runway',
    icon: '🎬',
    available: false,
    description: 'Edição e geração de vídeos. Requer API key.',
    category: 'video',
    website: 'https://runwayml.com',
    models: [
      { id: 'runway/gen4', name: 'Gen-4', available: false },
      { id: 'runway/gen3-alpha-turbo', name: 'Gen-3 Alpha Turbo', available: false },
    ],
  },
  {
    id: 'kling',
    name: 'Kling (Kuaishou)',
    icon: '🎥',
    available: false,
    description: 'Vídeos realistas. Requer API key.',
    category: 'video',
    website: 'https://klingai.com',
    models: [
      { id: 'kling/v2.1', name: 'Kling 2.1', available: false },
      { id: 'kling/v1.6', name: 'Kling 1.6', available: false },
    ],
  },
  {
    id: 'pika',
    name: 'Pika',
    icon: '🌊',
    available: false,
    description: 'Vídeos criativos. Requer API key.',
    category: 'video',
    website: 'https://pika.art',
    models: [
      { id: 'pika/v2.2', name: 'Pika 2.2', available: false },
    ],
  },
  {
    id: 'luma',
    name: 'Luma Dream Machine',
    icon: '🌙',
    available: false,
    description: 'Vídeos com Dream Machine. Requer API key.',
    category: 'video',
    website: 'https://lumalabs.ai',
    models: [
      { id: 'luma/dream-machine-1.5', name: 'Dream Machine 1.5', available: false },
    ],
  },
  // AUDIO
  {
    id: 'elevenlabs',
    name: 'ElevenLabs',
    icon: '🔊',
    available: false,
    description: 'Vozes realistas e TTS. Requer API key.',
    category: 'audio',
    website: 'https://elevenlabs.io',
    models: [
      { id: 'elevenlabs/v3', name: 'ElevenLabs v3', available: false },
      { id: 'elevenlabs/turbo-v2.5', name: 'ElevenLabs Turbo', available: false },
    ],
  },
  {
    id: 'openai-audio',
    name: 'OpenAI TTS',
    icon: '🟢',
    available: false,
    description: 'Text-to-Speech da OpenAI. Requer API key.',
    category: 'audio',
    website: 'https://openai.com',
    models: [
      { id: 'openai/tts-1-hd', name: 'OpenAI TTS HD', available: false },
      { id: 'openai/tts-1', name: 'OpenAI TTS', available: false },
    ],
  },
  {
    id: 'google-audio',
    name: 'Google WaveNet',
    icon: '🟦',
    available: false,
    description: 'Vozes naturais do Google Cloud. Requer API key.',
    category: 'audio',
    website: 'https://cloud.google.com/text-to-speech',
    models: [
      { id: 'google/wavenet', name: 'Google WaveNet', available: false },
    ],
  },
  // MUSIC
  {
    id: 'suno',
    name: 'Suno',
    icon: '🎵',
    available: false,
    description: 'Criação de músicas com IA. Requer API key.',
    category: 'music',
    website: 'https://suno.com',
    models: [
      { id: 'suno/v4', name: 'Suno v4', available: false },
      { id: 'suno/v3.5', name: 'Suno v3.5', available: false },
    ],
  },
  {
    id: 'udio',
    name: 'Udio',
    icon: '🎶',
    available: false,
    description: 'Composição musical avançada. Requer API key.',
    category: 'music',
    website: 'https://udio.com',
    models: [
      { id: 'udio/v2', name: 'Udio v2', available: false },
      { id: 'udio/v1.5', name: 'Udio v1.5', available: false },
    ],
  },
  {
    id: 'stability-audio',
    name: 'Stability Audio',
    icon: '🟣',
    available: false,
    description: 'Geração de áudio musical. Requer API key.',
    category: 'music',
    website: 'https://stability.ai',
    models: [
      { id: 'stability/stable-audio-2', name: 'Stable Audio 2.0', available: false },
    ],
  },
  {
    id: 'google-music',
    name: 'Google MusicFX',
    icon: '🟦',
    available: false,
    description: 'Criação de música do Google Labs. Em breve.',
    category: 'music',
    website: 'https://labs.google/fx',
    models: [
      { id: 'google/musicfx', name: 'MusicFX', available: false },
    ],
  },
];

const CATEGORY_LABELS: Record<string, { label: string; icon: string }> = {
  text: { label: 'Texto / LLM', icon: '🧠' },
  image: { label: 'Imagem', icon: '🎨' },
  video: { label: 'Vídeo', icon: '🎬' },
  audio: { label: 'Áudio', icon: '🔊' },
  music: { label: 'Música', icon: '🎵' },
};

interface Props {
  open: boolean;
  onClose: () => void;
}

const AISettingsPanel: React.FC<Props> = ({ open, onClose }) => {
  const [selectedProvider, setSelectedProvider] = useState<string | null>(null);
  const [apiKeys, setApiKeys] = useState<Record<string, string>>({});

  const handleSaveKey = (providerId: string) => {
    if (apiKeys[providerId]?.trim()) {
      toast.success(`API Key do ${AI_PROVIDERS.find(p => p.id === providerId)?.name} salva com sucesso!`);
    }
  };

  const selectedProviderData = AI_PROVIDERS.find(p => p.id === selectedProvider);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.3 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-4xl max-h-[85vh] bg-[#0f0f1a] border border-white/10 rounded-2xl shadow-2xl overflow-hidden flex flex-col"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.08]">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500/20 to-indigo-500/20 flex items-center justify-center border border-purple-500/20">
                  <Settings2 className="h-5 w-5 text-purple-400" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-white">Configurações de IA</h2>
                  <p className="text-xs text-white/40">Gerencie provedores e API keys dos modelos</p>
                </div>
              </div>
              <Button size="icon" variant="ghost" onClick={onClose} className="text-white/40 hover:text-white hover:bg-white/10">
                <X className="h-5 w-5" />
              </Button>
            </div>

            {/* Content */}
            <div className="flex flex-1 overflow-hidden">
              {/* Provider List */}
              <div className="w-[340px] border-r border-white/[0.08] flex flex-col">
                <Tabs defaultValue="text" className="flex flex-col flex-1">
                  <TabsList className="mx-3 mt-3 bg-white/[0.04] border border-white/[0.08] rounded-lg p-1 grid grid-cols-5 h-auto">
                    {Object.entries(CATEGORY_LABELS).map(([key, { label, icon }]) => (
                      <TabsTrigger
                        key={key}
                        value={key}
                        className="text-[10px] py-1.5 px-1 data-[state=active]:bg-purple-500/20 data-[state=active]:text-purple-300 text-white/40 rounded-md flex flex-col gap-0.5"
                      >
                        <span className="text-sm">{icon}</span>
                        <span>{label}</span>
                      </TabsTrigger>
                    ))}
                  </TabsList>

                  {Object.keys(CATEGORY_LABELS).map((cat) => (
                    <TabsContent key={cat} value={cat} className="flex-1 m-0 overflow-hidden">
                      <ScrollArea className="h-full">
                        <div className="p-3 space-y-1.5">
                          {AI_PROVIDERS.filter(p => p.category === cat).map((provider) => (
                            <button
                              key={provider.id}
                              onClick={() => {
                                if (provider.available) {
                                  setSelectedProvider(provider.id);
                                } else {
                                  setSelectedProvider(provider.id);
                                }
                              }}
                              className={`w-full text-left p-3 rounded-xl border transition-all ${
                                selectedProvider === provider.id
                                  ? 'bg-purple-500/10 border-purple-500/30'
                                  : provider.available
                                    ? 'bg-white/[0.02] border-white/[0.06] hover:bg-white/[0.04] hover:border-white/[0.12]'
                                    : 'bg-white/[0.01] border-white/[0.04] opacity-50 cursor-default'
                              }`}
                            >
                              <div className="flex items-center justify-between mb-1">
                                <div className="flex items-center gap-2">
                                  <span className="text-lg">{provider.icon}</span>
                                  <span className={`text-sm font-medium ${provider.available ? 'text-white/90' : 'text-white/30'}`}>
                                    {provider.name}
                                  </span>
                                </div>
                                {provider.available ? (
                                  <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30 text-[9px] px-1.5 py-0">
                                    <Check className="h-2.5 w-2.5 mr-0.5" />
                                    Ativo
                                  </Badge>
                                ) : (
                                  <Badge className="bg-white/5 text-white/25 border-white/10 text-[9px] px-1.5 py-0">
                                    <Lock className="h-2.5 w-2.5 mr-0.5" />
                                    API Key
                                  </Badge>
                                )}
                              </div>
                              <p className={`text-[11px] leading-tight ${provider.available ? 'text-white/40' : 'text-white/20'}`}>
                                {provider.description}
                              </p>
                            </button>
                          ))}
                        </div>
                      </ScrollArea>
                    </TabsContent>
                  ))}
                </Tabs>
              </div>

              {/* Provider Detail */}
              <div className="flex-1 flex flex-col">
                {selectedProviderData ? (
                  <ScrollArea className="flex-1">
                    <div className="p-6 space-y-6">
                      {/* Provider Header */}
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <span className="text-3xl">{selectedProviderData.icon}</span>
                          <div>
                            <h3 className="text-xl font-bold text-white">{selectedProviderData.name}</h3>
                            <p className="text-sm text-white/40">{selectedProviderData.description}</p>
                          </div>
                        </div>
                        {selectedProviderData.website && (
                          <a
                            href={selectedProviderData.website}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 text-xs text-purple-400 hover:text-purple-300 transition-colors"
                          >
                            <ExternalLink className="h-3 w-3" />
                            Site
                          </a>
                        )}
                      </div>

                      {/* Status */}
                      <div className={`rounded-xl border p-4 ${
                        selectedProviderData.available
                          ? 'bg-emerald-500/5 border-emerald-500/20'
                          : 'bg-amber-500/5 border-amber-500/20'
                      }`}>
                        <div className="flex items-center gap-2 mb-2">
                          {selectedProviderData.available ? (
                            <>
                              <Check className="h-4 w-4 text-emerald-400" />
                              <span className="text-sm font-medium text-emerald-400">Disponível e Ativo</span>
                            </>
                          ) : (
                            <>
                              <Lock className="h-4 w-4 text-amber-400" />
                              <span className="text-sm font-medium text-amber-400">Requer Configuração</span>
                            </>
                          )}
                        </div>
                        <p className="text-xs text-white/40">
                          {selectedProviderData.available
                            ? 'Este provedor está integrado via Lovable AI e pronto para uso. Nenhuma configuração adicional é necessária.'
                            : 'Para utilizar este provedor, é necessário fornecer uma API key válida. Obtenha a chave no site oficial do provedor.'}
                        </p>
                      </div>

                      {/* API Key Input (for unavailable providers) */}
                      {!selectedProviderData.available && (
                        <div className="space-y-3">
                          <Label className="text-sm text-white/60">
                            <Key className="h-3.5 w-3.5 inline mr-1" />
                            API Key
                          </Label>
                          <div className="flex gap-2">
                            <Input
                              type="password"
                              value={apiKeys[selectedProviderData.id] || ''}
                              onChange={(e) => setApiKeys(prev => ({ ...prev, [selectedProviderData.id]: e.target.value }))}
                              placeholder="sk-..."
                              className="bg-white/[0.04] border-white/10 text-white placeholder:text-white/20 font-mono text-sm"
                            />
                            <Button
                              onClick={() => handleSaveKey(selectedProviderData.id)}
                              disabled={!apiKeys[selectedProviderData.id]?.trim()}
                              className="bg-purple-600 hover:bg-purple-500 text-white shrink-0"
                            >
                              Salvar
                            </Button>
                          </div>
                          <p className="text-[11px] text-white/30">
                            A chave será armazenada de forma segura e usada apenas para chamadas de API deste provedor.
                          </p>
                        </div>
                      )}

                      {/* Models List */}
                      <div className="space-y-3">
                        <h4 className="text-sm font-semibold text-white/60">Modelos Disponíveis</h4>
                        <div className="space-y-2">
                          {selectedProviderData.models.map((model) => (
                            <div
                              key={model.id}
                              className={`flex items-center justify-between p-3 rounded-lg border ${
                                model.available
                                  ? 'bg-white/[0.03] border-white/[0.08]'
                                  : 'bg-white/[0.01] border-white/[0.04] opacity-40'
                              }`}
                            >
                              <div className="flex items-center gap-3">
                                <div className={`w-2 h-2 rounded-full ${model.available ? 'bg-emerald-400' : 'bg-white/20'}`} />
                                <div>
                                  <p className={`text-sm font-medium ${model.available ? 'text-white/80' : 'text-white/30'}`}>
                                    {model.name}
                                  </p>
                                  {model.description && (
                                    <p className={`text-[11px] ${model.available ? 'text-white/40' : 'text-white/15'}`}>
                                      {model.description}
                                    </p>
                                  )}
                                </div>
                              </div>
                              <code className={`text-[10px] font-mono px-2 py-0.5 rounded ${
                                model.available
                                  ? 'bg-white/[0.05] text-white/30'
                                  : 'bg-white/[0.02] text-white/15'
                              }`}>
                                {model.id}
                              </code>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </ScrollArea>
                ) : (
                  <div className="flex-1 flex items-center justify-center text-center p-8">
                    <div>
                      <Settings2 className="h-12 w-12 text-white/10 mx-auto mb-4" />
                      <h3 className="text-lg font-semibold text-white/30 mb-2">Selecione um Provedor</h3>
                      <p className="text-sm text-white/20 max-w-xs mx-auto">
                        Escolha um provedor de IA ao lado para ver seus modelos e configurações.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default AISettingsPanel;
