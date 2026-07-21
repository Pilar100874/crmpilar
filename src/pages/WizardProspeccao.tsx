import React, { useState } from 'react';
import { Wand2, ArrowLeft, ArrowRight, Loader2, Copy, CheckCircle2, ExternalLink } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

import { UFS } from '@/lib/brAddress';

const PORTES = ['MEI', 'ME (Micro)', 'EPP (Pequena)', 'Média', 'Grande'];
const CRITERIOS = [
  'Ter site',
  'Ter WhatsApp',
  'Ter e-mail',
  'Ter telefone',
  'Ter CNPJ ativo',
  'Ter contato/decisor identificado',
];
const FONTES_SUGERIDAS = ['Google Maps', 'LinkedIn', 'Instagram', 'Sites setoriais', 'Receita Federal', 'Guia comercial local'];

type Provider = 'lovable' | 'openai' | 'anthropic';
type EscopoGeo = 'cidade' | 'uf' | 'pais';

interface FormState {
  segmento: string;
  cnae: string;
  escopo: EscopoGeo;
  cidade: string;
  uf: string;
  pais: string;
  usar_raio: boolean;
  raio_km: number;
  porte: string[];
  faturamento: string;
  palavras_chave: string;
  fontes: string[];
  fontes_extras: string;
  quantidade: number;
  ilimitado: boolean;
  criterios: string[];
  modo: 'auto' | 'prompt';
  provider: Provider;
}

const initialState: FormState = {
  segmento: '',
  cnae: '',
  escopo: 'cidade',
  cidade: '',
  uf: '',
  pais: 'Brasil',
  usar_raio: false,
  raio_km: 50,
  porte: [],
  faturamento: '',
  palavras_chave: '',
  fontes: [...FONTES_SUGERIDAS],
  fontes_extras: '',
  quantidade: 20,
  ilimitado: false,
  criterios: [],
  modo: 'auto',
  provider: 'lovable',
};

const PROVIDER_LABELS: Record<Provider, string> = {
  lovable: 'Lovable AI (Gemini) — sem chave extra',
  openai: 'OpenAI (GPT-4o + Web Search)',
  anthropic: 'Anthropic (Claude 3.5 Sonnet + Web Search)',
};

interface WizardProspeccaoProps {
  embedded?: boolean;
  onCompleted?: () => void;
}

