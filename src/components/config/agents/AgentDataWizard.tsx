import { useState, useEffect, useCallback, useRef } from 'react';
import { AGENT_DATA_REQUIREMENTS, SYSTEM_TABLES, AgentDataField, AgentDataRequirement } from '@/constants/agentDataRequirements';
import { useAgentDataBindings } from '@/hooks/useAgentDataBindings';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from 'sonner';
import {
  ChevronLeft, Check, Database, FileText, Globe, AlertCircle, CheckCircle2,
  Loader2, ArrowRight, ArrowLeft, Table2, RefreshCw, Eye
} from 'lucide-react';

interface Props {
  estabelecimentoId: string;
  onClose: () => void;
}

interface ApiEndpoint {
  id: string;
  name: string;
  endpoint_path: string;
  custom_url: string | null;
  http_method: string;
}

type DataSourceType = 'manual' | 'sistema' | 'api';

interface FieldMappingEntry {
  type: 'field' | 'fixed';
  value: string;
}

export default function AgentDataWizard({ estabelecimentoId, onClose }: Props) {
  const { bindings, loading, upsertBinding, getProgressForAgent } = useAgentDataBindings(estabelecimentoId);

  // Wizard state
  const [currentStep, setCurrentStep] = useState(0);
  const [selectedAgentKey, setSelectedAgentKey] = useState<string | null>(null);
  const [dataSource, setDataSource] = useState<DataSourceType>('manual');

  // API state
  const [apiEndpoints, setApiEndpoints] = useState<ApiEndpoint[]>([]);
  const [selectedApiId, setSelectedApiId] = useState('');
  const [customUrl, setCustomUrl] = useState('');
  const [useCustomUrl, setUseCustomUrl] = useState(false);
  const [apiData, setApiData] = useState<any[]>([]);
  const [apiHeaders, setApiHeaders] = useState<string[]>([]);
  const [fetchingData, setFetchingData] = useState(false);
  const [fetchProgress, setFetchProgress] = useState(0);
  const progressRef = useRef<NodeJS.Timeout | null>(null);

  // Sistema state
  const [selectedTable, setSelectedTable] = useState('');

  // Field mapping state (for API and Sistema)
  const [fieldMappings, setFieldMappings] = useState<Record<string, FieldMappingEntry>>({});

  // Manual values state
  const [manualValues, setManualValues] = useState<Record<string, string>>({});

  // Saving
  const [saving, setSaving] = useState(false);

  const selectedAgent = selectedAgentKey ? AGENT_DATA_REQUIREMENTS.find(a => a.template_key === selectedAgentKey) : null;

  const STEP_LABELS = ['Agente', 'Origem dos Dados', 'Dados', 'Mapeamento', 'Confirmação'];
  const totalSteps = STEP_LABELS.length;
  const progress = ((currentStep + 1) / totalSteps) * 100;

  useEffect(() => {
    supabase.from('api_endpoints').select('id, name, endpoint_path, custom_url, http_method')
      .eq('estabelecimento_id', estabelecimentoId)
      .eq('active', true)
      .order('name')
      .then(({ data }) => { if (data) setApiEndpoints(data as ApiEndpoint[]); });
  }, [estabelecimentoId]);

  // Pre-fill manual values and mappings from existing bindings when agent is selected
  useEffect(() => {
    if (!selectedAgentKey || !selectedAgent) return;
    const agentBindings = bindings.filter(b => b.agent_template_key === selectedAgentKey);
    const mv: Record<string, string> = {};
    const fm: Record<string, FieldMappingEntry> = {};
    agentBindings.forEach(b => {
      if (b.fonte_tipo === 'manual' && b.valor_manual) {
        mv[b.campo] = b.valor_manual;
      }
      if (b.fonte_tipo === 'api' && b.campo_api) {
        fm[b.campo] = { type: 'field', value: b.campo_api };
      }
      if (b.fonte_tipo === 'sistema' && b.coluna_sistema) {
        fm[b.campo] = { type: 'field', value: b.coluna_sistema };
      }
    });
    setManualValues(mv);
    setFieldMappings(fm);
  }, [selectedAgentKey, bindings]);

  // Progress simulation
  const startProgress = () => {
    setFetchProgress(0);
    progressRef.current = setInterval(() => {
      setFetchProgress(prev => prev >= 90 ? prev : Math.min(prev + (prev < 30 ? 8 : prev < 60 ? 5 : 2), 90));
    }, 150);
  };
  const stopProgress = (success: boolean) => {
    if (progressRef.current) { clearInterval(progressRef.current); progressRef.current = null; }
    setFetchProgress(success ? 100 : 0);
    if (success) setTimeout(() => setFetchProgress(0), 500);
  };

  // Fetch API data
  const fetchApiData = async () => {
    setFetchingData(true);
    startProgress();
    try {
      let result: any;
      if (useCustomUrl && customUrl) {
        // Route through edge function to avoid CORS
        const { data, error } = await supabase.functions.invoke('execute-dynamic-query', { 
          body: { custom_url: customUrl } 
        });
        if (error) throw error;
        result = data;
      } else if (selectedApiId) {
        const { data, error } = await supabase.functions.invoke('execute-dynamic-query', { 
          body: { endpoint_id: selectedApiId } 
        });
        if (error) throw error;
        result = data;
      }
      if (!result) { stopProgress(false); toast.error('Não foi possível obter dados. Verifique se o endpoint está configurado corretamente.'); return; }

      let data: any[] = [];
      if (Array.isArray(result)) data = result;
      else {
        for (const key of ['data', 'items', 'products', 'produtos']) {
          if (result[key] && Array.isArray(result[key])) { data = result[key]; break; }
        }
        if (data.length === 0) {
          const firstArr = Object.keys(result).find(k => Array.isArray(result[k]));
          if (firstArr) data = result[firstArr];
        }
      }
      if (data.length === 0) { stopProgress(false); toast.warning('Nenhum dado encontrado'); return; }

      setApiData(data);
      setApiHeaders(Object.keys(data[0]));
      stopProgress(true);
      toast.success(`${data.length} registros carregados`);
    } catch (err: any) {
      stopProgress(false);
      toast.error('Erro: ' + err.message);
    } finally {
      setFetchingData(false);
    }
  };

  // Get available columns for mapping
  const getAvailableColumns = (): string[] => {
    if (dataSource === 'api') return apiHeaders;
    if (dataSource === 'sistema') {
      const tbl = SYSTEM_TABLES.find(t => t.value === selectedTable);
      return tbl?.colunas || [];
    }
    return [];
  };

  // Save all mappings
  const handleSave = async () => {
    if (!selectedAgent) return;
    setSaving(true);
    try {
      for (const field of selectedAgent.campos) {
        if (dataSource === 'manual') {
          const val = manualValues[field.campo] || '';
          await upsertBinding({
            estabelecimento_id: estabelecimentoId,
            agent_template_key: selectedAgent.template_key,
            campo: field.campo,
            label: field.label,
            descricao: field.descricao,
            fonte_tipo: 'manual',
            valor_manual: val,
            configurado: val.trim().length > 0,
          });
        } else if (dataSource === 'api') {
          const mapping = fieldMappings[field.campo];
          await upsertBinding({
            estabelecimento_id: estabelecimentoId,
            agent_template_key: selectedAgent.template_key,
            campo: field.campo,
            label: field.label,
            descricao: field.descricao,
            fonte_tipo: 'api',
            api_endpoint_id: useCustomUrl ? undefined : selectedApiId,
            campo_api: mapping?.value || undefined,
            configurado: !!(mapping?.value),
          });
        } else if (dataSource === 'sistema') {
          const mapping = fieldMappings[field.campo];
          await upsertBinding({
            estabelecimento_id: estabelecimentoId,
            agent_template_key: selectedAgent.template_key,
            campo: field.campo,
            label: field.label,
            descricao: field.descricao,
            fonte_tipo: 'sistema',
            tabela_sistema: selectedTable,
            coluna_sistema: mapping?.value || '__all__',
            configurado: !!selectedTable,
          });
        }
      }
      toast.success('Dados do agente salvos com sucesso!');
      setCurrentStep(0);
      setSelectedAgentKey(null);
      resetWizardState();
    } catch (err: any) {
      toast.error('Erro ao salvar: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const resetWizardState = () => {
    setDataSource('manual');
    setSelectedApiId('');
    setCustomUrl('');
    setUseCustomUrl(false);
    setApiData([]);
    setApiHeaders([]);
    setSelectedTable('');
    setFieldMappings({});
    setManualValues({});
  };

  const canGoNext = (): boolean => {
    switch (currentStep) {
      case 0: return !!selectedAgentKey;
      case 1: return true;
      case 2:
        if (dataSource === 'manual') return Object.values(manualValues).some(v => v.trim().length > 0);
        if (dataSource === 'api') return apiHeaders.length > 0;
        if (dataSource === 'sistema') return !!selectedTable;
        return false;
      case 3: return true;
      default: return true;
    }
  };

  const handleNext = () => {
    if (dataSource === 'manual' && currentStep === 2) {
      // Skip mapping step for manual, go directly to confirmation
      setCurrentStep(4);
    } else {
      setCurrentStep(prev => Math.min(prev + 1, totalSteps - 1));
    }
  };

  const handleBack = () => {
    if (dataSource === 'manual' && currentStep === 4) {
      setCurrentStep(2);
    } else {
      setCurrentStep(prev => Math.max(prev - 1, 0));
    }
  };

  if (loading) return <div className="flex items-center justify-center p-8"><Loader2 className="h-6 w-6 animate-spin" /></div>;

  // ========== STEP 0: Select Agent ==========
  const renderStep0 = () => (
    <div className="space-y-4">
      <div className="text-center">
        <h3 className="text-lg font-semibold mb-2">Selecione o Agente</h3>
        <p className="text-sm text-muted-foreground">Escolha qual agente deseja configurar os dados</p>
      </div>
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {AGENT_DATA_REQUIREMENTS.map(agent => {
          const prog = getProgressForAgent(agent.template_key, agent.campos.length);
          const configuredCount = bindings.filter(b => b.agent_template_key === agent.template_key && b.configurado).length;
          const isSelected = selectedAgentKey === agent.template_key;
          return (
            <Card
              key={agent.template_key}
              className={`cursor-pointer transition-all ${isSelected ? 'ring-2 ring-primary bg-primary/5' : 'hover:ring-2 hover:ring-primary/50'}`}
              onClick={() => { setSelectedAgentKey(agent.template_key); resetWizardState(); }}
            >
              <CardHeader className="pb-2">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">{agent.icone}</span>
                  <div className="flex-1">
                    <CardTitle className="text-sm">{agent.nome}</CardTitle>
                    <CardDescription className="text-xs">{configuredCount}/{agent.campos.length} campos</CardDescription>
                  </div>
                  {prog === 100 ? <CheckCircle2 className="h-5 w-5 text-green-500" /> :
                   prog > 0 ? <Badge variant="outline" className="text-xs">{prog}%</Badge> :
                   <AlertCircle className="h-5 w-5 text-muted-foreground" />}
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <Progress value={prog} className="h-1.5" />
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
    </div>
  );

  // ========== STEP 1: Select Data Source ==========
  const renderStep1 = () => (
    <div className="space-y-4">
      <div className="text-center">
        <h3 className="text-lg font-semibold mb-2">Origem dos Dados</h3>
        <p className="text-sm text-muted-foreground">
          Escolha como deseja alimentar os dados do agente <strong>{selectedAgent?.nome}</strong>
        </p>
      </div>

      <Card className="p-4">
        <RadioGroup
          value={dataSource}
          onValueChange={(v) => { setDataSource(v as DataSourceType); setApiData([]); setApiHeaders([]); }}
          className="flex flex-col gap-4"
        >
          {[
            { value: 'manual' as const, icon: <FileText className="h-5 w-5 text-primary" />, label: 'Entrada Manual', desc: 'Digite os valores de cada campo diretamente' },
            { value: 'sistema' as const, icon: <Database className="h-5 w-5 text-primary" />, label: 'Tabelas do Sistema', desc: 'Vincule campos a tabelas internas do sistema' },
            { value: 'api' as const, icon: <Globe className="h-5 w-5 text-primary" />, label: 'API Externa', desc: 'Importe de uma API cadastrada ou URL personalizada' },
          ].map(opt => (
            <div
              key={opt.value}
              className={`flex items-center space-x-3 p-4 rounded-lg border-2 cursor-pointer transition-all ${
                dataSource === opt.value ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'
              }`}
              onClick={() => { setDataSource(opt.value); setApiData([]); setApiHeaders([]); }}
            >
              <RadioGroupItem value={opt.value} id={opt.value} />
              <Label htmlFor={opt.value} className="flex items-center gap-3 cursor-pointer flex-1">
                {opt.icon}
                <div>
                  <p className="font-medium">{opt.label}</p>
                  <p className="text-xs text-muted-foreground">{opt.desc}</p>
                </div>
              </Label>
            </div>
          ))}
        </RadioGroup>
      </Card>
    </div>
  );

  // ========== STEP 2: Data Input ==========
  // Group fields by categoria
  const getGroupedFields = () => {
    if (!selectedAgent) return [];
    const groups: { categoria: string; fields: AgentDataField[] }[] = [];
    const seen = new Set<string>();
    for (const field of selectedAgent.campos) {
      const cat = field.categoria || 'Geral';
      if (!seen.has(cat)) {
        seen.add(cat);
        groups.push({ categoria: cat, fields: [] });
      }
      groups.find(g => g.categoria === cat)!.fields.push(field);
    }
    return groups;
  };

  const renderStep2 = () => {
    if (dataSource === 'manual') {
      const groups = getGroupedFields();
      return (
        <div className="space-y-4">
          <div className="text-center">
            <h3 className="text-lg font-semibold mb-2">Inserir Dados Manualmente</h3>
            <p className="text-sm text-muted-foreground">Preencha cada campo do agente <strong>{selectedAgent?.nome}</strong></p>
          </div>

          <ScrollArea className="max-h-[500px]">
            <div className="space-y-6 pr-4">
              {groups.map(group => (
                <div key={group.categoria}>
                  <div className="flex items-center gap-2 mb-3 sticky top-0 bg-background z-10 py-1">
                    <Badge variant="secondary" className="text-xs font-semibold">{group.categoria}</Badge>
                    <div className="h-px flex-1 bg-border" />
                    <span className="text-[10px] text-muted-foreground">{group.fields.length} campos</span>
                  </div>
                  <div className="space-y-3">
                    {group.fields.map(field => (
                      <Card key={field.campo} className="p-4">
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <Label className="font-medium">{field.label}</Label>
                            {field.obrigatorio && <Badge variant="destructive" className="text-[10px]">Obrigatório</Badge>}
                          </div>
                          <p className="text-xs text-muted-foreground">{field.descricao}</p>
                          {field.exemplo && <p className="text-[10px] text-primary/70">💡 Ex: {field.exemplo}</p>}
                          <Textarea
                            value={manualValues[field.campo] || ''}
                            onChange={e => setManualValues(prev => ({ ...prev, [field.campo]: e.target.value }))}
                            placeholder={field.exemplo || field.descricao}
                            rows={field.tipo === 'texto' ? 3 : 1}
                            className="text-sm"
                          />
                        </div>
                      </Card>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        </div>
      );
    }

    if (dataSource === 'sistema') {
      const tbl = SYSTEM_TABLES.find(t => t.value === selectedTable);
      const suggestedTables = selectedAgent?.campos.flatMap(c => c.tabelas_sistema_sugeridas || []).filter((v, i, a) => a.indexOf(v) === i) || [];

      return (
        <div className="space-y-4">
          <div className="text-center">
            <h3 className="text-lg font-semibold mb-2">Selecionar Tabela do Sistema</h3>
            <p className="text-sm text-muted-foreground">Escolha a tabela que contém os dados para o agente</p>
          </div>

          <Card className="p-6 space-y-4">
            <div className="space-y-2">
              <Label>Tabela do Sistema</Label>
              <Select value={selectedTable} onValueChange={setSelectedTable}>
                <SelectTrigger><SelectValue placeholder="Selecione uma tabela..." /></SelectTrigger>
                <SelectContent>
                  {SYSTEM_TABLES.map(t => (
                    <SelectItem key={t.value} value={t.value}>
                      <div className="flex items-center gap-2">
                        <Database className="h-4 w-4" />
                        {t.label}
                        {suggestedTables.includes(t.value) && <Badge variant="secondary" className="text-[10px] ml-1">⭐ Sugerido</Badge>}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {tbl && (
              <div className="bg-muted/50 rounded-lg p-4 space-y-2">
                <p className="text-sm font-medium">Colunas disponíveis:</p>
                <div className="flex flex-wrap gap-1">
                  {tbl.colunas.map(c => (
                    <Badge key={c} variant="outline" className="text-xs">{c}</Badge>
                  ))}
                </div>
              </div>
            )}
          </Card>
        </div>
      );
    }

    // API
    return (
      <div className="space-y-4">
        <div className="text-center">
          <h3 className="text-lg font-semibold mb-2">Buscar Dados da API</h3>
          <p className="text-sm text-muted-foreground">Selecione uma API e busque os dados para mapear os campos do agente</p>
        </div>

        <Card className="p-6 space-y-4">
          <div className="space-y-2">
            <Label>Selecione a API</Label>
            <Select
              value={useCustomUrl ? 'custom' : selectedApiId}
              onValueChange={v => {
                if (v === 'custom') { setUseCustomUrl(true); setSelectedApiId(''); }
                else { setUseCustomUrl(false); setSelectedApiId(v); }
              }}
            >
              <SelectTrigger><SelectValue placeholder="Selecione uma API..." /></SelectTrigger>
              <SelectContent>
                {apiEndpoints.map(api => (
                  <SelectItem key={api.id} value={api.id}>
                    <div className="flex items-center gap-2"><Database className="h-4 w-4" />{api.name}</div>
                  </SelectItem>
                ))}
                <SelectItem value="custom">
                  <div className="flex items-center gap-2"><Globe className="h-4 w-4" />URL Personalizada</div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {useCustomUrl && (
            <div className="space-y-2">
              <Label>URL da API</Label>
              <Input placeholder="https://api.exemplo.com/dados" value={customUrl} onChange={e => setCustomUrl(e.target.value)} />
              <p className="text-xs text-muted-foreground">A API deve retornar um JSON com dados</p>
            </div>
          )}

          <Button onClick={fetchApiData} disabled={fetchingData || (!selectedApiId && !customUrl)} className="w-full">
            {fetchingData ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Buscando dados...</> :
              <><RefreshCw className="h-4 w-4 mr-2" />Buscar Dados da API</>}
          </Button>

          {fetchingData && fetchProgress > 0 && (
            <Progress value={fetchProgress} className="h-2" />
          )}
        </Card>

        {/* Preview fetched data */}
        {apiHeaders.length > 0 && (
          <Card className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <Eye className="h-4 w-4 text-primary" />
              <span className="font-medium text-sm">Prévia dos Dados</span>
              <Badge variant="outline" className="ml-auto">{apiData.length} registros</Badge>
            </div>
            <div className="flex flex-wrap gap-1 mb-3">
              {apiHeaders.map(h => (
                <Badge key={h} variant="secondary" className="text-xs">{h}</Badge>
              ))}
            </div>
            <ScrollArea className="max-h-[200px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">#</TableHead>
                    {apiHeaders.slice(0, 6).map(h => <TableHead key={h} className="min-w-[100px]">{h}</TableHead>)}
                    {apiHeaders.length > 6 && <TableHead className="text-muted-foreground">+{apiHeaders.length - 6}</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {apiData.slice(0, 5).map((row, i) => (
                    <TableRow key={i}>
                      <TableCell className="text-xs text-muted-foreground">{i + 1}</TableCell>
                      {apiHeaders.slice(0, 6).map(h => (
                        <TableCell key={h} className="text-xs max-w-[150px] truncate">
                          {row[h] !== undefined && row[h] !== null ? String(row[h]) : '-'}
                        </TableCell>
                      ))}
                      {apiHeaders.length > 6 && <TableCell className="text-xs text-muted-foreground">...</TableCell>}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
          </Card>
        )}
      </div>
    );
  };

  // ========== STEP 3: Field Mapping ==========
  const renderStep3 = () => {
    const availableColumns = getAvailableColumns();

    return (
      <div className="space-y-4">
        <div className="text-center">
          <h3 className="text-lg font-semibold mb-2">Mapeamento de Campos</h3>
          <p className="text-sm text-muted-foreground">
            Vincule cada campo do agente <strong>{selectedAgent?.nome}</strong> ao campo correspondente da {dataSource === 'api' ? 'API' : 'tabela'}
          </p>
        </div>

        <div className="bg-muted/50 rounded-lg p-3 mb-2">
          <p className="text-xs text-muted-foreground">
            💡 Para cada campo do agente, selecione o campo correspondente da fonte de dados ou insira um valor fixo.
          </p>
        </div>

        <ScrollArea className="max-h-[500px]">
          <div className="space-y-6 pr-4">
            {getGroupedFields().map(group => (
              <div key={group.categoria}>
                <div className="flex items-center gap-2 mb-3 sticky top-0 bg-background z-10 py-1">
                  <Badge variant="secondary" className="text-xs font-semibold">{group.categoria}</Badge>
                  <div className="h-px flex-1 bg-border" />
                  <span className="text-[10px] text-muted-foreground">{group.fields.length} campos</span>
                </div>
                <div className="space-y-3">
                  {group.fields.map(field => {
                    const mapping = fieldMappings[field.campo];
                    const mappingType = mapping?.type || 'field';

                    return (
                      <Card key={field.campo} className="p-4">
                        <div className="space-y-3">
                          <div className="flex items-center gap-2">
                            <div className="flex-1">
                              <Label className="flex items-center gap-2">
                                {field.label}
                                {field.obrigatorio && <Badge variant="destructive" className="text-[10px]">Obrigatório</Badge>}
                              </Label>
                              <p className="text-xs text-muted-foreground mt-0.5">{field.descricao}</p>
                              {field.exemplo && <p className="text-[10px] text-primary/70 mt-0.5">💡 Ex: {field.exemplo}</p>}
                            </div>
                            <ArrowRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                            <div className="flex-1">
                              <RadioGroup
                                value={mappingType}
                                onValueChange={v => setFieldMappings(prev => ({ ...prev, [field.campo]: { type: v as 'field' | 'fixed', value: '' } }))}
                                className="flex gap-4"
                              >
                                <div className="flex items-center space-x-2">
                                  <RadioGroupItem value="field" id={`${field.campo}-field`} />
                                  <Label htmlFor={`${field.campo}-field`} className="font-normal cursor-pointer text-sm">Mapear</Label>
                                </div>
                                <div className="flex items-center space-x-2">
                                  <RadioGroupItem value="fixed" id={`${field.campo}-fixed`} />
                                  <Label htmlFor={`${field.campo}-fixed`} className="font-normal cursor-pointer text-sm">Fixo</Label>
                                </div>
                              </RadioGroup>
                            </div>
                          </div>

                          <div>
                            {mappingType === 'field' ? (
                              <Select
                                value={mapping?.value || 'none'}
                                onValueChange={v => setFieldMappings(prev => ({
                                  ...prev,
                                  [field.campo]: { type: 'field', value: v === 'none' ? '' : v }
                                }))}
                              >
                                <SelectTrigger><SelectValue placeholder="Selecione um campo..." /></SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="none"><span className="text-muted-foreground">(Não mapear)</span></SelectItem>
                                  {availableColumns.map(c => (
                                    <SelectItem key={c} value={c}>{c}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            ) : (
                              <Textarea
                                value={mapping?.value || ''}
                                onChange={e => setFieldMappings(prev => ({ ...prev, [field.campo]: { type: 'fixed', value: e.target.value } }))}
                                placeholder="Digite o valor fixo..."
                                rows={2}
                                className="text-sm"
                              />
                            )}
                          </div>
                        </div>
                      </Card>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </div>
    );
  };

  // ========== STEP 4: Confirmation ==========
  const renderStep4 = () => {
    const getMappedCount = () => {
      if (dataSource === 'manual') return Object.values(manualValues).filter(v => v.trim().length > 0).length;
      return Object.values(fieldMappings).filter(m => m.value && m.value.length > 0).length;
    };

    return (
      <div className="space-y-4">
        <div className="text-center">
          <h3 className="text-lg font-semibold mb-2">Confirmar Configuração</h3>
          <p className="text-sm text-muted-foreground">Revise os dados antes de salvar</p>
        </div>

        <Card className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-xs text-muted-foreground">Agente</Label>
              <p className="font-medium flex items-center gap-2"><span>{selectedAgent?.icone}</span> {selectedAgent?.nome}</p>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Origem</Label>
              <p className="font-medium flex items-center gap-2">
                {dataSource === 'manual' ? <><FileText className="h-4 w-4" /> Manual</> :
                 dataSource === 'sistema' ? <><Database className="h-4 w-4" /> Sistema ({SYSTEM_TABLES.find(t => t.value === selectedTable)?.label})</> :
                 <><Globe className="h-4 w-4" /> API ({useCustomUrl ? 'URL personalizada' : apiEndpoints.find(e => e.id === selectedApiId)?.name})</>}
              </p>
            </div>
          </div>

          <div>
            <Label className="text-xs text-muted-foreground">Campos configurados</Label>
            <p className="font-medium text-lg">{getMappedCount()} de {selectedAgent?.campos.length}</p>
          </div>

          {/* Field summary table */}
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Campo do Agente</TableHead>
                  <TableHead>Valor / Mapeamento</TableHead>
                  <TableHead className="w-20">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {selectedAgent?.campos.map(field => {
                  let valueDisplay = '';
                  let configured = false;

                  if (dataSource === 'manual') {
                    const val = manualValues[field.campo] || '';
                    valueDisplay = val ? (val.length > 60 ? val.substring(0, 60) + '...' : val) : '—';
                    configured = val.trim().length > 0;
                  } else {
                    const mapping = fieldMappings[field.campo];
                    if (mapping?.value) {
                      valueDisplay = mapping.type === 'field' ? `📊 ${mapping.value}` : `✏️ ${mapping.value.substring(0, 60)}`;
                      configured = true;
                    } else {
                      valueDisplay = '—';
                    }
                  }

                  return (
                    <TableRow key={field.campo}>
                      <TableCell className="font-medium text-sm">
                        {field.label}
                        {field.obrigatorio && <span className="text-destructive ml-1">*</span>}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">{valueDisplay}</TableCell>
                      <TableCell>
                        {configured ? (
                          <Badge className="text-[10px] bg-green-500/10 text-green-600 border-green-200"><CheckCircle2 className="h-3 w-3 mr-1" />OK</Badge>
                        ) : (
                          <Badge variant="outline" className="text-[10px] text-amber-600 border-amber-200"><AlertCircle className="h-3 w-3 mr-1" />—</Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </Card>
      </div>
    );
  };

  // ========== RENDER ==========
  const renderCurrentStep = () => {
    switch (currentStep) {
      case 0: return renderStep0();
      case 1: return renderStep1();
      case 2: return renderStep2();
      case 3: return renderStep3();
      case 4: return renderStep4();
      default: return null;
    }
  };

  return (
    <div className="space-y-6">
      {/* Progress bar */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold flex items-center gap-2"><Table2 className="h-5 w-5" /> Wizard de Dados</h2>
          <Badge variant="outline">{currentStep + 1} de {totalSteps}</Badge>
        </div>
        <Progress value={progress} className="h-2" />
        <div className="flex justify-between">
          {STEP_LABELS.map((label, i) => (
            <span key={i} className={`text-[10px] ${i === currentStep ? 'text-primary font-semibold' : 'text-muted-foreground'}`}>
              {label}
            </span>
          ))}
        </div>
      </div>

      {/* Step content */}
      {renderCurrentStep()}

      {/* Navigation */}
      <div className="flex justify-between pt-4 border-t">
        <div>
          {currentStep === 0 ? (
            <Button variant="outline" onClick={onClose}>Fechar</Button>
          ) : (
            <Button variant="outline" onClick={handleBack}><ArrowLeft className="h-4 w-4 mr-1" /> Voltar</Button>
          )}
        </div>
        <div>
          {currentStep < totalSteps - 1 ? (
            <Button onClick={handleNext} disabled={!canGoNext()}>
              Próximo <ArrowRight className="h-4 w-4 ml-1" />
            </Button>
          ) : (
            <Button onClick={handleSave} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Check className="h-4 w-4 mr-2" />}
              Salvar Configuração
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
