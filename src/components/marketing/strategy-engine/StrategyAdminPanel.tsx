import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { AGENT_INFO, AGENT_ORDER } from './types';
import { AGENT_CARDS, AgentCard, agentCardToSystemPrompt } from './agent-cards';
import { Save, Loader2, RotateCcw, ChevronDown, ChevronRight, Plus, Trash2, Copy } from 'lucide-react';
import { toast } from 'sonner';

interface EditableAgentCard {
  id: string;
  name: string;
  version: string;
  role: string;
  mission: string;
  capabilities: string[];
  non_capabilities: string[];
  inputs: string[];
  context_dependencies: string[];
  reasoning_protocol: string[];
  output_schema: string; // stored as JSON string for editing
  quality_standards: string[];
  anti_patterns: string[];
  error_handling: string;
  handoff: string;
}

interface AgentConfig {
  card: EditableAgentCard;
  active: boolean;
  saved: boolean;
  dbId?: string;
}

function agentCardToEditable(card: AgentCard): EditableAgentCard {
  return {
    id: card.id,
    name: card.name,
    version: card.version,
    role: card.role,
    mission: card.mission,
    capabilities: [...card.capabilities],
    non_capabilities: [...card.non_capabilities],
    inputs: [...card.inputs],
    context_dependencies: [...card.context_dependencies],
    reasoning_protocol: [...card.reasoning_protocol],
    output_schema: JSON.stringify(card.output_schema, null, 2),
    quality_standards: [...card.quality_standards],
    anti_patterns: [...card.anti_patterns],
    error_handling: card.error_handling,
    handoff: card.handoff,
  };
}

function editableToSystemPrompt(editable: EditableAgentCard): string {
  let schema: Record<string, any>;
  try {
    schema = JSON.parse(editable.output_schema);
  } catch {
    schema = {};
  }

  const card: AgentCard = {
    ...editable,
    output_schema: schema,
  };
  return agentCardToSystemPrompt(card);
}

// ─── Editable List Component ────────────────────────────────────────────────
function EditableList({
  items,
  onChange,
  placeholder,
  ordered = false,
}: {
  items: string[];
  onChange: (items: string[]) => void;
  placeholder?: string;
  ordered?: boolean;
}) {
  const update = (index: number, value: string) => {
    const next = [...items];
    next[index] = value;
    onChange(next);
  };
  const remove = (index: number) => onChange(items.filter((_, i) => i !== index));
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
          <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={() => remove(i)}>
            <Trash2 className="h-3 w-3 text-destructive" />
          </Button>
        </div>
      ))}
      <Button variant="outline" size="sm" className="h-6 text-[10px]" onClick={add}>
        <Plus className="h-3 w-3 mr-1" /> Adicionar
      </Button>
    </div>
  );
}

