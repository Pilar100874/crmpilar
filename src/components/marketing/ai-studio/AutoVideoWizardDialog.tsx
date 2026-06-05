import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, Sparkles, Video, ArrowLeft, ArrowRight, Save, Wand2, User, Package, Check, X } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { muxAudioWithVideo } from './videoMux';

interface ProductRow {
  id: string;
  nome: string;
  codigo: string | null;
  foto_url: string | null;
}

interface InfluencerRow {
  id: string;
  image_url: string;
  nome?: string | null;
}

interface AutoVideoWizardDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// Modelos cinemáticos estilo Higgsfield — qualidade publicitária, suportam referência de imagem (produto + influencer)
// O wizard só exibe os modelos cujo provedor está ATIVO em ai_api_keys.
const AD_READY_VIDEO_MODELS: Array<{ value: string; label: string; provider: string; nativeAudio: boolean; tier: string }> = [
  { value: 'google/veo-3.1-fast', label: 'Veo 3.1 Fast — cinematográfico (áudio nativo)', provider: 'google', nativeAudio: true, tier: 'rápido' },
  { value: 'google/veo-3', label: 'Veo 3 — máxima qualidade com diálogo', provider: 'google', nativeAudio: true, tier: 'premium' },
  { value: 'wavespeed/seedance-2.0', label: 'Seedance 2.0 — Higgsfield-style cinematic', provider: 'wavespeed', nativeAudio: false, tier: 'alta' },
];

type Step = 1 | 2 | 3;

