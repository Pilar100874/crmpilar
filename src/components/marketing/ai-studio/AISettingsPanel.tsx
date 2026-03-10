import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import { X, Settings2, Key, Lock, ExternalLink, Save, Eye, EyeOff, Loader2, CheckCircle2, AlertCircle, TestTube, Play, Pause, Mic, DollarSign } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

// ── Paid providers that need API keys ──────────────────────────────────────

interface PaidProvider {
  id: string;
  name: string;
  icon: string;
  category: 'audio' | 'video' | 'image' | 'music';
  description: string;
  website: string;
  keyPlaceholder: string;
  hasExtraConfig?: boolean;
}

const PAID_PROVIDERS: PaidProvider[] = [
  { id: 'elevenlabs', name: 'ElevenLabs', icon: '🔊', category: 'audio', description: 'Vozes realistas, TTS e narração de alta qualidade.', website: 'https://elevenlabs.io/app/settings/api-keys', keyPlaceholder: 'xi-...', hasExtraConfig: true },
  { id: 'google', name: 'Google (Veo / TTS)', icon: '🟦', category: 'video', description: 'Veo 2/3/3.1 para vídeos e WaveNet/Neural2 para áudio. Use sua própria chave Google AI Studio.', website: 'https://aistudio.google.com/apikey', keyPlaceholder: 'AIza...' },
  { id: 'openai', name: 'OpenAI (Sora / TTS)', icon: '🟢', category: 'video', description: 'Sora 2/3 para vídeos e TTS para áudio. Use sua própria chave OpenAI.', website: 'https://platform.openai.com/api-keys', keyPlaceholder: 'sk-...' },
  { id: 'runway', name: 'Runway', icon: '🎬', category: 'video', description: 'Geração e edição de vídeos com Gen-4.', website: 'https://app.runwayml.com/account/api-keys', keyPlaceholder: 'rw-...' },
  { id: 'kling', name: 'Kling (Kuaishou)', icon: '🎥', category: 'video', description: 'Vídeos realistas de alta qualidade.', website: 'https://klingai.com', keyPlaceholder: 'sk-...' },
  { id: 'pika', name: 'Pika', icon: '🌊', category: 'video', description: 'Vídeos criativos e estilizados.', website: 'https://pika.art', keyPlaceholder: 'pk-...' },
  { id: 'luma', name: 'Luma Dream Machine', icon: '🌙', category: 'video', description: 'Geração de vídeos com Dream Machine.', website: 'https://lumalabs.ai', keyPlaceholder: 'lm-...' },
  { id: 'stability', name: 'Stability AI', icon: '🟣', category: 'image', description: 'Stable Diffusion para imagens e vídeos.', website: 'https://platform.stability.ai/account/keys', keyPlaceholder: 'sk-...' },
  { id: 'suno', name: 'Suno', icon: '🎵', category: 'music', description: 'Criação de músicas completas com IA.', website: 'https://suno.com/account', keyPlaceholder: 'sk-...' },
  { id: 'udio', name: 'Udio', icon: '🎶', category: 'music', description: 'Composição musical avançada.', website: 'https://udio.com', keyPlaceholder: 'sk-...' },
];

const CATEGORY_LABELS: Record<string, { label: string; icon: string }> = {
  audio: { label: 'Áudio', icon: '🔊' },
  video: { label: 'Vídeo', icon: '🎬' },
  image: { label: 'Imagem', icon: '🎨' },
  music: { label: 'Música', icon: '🎵' },
};

// ── ElevenLabs voice config helpers ────────────────────────────────────────