// ─── Section wrapper ────────────────────────────────────────────────────────
function FieldSection({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) {
  return (
    <div className="space-y-1">
      <Label className="text-xs font-semibold uppercase tracking-wide">{label}</Label>
      {hint && <p className="text-[10px] text-muted-foreground">{hint}</p>}
      {children}
    </div>
  );
}

export function StrategyAdminPanel() {
  const [configs, setConfigs] = useState<Record<string, AgentConfig>>({});
  const [saving, setSaving] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [expandedAgent, setExpandedAgent] = useState<string | null>(null);

  useEffect(() => {
    const loadConfigs = async () => {
      const initial: Record<string, AgentConfig> = {};
      AGENT_ORDER.forEach(key => {
        const card = AGENT_CARDS[key];
        initial[key] = {
          card: card ? agentCardToEditable(card) : agentCardToEditable({ id: key, name: key, version: '1.0', role: '', mission: '', capabilities: [], non_capabilities: [], inputs: [], context_dependencies: [], reasoning_protocol: [], output_schema: {}, quality_standards: [], anti_patterns: [], error_handling: '', handoff: '' }),
          active: true,
          saved: true,
        };
      });

      const { data } = await supabase
        .from('strategy_agent_configs')
        .select('*')
        .order('created_at');

      if (data) {
        for (const row of data as any[]) {
          if (initial[row.agent_type]) {
            // If DB has a stored agent_card_json, restore it; otherwise keep default
            const storedCard = (row as any).agent_card_json;
            initial[row.agent_type] = {
              card: storedCard ? { ...initial[row.agent_type].card, ...storedCard } : initial[row.agent_type].card,
              active: row.is_active ?? true,
              saved: true,
              dbId: row.id,
            };
          }
        }
      }

      setConfigs(initial);
      setLoading(false);
    };
    loadConfigs();
  }, []);

  const updateCard = useCallback((agentKey: string, field: keyof EditableAgentCard, value: any) => {
    setConfigs(prev => ({
      ...prev,
      [agentKey]: {
        ...prev[agentKey],
        card: { ...prev[agentKey].card, [field]: value },
        saved: false,
      },
    }));
  }, []);

  const handleSave = async (agentKey: string) => {
    setSaving(agentKey);
    const config = configs[agentKey];
    const systemPrompt = editableToSystemPrompt(config.card);

    try {
      const payload: any = {
        system_prompt: systemPrompt,
        is_active: config.active,
        agent_card_json: config.card,
      };

      if (config.dbId) {
        await supabase
          .from('strategy_agent_configs')
          .update(payload)
          .eq('id', config.dbId);
      } else {
        const info = AGENT_INFO[agentKey];
        const { data } = await supabase
          .from('strategy_agent_configs')
          .insert({
            agent_type: agentKey,
            agent_name: info?.name || agentKey,
            ...payload,
          } as any)
          .select()
          .single();

        if (data) {
          setConfigs(prev => ({
            ...prev,
            [agentKey]: { ...prev[agentKey], dbId: (data as any).id },
          }));
        }
      }

      setConfigs(prev => ({ ...prev, [agentKey]: { ...prev[agentKey], saved: true } }));
      toast.success(`Agent Card "${config.card.name}" salvo com sucesso`);
    } catch (err: any) {
      toast.error(`Erro ao salvar: ${err.message}`);
    } finally {
      setSaving(null);
    }
  };

  const handleReset = (agentKey: string) => {
    const card = AGENT_CARDS[agentKey];
    if (!card) return;
    setConfigs(prev => ({
      ...prev,
      [agentKey]: {
        ...prev[agentKey],
        card: agentCardToEditable(card),
        active: true,
        saved: false,
      },
    }));
    toast.info('Agent Card restaurado ao padrão');
  };

  const copyPrompt = (agentKey: string) => {
    const config = configs[agentKey];
    if (!config) return;
    const prompt = editableToSystemPrompt(config.card);
    navigator.clipboard.writeText(prompt);
    toast.success('System prompt copiado!');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">🏗️ Agent Card Architecture v1.0</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Edite todos os campos de cada Agent Card. O system prompt é gerado automaticamente a partir dos campos.
          </p>
        </CardContent>
      </Card>

      <ScrollArea className="h-[650px] pr-2">
        <div className="space-y-2">
          {AGENT_ORDER.map((agentKey, index) => {
            const info = AGENT_INFO[agentKey];
            const config = configs[agentKey];
            if (!config) return null;
            const { card } = config;
            const isExpanded = expandedAgent === agentKey;

            return (
              <Card key={agentKey} className={!config.saved ? 'ring-1 ring-primary/50' : ''}>
                <Collapsible open={isExpanded} onOpenChange={() => setExpandedAgent(isExpanded ? null : agentKey)}>
                  <CardHeader className="pb-2">
                    <CollapsibleTrigger asChild>
                      <div className="flex items-center justify-between cursor-pointer group">
                        <div className="flex items-center gap-2">
                          {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                          <span className="text-lg">{info.icon}</span>
                          <CardTitle className="text-sm group-hover:underline">{card.name}</CardTitle>
                          <Badge variant="outline" className="text-[10px]">v{card.version}</Badge>
                          <Badge variant="outline" className="text-[10px]">#{index + 1}</Badge>
                          {!config.saved && <Badge className="text-[10px] bg-primary/20 text-primary">Modificado</Badge>}
                        </div>
                        <div className="flex items-center gap-3" onClick={e => e.stopPropagation()}>
                          <span className="text-xs text-muted-foreground">Ativo</span>
                          <Switch
                            checked={config.active}
                            onCheckedChange={v => setConfigs(prev => ({
                              ...prev,
                              [agentKey]: { ...prev[agentKey], active: v, saved: false },
                            }))}
                          />
                        </div>
                      </div>
                    </CollapsibleTrigger>
                    {!isExpanded && (
                      <p className="text-[11px] text-muted-foreground mt-1 ml-9 line-clamp-1">{card.mission}</p>
                    )}
                  </CardHeader>

                  <CollapsibleContent>
                    <CardContent className="pt-0 space-y-4">
                      <Tabs defaultValue="identity" className="w-full">
                        <TabsList className="w-full grid grid-cols-5 h-8">
                          <TabsTrigger value="identity" className="text-[10px]">Identidade</TabsTrigger>
                          <TabsTrigger value="contracts" className="text-[10px]">Contratos</TabsTrigger>
                          <TabsTrigger value="reasoning" className="text-[10px]">Raciocínio</TabsTrigger>
                          <TabsTrigger value="quality" className="text-[10px]">Qualidade</TabsTrigger>
                          <TabsTrigger value="prompt" className="text-[10px]">Prompt</TabsTrigger>
                        </TabsList>

                        {/* ─── IDENTITY TAB ─── */}
                        <TabsContent value="identity" className="space-y-3 mt-3">
                          <div className="grid grid-cols-3 gap-2">
                            <FieldSection label="ID">
                              <Input value={card.id} onChange={e => updateCard(agentKey, 'id', e.target.value)} className="text-xs h-8" />
                            </FieldSection>
                            <FieldSection label="Name">
                              <Input value={card.name} onChange={e => updateCard(agentKey, 'name', e.target.value)} className="text-xs h-8" />
                            </FieldSection>
                            <FieldSection label="Version">
                              <Input value={card.version} onChange={e => updateCard(agentKey, 'version', e.target.value)} className="text-xs h-8" />
                            </FieldSection>
                          </div>

                          <FieldSection label="Role" hint="Descrição clara do papel do agente no sistema">
                            <Textarea value={card.role} onChange={e => updateCard(agentKey, 'role', e.target.value)} rows={2} className="text-xs" />
                          </FieldSection>

                          <FieldSection label="Mission" hint="Resultado estratégico que o agente deve produzir">
                            <Textarea value={card.mission} onChange={e => updateCard(agentKey, 'mission', e.target.value)} rows={2} className="text-xs" />
                          </FieldSection>

                          <FieldSection label="Handoff" hint="Qual agente deve consumir o resultado gerado">
                            <Input value={card.handoff} onChange={e => updateCard(agentKey, 'handoff', e.target.value)} className="text-xs h-8" />
                          </FieldSection>
                        </TabsContent>

                        {/* ─── CONTRACTS TAB ─── */}
                        <TabsContent value="contracts" className="space-y-3 mt-3">
                          <FieldSection label="Capabilities" hint="Lista de tarefas que o agente é capaz de executar">
                            <EditableList items={card.capabilities} onChange={v => updateCard(agentKey, 'capabilities', v)} placeholder="Capacidade..." />
                          </FieldSection>

                          <Separator />

                          <FieldSection label="Non-Capabilities" hint="Lista explícita do que o agente NÃO deve fazer">
                            <EditableList items={card.non_capabilities} onChange={v => updateCard(agentKey, 'non_capabilities', v)} placeholder="Restrição..." />
                          </FieldSection>

                          <Separator />

                          <FieldSection label="Inputs" hint="Tipos de dados aceitos pelo agente">
                            <EditableList items={card.inputs} onChange={v => updateCard(agentKey, 'inputs', v)} placeholder="Tipo de dado..." />
                          </FieldSection>

                          <Separator />

                          <FieldSection label="Context Dependencies" hint="Dados da memória estratégica necessários">
                            <EditableList items={card.context_dependencies} onChange={v => updateCard(agentKey, 'context_dependencies', v)} placeholder="Dependência..." />
                          </FieldSection>

                          <Separator />

                          <FieldSection label="Output Schema" hint="JSON schema obrigatório para a saída do agente">
                            <Textarea
                              value={card.output_schema}
                              onChange={e => updateCard(agentKey, 'output_schema', e.target.value)}
                              rows={8}
                              className="text-xs font-mono"
                              placeholder='{ "campo": "tipo" }'
                            />
                          </FieldSection>
                        </TabsContent>

                        {/* ─── REASONING TAB ─── */}
                        <TabsContent value="reasoning" className="space-y-3 mt-3">
                          <FieldSection label="Reasoning Protocol" hint="Passos ordenados que o agente deve seguir ao executar">
                            <EditableList items={card.reasoning_protocol} onChange={v => updateCard(agentKey, 'reasoning_protocol', v)} placeholder="Passo..." ordered />
                          </FieldSection>

                          <Separator />

                          <FieldSection label="Error Handling" hint="Como o agente reage quando dados são insuficientes">
                            <Textarea value={card.error_handling} onChange={e => updateCard(agentKey, 'error_handling', e.target.value)} rows={2} className="text-xs" />
                          </FieldSection>
                        </TabsContent>

                        {/* ─── QUALITY TAB ─── */}
                        <TabsContent value="quality" className="space-y-3 mt-3">
                          <FieldSection label="Quality Standards" hint="Critérios que definem se o output é aceitável">
                            <EditableList items={card.quality_standards} onChange={v => updateCard(agentKey, 'quality_standards', v)} placeholder="Padrão de qualidade..." />
                          </FieldSection>

                          <Separator />

                          <FieldSection label="Anti-Patterns" hint="Comportamentos proibidos que devem ser evitados">
                            <EditableList items={card.anti_patterns} onChange={v => updateCard(agentKey, 'anti_patterns', v)} placeholder="Anti-pattern..." />
                          </FieldSection>
                        </TabsContent>

                        {/* ─── PROMPT PREVIEW TAB ─── */}
                        <TabsContent value="prompt" className="space-y-3 mt-3">
                          <FieldSection label="System Prompt Gerado" hint="Prompt gerado automaticamente a partir dos campos do Agent Card. Somente leitura.">
                            <Textarea
                              value={editableToSystemPrompt(card)}
                              readOnly
                              rows={15}
                              className="text-xs font-mono bg-muted/50"
                            />
                          </FieldSection>
                          <Button variant="outline" size="sm" onClick={() => copyPrompt(agentKey)}>
                            <Copy className="h-3 w-3 mr-1" /> Copiar Prompt
                          </Button>
                        </TabsContent>
                      </Tabs>

                      {/* ─── Actions ─── */}
                      <div className="flex justify-between items-center pt-2 border-t">
                        <Button variant="ghost" size="sm" onClick={() => handleReset(agentKey)}>
                          <RotateCcw className="h-3 w-3 mr-1" /> Resetar ao Padrão
                        </Button>
                        <Button size="sm" onClick={() => handleSave(agentKey)} disabled={config.saved || saving === agentKey}>
                          {saving === agentKey ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Save className="h-3 w-3 mr-1" />}
                          Salvar Agent Card
                        </Button>
                      </div>
                    </CardContent>
                  </CollapsibleContent>
                </Collapsible>
              </Card>
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );
}