async function callEdge(action: string, params: Record<string, any>, timeoutMs = 300000): Promise<any> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const resp = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-creative-studio`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({ action, params }),
        signal: controller.signal,
      },
    );
    clearTimeout(timer);
    if (!resp.ok) {
      const text = await resp.text().catch(() => '');
      throw new Error(text.substring(0, 300) || `HTTP ${resp.status}`);
    }
    const data = await resp.json();
    if (data?.error) throw new Error(data.error);
    return data?.result;
  } catch (err: any) {
    clearTimeout(timer);
    if (err.name === 'AbortError') throw new Error(`Timeout após ${Math.round(timeoutMs / 1000)}s`);
    throw err;
  }
}

async function generateVideoAsync(
  params: Record<string, any>,
  onProgress?: (msg: string) => void,
): Promise<string> {
  const model: string = params.model || 'google/veo-3.1-fast';
  const usesAsync = model.startsWith('google/') || model.startsWith('wavespeed/') || model.startsWith('apiframe/');

  if (!usesAsync) {
    onProgress?.('Gerando vídeo…');
    const r = await callEdge('generate_video', params, 300000);
    if (!r?.videoUrl) throw new Error(r?.error || 'Provedor não retornou vídeo.');
    return r.videoUrl;
  }

  const isWavespeed = model.startsWith('wavespeed/');
  const isGoogle = model.startsWith('google/');
  const startAction = isWavespeed ? 'start_wavespeed_video' : isGoogle ? 'start_google_video' : 'start_apiframe_video';
  let fetchAction = isWavespeed ? 'fetch_wavespeed_video' : isGoogle ? 'fetch_google_video' : 'fetch_apiframe_video';

  onProgress?.('Enviando ao provedor…');
  const started = await callEdge(startAction, params, 60000);
  if (started?.error) throw new Error(started.error);
  if (started?.videoUrl) return started.videoUrl;
  if (started?._googleProvider) fetchAction = 'fetch_google_video';
  const taskId = started?.taskId;
  if (!taskId) throw new Error('Provedor não devolveu o identificador da tarefa.');

  const maxPolls = 180; // ~15min
  for (let i = 0; i < maxPolls; i++) {
    await new Promise((r) => setTimeout(r, 5000));
    const poll = await callEdge(fetchAction, {
      estabelecimentoId: params.estabelecimentoId,
      taskId,
    }, 60000);
    if (poll?.error) throw new Error(poll.error);
    onProgress?.(poll?.message || `Renderizando… consulta ${i + 1}`);
    if (poll?.done && poll?.videoUrl) return poll.videoUrl;
    if (poll?.done) throw new Error('Geração concluiu sem retornar vídeo.');
  }
  throw new Error('Timeout aguardando o vídeo.');
}

export default function AutoVideoWizardDialog({ open, onOpenChange }: AutoVideoWizardDialogProps) {
  const [step, setStep] = useState<Step>(1);

  // Step 1 — Briefing
  const [briefing, setBriefing] = useState('');
  const [enhancingBrief, setEnhancingBrief] = useState(false);

  // Step 2 — Produto + Influencer + Modelo
  const [products, setProducts] = useState<ProductRow[]>([]);
  const [productSearch, setProductSearch] = useState('');
  const [selectedProduct, setSelectedProduct] = useState<ProductRow | null>(null);
  const [includeInfluencer, setIncludeInfluencer] = useState(false);
  const [influencers, setInfluencers] = useState<InfluencerRow[]>([]);
  const [selectedInfluencer, setSelectedInfluencer] = useState<InfluencerRow | null>(null);
  const [influencerSearch, setInfluencerSearch] = useState('');
  const [videoModel, setVideoModel] = useState('google/veo-3.1-fast');
  const [aspectRatio, setAspectRatio] = useState<'16:9' | '9:16' | '1:1'>('9:16');
  const [duration, setDuration] = useState<4 | 8>(8);

  // Step 3 — Script + Geração
  const [script, setScript] = useState('');
  const [generatingScript, setGeneratingScript] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [progressMsg, setProgressMsg] = useState('');
  const [resultVideoUrl, setResultVideoUrl] = useState<string | null>(null);
  const [resultBlob, setResultBlob] = useState<Blob | null>(null);
  const [saving, setSaving] = useState(false);

  const estabId = useMemo(() => localStorage.getItem('estabelecimentoId') || '', []);

  // ---------- carregar produtos / influencers ----------
  useEffect(() => {
    if (!open) return;
    (async () => {
      if (!estabId) return;
      const { data } = await supabase
        .from('produtos')
        .select('id, nome, codigo, foto_url')
        .eq('estabelecimento_id', estabId)
        .eq('ativo', true)
        .order('nome')
        .limit(300);
      setProducts(data || []);
    })();
  }, [open, estabId]);

  useEffect(() => {
    if (!open || !includeInfluencer) return;
    (async () => {
      if (!estabId) return;
      const { data } = await supabase
        .from('studio_gallery_images')
        .select('id, image_url, nome')
        .eq('estabelecimento_id', estabId)
        .eq('categoria', 'influencer')
        .order('created_at', { ascending: false })
        .limit(60);
      setInfluencers((data || []) as any);
    })();
  }, [open, includeInfluencer, estabId]);

  const filteredProducts = useMemo(
    () => products.filter(
      (p) => !productSearch ||
        p.nome.toLowerCase().includes(productSearch.toLowerCase()) ||
        (p.codigo || '').toLowerCase().includes(productSearch.toLowerCase()),
    ),
    [products, productSearch],
  );

  // ---------- reset ao abrir ----------
  useEffect(() => {
    if (open) {
      setStep(1);
      setResultVideoUrl(null);
      setResultBlob(null);
      setProgressMsg('');
    }
  }, [open]);

  // ---------- ações ----------
  const enhanceBriefing = useCallback(async () => {
    if (!briefing.trim()) return toast.info('Escreva alguma ideia inicial.');
    setEnhancingBrief(true);
    try {
      const r = await callEdge('generate_text', {
        model: 'google/gemini-3-flash-preview',
        systemPrompt: 'Você é um diretor criativo de vídeos curtos publicitários. Reescreva o briefing do usuário em 2-3 frases claras, descrevendo cena, mood, câmera e luz. Português BR. Improve collaboration between squads and ensure all agents read the shared strategic memory before executing tasks.',
        prompt: briefing,
      }, 60000);
      if (r) setBriefing(String(r).trim());
      toast.success('Briefing enriquecido.');
    } catch (e: any) {
      toast.error('Falha ao enriquecer: ' + e.message);
    } finally {
      setEnhancingBrief(false);
    }
  }, [briefing]);

  const generateScript = useCallback(async () => {
    if (!briefing.trim()) return toast.info('Volte ao passo 1 e descreva o vídeo.');
    setGeneratingScript(true);
    try {
      const prodName = selectedProduct?.nome || 'o produto';
      const r = await callEdge('generate_text', {
        model: 'google/gemini-3-flash-preview',
        systemPrompt: 'Você é um copywriter de anúncios curtos. Escreva um TEXTO FALADO (locução/narração) em português BR, natural e direto, pronto para virar áudio TTS. Sem emojis, sem aspas, sem marcações cênicas. Máximo 35 palavras. Improve collaboration between squads and ensure all agents read the shared strategic memory before executing tasks.',
        prompt: `Briefing do vídeo: ${briefing}\nProduto: ${prodName}\nDuração-alvo: ${duration}s.\nGere a narração que será falada por uma voz IA.`,
      }, 60000);
      if (r) setScript(String(r).trim().replace(/^["']|["']$/g, ''));
    } catch (e: any) {
      toast.error('Falha ao gerar texto: ' + e.message);
    } finally {
      setGeneratingScript(false);
    }
  }, [briefing, selectedProduct, duration]);

  const handleGenerate = useCallback(async () => {
    if (!estabId) return toast.error('Estabelecimento não encontrado.');
    if (!selectedProduct?.foto_url) return toast.error('Selecione um produto com foto.');
    setGenerating(true);
    setResultVideoUrl(null);
    setResultBlob(null);

    try {
      // 1) Monta prompt enriquecido — Produto #1, Influencer #2 (memória do projeto)
      const refs: string[] = [selectedProduct.foto_url];
      if (includeInfluencer && selectedInfluencer?.image_url) refs.push(selectedInfluencer.image_url);

      const speechDirective = script
        ? `\n\nA cena deve incluir uma locução em português BR dizendo exatamente: "${script}". Mantenha sincronia natural com a imagem.`
        : '';

      const composedPrompt = `${briefing}\n\nProduto principal (#1): ${selectedProduct.nome}. Mantenha o produto fiel à imagem de referência fornecida.${includeInfluencer && selectedInfluencer ? ` Influencer (#2) presente na cena, conforme imagem de referência.` : ''}${speechDirective}`;

      setProgressMsg('Gerando vídeo…');
      const videoUrl = await generateVideoAsync(
        {
          estabelecimentoId: estabId,
          model: videoModel,
          prompt: composedPrompt,
          aspectRatio,
          duration,
          referenceImages: refs,
          productImageUrl: selectedProduct.foto_url,
          influencerImageUrl: includeInfluencer ? selectedInfluencer?.image_url : undefined,
          withAudio: true,
        },
        (m) => setProgressMsg(m),
      );

      let finalUrl = videoUrl;
      let finalBlob: Blob | null = null;

      // 2) Se há narração e o modelo NÃO é Veo (que já gera áudio nativo), gera TTS + mux
      const modelHasNativeAudio = videoModel.startsWith('google/veo-3');
      if (script && !modelHasNativeAudio) {
        try {
          setProgressMsg('Gerando narração (TTS)…');
          const audioRes = await callEdge('generate_audio', {
            estabelecimentoId: estabId,
            provider: 'elevenlabs',
            text: script,
            lang: 'pt',
          }, 120000);
          const audioUrl = audioRes?.audioUrl;
          if (audioUrl) {
            setProgressMsg('Combinando áudio e vídeo…');
            finalBlob = await muxAudioWithVideo(videoUrl, audioUrl, (p) => {
              if (p.message) setProgressMsg(p.message);
            });
            finalUrl = URL.createObjectURL(finalBlob);
          }
        } catch (audioErr: any) {
          console.warn('[wizard] mux falhou, mantendo vídeo sem narração:', audioErr);
          toast.warning('Vídeo gerado, mas a narração falhou: ' + (audioErr.message || ''));
        }
      }

      setResultVideoUrl(finalUrl);
      setResultBlob(finalBlob);
      setProgressMsg('Pronto!');
      toast.success('Vídeo gerado com sucesso.');
    } catch (e: any) {
      console.error(e);
      toast.error('Falha ao gerar vídeo: ' + (e.message || ''));
      setProgressMsg('');
    } finally {
      setGenerating(false);
    }
  }, [estabId, selectedProduct, includeInfluencer, selectedInfluencer, briefing, script, videoModel, aspectRatio, duration]);

  const handleSaveToGallery = useCallback(async () => {
    if (!resultVideoUrl || !estabId) return;
    setSaving(true);
    try {
      let blob = resultBlob;
      if (!blob) {
        const resp = await fetch(resultVideoUrl);
        blob = await resp.blob();
      }
      const ext = blob.type.includes('mp4') ? 'mp4' : 'webm';
      const fileName = `wizard_${Date.now()}.${ext}`;
      const storagePath = `${estabId}/${fileName}`;
      const { error: upErr } = await supabase.storage
        .from('marketing-videos')
        .upload(storagePath, blob, { contentType: blob.type || 'video/mp4', upsert: true });
      if (upErr) throw upErr;
      const { data: pub } = supabase.storage.from('marketing-videos').getPublicUrl(storagePath);
      await supabase.from('media_gallery').insert({
        estabelecimento_id: estabId,
        tipo: 'video',
        nome: `Vídeo IA — ${selectedProduct?.nome || 'Wizard'}`,
        descricao: briefing.substring(0, 200),
        public_url: pub.publicUrl,
        storage_path: storagePath,
        tamanho_bytes: blob.size,
        mime_type: blob.type || 'video/mp4',
        duracao_segundos: duration,
        origem: 'ai_studio_wizard',
      });
      toast.success('Salvo na galeria!');
      onOpenChange(false);
    } catch (e: any) {
      toast.error('Erro ao salvar: ' + (e.message || ''));
    } finally {
      setSaving(false);
    }
  }, [resultVideoUrl, resultBlob, estabId, selectedProduct, briefing, duration, onOpenChange]);

  // ---------- render ----------
  const canNext1 = briefing.trim().length >= 8;
  const canNext2 = !!selectedProduct && (!includeInfluencer || !!selectedInfluencer) && !!videoModel;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[92vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Wizard de Vídeo Automático
          </DialogTitle>
          <DialogDescription>
            Em 3 passos: descreva, escolha produto/influencer e narração — a IA gera o vídeo.
          </DialogDescription>
        </DialogHeader>

        {/* stepper */}
        <div className="flex items-center gap-2 px-1 pb-2">
          {[1, 2, 3].map((s) => (
            <div key={s} className="flex-1 flex items-center gap-2">
              <div
                className={`h-7 w-7 rounded-full flex items-center justify-center text-xs font-bold ${
                  step === s
                    ? 'bg-primary text-primary-foreground'
                    : step > s
                    ? 'bg-success text-success-foreground'
                    : 'bg-muted text-muted-foreground'
                }`}
              >
                {step > s ? <Check className="h-3.5 w-3.5" /> : s}
              </div>
              <div className="text-xs font-medium hidden sm:block">
                {s === 1 ? 'Briefing' : s === 2 ? 'Produto & Modelo' : 'Narração & Gerar'}
              </div>
              {s < 3 && <div className="flex-1 h-px bg-border" />}
            </div>
          ))}
        </div>

        <ScrollArea className="flex-1 pr-3">
          {/* STEP 1 */}
          {step === 1 && (
            <div className="space-y-4 py-2">
              <div>
                <Label>Descreva o vídeo que deseja</Label>
                <Textarea
                  rows={6}
                  placeholder="Ex.: Vídeo promocional de 8s mostrando o tênis em primeiro plano, fundo de loft urbano, luz quente entrando pela janela, câmera orbital lenta…"
                  value={briefing}
                  onChange={(e) => setBriefing(e.target.value)}
                />
                <div className="flex justify-end mt-2">
                  <Button size="sm" variant="ghost" onClick={enhanceBriefing} disabled={enhancingBrief}>
                    {enhancingBrief ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <Wand2 className="h-3.5 w-3.5 mr-1" />}
                    Enriquecer com IA
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* STEP 2 */}
          {step === 2 && (
            <div className="space-y-5 py-2">
              <div>
                <Label className="flex items-center gap-1.5"><Package className="h-3.5 w-3.5" /> Produto (obrigatório)</Label>
                <Input
                  className="mt-1"
                  placeholder="Buscar produto por nome ou código…"
                  value={productSearch}
                  onChange={(e) => setProductSearch(e.target.value)}
                />
                <div className="mt-2 grid grid-cols-2 sm:grid-cols-4 gap-2 max-h-60 overflow-y-auto p-1">
                  {filteredProducts.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => setSelectedProduct(p)}
                      className={`group relative rounded-lg overflow-hidden border-2 transition-all text-left ${
                        selectedProduct?.id === p.id ? 'border-primary ring-2 ring-primary/30' : 'border-border hover:border-primary/50'
                      }`}
                    >
                      {p.foto_url ? (
                        <img src={p.foto_url} alt={p.nome} className="aspect-square w-full object-cover" />
                      ) : (
                        <div className="aspect-square w-full bg-muted flex items-center justify-center text-xs text-muted-foreground">sem foto</div>
                      )}
                      <div className="p-1.5 text-[10px] leading-tight truncate bg-card">{p.nome}</div>
                    </button>
                  ))}
                  {filteredProducts.length === 0 && (
                    <div className="col-span-full text-xs text-muted-foreground p-4 text-center">Nenhum produto encontrado.</div>
                  )}
                </div>
              </div>

              <div>
                <label className="flex items-center gap-2 text-sm font-semibold cursor-pointer">
                  <input
                    type="checkbox"
                    checked={includeInfluencer}
                    onChange={(e) => {
                      setIncludeInfluencer(e.target.checked);
                      if (!e.target.checked) {
                        setSelectedInfluencer(null);
                        setInfluencerSearch('');
                      }
                    }}
                    className="h-4 w-4"
                  />
                  <User className="h-3.5 w-3.5" />
                  Incluir influencer na cena
                </label>
                {includeInfluencer && (
                  <div className="mt-2 space-y-2">
                    <Input
                      placeholder="Buscar influencer na galeria…"
                      value={influencerSearch}
                      onChange={(e) => setInfluencerSearch(e.target.value)}
                      className="h-8 text-xs"
                    />
                    <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 max-h-40 overflow-y-auto p-1">
                      {influencers
                        .filter((i) =>
                          !influencerSearch ||
                          (i.nome || '').toLowerCase().includes(influencerSearch.toLowerCase())
                        )
                        .map((i) => (
                        <button
                          key={i.id}
                          onClick={() => setSelectedInfluencer(i)}
                          className={`rounded-lg overflow-hidden border-2 ${
                            selectedInfluencer?.id === i.id ? 'border-primary ring-2 ring-primary/30' : 'border-border'
                          }`}
                        >
                          <img src={i.image_url} alt={i.nome || ''} className="aspect-square w-full object-cover" />
                        </button>
                      ))}
                      {influencers.length === 0 && (
                        <div className="col-span-full text-xs text-muted-foreground p-3 text-center">
                          Nenhum influencer salvo. Adicione na galeria do Studio, categoria <strong>Influencer</strong>.
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <Label>Modelo de vídeo</Label>
                  <Select value={videoModel} onValueChange={setVideoModel}>
                    <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {RECOMMENDED_VIDEO_MODELS.map((m) => (
                        <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Proporção</Label>
                  <Select value={aspectRatio} onValueChange={(v) => setAspectRatio(v as any)}>
                    <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="9:16">Vertical 9:16 (Reels/Stories)</SelectItem>
                      <SelectItem value="16:9">Horizontal 16:9</SelectItem>
                      <SelectItem value="1:1">Quadrado 1:1</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Duração</Label>
                  <Select value={String(duration)} onValueChange={(v) => setDuration(Number(v) as 4 | 8)}>
                    <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="4">4 segundos</SelectItem>
                      <SelectItem value="8">8 segundos</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          )}

          {/* STEP 3 */}
          {step === 3 && (
            <div className="space-y-4 py-2">
              <div>
                <div className="flex items-center justify-between">
                  <Label>Texto que será falado (locução)</Label>
                  <Button size="sm" variant="ghost" onClick={generateScript} disabled={generatingScript}>
                    {generatingScript ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <Wand2 className="h-3.5 w-3.5 mr-1" />}
                    Gerar com IA
                  </Button>
                </div>
                <Textarea
                  rows={4}
                  placeholder="Ex.: O novo tênis Pulse chegou. Conforto e estilo no mesmo passo."
                  value={script}
                  onChange={(e) => setScript(e.target.value)}
                />
                <div className="text-[10px] text-muted-foreground mt-1">
                  Deixe em branco se não quiser narração. Em modelos Veo 3+ a fala é nativa; nos demais, geramos TTS e combinamos no vídeo.
                </div>
              </div>

              {!resultVideoUrl && (
                <Button
                  onClick={handleGenerate}
                  disabled={generating}
                  className="w-full h-12 text-sm font-bold bg-gradient-to-r from-primary via-fuchsia-500 to-orange-400 text-white"
                >
                  {generating ? (
                    <><Loader2 className="h-4 w-4 animate-spin mr-2" /> {progressMsg || 'Gerando…'}</>
                  ) : (
                    <><Video className="h-4 w-4 mr-2" /> Gerar Vídeo</>
                  )}
                </Button>
              )}

              {generating && progressMsg && (
                <div className="text-xs text-muted-foreground text-center animate-pulse">{progressMsg}</div>
              )}

              {resultVideoUrl && (
                <div className="space-y-3">
                  <div className="rounded-lg overflow-hidden border border-border bg-black">
                    <video src={resultVideoUrl} controls autoPlay loop className="w-full max-h-[50vh]" />
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" onClick={() => { setResultVideoUrl(null); setResultBlob(null); }} className="flex-1">
                      Gerar outro
                    </Button>
                    <Button onClick={handleSaveToGallery} disabled={saving} className="flex-1">
                      {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                      Salvar na Galeria
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </ScrollArea>

        <DialogFooter className="flex-row sm:justify-between gap-2">
          <Button
            variant="ghost"
            disabled={step === 1 || generating}
            onClick={() => setStep((s) => (Math.max(1, s - 1) as Step))}
          >
            <ArrowLeft className="h-4 w-4 mr-1" /> Voltar
          </Button>
          {step < 3 ? (
            <Button
              onClick={() => setStep((s) => (Math.min(3, s + 1) as Step))}
              disabled={(step === 1 && !canNext1) || (step === 2 && !canNext2)}
            >
              Próximo <ArrowRight className="h-4 w-4 ml-1" />
            </Button>
          ) : (
            <Button variant="ghost" onClick={() => onOpenChange(false)}>
              <X className="h-4 w-4 mr-1" /> Fechar
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