const ELEVENLABS_VOICES = [
  { value: 'CwhRBWXzGAHq8TQ4Fs17', label: 'Roger', gender: 'Masculino' },
  { value: 'EXAVITQu4vr4xnSDxMaL', label: 'Sarah', gender: 'Feminino' },
  { value: 'FGY2WhTYpPnrIDTdsKH5', label: 'Laura', gender: 'Feminino' },
  { value: 'IKne3meq5aSn9XLyUdCD', label: 'Charlie', gender: 'Masculino' },
  { value: 'JBFqnCBsd6RMkjVDRZzb', label: 'George', gender: 'Masculino' },
  { value: 'N2lVS1w4EtoT3dr4eOWO', label: 'Callum', gender: 'Masculino' },
  { value: 'SAz9YHcvj6GT2YYXdXww', label: 'River', gender: 'Neutro' },
  { value: 'TX3LPaxmHKxFdv7VOQHJ', label: 'Liam', gender: 'Masculino' },
  { value: 'Xb7hH8MSUJpSbSDYk0k2', label: 'Alice', gender: 'Feminino' },
  { value: 'XrExE9yKIg1WjnnlVkGX', label: 'Matilda', gender: 'Feminino' },
  { value: 'bIHbv24MWmeRgasZH58o', label: 'Will', gender: 'Masculino' },
  { value: 'cgSgspJ2msm6clMCkdW9', label: 'Jessica', gender: 'Feminino' },
  { value: 'cjVigY5qzO86Huf0OWal', label: 'Eric', gender: 'Masculino' },
  { value: 'iP95p4xoKVk53GoZ742B', label: 'Chris', gender: 'Masculino' },
  { value: 'nPczCjzI2devNBz1zQrb', label: 'Brian', gender: 'Masculino' },
  { value: 'onwK4e9ZLuTAKqWW03F9', label: 'Daniel', gender: 'Masculino' },
  { value: 'pFZP5JQG7iQjIQuC4Bku', label: 'Lily', gender: 'Feminino' },
  { value: 'pqHfZKP75CvOlQylNhV4', label: 'Bill', gender: 'Masculino' },
];

const EL_MODELS = [
  { value: 'eleven_multilingual_v2', label: 'Multilingual v2', desc: '29 idiomas, alta qualidade' },
  { value: 'eleven_turbo_v2_5', label: 'Turbo v2.5', desc: 'Baixa latência' },
  { value: 'eleven_turbo_v2', label: 'Turbo v2', desc: 'Mais rápido' },
];

const EL_FORMATS = [
  { value: 'mp3_44100_128', label: 'MP3 44.1kHz 128kbps' },
  { value: 'mp3_22050_32', label: 'MP3 22kHz 32kbps' },
  { value: 'pcm_24000', label: 'PCM 24kHz' },
];

interface ELConfig {
  defaultVoiceId: string;
  defaultModel: string;
  outputFormat: string;
  stability: number;
  similarityBoost: number;
  style: number;
  useSpeakerBoost: boolean;
  speed: number;
}

const DEFAULT_EL_CONFIG: ELConfig = {
  defaultVoiceId: 'JBFqnCBsd6RMkjVDRZzb',
  defaultModel: 'eleven_multilingual_v2',
  outputFormat: 'mp3_44100_128',
  stability: 0.5,
  similarityBoost: 0.75,
  style: 0.5,
  useSpeakerBoost: true,
  speed: 1.0,
};

// ── Defaults helpers ───────────────────────────────────────────────────────

const DEFAULTS_STORAGE_KEY = 'ai-studio-defaults';

export interface StudioDefaults {
  imageNegativePrompt: string;
  videoNegativePrompt: string;
}

export const DEFAULT_STUDIO_DEFAULTS: StudioDefaults = {
  imageNegativePrompt: "texto, marca d'água, logo sobreposto, baixa resolução, desfocado, distorcido, artefatos, ruído, pixelado, bordas cortadas, iluminação artificial ruim, cores saturadas demais, fundo poluído",
  videoNegativePrompt: "texto na tela, marca d'água, logo sobreposto, baixa resolução, tremido, flickering, artefatos visuais, distorção facial, mãos deformadas, movimentos robóticos, transições bruscas, ruído visual, glitch, proporções irreais",
};

export const getStudioDefaults = (estabelecimentoId: string): StudioDefaults => {
  try {
    const raw = localStorage.getItem(`${DEFAULTS_STORAGE_KEY}-${estabelecimentoId}`);
    if (raw) return { ...DEFAULT_STUDIO_DEFAULTS, ...JSON.parse(raw) };
  } catch { /* ignore */ }
  return { ...DEFAULT_STUDIO_DEFAULTS };
};

export const saveStudioDefaults = (estabelecimentoId: string, defaults: StudioDefaults) => {
  localStorage.setItem(`${DEFAULTS_STORAGE_KEY}-${estabelecimentoId}`, JSON.stringify(defaults));
};

// ── Main component ─────────────────────────────────────────────────────────

interface Props {
  open: boolean;
  onClose: () => void;
}