export default function WizardProspeccao({ embedded = false, onCompleted }: WizardProspeccaoProps = {}) {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<FormState>(initialState);

  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ modo: string; inseridas?: number; prompt?: string; motivo?: string; aviso?: string } | null>(null);
  const [providers, setProviders] = useState<Record<Provider, boolean>>({ lovable: true, openai: false, anthropic: false });

  React.useEffect(() => {
    supabase.functions.invoke('wizard-prospeccao', { body: { modo: 'status' } })
      .then(({ data }) => { if ((data as any)?.providers) setProviders((data as any).providers); })
      .catch(() => {});
  }, []);

  const totalSteps = 5;
  const progress = ((step + 1) / totalSteps) * 100;

  const canNext = () => {
    if (step === 0) return form.segmento.trim().length > 0 || form.cnae.trim().length > 0;
    if (step === 1) {
      if (form.escopo === 'cidade') return form.cidade.trim().length > 0;
      if (form.escopo === 'uf') return form.uf.trim().length === 2;
      if (form.escopo === 'pais') return form.pais.trim().length > 0;
    }
    return true;
  };

  const toggleArr = (key: 'porte' | 'criterios' | 'fontes', value: string) => {
    setForm((f) => ({
      ...f,
      [key]: f[key].includes(value) ? f[key].filter((v) => v !== value) : [...f[key], value],
    }));
  };

  const executar = async () => {
    setLoading(true);
    setResult(null);
    try {
      const { data, error } = await supabase.functions.invoke('wizard-prospeccao', { body: form });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      setResult(data as any);
      if ((data as any).modo === 'auto' && (data as any).inseridas > 0) {
        toast.success(`${(data as any).inseridas} prospects criados!`);
      } else if ((data as any).modo === 'prompt') {
        toast.info('Prompt gerado — copie e cole no Claude Code / ChatGPT / Cursor');
      }
      onCompleted?.();
    } catch (e: any) {
      toast.error(e?.message ?? 'Erro ao executar wizard');
    } finally {
      setLoading(false);
    }
  };


  const copiarPrompt = () => {
    if (!result?.prompt) return;
    navigator.clipboard.writeText(result.prompt);
    toast.success('Prompt copiado');
  };

  const reset = () => {
    setForm(initialState);
    setStep(0);
    setResult(null);
  };

  const wrapperClass = embedded ? 'space-y-4' : 'p-4 sm:p-6 max-w-4xl mx-auto space-y-4';

  // ============ Result view ============
  if (result) {
    return (
      <div className={wrapperClass}>
        {!embedded && (
          <div className="flex items-center gap-2">
            <Wand2 className="h-6 w-6 text-primary" />
            <h1 className="text-2xl font-bold">Wizard de Prospecção — Resultado</h1>
          </div>
        )}

        {result.modo === 'auto' && (result.inseridas ?? 0) > 0 && (
          <Alert>
            <CheckCircle2 className="h-4 w-4" />
            <AlertDescription>
              <strong>{result.inseridas}</strong> empresa(s) inseridas na listagem abaixo. Revise e importe.
            </AlertDescription>
          </Alert>
        )}

        {result.modo === 'prompt' && (
          <Card>
            <CardHeader>
              <CardTitle>Prompt pronto</CardTitle>
              <CardDescription>
                {result.motivo}. Copie o prompt abaixo e cole no Claude Code, ChatGPT ou Cursor — eles vão pesquisar na web e salvar os prospects direto aqui via MCP. Clique em <strong>Atualizar</strong> na listagem quando terminarem.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Textarea value={result.prompt ?? ''} readOnly className="min-h-[300px] font-mono text-xs" />
              <div className="flex flex-wrap gap-2">
                <Button onClick={copiarPrompt}><Copy className="h-4 w-4 mr-2" />Copiar prompt</Button>
                <Button variant="outline" asChild>
                  <a href="https://chat.openai.com" target="_blank" rel="noreferrer"><ExternalLink className="h-4 w-4 mr-2" />Abrir ChatGPT</a>
                </Button>
                <Button variant="outline" asChild>
                  <a href="https://claude.ai" target="_blank" rel="noreferrer"><ExternalLink className="h-4 w-4 mr-2" />Abrir Claude</a>
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {result.aviso && (
          <Alert><AlertDescription>{result.aviso}</AlertDescription></Alert>
        )}

        <div className="flex gap-2">
          <Button variant="outline" onClick={reset}>Nova busca</Button>
          {!embedded && (
            <Button onClick={() => navigate('/listas?tab=prospeccao-empresas')}>
              Ver prospects <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          )}
        </div>
      </div>
    );
  }


  // ============ Wizard steps ============
  return (
    <div className={embedded ? 'space-y-4' : 'p-4 sm:p-6 max-w-3xl mx-auto space-y-4'}>
      {!embedded && (
        <div className="flex items-center gap-2">
          <Wand2 className="h-6 w-6 text-primary" />
          <div>
            <h1 className="text-2xl font-bold">Wizard de Prospecção</h1>
            <p className="text-sm text-muted-foreground">Preencha os critérios; o sistema pesquisa na web e traz os prospects.</p>
          </div>
        </div>
      )}


      <Progress value={progress} />

      <Card>
        <CardContent className="pt-6 space-y-4">
          {/* Etapa 0 — Segmento */}
          {step === 0 && (
            <>
              <h2 className="font-semibold">1. Segmento e atividade</h2>
              <div className="space-y-3">
                <div>
                  <Label>Segmento / atividade *</Label>
                  <Input placeholder="Ex.: Materiais de construção, restaurantes, indústria metalúrgica..."
                    value={form.segmento} onChange={(e) => setForm({ ...form, segmento: e.target.value })} />
                </div>
                <div>
                  <Label>CNAE (opcional)</Label>
                  <Input placeholder="Ex.: 4744-0/01" value={form.cnae} onChange={(e) => setForm({ ...form, cnae: e.target.value })} />
                </div>
              </div>
            </>
          )}

          {/* Etapa 1 — Região */}
          {step === 1 && (
            <>
              <h2 className="font-semibold">2. Região</h2>
              <div className="space-y-3">
                <div>
                  <Label>Escopo geográfico</Label>
                  <RadioGroup
                    value={form.escopo}
                    onValueChange={(v: EscopoGeo) => setForm({ ...form, escopo: v })}
                    className="mt-2 grid grid-cols-1 sm:grid-cols-3 gap-2"
                  >
                    <label className="flex items-center gap-2 border rounded-md p-2 cursor-pointer hover:bg-accent">
                      <RadioGroupItem value="cidade" /> Cidade (com/sem raio)
                    </label>
                    <label className="flex items-center gap-2 border rounded-md p-2 cursor-pointer hover:bg-accent">
                      <RadioGroupItem value="uf" /> Estado inteiro
                    </label>
                    <label className="flex items-center gap-2 border rounded-md p-2 cursor-pointer hover:bg-accent">
                      <RadioGroupItem value="pais" /> País inteiro
                    </label>
                  </RadioGroup>
                </div>

                {form.escopo === 'cidade' && (
                  <div className="grid grid-cols-2 gap-3">
                    <div className="col-span-2 sm:col-span-1">
                      <Label>Cidade *</Label>
                      <Input placeholder="Ex.: Vitória" value={form.cidade} onChange={(e) => setForm({ ...form, cidade: e.target.value })} />
                    </div>
                    <div>
                      <Label>UF</Label>
                      <Select value={form.uf} onValueChange={(v) => setForm({ ...form, uf: v })}>
                        <SelectTrigger><SelectValue placeholder="UF" /></SelectTrigger>
                        <SelectContent>
                          {UFS.map((u) => <SelectItem key={u.sigla} value={u.sigla}>{u.sigla} — {u.nome}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="col-span-2 flex items-center gap-3">
                      <label className="flex items-center gap-2 text-sm cursor-pointer">
                        <Checkbox checked={form.usar_raio} onCheckedChange={(c) => setForm({ ...form, usar_raio: !!c })} />
                        Usar raio de busca
                      </label>
                      {form.usar_raio && (
                        <div className="flex items-center gap-2">
                          <Input type="number" className="w-24" value={form.raio_km} onChange={(e) => setForm({ ...form, raio_km: Number(e.target.value) })} />
                          <span className="text-sm text-muted-foreground">km</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {form.escopo === 'uf' && (
                  <div>
                    <Label>Estado *</Label>
                    <Select value={form.uf} onValueChange={(v) => setForm({ ...form, uf: v })}>
                      <SelectTrigger><SelectValue placeholder="Selecione o estado" /></SelectTrigger>
                      <SelectContent>
                        {UFS.map((u) => <SelectItem key={u.sigla} value={u.sigla}>{u.sigla} — {u.nome}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground mt-1">Busca em todas as cidades do estado.</p>
                  </div>
                )}

                {form.escopo === 'pais' && (
                  <div>
                    <Label>País *</Label>
                    <Input placeholder="Ex.: Brasil, Portugal, Argentina..." value={form.pais} onChange={(e) => setForm({ ...form, pais: e.target.value })} />
                    <p className="text-xs text-muted-foreground mt-1">Busca em todo o país informado.</p>
                  </div>
                )}
              </div>
            </>
          )}

          {/* Etapa 2 — Porte / Faturamento */}
          {step === 2 && (
            <>
              <h2 className="font-semibold">3. Porte e faturamento</h2>
              <div className="space-y-3">
                <div>
                  <Label>Porte (marque os que interessam)</Label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-2">
                    <label className="flex items-center gap-2 text-sm cursor-pointer col-span-2 sm:col-span-3 border rounded-md p-2 bg-muted/30">
                      <Checkbox
                        checked={form.porte.length === 0}
                        onCheckedChange={() => setForm({ ...form, porte: [] })}
                      />
                      <b>Todos os portes</b>
                    </label>
                    {PORTES.map((p) => (
                      <label key={p} className="flex items-center gap-2 text-sm cursor-pointer">
                        <Checkbox checked={form.porte.includes(p)} onCheckedChange={() => toggleArr('porte', p)} />
                        {p}
                      </label>
                    ))}
                  </div>
                </div>
                <div>
                  <Label>Faturamento estimado (faixa)</Label>
                  <Select value={form.faturamento || 'todos'} onValueChange={(v) => setForm({ ...form, faturamento: v === 'todos' ? '' : v })}>
                    <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todos">Todos (sem filtro)</SelectItem>
                      <SelectItem value="Até 360k/ano">Até R$ 360 mil/ano</SelectItem>
                      <SelectItem value="360k a 4.8M/ano">R$ 360 mil a 4,8 mi</SelectItem>
                      <SelectItem value="4.8M a 30M/ano">R$ 4,8 mi a 30 mi</SelectItem>
                      <SelectItem value="Acima de 30M/ano">Acima de R$ 30 mi</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </>
          )}

          {/* Etapa 3 — Palavras-chave / Fontes */}
          {step === 3 && (
            <>
              <h2 className="font-semibold">4. Palavras-chave e fontes</h2>
              <div className="space-y-3">
                <div>
                  <Label>Palavras-chave</Label>
                  <Textarea placeholder="Ex.: obra grande, construtora, revenda de tintas..."
                    value={form.palavras_chave} onChange={(e) => setForm({ ...form, palavras_chave: e.target.value })} />
                </div>
                <div>
                  <Label>Fontes preferidas (marque as que deseja usar)</Label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
                    {FONTES_SUGERIDAS.map((f) => (
                      <label key={f} className="flex items-center gap-2 text-sm cursor-pointer">
                        <Checkbox checked={form.fontes.includes(f)} onCheckedChange={() => toggleArr('fontes', f)} />
                        {f}
                      </label>
                    ))}
                  </div>
                  <div className="mt-3">
                    <Label>Outras fontes (separe por vírgula)</Label>
                    <Input placeholder="Ex.: Sympla, Reclame Aqui, associação XYZ..."
                      value={form.fontes_extras} onChange={(e) => setForm({ ...form, fontes_extras: e.target.value })} />
                  </div>
                </div>
              </div>
            </>
          )}

          {/* Etapa 4 — Quantidade / Critérios / Modo */}
          {step === 4 && (
            <>
              <h2 className="font-semibold">5. Quantidade, qualificação e modo</h2>
              <div className="space-y-4">
                <div>
                  <Label>Quantidade de prospects</Label>
                  <div className="flex items-center gap-3 mt-1">
                    <Input
                      type="number"
                      min={1}
                      value={form.quantidade}
                      disabled={form.ilimitado}
                      onChange={(e) => setForm({ ...form, quantidade: Number(e.target.value) })}
                      className="w-40"
                    />
                    <label className="flex items-center gap-2 text-sm cursor-pointer">
                      <Checkbox checked={form.ilimitado} onCheckedChange={(c) => setForm({ ...form, ilimitado: !!c })} />
                      Ilimitada (trazer o máximo possível)
                    </label>
                  </div>
                </div>
                <div>
                  <Label>Critérios de qualificação obrigatórios</Label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
                    {CRITERIOS.map((c) => (
                      <label key={c} className="flex items-center gap-2 text-sm cursor-pointer">
                        <Checkbox checked={form.criterios.includes(c)} onCheckedChange={() => toggleArr('criterios', c)} />
                        {c}
                      </label>
                    ))}
                  </div>
                </div>
                <div>
                  <Label>Como executar</Label>
                  <RadioGroup value={form.modo} onValueChange={(v: 'auto' | 'prompt') => setForm({ ...form, modo: v })} className="mt-2 space-y-2">
                    <label className="flex items-start gap-2 cursor-pointer p-3 border rounded-md hover:bg-accent">
                      <RadioGroupItem value="auto" />
                      <div className="flex-1">
                        <div className="font-medium text-sm">Automático (via IA)</div>
                        <div className="text-xs text-muted-foreground">
                          Pesquisa e salva os prospects sozinho usando o provedor selecionado abaixo.
                        </div>
                      </div>
                    </label>
                    <label className="flex items-start gap-2 cursor-pointer p-3 border rounded-md hover:bg-accent">
                      <RadioGroupItem value="prompt" />
                      <div>
                        <div className="font-medium text-sm">Gerar prompt para Claude Code / ChatGPT / Cursor</div>
                        <div className="text-xs text-muted-foreground">
                          Retorna o prompt pronto. Cole no cliente conectado ao MCP; ele salva os prospects automaticamente.
                        </div>
                      </div>
                    </label>
                  </RadioGroup>
                </div>
                {form.modo === 'auto' && (
                  <div>
                    <Label>Provedor de IA</Label>
                    <Select value={form.provider} onValueChange={(v: Provider) => setForm({ ...form, provider: v })}>
                      <SelectTrigger className="mt-2"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {(Object.keys(providers) as Provider[])
                          .filter((p) => providers[p])
                          .map((p) => (
                            <SelectItem key={p} value={p}>{PROVIDER_LABELS[p]}</SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground mt-1">
                      Só aparecem os provedores com chave configurada. Adicione mais em <em>Listas → Configurar IAs de Prospecção</em>.
                    </p>
                  </div>
                )}
              </div>
            </>
          )}

          <div className="flex justify-between pt-4 border-t">
            <Button variant="outline" onClick={() => setStep((s) => Math.max(0, s - 1))} disabled={step === 0 || loading}>
              <ArrowLeft className="h-4 w-4 mr-2" />Voltar
            </Button>
            {step < totalSteps - 1 ? (
              <Button onClick={() => setStep((s) => s + 1)} disabled={!canNext()}>
                Próximo <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            ) : (
              <Button onClick={executar} disabled={loading}>
                {loading ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Executando...</> : <><Wand2 className="h-4 w-4 mr-2" />Executar</>}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
