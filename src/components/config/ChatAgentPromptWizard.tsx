import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Sparkles, Loader2, ChevronRight, ChevronLeft, Copy, Plus, Trash2, Eye, Wand2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface ChatAgentCardData {
  papel: string;
  missao: string;
  tom_de_voz: string;
  capacidades: string[];
  restricoes: string[];
  protocolo_raciocinio: string[];
  padroes_qualidade: string[];
  anti_padroes: string[];
  tratamento_erros: string;
  instrucoes_extras: string;
}

const emptyCard: ChatAgentCardData = {
  papel: '',
  missao: '',
  tom_de_voz: '',
  capacidades: [''],
  restricoes: [''],
  protocolo_raciocinio: [''],
  padroes_qualidade: [''],
  anti_padroes: [''],
  tratamento_erros: '',
  instrucoes_extras: '',
};

// Known section headers for parsing
const KNOWN_HEADERS = [
  'PAPEL', 'MISSÃO', 'TOM DE VOZ', 'CAPACIDADES',
  'RESTRIÇÕES', 'PROTOCOLO DE RACIOCÍNIO', 'PADRÕES DE QUALIDADE',
  'ANTI-PADRÕES', 'TRATAMENTO DE ERROS', 'INSTRUÇÕES ADICIONAIS', 'CONTEXTO DISPONÍVEL'
];

const HEADER_REGEX = new RegExp(`^(${KNOWN_HEADERS.map(h => h.replace(/[()]/g, '\\$&')).join('|')})`, 'i');

