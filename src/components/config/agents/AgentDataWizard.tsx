import { useState, useEffect } from 'react';
import { AGENT_DATA_REQUIREMENTS, SYSTEM_TABLES, AgentDataField } from '@/constants/agentDataRequirements';
import { useAgentDataBindings, DataBinding } from '@/hooks/useAgentDataBindings';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';
import { ChevronLeft, ChevronRight, Check, Database, FileText, Globe, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';

interface Props {
  estabelecimentoId: string;
  onClose: () => void;
}

interface ApiEndpoint {
  id: string;
  name: string;
  endpoint_path: string;
}

export default function AgentDataWizard({ estabelecimentoId, onClose }: Props) {
  const { bindings, loading, upsertBinding, getBindingsForAgent, getProgressForAgent } = useAgentDataBindings(estabelecimentoId);
  const [currentAgentIdx, setCurrentAgentIdx] = useState(0);
  const [currentFieldIdx, setCurrentFieldIdx] = useState(0);
  const [viewMode, setViewMode] = useState<'overview' | 'wizard'>('overview');
  const [apiEndpoints, setApiEndpoints] = useState<ApiEndpoint[]>([]);
  const [saving, setSaving] = useState(false);

  // Local form state
  const [fonteTipo, setFonteTipo] = useState<'manual' | 'sistema' | 'api'>('manual');
  const [valorManual, setValorManual] = useState('');
  const [tabelaSistema, setTabelaSistema] = useState('');
  const [colunaSistema, setColunaSistema] = useState('');
  const [apiEndpointId, setApiEndpointId] = useState('');
  const [campoApi, setCampoApi] = useState('');

  useEffect(() => {
    supabase.from('api_endpoints').select('id, name, endpoint_path').eq('estabelecimento_id', estabelecimentoId).then(({ data }) => {
      if (data) setApiEndpoints(data);
    });
  }, [estabelecimentoId]);

  const currentAgent = AGENT_DATA_REQUIREMENTS[currentAgentIdx];
  const currentField = currentAgent?.campos[currentFieldIdx];

  // Load existing binding when field changes
  useEffect(() => {
    if (!currentAgent || !currentField) return;
    const existing = bindings.find(b => b.agent_template_key === currentAgent.template_key && b.campo === currentField.campo);
    if (existing) {
      setFonteTipo(existing.fonte_tipo as any);
      setValorManual(existing.valor_manual || '');
      setTabelaSistema(existing.tabela_sistema || '');
      setColunaSistema(existing.coluna_sistema || '');
      setApiEndpointId(existing.api_endpoint_id || '');
      setCampoApi(existing.campo_api || '');
    } else {
      setFonteTipo('manual');
      setValorManual('');
      setTabelaSistema(currentField.tabelas_sistema_sugeridas?.[0] || '');
      setColunaSistema('');
      setApiEndpointId('');
      setCampoApi('');
    }
  }, [currentAgentIdx, currentFieldIdx, bindings, currentAgent, currentField]);

  const isFieldConfigured = () => {
    if (fonteTipo === 'manual') return valorManual.trim().length > 0;
    if (fonteTipo === 'sistema') return tabelaSistema.length > 0;
    if (fonteTipo === 'api') return apiEndpointId.length > 0 && campoApi.trim().length > 0;
    return false;
  };

  const handleSave = async () => {
    if (!currentAgent || !currentField) return;
    setSaving(true);
    await upsertBinding({
      estabelecimento_id: estabelecimentoId,
      agent_template_key: currentAgent.template_key,
      campo: currentField.campo,
      label: currentField.label,
      descricao: currentField.descricao,
      fonte_tipo: fonteTipo,
      valor_manual: fonteTipo === 'manual' ? valorManual : undefined,
      tabela_sistema: fonteTipo === 'sistema' ? tabelaSistema : undefined,
      coluna_sistema: fonteTipo === 'sistema' ? colunaSistema : undefined,
      api_endpoint_id: fonteTipo === 'api' ? apiEndpointId : undefined,
      campo_api: fonteTipo === 'api' ? campoApi : undefined,
      configurado: isFieldConfigured(),
    });
    setSaving(false);
    toast.success(`"${currentField.label}" salvo!`);
  };

  const handleNext = async () => {
    await handleSave();
    if (currentFieldIdx < currentAgent.campos.length - 1) {
      setCurrentFieldIdx(f => f + 1);
    } else if (currentAgentIdx < AGENT_DATA_REQUIREMENTS.length - 1) {
      setCurrentAgentIdx(a => a + 1);
      setCurrentFieldIdx(0);
    } else {
      toast.success('Todos os agentes foram configurados!');
      setViewMode('overview');
    }
  };

  const handlePrev = () => {
    if (currentFieldIdx > 0) {
      setCurrentFieldIdx(f => f - 1);
    } else if (currentAgentIdx > 0) {
      setCurrentAgentIdx(a => a - 1);
      const prevAgent = AGENT_DATA_REQUIREMENTS[currentAgentIdx - 1];
      setCurrentFieldIdx(prevAgent.campos.length - 1);
    }
  };

  const startWizardForAgent = (idx: number) => {
    setCurrentAgentIdx(idx);
    setCurrentFieldIdx(0);
    setViewMode('wizard');
  };

  const selectedTable = SYSTEM_TABLES.find(t => t.value === tabelaSistema);

  if (loading) return <div className="flex items-center justify-center p-8"><Loader2 className="h-6 w-6 animate-spin" /></div>;

  // OVERVIEW MODE
  if (viewMode === 'overview') {
    return (
      <div className="space-y-4">
        <div className="text-center space-y-1">
          <h2 className="text-xl font-bold">Wizard de Dados dos Agentes</h2>
          <p className="text-sm text-muted-foreground">Configure de onde cada agente obtém seus dados. Vincule a fontes manuais, do sistema ou via API externa.</p>
        </div>

        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {AGENT_DATA_REQUIREMENTS.map((agent, idx) => {
            const progress = getProgressForAgent(agent.template_key, agent.campos.length);
            const configuredCount = bindings.filter(b => b.agent_template_key === agent.template_key && b.configurado).length;
            return (
              <Card key={agent.template_key} className="cursor-pointer hover:ring-2 hover:ring-primary transition-all" onClick={() => startWizardForAgent(idx)}>
                <CardHeader className="pb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">{agent.icone}</span>
                    <div className="flex-1">
                      <CardTitle className="text-sm">{agent.nome}</CardTitle>
                      <CardDescription className="text-xs">{configuredCount}/{agent.campos.length} campos</CardDescription>
                    </div>
                    {progress === 100 ? (
                      <CheckCircle2 className="h-5 w-5 text-green-500" />
                    ) : progress > 0 ? (
                      <Badge variant="outline" className="text-xs">{progress}%</Badge>
                    ) : (
                      <AlertCircle className="h-5 w-5 text-muted-foreground" />
                    )}
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <Progress value={progress} className="h-1.5" />
                  <div className="flex flex-wrap gap-1 mt-2">
                    {agent.campos.map(c => {
                      const bound = bindings.find(b => b.agent_template_key === agent.template_key && b.campo === c.campo && b.configurado);
                      return (
                        <Badge key={c.campo} variant={bound ? 'default' : 'outline'} className="text-[10px]">
                          {bound ? (bound.fonte_tipo === 'sistema' ? '🗄️' : bound.fonte_tipo === 'api' ? '🌐' : '✏️') : '○'} {c.label}
                        </Badge>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>Fechar</Button>
          <Button onClick={() => startWizardForAgent(0)}>Configurar Todos</Button>
        </div>
      </div>
    );
  }

  // WIZARD MODE
  if (!currentAgent || !currentField) return null;

  const totalFields = AGENT_DATA_REQUIREMENTS.reduce((sum, a) => sum + a.campos.length, 0);
  const globalFieldIdx = AGENT_DATA_REQUIREMENTS.slice(0, currentAgentIdx).reduce((sum, a) => sum + a.campos.length, 0) + currentFieldIdx;
  const globalProgress = Math.round((globalFieldIdx / totalFields) * 100);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => setViewMode('overview')}>
          <ChevronLeft className="h-4 w-4 mr-1" /> Visão Geral
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="text-xl">{currentAgent.icone}</span>
            <span className="font-semibold text-sm">{currentAgent.nome}</span>
            <Badge variant="outline" className="text-xs">Campo {currentFieldIdx + 1}/{currentAgent.campos.length}</Badge>
          </div>
          <Progress value={globalProgress} className="h-1 mt-1" />
        </div>
      </div>

      {/* Current Field */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            {currentField.label}
            {currentField.obrigatorio && <Badge variant="destructive" className="text-[10px]">Obrigatório</Badge>}
          </CardTitle>
          <CardDescription>{currentField.descricao}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Source selector */}
          <div>
            <Label className="text-xs font-medium mb-2 block">Fonte dos dados</Label>
            <div className="grid grid-cols-3 gap-2">
              {(['manual', 'sistema', 'api'] as const).map(tipo => (
                <Card
                  key={tipo}
                  className={`cursor-pointer p-3 text-center transition-all ${fonteTipo === tipo ? 'ring-2 ring-primary bg-primary/5' : 'hover:bg-muted/50'}`}
                  onClick={() => setFonteTipo(tipo)}
                >
                  <div className="flex flex-col items-center gap-1">
                    {tipo === 'manual' ? <FileText className="h-5 w-5" /> : tipo === 'sistema' ? <Database className="h-5 w-5" /> : <Globe className="h-5 w-5" />}
                    <span className="text-xs font-medium">{tipo === 'manual' ? 'Manual' : tipo === 'sistema' ? 'Sistema' : 'API Externa'}</span>
                  </div>
                </Card>
              ))}
            </div>
          </div>

          <Separator />

          {/* Manual input */}
          {fonteTipo === 'manual' && (
            <div className="space-y-2">
              <Label className="text-xs">Insira as informações manualmente</Label>
              <Textarea
                value={valorManual}
                onChange={e => setValorManual(e.target.value)}
                placeholder={`Ex: ${currentField.descricao}`}
                rows={5}
              />
              <p className="text-[10px] text-muted-foreground">Você pode colar tabelas, listas, regras ou qualquer texto que o agente deve usar como base de conhecimento.</p>
            </div>
          )}

          {/* System table binding */}
          {fonteTipo === 'sistema' && (
            <div className="space-y-3">
              <div>
                <Label className="text-xs">Tabela do Sistema</Label>
                <Select value={tabelaSistema} onValueChange={setTabelaSistema}>
                  <SelectTrigger><SelectValue placeholder="Selecione a tabela" /></SelectTrigger>
                  <SelectContent>
                    {SYSTEM_TABLES.map(t => (
                      <SelectItem key={t.value} value={t.value}>
                        {t.label}
                        {currentField.tabelas_sistema_sugeridas?.includes(t.value) && ' ⭐'}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {currentField.tabelas_sistema_sugeridas && (
                  <p className="text-[10px] text-muted-foreground mt-1">⭐ Tabelas sugeridas para este campo</p>
                )}
              </div>
              {selectedTable && (
                <div>
                  <Label className="text-xs">Coluna Principal (opcional)</Label>
                  <Select value={colunaSistema} onValueChange={setColunaSistema}>
                    <SelectTrigger><SelectValue placeholder="Todas as colunas" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__all__">Todas as colunas</SelectItem>
                      {selectedTable.colunas.map(c => (
                        <SelectItem key={c} value={c}>{c}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
          )}

          {/* API endpoint binding */}
          {fonteTipo === 'api' && (
            <div className="space-y-3">
              <div>
                <Label className="text-xs">Endpoint de API</Label>
                {apiEndpoints.length === 0 ? (
                  <p className="text-sm text-muted-foreground p-3 border rounded-md bg-muted/30">
                    Nenhum endpoint de API cadastrado. Cadastre primeiro em Configurações → API.
                  </p>
                ) : (
                  <Select value={apiEndpointId} onValueChange={setApiEndpointId}>
                    <SelectTrigger><SelectValue placeholder="Selecione o endpoint" /></SelectTrigger>
                    <SelectContent>
                      {apiEndpoints.map(ep => (
                        <SelectItem key={ep.id} value={ep.id}>{ep.name} ({ep.endpoint_path})</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
              <div>
                <Label className="text-xs">Campo/Path na resposta da API</Label>
                <Input
                  value={campoApi}
                  onChange={e => setCampoApi(e.target.value)}
                  placeholder="Ex: data.produtos, response.items"
                />
                <p className="text-[10px] text-muted-foreground mt-1">Informe o caminho do campo no JSON de resposta da API</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Navigation */}
      <div className="flex items-center justify-between">
        <Button variant="outline" onClick={handlePrev} disabled={currentAgentIdx === 0 && currentFieldIdx === 0}>
          <ChevronLeft className="h-4 w-4 mr-1" /> Anterior
        </Button>
        <div className="flex gap-2">
          <Button variant="outline" onClick={async () => { await handleSave(); setViewMode('overview'); }}>
            Salvar e Sair
          </Button>
          <Button onClick={handleNext} disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : null}
            {currentAgentIdx === AGENT_DATA_REQUIREMENTS.length - 1 && currentFieldIdx === currentAgent.campos.length - 1
              ? <><Check className="h-4 w-4 mr-1" /> Concluir</>
              : <>Próximo <ChevronRight className="h-4 w-4 ml-1" /></>
            }
          </Button>
        </div>
      </div>
    </div>
  );
}