const AISettingsPanel: React.FC<Props> = ({ open, onClose }) => {
  const [selectedProvider, setSelectedProvider] = useState<string>('elevenlabs');
  const [selectedSection, setSelectedSection] = useState<'providers' | 'defaults'>('providers');
  const [apiKeys, setApiKeys] = useState<Record<string, string>>({});
  const [showKeys, setShowKeys] = useState<Record<string, boolean>>({});
  const [statuses, setStatuses] = useState<Record<string, 'none' | 'pending' | 'valid' | 'invalid'>>({});
  const [saving, setSaving] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const [elConfig, setElConfig] = useState<ELConfig>(DEFAULT_EL_CONFIG);
  const [testText, setTestText] = useState('Olá! Este é um teste de áudio do ElevenLabs.');
  const [isTesting, setIsTesting] = useState(false);
  const [testAudioUrl, setTestAudioUrl] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioElement, setAudioElement] = useState<HTMLAudioElement | null>(null);

  const [studioDefaults, setStudioDefaults] = useState<StudioDefaults>(DEFAULT_STUDIO_DEFAULTS);

  const estabelecimentoId = localStorage.getItem('estabelecimentoId') || '';

  const loadKeys = useCallback(async () => {
    if (!estabelecimentoId) return;
    setLoading(true);
    try {
      const { data } = await supabase
        .from('ai_api_keys')
        .select('*')
        .eq('estabelecimento_id', estabelecimentoId);

      if (data) {
        const keys: Record<string, string> = {};
        const sts: Record<string, 'none' | 'pending' | 'valid' | 'invalid'> = {};
        data.forEach((row) => {
          keys[row.provider] = row.api_key || '';
          sts[row.provider] = (row.validation_status as any) || 'none';
          if (row.provider === 'elevenlabs' && row.base_url) {
            try {
              const extra = JSON.parse(row.base_url);
              setElConfig(prev => ({ ...prev, ...extra }));
            } catch { /* ignore */ }
          }
        });
        setApiKeys(keys);
        setStatuses(sts);
      }
    } catch (err) {
      console.error('Error loading API keys:', err);
    } finally {
      setLoading(false);
    }
  }, [estabelecimentoId]);

  useEffect(() => {
    if (open) loadKeys();
  }, [open, loadKeys]);

  const handleSave = async (providerId: string) => {
    if (!estabelecimentoId) { toast.error('Estabelecimento não encontrado'); return; }
    setSaving(providerId);
    try {
      const provider = PAID_PROVIDERS.find(p => p.id === providerId);
      const apiKey = apiKeys[providerId]?.trim() || null;
      const payload: Record<string, any> = {
        estabelecimento_id: estabelecimentoId,
        provider: providerId,
        provider_display_name: provider?.name || providerId,
        api_key: apiKey,
        is_active: true,
        validation_status: apiKey ? 'valid' : 'none',
      };
      if (providerId === 'elevenlabs') payload.base_url = JSON.stringify(elConfig);

      const { data: existing } = await supabase.from('ai_api_keys').select('id').eq('estabelecimento_id', estabelecimentoId).eq('provider', providerId).maybeSingle();
      if (existing) {
        const { error } = await supabase.from('ai_api_keys').update(payload).eq('id', existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('ai_api_keys').insert([payload] as any);
        if (error) throw error;
      }
      setStatuses(prev => ({ ...prev, [providerId]: apiKey ? 'valid' : 'none' }));
      toast.success(`Configurações de ${provider?.name} salvas!`);
    } catch (err) {
      console.error(err);
      toast.error('Erro ao salvar configurações');
    } finally {
      setSaving(null);
    }
  };

  const handleTestEL = async () => {
    const key = apiKeys['elevenlabs'];
    if (!key) { toast.error('Configure a API Key primeiro'); return; }
    if (!testText.trim()) { toast.error('Digite um texto para testar'); return; }
    setIsTesting(true);
    try {
      const resp = await fetch(
        `https://api.elevenlabs.io/v1/text-to-speech/${elConfig.defaultVoiceId}?output_format=${elConfig.outputFormat}`,
        {
          method: 'POST',
          headers: { 'xi-api-key': key, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            text: testText,
            model_id: elConfig.defaultModel,
            voice_settings: { stability: elConfig.stability, similarity_boost: elConfig.similarityBoost, style: elConfig.style, use_speaker_boost: elConfig.useSpeakerBoost, speed: elConfig.speed },
          }),
        }
      );
      if (!resp.ok) {
        if (resp.status === 401) { setStatuses(prev => ({ ...prev, elevenlabs: 'invalid' })); toast.error('API Key inválida'); return; }
        throw new Error(`Erro ${resp.status}`);
      }
      setStatuses(prev => ({ ...prev, elevenlabs: 'valid' }));
      const { data: ex } = await supabase.from('ai_api_keys').select('id').eq('estabelecimento_id', estabelecimentoId).eq('provider', 'elevenlabs').maybeSingle();
      if (ex) await supabase.from('ai_api_keys').update({ validation_status: 'valid' }).eq('id', ex.id);
      const blob = await resp.blob();
      const url = URL.createObjectURL(blob);
      if (testAudioUrl) URL.revokeObjectURL(testAudioUrl);
      setTestAudioUrl(url);
      const audio = new Audio(url);
      audio.onended = () => setIsPlaying(false);
      setAudioElement(audio);
      audio.play();
      setIsPlaying(true);
      toast.success('Áudio gerado! API Key válida.');
    } catch (err: any) {
      toast.error('Erro ao testar: ' + (err.message || 'Desconhecido'));
    } finally {
      setIsTesting(false);
    }
  };

  const togglePlayback = () => {
    if (!audioElement) return;
    if (isPlaying) { audioElement.pause(); setIsPlaying(false); } else { audioElement.play(); setIsPlaying(true); }
  };

  const selectedProviderData = PAID_PROVIDERS.find(p => p.id === selectedProvider);

  const statusBadge = (providerId: string) => {
    const key = apiKeys[providerId];
    const status = statuses[providerId];
    if (status === 'valid') return <Badge className="bg-success/10 text-success border-success/20 text-[9px] px-1.5 py-0"><CheckCircle2 className="h-2.5 w-2.5 mr-0.5" />Ativo</Badge>;
    if (key) return <Badge className="bg-warning/10 text-warning border-warning/20 text-[9px] px-1.5 py-0"><AlertCircle className="h-2.5 w-2.5 mr-0.5" />Pendente</Badge>;
    return <Badge variant="outline" className="text-[9px] px-1.5 py-0 text-muted-foreground"><Lock className="h-2.5 w-2.5 mr-0.5" />Sem Key</Badge>;
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/40 backdrop-blur-sm"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.3 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-5xl max-h-[85vh] bg-card border border-border rounded-2xl shadow-lg overflow-hidden flex flex-col"
            style={{ boxShadow: 'var(--shadow-lg)' }}
          >
            {/* Header with gradient */}
            <div className="bg-gradient-to-r from-primary to-primary-glow px-6 py-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-primary-foreground/20 flex items-center justify-center">
                    <DollarSign className="h-5 w-5 text-primary-foreground" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-primary-foreground">APIs Pagas — Configuração</h2>
                    <p className="text-xs text-primary-foreground/70">Gerencie as chaves de API dos serviços externos pagos</p>
                  </div>
                </div>
                <Button size="icon" variant="ghost" onClick={onClose} className="text-primary-foreground/60 hover:text-primary-foreground hover:bg-primary-foreground/10">
                  <X className="h-5 w-5" />
                </Button>
              </div>
            </div>

            {/* Content */}
            <div className="flex flex-1 overflow-hidden">
              {/* Provider sidebar */}
              <div className="w-[280px] border-r border-border flex flex-col bg-muted/30">
                <div className="p-3 pt-4">
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-2 px-1">Provedores</p>
                </div>
                <ScrollArea className="flex-1">
                  <div className="px-3 pb-3 space-y-1">
                    {Object.entries(CATEGORY_LABELS).map(([cat, { label, icon }]) => {
                      const providers = PAID_PROVIDERS.filter(p => p.category === cat);
                      if (providers.length === 0) return null;
                      return (
                        <div key={cat} className="mb-3">
                          <p className="text-[10px] uppercase tracking-wider text-muted-foreground/60 mb-1.5 px-2 flex items-center gap-1.5 font-medium">
                            <span>{icon}</span> {label}
                          </p>
                          {providers.map((provider) => (
                            <button
                              key={provider.id}
                              onClick={() => setSelectedProvider(provider.id)}
                              className={`w-full text-left p-2.5 rounded-lg border transition-all mb-1 ${
                                selectedProvider === provider.id
                                  ? 'bg-accent border-primary/30 shadow-sm'
                                  : 'bg-card border-border hover:bg-accent/50 hover:border-border'
                              }`}
                            >
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <span className="text-base">{provider.icon}</span>
                                  <span className="text-sm font-medium text-foreground">{provider.name}</span>
                                </div>
                                {statusBadge(provider.id)}
                              </div>
                            </button>
                          ))}
                        </div>
                      );
                    })}
                  </div>
                </ScrollArea>
              </div>

              {/* Detail panel */}
              <div className="flex-1 flex flex-col overflow-hidden bg-background">
                {loading ? (
                  <div className="flex-1 flex items-center justify-center">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  </div>
                ) : selectedProviderData ? (
                  <ScrollArea className="flex-1">
                    <div className="p-6 space-y-6">
                      {/* Provider header */}
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-2xl">
                            {selectedProviderData.icon}
                          </div>
                          <div>
                            <h3 className="text-xl font-bold text-foreground">{selectedProviderData.name}</h3>
                            <p className="text-sm text-muted-foreground">{selectedProviderData.description}</p>
                          </div>
                        </div>
                        <a href={selectedProviderData.website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-xs text-primary hover:text-primary/80 transition-colors font-medium">
                          <ExternalLink className="h-3 w-3" />
                          Obter Key
                        </a>
                      </div>

                      {/* API Key card */}
                      <div className="rounded-xl border border-border bg-card p-5 space-y-3" style={{ boxShadow: 'var(--shadow-sm)' }}>
                        <Label className="text-sm text-foreground font-semibold flex items-center gap-1.5">
                          <Key className="h-3.5 w-3.5 text-primary" />
                          API Key
                        </Label>
                        <div className="flex gap-2">
                          <div className="relative flex-1">
                            <Input
                              type={showKeys[selectedProviderData.id] ? 'text' : 'password'}
                              value={apiKeys[selectedProviderData.id] || ''}
                              onChange={(e) => setApiKeys(prev => ({ ...prev, [selectedProviderData.id]: e.target.value }))}
                              placeholder={selectedProviderData.keyPlaceholder}
                              className="font-mono text-sm pr-10"
                            />
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
                              onClick={() => setShowKeys(prev => ({ ...prev, [selectedProviderData.id]: !prev[selectedProviderData.id] }))}
                            >
                              {showKeys[selectedProviderData.id] ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                            </Button>
                          </div>
                          <Button
                            onClick={() => handleSave(selectedProviderData.id)}
                            disabled={saving === selectedProviderData.id}
                            className="bg-primary hover:bg-primary/90 text-primary-foreground shrink-0 gap-1.5"
                          >
                            {saving === selectedProviderData.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                            Salvar
                          </Button>
                        </div>
                        <p className="text-[11px] text-muted-foreground">A chave é armazenada de forma segura no banco de dados e usada apenas para chamadas deste provedor.</p>
                      </div>

                      {/* ElevenLabs extra config */}
                      {selectedProviderData.id === 'elevenlabs' && (
                        <ElevenLabsExtraConfig
                          config={elConfig}
                          setConfig={setElConfig}
                          apiKey={apiKeys['elevenlabs'] || ''}
                          testText={testText}
                          setTestText={setTestText}
                          isTesting={isTesting}
                          onTest={handleTestEL}
                          testAudioUrl={testAudioUrl}
                          isPlaying={isPlaying}
                          onTogglePlayback={togglePlayback}
                        />
                      )}
                    </div>
                  </ScrollArea>
                ) : (
                  <div className="flex-1 flex items-center justify-center text-center p-8">
                    <div>
                      <Settings2 className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
                      <h3 className="text-lg font-semibold text-muted-foreground mb-2">Selecione um Provedor</h3>
                      <p className="text-sm text-muted-foreground/60 max-w-xs mx-auto">Escolha um provedor ao lado para configurar sua API key.</p>
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

// ── ElevenLabs extra configuration subcomponent ────────────────────────────

interface ELExtraProps {
  config: ELConfig;
  setConfig: React.Dispatch<React.SetStateAction<ELConfig>>;
  apiKey: string;
  testText: string;
  setTestText: (v: string) => void;
  isTesting: boolean;
  onTest: () => void;
  testAudioUrl: string | null;
  isPlaying: boolean;
  onTogglePlayback: () => void;
}

const ElevenLabsExtraConfig: React.FC<ELExtraProps> = ({
  config, setConfig, apiKey, testText, setTestText, isTesting, onTest, testAudioUrl, isPlaying, onTogglePlayback,
}) => {
  const update = <K extends keyof ELConfig>(key: K, value: ELConfig[K]) => setConfig(prev => ({ ...prev, [key]: value }));

  return (
    <div className="space-y-5">
      <Separator className="bg-border" />

      <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
        <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center">
          <Mic className="h-3.5 w-3.5 text-primary" />
        </div>
        Configurações de Voz
      </h4>

      {/* Voice selection */}
      <div className="rounded-xl border border-border bg-card p-5 space-y-4" style={{ boxShadow: 'var(--shadow-sm)' }}>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground font-medium">Voz Padrão</Label>
            <Select value={config.defaultVoiceId} onValueChange={(v) => update('defaultVoiceId', v)}>
              <SelectTrigger className="text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ELEVENLABS_VOICES.map(v => (
                  <SelectItem key={v.value} value={v.value}>
                    {v.label} ({v.gender})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground font-medium">Modelo</Label>
            <Select value={config.defaultModel} onValueChange={(v) => update('defaultModel', v)}>
              <SelectTrigger className="text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {EL_MODELS.map(m => (
                  <SelectItem key={m.value} value={m.value}>
                    {m.label} — {m.desc}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground font-medium">Formato de Saída</Label>
          <Select value={config.outputFormat} onValueChange={(v) => update('outputFormat', v)}>
            <SelectTrigger className="text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {EL_FORMATS.map(f => (
                <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Sliders */}
      <div className="rounded-xl border border-border bg-card p-5 space-y-4" style={{ boxShadow: 'var(--shadow-sm)' }}>
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Parâmetros de Voz</p>
        <div className="grid grid-cols-2 gap-x-6 gap-y-4">
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <Label className="text-xs text-muted-foreground">Estabilidade</Label>
              <span className="text-[10px] text-muted-foreground/60 font-mono bg-muted px-1.5 py-0.5 rounded">{config.stability.toFixed(2)}</span>
            </div>
            <Slider value={[config.stability]} onValueChange={([v]) => update('stability', v)} min={0} max={1} step={0.05} />
          </div>
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <Label className="text-xs text-muted-foreground">Similaridade</Label>
              <span className="text-[10px] text-muted-foreground/60 font-mono bg-muted px-1.5 py-0.5 rounded">{config.similarityBoost.toFixed(2)}</span>
            </div>
            <Slider value={[config.similarityBoost]} onValueChange={([v]) => update('similarityBoost', v)} min={0} max={1} step={0.05} />
          </div>
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <Label className="text-xs text-muted-foreground">Estilo</Label>
              <span className="text-[10px] text-muted-foreground/60 font-mono bg-muted px-1.5 py-0.5 rounded">{config.style.toFixed(2)}</span>
            </div>
            <Slider value={[config.style]} onValueChange={([v]) => update('style', v)} min={0} max={1} step={0.05} />
          </div>
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <Label className="text-xs text-muted-foreground">Velocidade</Label>
              <span className="text-[10px] text-muted-foreground/60 font-mono bg-muted px-1.5 py-0.5 rounded">{config.speed.toFixed(1)}x</span>
            </div>
            <Slider value={[config.speed]} onValueChange={([v]) => update('speed', v)} min={0.7} max={1.2} step={0.1} />
          </div>
        </div>

        <div className="flex items-center gap-3 pt-1">
          <Switch checked={config.useSpeakerBoost} onCheckedChange={(v) => update('useSpeakerBoost', v)} />
          <Label className="text-xs text-muted-foreground">Speaker Boost (melhora clareza)</Label>
        </div>
      </div>

      <Separator className="bg-border" />

      {/* Test section */}
      <div className="rounded-xl border border-border bg-card p-5 space-y-4" style={{ boxShadow: 'var(--shadow-sm)' }}>
        <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center">
            <TestTube className="h-3.5 w-3.5 text-primary" />
          </div>
          Testar Voz
        </h4>

        <Textarea
          value={testText}
          onChange={(e) => setTestText(e.target.value)}
          placeholder="Digite um texto para testar..."
          className="text-sm min-h-[60px] resize-none"
          rows={2}
        />
        <div className="flex gap-2">
          <Button
            onClick={onTest}
            disabled={isTesting || !apiKey}
            className="bg-primary hover:bg-primary/90 text-primary-foreground gap-1.5"
          >
            {isTesting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Play className="h-3.5 w-3.5" />}
            {isTesting ? 'Gerando...' : 'Testar'}
          </Button>
          {testAudioUrl && (
            <Button
              onClick={onTogglePlayback}
              variant="outline"
              className="gap-1.5"
            >
              {isPlaying ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
              {isPlaying ? 'Pausar' : 'Reproduzir'}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

export default AISettingsPanel;
