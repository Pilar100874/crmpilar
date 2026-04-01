import { useState, useEffect, useCallback } from 'react';
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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { 
  ChevronLeft, Check, Database, FileText, Globe, AlertCircle, CheckCircle2, 
  Loader2, Pencil, Link2, ArrowRight, Zap, Table2, Eye
} from 'lucide-react';

interface Props {
  estabelecimentoId: string;
  onClose: () => void;
}

interface ApiEndpoint {
  id: string;
  name: string;
  endpoint_path: string;
}

interface ApiTestResult {
  fields: string[];
  sampleData: Record<string, any>;
}

export default function AgentDataWizard({ estabelecimentoId, onClose }: Props) {
  const { bindings, loading, upsertBinding, getBindingsForAgent, getProgressForAgent } = useAgentDataBindings(estabelecimentoId);
  const [selectedAgent, setSelectedAgent] = useState<string | null>(null);
  const [apiEndpoints, setApiEndpoints] = useState<ApiEndpoint[]>([]);
  const [saving, setSaving] = useState<string | null>(null);

  // Inline editing
  const [editingField, setEditingField] = useState<string | null>(null);
  const [editFonteTipo, setEditFonteTipo] = useState<'manual' | 'sistema' | 'api'>('manual');
  const [editValorManual, setEditValorManual] = useState('');
  const [editTabelaSistema, setEditTabelaSistema] = useState('');
  const [editColunaSistema, setEditColunaSistema] = useState('');
  const [editApiEndpointId, setEditApiEndpointId] = useState('');
  const [editCampoApi, setEditCampoApi] = useState('');

  // API Mapping wizard
  const [apiMapOpen, setApiMapOpen] = useState(false);
  const [apiMapEndpointId, setApiMapEndpointId] = useState('');
  const [apiMapBasePath, setApiMapBasePath] = useState('');
  const [apiTestResult, setApiTestResult] = useState<ApiTestResult | null>(null);
  const [apiTesting, setApiTesting] = useState(false);
  const [apiFieldMappings, setApiFieldMappings] = useState<Record<string, string>>({});

  useEffect(() => {
    supabase.from('api_endpoints').select('id, name, endpoint_path').eq('estabelecimento_id', estabelecimentoId).then(({ data }) => {
      if (data) setApiEndpoints(data);
    });
  }, [estabelecimentoId]);

  const currentAgentDef = selectedAgent ? AGENT_DATA_REQUIREMENTS.find(a => a.template_key === selectedAgent) : null;

  const startEditing = (agentKey: string, field: AgentDataField) => {
    const key = `${agentKey}::${field.campo}`;
    const existing = bindings.find(b => b.agent_template_key === agentKey && b.campo === field.campo);
    if (existing) {
      setEditFonteTipo(existing.fonte_tipo as any);
      setEditValorManual(existing.valor_manual || '');
      setEditTabelaSistema(existing.tabela_sistema || '');
      setEditColunaSistema(existing.coluna_sistema || '');
      setEditApiEndpointId(existing.api_endpoint_id || '');
      setEditCampoApi(existing.campo_api || '');
    } else {
      setEditFonteTipo('manual');
      setEditValorManual('');
      setEditTabelaSistema(field.tabelas_sistema_sugeridas?.[0] || '');
      setEditColunaSistema('');
      setEditApiEndpointId('');
      setEditCampoApi('');
    }
    setEditingField(key);
  };

  const saveField = async (agentKey: string, field: AgentDataField) => {
    const key = `${agentKey}::${field.campo}`;
    setSaving(key);
    const configurado = editFonteTipo === 'manual' ? editValorManual.trim().length > 0
      : editFonteTipo === 'sistema' ? editTabelaSistema.length > 0
      : editApiEndpointId.length > 0 && editCampoApi.trim().length > 0;

    await upsertBinding({
      estabelecimento_id: estabelecimentoId,
      agent_template_key: agentKey,
      campo: field.campo,
      label: field.label,
      descricao: field.descricao,
      fonte_tipo: editFonteTipo,
      valor_manual: editFonteTipo === 'manual' ? editValorManual : undefined,
      tabela_sistema: editFonteTipo === 'sistema' ? editTabelaSistema : undefined,
      coluna_sistema: editFonteTipo === 'sistema' ? editColunaSistema : undefined,
      api_endpoint_id: editFonteTipo === 'api' ? editApiEndpointId : undefined,
      campo_api: editFonteTipo === 'api' ? editCampoApi : undefined,
      configurado,
    });
    setSaving(null);
    setEditingField(null);
    toast.success(`"${field.label}" salvo!`);
  };

  // API auto-mapping
  const handleApiTest = async () => {
    if (!apiMapEndpointId) return;
    setApiTesting(true);
    try {
      const ep = apiEndpoints.find(e => e.id === apiMapEndpointId);
      if (!ep) throw new Error('Endpoint não encontrado');

      const { data: epData } = await supabase.from('api_endpoints').select('*').eq('id', apiMapEndpointId).single();
      if (!epData) throw new Error('Endpoint não encontrado');

      // Try to call the API to discover fields
      const url = epData.custom_url || epData.endpoint_path;
      const response = await fetch(url, { method: epData.http_method || 'GET' });
      const json = await response.json();

      // Extract fields from response
      const extractFields = (obj: any, prefix = ''): string[] => {
        if (!obj || typeof obj !== 'object') return [];
        if (Array.isArray(obj)) {
          return obj.length > 0 ? extractFields(obj[0], prefix) : [];
        }
        const fields: string[] = [];
        for (const [k, v] of Object.entries(obj)) {
          const path = prefix ? `${prefix}.${k}` : k;
          fields.push(path);
          if (v && typeof v === 'object' && !Array.isArray(v)) {
            fields.push(...extractFields(v, path));
          }
        }
        return fields;
      };

      const basePath = apiMapBasePath;
      let targetObj = json;
      if (basePath) {
        for (const part of basePath.split('.')) {
          targetObj = targetObj?.[part];
        }
      }

      const fields = extractFields(targetObj);
      setApiTestResult({ fields, sampleData: targetObj });
    } catch (err: any) {
      toast.error('Erro ao testar API: ' + err.message);
      // Show manual field input instead
      setApiTestResult({ fields: [], sampleData: {} });
    }
    setApiTesting(false);
  };

  const applyApiMappings = async () => {
    if (!currentAgentDef || !apiMapEndpointId) return;
    setSaving('api-map');
    for (const field of currentAgentDef.campos) {
      const apiField = apiFieldMappings[field.campo];
      if (apiField) {
        await upsertBinding({
          estabelecimento_id: estabelecimentoId,
          agent_template_key: currentAgentDef.template_key,
          campo: field.campo,
          label: field.label,
          descricao: field.descricao,
          fonte_tipo: 'api',
          api_endpoint_id: apiMapEndpointId,
          campo_api: apiMapBasePath ? `${apiMapBasePath}.${apiField}` : apiField,
          configurado: true,
        });
      }
    }
    setSaving(null);
    setApiMapOpen(false);
    setApiFieldMappings({});
    setApiTestResult(null);
    toast.success('Mapeamento de API aplicado com sucesso!');
  };

  const selectedTable = SYSTEM_TABLES.find(t => t.value === editTabelaSistema);

  if (loading) return <div className="flex items-center justify-center p-8"><Loader2 className="h-6 w-6 animate-spin" /></div>;

  // AGENT TABLE VIEW
  if (selectedAgent && currentAgentDef) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => { setSelectedAgent(null); setEditingField(null); }}>
            <ChevronLeft className="h-4 w-4 mr-1" /> Voltar
          </Button>
          <span className="text-xl">{currentAgentDef.icone}</span>
          <div className="flex-1">
            <h3 className="font-semibold">{currentAgentDef.nome}</h3>
            <p className="text-xs text-muted-foreground">{currentAgentDef.campos.length} campos para configurar</p>
          </div>
          <Button variant="outline" size="sm" onClick={() => { setApiMapOpen(true); setApiFieldMappings({}); setApiTestResult(null); setApiMapEndpointId(''); setApiMapBasePath(''); }}>
            <Link2 className="h-4 w-4 mr-1" /> Mapear via API
          </Button>
        </div>

        {/* Data table */}
        <div className="border rounded-lg overflow-hidden">
          <div className="grid grid-cols-[200px_100px_1fr_100px_80px] bg-muted/50 px-3 py-2 text-xs font-semibold text-muted-foreground border-b">
            <span>Campo</span>
            <span>Fonte</span>
            <span>Valor / Mapeamento</span>
            <span>Status</span>
            <span>Ação</span>
          </div>
          <ScrollArea className="max-h-[500px]">
            {currentAgentDef.campos.map(field => {
              const key = `${currentAgentDef.template_key}::${field.campo}`;
              const binding = bindings.find(b => b.agent_template_key === currentAgentDef.template_key && b.campo === field.campo);
              const isEditing = editingField === key;
              const isSaving = saving === key;

              if (isEditing) {
                return (
                  <div key={field.campo} className="border-b bg-primary/5 p-3 space-y-3">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm">{field.label}</span>
                      {field.obrigatorio && <Badge variant="destructive" className="text-[10px]">Obrigatório</Badge>}
                    </div>
                    <p className="text-xs text-muted-foreground">{field.descricao}</p>

                    {/* Source selector */}
                    <div className="grid grid-cols-3 gap-2">
                      {(['manual', 'sistema', 'api'] as const).map(tipo => (
                        <div
                          key={tipo}
                          className={`cursor-pointer p-2 rounded-lg border text-center transition-all ${editFonteTipo === tipo ? 'ring-2 ring-primary bg-primary/10' : 'hover:bg-muted/50'}`}
                          onClick={() => setEditFonteTipo(tipo)}
                        >
                          <div className="flex items-center justify-center gap-1">
                            {tipo === 'manual' ? <FileText className="h-4 w-4" /> : tipo === 'sistema' ? <Database className="h-4 w-4" /> : <Globe className="h-4 w-4" />}
                            <span className="text-xs font-medium">{tipo === 'manual' ? 'Manual' : tipo === 'sistema' ? 'Sistema' : 'API'}</span>
                          </div>
                        </div>
                      ))}
                    </div>

                    {editFonteTipo === 'manual' && (
                      <Textarea
                        value={editValorManual}
                        onChange={e => setEditValorManual(e.target.value)}
                        placeholder={`Ex: ${field.descricao}`}
                        rows={4}
                        className="text-sm"
                      />
                    )}

                    {editFonteTipo === 'sistema' && (
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <Label className="text-xs">Tabela</Label>
                          <Select value={editTabelaSistema} onValueChange={setEditTabelaSistema}>
                            <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Selecione" /></SelectTrigger>
                            <SelectContent>
                              {SYSTEM_TABLES.map(t => (
                                <SelectItem key={t.value} value={t.value}>
                                  {t.label}{field.tabelas_sistema_sugeridas?.includes(t.value) ? ' ⭐' : ''}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label className="text-xs">Coluna</Label>
                          <Select value={editColunaSistema} onValueChange={setEditColunaSistema}>
                            <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Todas" /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="__all__">Todas</SelectItem>
                              {selectedTable?.colunas.map(c => (
                                <SelectItem key={c} value={c}>{c}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    )}

                    {editFonteTipo === 'api' && (
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <Label className="text-xs">Endpoint</Label>
                          {apiEndpoints.length === 0 ? (
                            <p className="text-xs text-muted-foreground p-2 border rounded bg-muted/30">Nenhum endpoint cadastrado</p>
                          ) : (
                            <Select value={editApiEndpointId} onValueChange={setEditApiEndpointId}>
                              <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Selecione" /></SelectTrigger>
                              <SelectContent>
                                {apiEndpoints.map(ep => (
                                  <SelectItem key={ep.id} value={ep.id}>{ep.name}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          )}
                        </div>
                        <div>
                          <Label className="text-xs">Campo na resposta</Label>
                          <Input
                            value={editCampoApi}
                            onChange={e => setEditCampoApi(e.target.value)}
                            placeholder="data.items"
                            className="h-8 text-xs"
                          />
                        </div>
                      </div>
                    )}

                    <div className="flex gap-2 justify-end">
                      <Button variant="ghost" size="sm" onClick={() => setEditingField(null)}>Cancelar</Button>
                      <Button size="sm" onClick={() => saveField(currentAgentDef.template_key, field)} disabled={isSaving}>
                        {isSaving ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Check className="h-3 w-3 mr-1" />}
                        Salvar
                      </Button>
                    </div>
                  </div>
                );
              }

              // Read-only row
              return (
                <div key={field.campo} className="grid grid-cols-[200px_100px_1fr_100px_80px] px-3 py-2.5 border-b items-center text-sm hover:bg-muted/30 transition-colors">
                  <div>
                    <span className="font-medium text-sm">{field.label}</span>
                    {field.obrigatorio && <span className="text-destructive ml-1">*</span>}
                  </div>
                  <div>
                    {binding ? (
                      <Badge variant="outline" className="text-[10px]">
                        {binding.fonte_tipo === 'manual' ? '✏️ Manual' : binding.fonte_tipo === 'sistema' ? '🗄️ Sistema' : '🌐 API'}
                      </Badge>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </div>
                  <div className="truncate text-xs text-muted-foreground">
                    {binding?.fonte_tipo === 'manual' && binding.valor_manual && (
                      <span title={binding.valor_manual}>{binding.valor_manual.substring(0, 80)}{binding.valor_manual.length > 80 ? '...' : ''}</span>
                    )}
                    {binding?.fonte_tipo === 'sistema' && (
                      <span>📊 {SYSTEM_TABLES.find(t => t.value === binding.tabela_sistema)?.label || binding.tabela_sistema}{binding.coluna_sistema && binding.coluna_sistema !== '__all__' ? ` → ${binding.coluna_sistema}` : ''}</span>
                    )}
                    {binding?.fonte_tipo === 'api' && (
                      <span>🔗 {apiEndpoints.find(e => e.id === binding.api_endpoint_id)?.name || 'API'} → {binding.campo_api}</span>
                    )}
                    {!binding && <span className="italic">Não configurado</span>}
                  </div>
                  <div>
                    {binding?.configurado ? (
                      <Badge className="text-[10px] bg-green-500/10 text-green-600 border-green-200">
                        <CheckCircle2 className="h-3 w-3 mr-1" /> OK
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-[10px] text-amber-600 border-amber-200">
                        <AlertCircle className="h-3 w-3 mr-1" /> Pendente
                      </Badge>
                    )}
                  </div>
                  <div>
                    <Button variant="ghost" size="sm" className="h-7 px-2" onClick={() => startEditing(currentAgentDef.template_key, field)}>
                      <Pencil className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </ScrollArea>
        </div>

        {/* API Mapping Dialog */}
        <Dialog open={apiMapOpen} onOpenChange={setApiMapOpen}>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2"><Zap className="h-5 w-5" /> Mapear campos via API</DialogTitle>
              <DialogDescription>Selecione um endpoint de API e mapeie os campos da resposta para os campos do agente.</DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              {/* Step 1: Select endpoint */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">1. Selecione o Endpoint</Label>
                {apiEndpoints.length === 0 ? (
                  <p className="text-sm text-muted-foreground p-3 border rounded bg-muted/30">Nenhum endpoint cadastrado. Cadastre em Configurações → API.</p>
                ) : (
                  <Select value={apiMapEndpointId} onValueChange={setApiMapEndpointId}>
                    <SelectTrigger><SelectValue placeholder="Selecione o endpoint" /></SelectTrigger>
                    <SelectContent>
                      {apiEndpoints.map(ep => (
                        <SelectItem key={ep.id} value={ep.id}>{ep.name} ({ep.endpoint_path})</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>

              {/* Step 2: Base path */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">2. Caminho base na resposta (opcional)</Label>
                <Input
                  value={apiMapBasePath}
                  onChange={e => setApiMapBasePath(e.target.value)}
                  placeholder="Ex: data, response.items[0]"
                />
                <p className="text-[10px] text-muted-foreground">Se os dados estão aninhados, informe o caminho. Ex: se a resposta é {"{ data: { products: [...] } }"}, use "data.products"</p>
              </div>

              {/* Step 3: Test */}
              <Button onClick={handleApiTest} disabled={!apiMapEndpointId || apiTesting} variant="outline" className="w-full">
                {apiTesting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Eye className="h-4 w-4 mr-2" />}
                Testar e Descobrir Campos
              </Button>

              {/* Step 4: Map fields */}
              {apiTestResult && (
                <div className="space-y-3">
                  <Separator />
                  <Label className="text-sm font-medium">3. Mapeie os campos</Label>
                  
                  {apiTestResult.fields.length > 0 ? (
                    <div className="border rounded-lg overflow-hidden">
                      <div className="grid grid-cols-[1fr_40px_1fr] bg-muted/50 px-3 py-2 text-xs font-semibold text-muted-foreground border-b">
                        <span>Campo do Agente</span>
                        <span></span>
                        <span>Campo da API</span>
                      </div>
                      {currentAgentDef?.campos.map(field => (
                        <div key={field.campo} className="grid grid-cols-[1fr_40px_1fr] px-3 py-2 border-b items-center">
                          <div>
                            <span className="text-sm font-medium">{field.label}</span>
                            <p className="text-[10px] text-muted-foreground">{field.descricao}</p>
                          </div>
                          <ArrowRight className="h-4 w-4 text-muted-foreground mx-auto" />
                          <Select 
                            value={apiFieldMappings[field.campo] || ''} 
                            onValueChange={v => setApiFieldMappings(prev => ({ ...prev, [field.campo]: v }))}
                          >
                            <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Selecione o campo" /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="__none__">— Não mapear —</SelectItem>
                              {apiTestResult.fields.map(f => (
                                <SelectItem key={f} value={f}>{f}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <p className="text-sm text-muted-foreground">Não foi possível detectar os campos automaticamente. Insira manualmente os caminhos dos campos:</p>
                      {currentAgentDef?.campos.map(field => (
                        <div key={field.campo} className="grid grid-cols-[1fr_1fr] gap-2 items-center">
                          <span className="text-sm">{field.label}</span>
                          <Input
                            value={apiFieldMappings[field.campo] || ''}
                            onChange={e => setApiFieldMappings(prev => ({ ...prev, [field.campo]: e.target.value }))}
                            placeholder="campo.da.api"
                            className="h-8 text-xs"
                          />
                        </div>
                      ))}
                    </div>
                  )}

                  <Button 
                    onClick={applyApiMappings} 
                    disabled={saving === 'api-map' || Object.values(apiFieldMappings).filter(v => v && v !== '__none__').length === 0}
                    className="w-full"
                  >
                    {saving === 'api-map' ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Check className="h-4 w-4 mr-2" />}
                    Aplicar Mapeamento ({Object.values(apiFieldMappings).filter(v => v && v !== '__none__').length} campos)
                  </Button>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  // OVERVIEW
  return (
    <div className="space-y-4">
      <div className="text-center space-y-1">
        <h2 className="text-xl font-bold flex items-center justify-center gap-2"><Table2 className="h-5 w-5" /> Dados dos Agentes</h2>
        <p className="text-sm text-muted-foreground">Configure de onde cada agente obtém seus dados. Clique em um agente para editar todos os campos em tabela.</p>
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {AGENT_DATA_REQUIREMENTS.map(agent => {
          const progress = getProgressForAgent(agent.template_key, agent.campos.length);
          const configuredCount = bindings.filter(b => b.agent_template_key === agent.template_key && b.configurado).length;
          return (
            <Card key={agent.template_key} className="cursor-pointer hover:ring-2 hover:ring-primary transition-all" onClick={() => setSelectedAgent(agent.template_key)}>
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

      <div className="flex justify-end">
        <Button variant="outline" onClick={onClose}>Fechar</Button>
      </div>
    </div>
  );
}