function extractFreeText(prompt: string): string {
  if (!prompt) return '';
  const lines = prompt.split('\n');
  const freeLines: string[] = [];
  let insideKnownSection = false;

  for (const line of lines) {
    const trimmed = line.trim();
    if (HEADER_REGEX.test(trimmed.replace(/[:(].*/, '').trim())) {
      insideKnownSection = true;
      continue;
    }
    if (insideKnownSection) {
      // Content belongs to a known section — skip
      // Detect end of section (empty line followed by non-bullet/numbered line)
      if (trimmed === '') {
        insideKnownSection = false;
      }
      continue;
    }
    // Not inside a known section — this is free text
    if (trimmed !== '') {
      freeLines.push(line);
    }
  }
  return freeLines.join('\n').trim();
}

export function cardDataToPrompt(card: ChatAgentCardData, freeText?: string): string {
  const sections: string[] = [];

  if (card.papel) sections.push(`PAPEL:\n${card.papel}`);
  if (card.missao) sections.push(`MISSÃO:\n${card.missao}`);
  if (card.tom_de_voz) sections.push(`TOM DE VOZ:\n${card.tom_de_voz}`);

  const caps = card.capacidades.filter(Boolean);
  if (caps.length) sections.push(`CAPACIDADES:\n${caps.map(c => `• ${c}`).join('\n')}`);

  const rests = card.restricoes.filter(Boolean);
  if (rests.length) sections.push(`RESTRIÇÕES (o que você NÃO deve fazer):\n${rests.map(r => `• ${r}`).join('\n')}`);

  const protocol = card.protocolo_raciocinio.filter(Boolean);
  if (protocol.length) sections.push(`PROTOCOLO DE RACIOCÍNIO (siga estes passos na ordem):\n${protocol.map((p, i) => `${i + 1}. ${p}`).join('\n')}`);

  const quality = card.padroes_qualidade.filter(Boolean);
  if (quality.length) sections.push(`PADRÕES DE QUALIDADE:\n${quality.map(q => `• ${q}`).join('\n')}`);

  const anti = card.anti_padroes.filter(Boolean);
  if (anti.length) sections.push(`ANTI-PADRÕES (comportamentos proibidos):\n${anti.map(a => `• ${a}`).join('\n')}`);

  if (card.tratamento_erros) sections.push(`TRATAMENTO DE ERROS:\n${card.tratamento_erros}`);
  if (card.instrucoes_extras) sections.push(`INSTRUÇÕES ADICIONAIS:\n${card.instrucoes_extras}`);

  // Preserve free text typed directly
  if (freeText?.trim()) {
    sections.push(freeText.trim());
  }

  sections.push(`\nCONTEXTO DISPONÍVEL:\n• Use {{historico_chat}} para acessar o histórico da conversa\n• Use {{mensagem_cliente}} para a última mensagem do cliente`);

  return sections.join('\n\n');
}

export function promptToCardData(prompt: string): ChatAgentCardData {
  const card = { ...emptyCard };
  
  const extractSection = (label: string): string => {
    const regex = new RegExp(`${label}[^:]*:?\\n([\\s\\S]*?)(?=\\n(?:PAPEL|MISSÃO|TOM DE VOZ|CAPACIDADES|RESTRIÇÕES|PROTOCOLO|PADRÕES|ANTI-PADRÕES|TRATAMENTO|INSTRUÇÕES|CONTEXTO)|$)`, 'i');
    const match = prompt.match(regex);
    return match ? match[1].trim() : '';
  };

  const extractList = (label: string): string[] => {
    const text = extractSection(label);
    if (!text) return [''];
    const items = text.split('\n').map(l => l.replace(/^[•\-\d.]+\s*/, '').trim()).filter(Boolean);
    return items.length ? items : [''];
  };

  card.papel = extractSection('PAPEL');
  card.missao = extractSection('MISSÃO');
  card.tom_de_voz = extractSection('TOM DE VOZ');
  card.capacidades = extractList('CAPACIDADES');
  card.restricoes = extractList('RESTRIÇÕES');
  card.protocolo_raciocinio = extractList('PROTOCOLO DE RACIOCÍNIO');
  card.padroes_qualidade = extractList('PADRÕES DE QUALIDADE');
  card.anti_padroes = extractList('ANTI-PADRÕES');
  card.tratamento_erros = extractSection('TRATAMENTO DE ERROS');
  card.instrucoes_extras = extractSection('INSTRUÇÕES ADICIONAIS');

  return card;
}

// ── Editable List Component ──
function EditableList({ items, onChange, placeholder, ordered = false }: {
  items: string[];
  onChange: (items: string[]) => void;
  placeholder?: string;
  ordered?: boolean;
}) {
  const update = (i: number, v: string) => { const n = [...items]; n[i] = v; onChange(n); };
  const remove = (i: number) => onChange(items.filter((_, idx) => idx !== i));
  const add = () => onChange([...items, '']);

  return (
    <div className="space-y-1">
      {items.map((item, i) => (
        <div key={i} className="flex items-center gap-1">
          {ordered && <span className="text-[10px] text-muted-foreground w-4 shrink-0">{i + 1}.</span>}
          <Input
            value={item}
            onChange={e => update(i, e.target.value)}
            className="text-xs h-7"
            placeholder={placeholder}
          />
          {items.length > 1 && (
            <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={() => remove(i)}>
              <Trash2 className="h-3 w-3 text-destructive" />
            </Button>
          )}
        </div>
      ))}
      <Button variant="outline" size="sm" className="h-6 text-[10px]" onClick={add}>
        <Plus className="h-3 w-3 mr-1" /> Adicionar
      </Button>
    </div>
  );
}

function FieldSection({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) {
  return (
    <div className="space-y-1">
      <Label className="text-xs font-semibold uppercase tracking-wide">{label}</Label>
      {hint && <p className="text-[10px] text-muted-foreground">{hint}</p>}
      {children}
    </div>
  );
}

const STEPS = [
  { id: 'ai', title: '✨ IA', subtitle: 'Gerar com IA' },
  { id: 'identidade', title: '🎯 Identidade', subtitle: 'Papel e Missão' },
  { id: 'comportamento', title: '💬 Comportamento', subtitle: 'Tom e Capacidades' },
  { id: 'regras', title: '🛡️ Regras', subtitle: 'Restrições e Qualidade' },
  { id: 'preview', title: '👁️ Preview', subtitle: 'Prompt Final' },
];

interface Props {
  value: string; // current system_prompt
  onChange: (prompt: string) => void;
  agentName?: string;
  knowledgeBaseType?: string;
  knowledgeBaseSummary?: string; // resumo textual da KB (textos internos, nomes de arquivos, etc.)
  onScopeChange?: (escopo: string) => void; // chamado quando IA gera o escopo do agente
}

export function ChatAgentPromptWizard({ value, onChange, agentName, knowledgeBaseType, knowledgeBaseSummary, onScopeChange }: Props) {
  const [step, setStep] = useState(0);
  const [cardData, setCardData] = useState<ChatAgentCardData>(() => {
    if (value?.trim()) return promptToCardData(value);
    return { ...emptyCard };
  });
  const [aiDescription, setAiDescription] = useState('');
  const [generating, setGenerating] = useState(false);

  const [freeText, setFreeText] = useState<string>(() => {
    if (value?.trim()) return extractFreeText(value);
    return '';
  });

  const updateField = (field: keyof ChatAgentCardData, val: any) => {
    const updated = { ...cardData, [field]: val };
    setCardData(updated);
    onChange(cardDataToPrompt(updated, freeText));
  };

  const generatedPrompt = cardDataToPrompt(cardData, freeText);

  // When preview textarea is edited directly, sync back
  const handleDirectPromptEdit = (newPrompt: string) => {
    const newCard = promptToCardData(newPrompt);
    const newFree = extractFreeText(newPrompt);
    setCardData(newCard);
    setFreeText(newFree);
    onChange(newPrompt);
  };

  const handleGenerateWithAI = async () => {
    if (!aiDescription.trim()) {
      toast.error('Descreva o que o agente deve fazer');
      return;
    }

    setGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-chat-agent-prompt', {
        body: {
          description: aiDescription,
          agent_name: agentName || 'Agente',
        },
      });

      if (error) throw error;
      if (data?.error) { toast.error(data.error); return; }

      const newCard: ChatAgentCardData = {
        papel: data.papel || '',
        missao: data.missao || '',
        tom_de_voz: data.tom_de_voz || '',
        capacidades: data.capacidades?.length ? data.capacidades : [''],
        restricoes: data.restricoes?.length ? data.restricoes : [''],
        protocolo_raciocinio: data.protocolo_raciocinio?.length ? data.protocolo_raciocinio : [''],
        padroes_qualidade: data.padroes_qualidade?.length ? data.padroes_qualidade : [''],
        anti_padroes: data.anti_padroes?.length ? data.anti_padroes : [''],
        tratamento_erros: data.tratamento_erros || '',
        instrucoes_extras: data.instrucoes_extras || '',
      };

      setCardData(newCard);
      setFreeText('');
      onChange(cardDataToPrompt(newCard, ''));
      if (data?.escopo_agente && onScopeChange) {
        onScopeChange(data.escopo_agente);
      }
      toast.success('✨ Prompt gerado com IA! Revise cada etapa antes de salvar.');
      setStep(1); // Go to identity step to review
    } catch (err: any) {
      toast.error(`Erro ao gerar: ${err.message || 'Erro desconhecido'}`);
    } finally {
      setGenerating(false);
    }
  };

  const handleGenerateFromKB = async () => {
    if (!knowledgeBaseSummary?.trim()) {
      toast.error('Base de conhecimento vazia');
      return;
    }

    setGenerating(true);
    try {
      const kbPreview = knowledgeBaseSummary.substring(0, 3000);
      const description = `Crie um prompt para um agente especialista chamado "${agentName || 'Agente'}". 
Este agente possui uma base de conhecimento anexada com o seguinte conteúdo (resumo):

---
${kbPreview}
---

O agente deve:
- Ser um especialista no conteúdo acima
- Responder APENAS com base nos dados da base de conhecimento
- Recusar educadamente perguntas fora do escopo
- Ser técnico e preciso nas informações`;

      const { data, error } = await supabase.functions.invoke('generate-chat-agent-prompt', {
        body: {
          description,
          agent_name: agentName || 'Agente',
        },
      });

      if (error) throw error;
      if (data?.error) { toast.error(data.error); return; }

      const newCard: ChatAgentCardData = {
        papel: data.papel || '',
        missao: data.missao || '',
        tom_de_voz: data.tom_de_voz || '',
        capacidades: data.capacidades?.length ? data.capacidades : [''],
        restricoes: [
          ...(data.restricoes?.length ? data.restricoes : []),
          'Não responder perguntas que não possam ser respondidas com a base de conhecimento',
          'Não inventar informações que não estejam nos dados disponíveis',
        ],
        protocolo_raciocinio: data.protocolo_raciocinio?.length ? data.protocolo_raciocinio : [''],
        padroes_qualidade: data.padroes_qualidade?.length ? data.padroes_qualidade : [''],
        anti_padroes: [
          ...(data.anti_padroes?.length ? data.anti_padroes : []),
          'Inventar dados, especificações ou informações não presentes na base de conhecimento',
        ],
        tratamento_erros: data.tratamento_erros || 'Se a informação não estiver na base de conhecimento, informe educadamente que não possui essa informação e sugira o que pode ajudar.',
        instrucoes_extras: data.instrucoes_extras || '',
      };

      setCardData(newCard);
      setFreeText('');
      onChange(cardDataToPrompt(newCard, ''));
      if (data?.escopo_agente && onScopeChange) {
        onScopeChange(data.escopo_agente);
      }
      toast.success('✨ Prompt gerado com base na KB! Revise antes de salvar.');
      setStep(1);
    } catch (err: any) {
      toast.error(`Erro ao gerar: ${err.message || 'Erro desconhecido'}`);
    } finally {
      setGenerating(false);
    }
  };

  const copyPrompt = () => {
    navigator.clipboard.writeText(generatedPrompt);
    toast.success('Prompt copiado!');
  };

  return (
    <div className="space-y-4">
      {/* Step Navigation */}
      <div className="flex items-center gap-1 overflow-x-auto pb-1">
        {STEPS.map((s, i) => (
          <button
            key={s.id}
            onClick={() => setStep(i)}
            className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              step === i
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground hover:text-foreground hover:bg-muted/80'
            }`}
          >
            <span>{s.title}</span>
          </button>
        ))}
      </div>

      {/* Step Content */}
      <div>
        {/* Step 0: AI Generation */}
        {step === 0 && (
          <div className="space-y-4">
            <div className="rounded-xl border-2 border-dashed border-primary/30 bg-primary/5 p-4 space-y-3">
              <div className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary" />
                <Label className="text-sm font-semibold text-primary">Gerar Prompt com IA</Label>
                <Badge variant="secondary" className="text-[10px]">Recomendado</Badge>
              </div>
              <p className="text-xs text-muted-foreground">
                Descreva em linguagem natural o que o agente deve fazer. A IA preencherá todos os campos automaticamente — depois é só revisar.
              </p>
              <Textarea
                value={aiDescription}
                onChange={e => setAiDescription(e.target.value)}
                placeholder={`Ex: Um agente consultor de estoque que ajuda atendentes a encontrar produtos disponíveis, verificar preços e sugerir alternativas quando um item está em falta. Deve responder de forma rápida e objetiva, sempre mencionando código e preço do produto.`}
                rows={4}
                className="text-sm"
              />
              <Button
                onClick={handleGenerateWithAI}
                disabled={generating || !aiDescription.trim()}
                className="gap-2 w-full"
              >
                {generating ? (
                  <><Loader2 className="h-4 w-4 animate-spin" /> Gerando prompt profissional...</>
                ) : (
                  <><Sparkles className="h-4 w-4" /> Gerar Prompt com IA</>
                )}
              </Button>
            </div>

            {/* Generate from Knowledge Base */}
            {knowledgeBaseType && knowledgeBaseType !== 'nenhuma' && knowledgeBaseType !== 'terceiros' && (
              <div className="rounded-xl border-2 border-dashed border-amber-500/30 bg-amber-500/5 p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <Wand2 className="h-5 w-5 text-amber-600" />
                  <Label className="text-sm font-semibold text-amber-700 dark:text-amber-400">Gerar a partir da Base de Conhecimento</Label>
                  <Badge variant="outline" className="text-[10px] border-amber-500/50 text-amber-600">Auto</Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  Gera automaticamente um prompt otimizado com base nos dados da sua base de conhecimento ({knowledgeBaseType === 'interna' ? 'textos internos' : 'arquivos anexados'}). O agente será configurado como especialista no conteúdo da KB.
                </p>
                <Button
                  variant="outline"
                  onClick={handleGenerateFromKB}
                  disabled={generating || !knowledgeBaseSummary?.trim()}
                  className="gap-2 w-full border-amber-500/50 text-amber-700 dark:text-amber-400 hover:bg-amber-500/10"
                >
                  {generating ? (
                    <><Loader2 className="h-4 w-4 animate-spin" /> Analisando base de conhecimento...</>
                  ) : (
                    <><Wand2 className="h-4 w-4" /> Gerar Prompt da Base de Conhecimento</>
                  )}
                </Button>
                {!knowledgeBaseSummary?.trim() && (
                  <p className="text-[10px] text-amber-600">⚠️ Adicione conteúdo à base de conhecimento na aba "Conhecimento" primeiro.</p>
                )}
              </div>
            )}

            <div className="text-center">
              <p className="text-xs text-muted-foreground mb-2">Ou preencha manualmente:</p>
              <Button variant="outline" size="sm" onClick={() => setStep(1)}>
                <ChevronRight className="h-4 w-4 mr-1" /> Começar Manualmente
              </Button>
            </div>
          </div>
        )}

        {/* Step 1: Identity */}
        {step === 1 && (
          <div className="space-y-4">
            <FieldSection label="Papel" hint="Quem é esse agente? Qual sua especialidade? (Ex: Especialista em vendas de peças automotivas)">
              <Textarea
                value={cardData.papel}
                onChange={e => updateField('papel', e.target.value)}
                rows={2}
                className="text-sm"
                placeholder="Ex: Consultor de vendas especializado no catálogo de produtos da empresa, com foco em identificar necessidades do cliente e sugerir produtos adequados."
              />
            </FieldSection>

            <FieldSection label="Missão" hint="Qual o objetivo principal desse agente? O que ele deve alcançar?">
              <Textarea
                value={cardData.missao}
                onChange={e => updateField('missao', e.target.value)}
                rows={2}
                className="text-sm"
                placeholder="Ex: Ajudar o atendente a fechar vendas mais rapidamente, fornecendo informações precisas sobre produtos, estoque e preços."
              />
            </FieldSection>

            <FieldSection label="Tom de Voz" hint="Como o agente deve se comunicar? (Ex: Formal, amigável, técnico, descontraído)">
              <Textarea
                value={cardData.tom_de_voz}
                onChange={e => updateField('tom_de_voz', e.target.value)}
                rows={2}
                className="text-sm"
                placeholder="Ex: Profissional e objetivo, com linguagem clara e sem jargões técnicos. Use frases curtas e diretas."
              />
            </FieldSection>
          </div>
        )}

        {/* Step 2: Behavior */}
        {step === 2 && (
          <div className="space-y-4">
            <FieldSection label="Capacidades" hint="O que o agente sabe fazer? Liste cada habilidade específica.">
              <EditableList
                items={cardData.capacidades}
                onChange={v => updateField('capacidades', v)}
                placeholder="Ex: Buscar produtos por nome, código ou categoria"
              />
            </FieldSection>

            <Separator />

            <FieldSection label="Protocolo de Raciocínio" hint="Passos que o agente deve seguir ao receber uma pergunta (na ordem).">
              <EditableList
                items={cardData.protocolo_raciocinio}
                onChange={v => updateField('protocolo_raciocinio', v)}
                placeholder="Ex: Analisar a necessidade do cliente"
                ordered
              />
            </FieldSection>
          </div>
        )}

        {/* Step 3: Rules */}
        {step === 3 && (
          <div className="space-y-4">
            <FieldSection label="Restrições" hint="O que o agente NÃO deve fazer sob nenhuma circunstância.">
              <EditableList
                items={cardData.restricoes}
                onChange={v => updateField('restricoes', v)}
                placeholder="Ex: Não inventar produtos que não existem no estoque"
              />
            </FieldSection>

            <Separator />

            <FieldSection label="Padrões de Qualidade" hint="Critérios que definem uma resposta de qualidade.">
              <EditableList
                items={cardData.padroes_qualidade}
                onChange={v => updateField('padroes_qualidade', v)}
                placeholder="Ex: Sempre incluir código e preço do produto"
              />
            </FieldSection>

            <Separator />

            <FieldSection label="Anti-Padrões" hint="Comportamentos que devem ser evitados a todo custo.">
              <EditableList
                items={cardData.anti_padroes}
                onChange={v => updateField('anti_padroes', v)}
                placeholder="Ex: Respostas genéricas sem dados específicos"
              />
            </FieldSection>

            <Separator />

            <FieldSection label="Tratamento de Erros" hint="Como o agente deve reagir quando não tem informação suficiente.">
              <Textarea
                value={cardData.tratamento_erros}
                onChange={e => updateField('tratamento_erros', e.target.value)}
                rows={2}
                className="text-sm"
                placeholder="Ex: Se não encontrar o produto, informar que não foi localizado e sugerir alternativas similares."
              />
            </FieldSection>

            <Separator />

            <FieldSection label="Instruções Extras" hint="Qualquer instrução adicional que não se encaixe nas categorias acima.">
              <Textarea
                value={cardData.instrucoes_extras}
                onChange={e => updateField('instrucoes_extras', e.target.value)}
                rows={2}
                className="text-sm"
                placeholder="Ex: Quando o cliente pedir desconto, consulte as regras de desconto antes de responder."
              />
            </FieldSection>
          </div>
        )}

        {/* Step 4: Preview */}
        {step === 4 && (
          <div className="space-y-3">
            <FieldSection label="Prompt do Sistema (Gerado)" hint="Este prompt é gerado automaticamente a partir dos campos preenchidos. Você pode editá-lo diretamente se preferir.">
              <Textarea
                value={generatedPrompt}
                onChange={e => handleDirectPromptEdit(e.target.value)}
                rows={16}
                className="text-xs font-mono"
              />
            </FieldSection>
            <Button variant="outline" size="sm" onClick={copyPrompt} className="gap-1">
              <Copy className="h-3 w-3" /> Copiar Prompt
            </Button>
          </div>
        )}
      </div>

      {/* Navigation Buttons */}
      <div className="flex justify-between pt-2 border-t">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setStep(Math.max(0, step - 1))}
          disabled={step === 0}
        >
          <ChevronLeft className="h-4 w-4 mr-1" /> Anterior
        </Button>
        <div className="flex items-center gap-1">
          {STEPS.map((_, i) => (
            <div
              key={i}
              className={`h-1.5 rounded-full transition-all ${
                i === step ? 'w-6 bg-primary' : 'w-1.5 bg-muted-foreground/30'
              }`}
            />
          ))}
        </div>
        <Button
          variant={step === STEPS.length - 1 ? 'outline' : 'default'}
          size="sm"
          onClick={() => setStep(Math.min(STEPS.length - 1, step + 1))}
          disabled={step === STEPS.length - 1}
        >
          Próximo <ChevronRight className="h-4 w-4 ml-1" />
        </Button>
      </div>
    </div>
  );
}
