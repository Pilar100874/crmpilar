import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { SYSTEM_TABLES, AgentDataField, AgentDataRequirement } from '@/constants/agentDataRequirements';
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
import * as XLSX from 'xlsx';
import { Checkbox } from '@/components/ui/checkbox';
import {
  ChevronLeft, Check, Database, FileText, Globe, AlertCircle, CheckCircle2,
  Loader2, ArrowRight, ArrowLeft, Table2, RefreshCw, Eye, Download, Upload, Plus, Copy, Trash2, EyeOff, Edit2
} from 'lucide-react';

interface CustomFieldFromDB {
  id: string;
  nome: string;
  tipo: string;
  descricao?: string | null;
  obrigatorio: boolean;
  opcoes?: string[] | null;
  ordem: number;
}

interface Props {
  estabelecimentoId: string;
  onClose: () => void;
  agentName?: string;
  agentId?: string;
  customFields: CustomFieldFromDB[];
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

export default function AgentDataWizard({ estabelecimentoId, onClose, agentName, agentId, customFields }: Props) {
  const { bindings, loading, upsertBinding, getProgressForAgent } = useAgentDataBindings(estabelecimentoId);

  // Convert custom fields from DB to AgentDataField format
  const agentFields: AgentDataField[] = useMemo(() => {
    return customFields.map(f => ({
      campo: f.id,
      label: f.nome,
      descricao: f.descricao || '',
      tipo: (f.tipo === 'lista' ? 'texto' : f.tipo === 'booleano' ? 'texto' : f.tipo) as AgentDataField['tipo'],
      obrigatorio: f.obrigatorio,
      categoria: 'Campos do Agente',
      exemplo: f.opcoes?.length ? f.opcoes.join(', ') : undefined,
    }));
  }, [customFields]);

  // Use agentId as the template key for bindings
  const templateKey = agentId || 'custom';

  // Wizard state — skip Step 0 (agent selection), start at Step 0 = data source
  const [currentStep, setCurrentStep] = useState(0);
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
  const excelInputRef = useRef<HTMLInputElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = useState(0);

  // Sistema state
  const [selectedTable, setSelectedTable] = useState('');

  // Field mapping state (for API and Sistema)
  const [fieldMappings, setFieldMappings] = useState<Record<string, FieldMappingEntry>>({});

  // Manual values state - now supports multiple rows
  const [manualValues, setManualValues] = useState<Record<string, string>>({});
  const [manualRows, setManualRows] = useState<Record<string, string>[]>(Array.from({ length: 50 }, () => ({})));

  // Disabled fields - user can exclude fields they won't use
  const [disabledFields, setDisabledFields] = useState<Set<string>>(new Set());

  // Saving
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [goToRow, setGoToRow] = useState('');

  // Active fields = all agent fields minus disabled ones
  const activeFields = useMemo(() => {
    return agentFields.filter(f => !disabledFields.has(f.campo));
  }, [agentFields, disabledFields]);

  // Steps: Origem dos Dados → Dados → Mapeamento → Confirmação
  const STEP_LABELS = ['Origem dos Dados', 'Dados', 'Mapeamento', 'Confirmação'];
  const totalSteps = STEP_LABELS.length;
  const progress = ((currentStep + 1) / totalSteps) * 100;

  useEffect(() => {
    supabase.from('api_endpoints').select('id, name, endpoint_path, custom_url, http_method')
      .eq('estabelecimento_id', estabelecimentoId)
      .eq('active', true)
      .order('name')
      .then(({ data }) => { if (data) setApiEndpoints(data as ApiEndpoint[]); });
  }, [estabelecimentoId]);

  // Pre-fill manual values and mappings from existing bindings
  useEffect(() => {
    if (!templateKey) return;
    const agentBindings = bindings.filter(b => b.agent_template_key === templateKey);
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
  }, [templateKey, bindings]);

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
    
    setSaving(true);
    try {
      for (const field of activeFields) {
        if (dataSource === 'manual') {
          // For manual, save all rows as JSON array in valor_manual
          const allValues = manualRows.filter(row => Object.values(row).some(v => v?.trim()));
          const val = allValues.length > 0 ? JSON.stringify(allValues.map(row => row[field.campo] || '')) : (manualValues[field.campo] || '');
          await upsertBinding({
            estabelecimento_id: estabelecimentoId,
            agent_template_key: templateKey,
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
            agent_template_key: templateKey,
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
            agent_template_key: templateKey,
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
      // Stay on confirmation step so user can review/edit
      setSaved(true);
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
    setManualRows(Array.from({ length: 50 }, () => ({})));
    setDisabledFields(new Set());
  };

  const canGoNext = (): boolean => {
    switch (currentStep) {
      case 0: return !!selectedAgentKey;
      case 1: return true;
      case 2:
        if (dataSource === 'manual') return manualRows.some(row => Object.values(row).some(v => v?.trim()));
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
        {filteredRequirements.map(agent => {
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
  const renderStep1 = () => {
    const toggleField = (campo: string) => {
      setDisabledFields(prev => {
        const next = new Set(prev);
        if (next.has(campo)) next.delete(campo);
        else next.add(campo);
        return next;
      });
    };

    const allCampos = selectedAgent?.campos || [];
    const categorias = [...new Set(allCampos.map(f => f.categoria || 'Geral'))];

    return (
    <div className="space-y-4">
      <div className="text-center">
        <h3 className="text-lg font-semibold mb-2">Origem dos Dados</h3>
        <p className="text-sm text-muted-foreground">
          Escolha como deseja alimentar os dados do agente <strong>{agentName}</strong>
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

      {/* Field selection - allow user to disable unused fields */}
      <Card className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <EyeOff className="h-4 w-4 text-muted-foreground" />
            <span className="font-medium text-sm">Campos a utilizar</span>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs">{activeFields.length}/{allCampos.length} ativos</Badge>
            <Button variant="ghost" size="sm" className="text-xs h-7" onClick={() => setDisabledFields(new Set())}>
              Ativar todos
            </Button>
          </div>
        </div>
        <p className="text-xs text-muted-foreground">Desmarque os campos que você não utilizará neste agente.</p>
        <ScrollArea className="max-h-[250px]">
          <div className="space-y-3">
            {categorias.map(cat => {
              const catFields = allCampos.filter(f => (f.categoria || 'Geral') === cat);
              return (
                <div key={cat}>
                  <div className="flex items-center gap-2 mb-1.5">
                    <Badge variant="secondary" className="text-[10px]">{cat}</Badge>
                    <div className="h-px flex-1 bg-border" />
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-1">
                    {catFields.map(f => (
                      <label
                        key={f.campo}
                        className={`flex items-center gap-2 p-1.5 rounded-md cursor-pointer text-xs transition-colors hover:bg-muted/50 ${disabledFields.has(f.campo) ? 'opacity-50' : ''}`}
                      >
                        <Checkbox
                          checked={!disabledFields.has(f.campo)}
                          onCheckedChange={() => toggleField(f.campo)}
                          disabled={f.obrigatorio}
                        />
                        <span className="truncate">{f.label}</span>
                        {f.obrigatorio && <span className="text-destructive text-[10px]">*</span>}
                      </label>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </ScrollArea>
      </Card>
    </div>
  )};

  // ========== STEP 2: Data Input ==========
  // Group fields by categoria
  const getGroupedFields = () => {
    // use agentFields directly
    const groups: { categoria: string; fields: AgentDataField[] }[] = [];
    const seen = new Set<string>();
    for (const field of activeFields) {
      const cat = field.categoria || 'Geral';
      if (!seen.has(cat)) {
        seen.add(cat);
        groups.push({ categoria: cat, fields: [] });
      }
      groups.find(g => g.categoria === cat)!.fields.push(field);
    }
    return groups;
  };

  // Excel template download
  const downloadExcelTemplate = () => {
    
    const fields = activeFields;
    // Example row with orientation hints
    const exampleRow: Record<string, string> = {};
    fields.forEach(f => {
      const hints: Record<string, string> = {
        'codigo_cliente': 'Ex: CLI001',
        'cnpj_cpf': 'Ex: 12.345.678/0001-90',
        'razao_social': 'Ex: Empresa ABC Ltda',
        'nome_fantasia': 'Ex: ABC',
        'segmento': 'Ex: Varejo',
        'cidade': 'Ex: São Paulo',
        'estado': 'Ex: SP',
        'email': 'Ex: contato@empresa.com',
        'telefone': 'Ex: (11) 99999-0000',
        'vendedor_responsavel': 'Ex: João Silva',
        'limite_credito': 'Ex: 50000',
        'numero_pedido': 'Ex: PED001',
        'data_pedido': 'Ex: 2024-01-15',
        'codigo_produto': 'Ex: PROD001',
        'nome_produto': 'Ex: Produto X',
        'quantidade': 'Ex: 10',
        'valor_unitario': 'Ex: 29.90',
        'valor_total': 'Ex: 299.00',
        'status_pedido': 'Ex: Faturado',
        'ticket_medio': 'Ex: 1500.00',
        'frequencia_compra': 'Ex: Mensal',
        'score': 'Ex: 85',
        'tipo': 'Ex: Recorrente',
        'data_vencimento': 'Ex: 2024-02-15',
        'valor': 'Ex: 1500.00',
        'status': 'Ex: Ativo',
        'descricao': 'Ex: Descrição do item',
        'categoria': 'Ex: Categoria A',
        'preco': 'Ex: 49.90',
        'estoque': 'Ex: 100',
      };
      exampleRow[f.label] = hints[f.campo] || `Ex: valor de ${f.label}`;
    });
    const ws = XLSX.utils.json_to_sheet([exampleRow]);
    ws['!cols'] = fields.map(() => ({ wch: 22 }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, agentName.substring(0, 31));
    XLSX.writeFile(wb, `modelo_${templateKey}.xlsx`);
    toast.success('Modelo Excel baixado com exemplo de orientação!');
  };

  // Excel import
  const handleExcelImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const wb = XLSX.read(evt.target?.result, { type: 'binary' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const data: any[] = XLSX.utils.sheet_to_json(ws);
        if (data.length === 0) { toast.warning('Nenhum dado encontrado'); return; }
        
        // Map Excel column labels back to field campo keys
        const fields = activeFields;
        const labelTocampo: Record<string, string> = {};
        fields.forEach(f => { labelTocampo[f.label] = f.campo; });
        
        const newRows: Record<string, string>[] = data.map(row => {
          const mapped: Record<string, string> = {};
          Object.entries(row).forEach(([key, val]) => {
            const campo = labelTocampo[key] || key;
            if (val !== undefined && val !== null && String(val).trim()) {
              mapped[campo] = String(val);
            }
          });
          return mapped;
        }).filter(row => Object.keys(row).length > 0);
        
        setManualRows(prev => [...prev.filter(r => Object.values(r).some(v => v?.trim())), ...newRows]);
        toast.success(`${newRows.length} registros importados do Excel!`);
      } catch {
        toast.error('Erro ao ler o arquivo Excel');
      }
    };
    reader.readAsBinaryString(file);
    e.target.value = '';
  };

  // moved excelInputRef to top-level hooks area

  const renderStep2 = () => {
    if (dataSource === 'manual') {
      const fields = activeFields;
      const groups = getGroupedFields();
      
      const addRow = () => setManualRows(prev => [...prev, {}]);
      const removeRow = (idx: number) => setManualRows(prev => prev.length <= 1 ? [{}] : prev.filter((_, i) => i !== idx));
      const updateRowField = (rowIdx: number, campo: string, value: string) => {
        setManualRows(prev => prev.map((row, i) => i === rowIdx ? { ...row, [campo]: value } : row));
      };
      const duplicateRow = (idx: number) => setManualRows(prev => [...prev.slice(0, idx + 1), { ...prev[idx] }, ...prev.slice(idx + 1)]);
      const clearAllRows = () => setManualRows(Array.from({ length: 50 }, () => ({})));

      // Handle paste from clipboard (Excel/Sheets copy)
      const handlePaste = (e: React.ClipboardEvent, groupFields: AgentDataField[], startRowIdx: number, startFieldIdx: number) => {
        const clipText = e.clipboardData.getData('text/plain');
        if (!clipText) return;
        
        const pastedRows = clipText.split(/\r?\n/).filter(line => line.trim());
        if (pastedRows.length <= 1 && !clipText.includes('\t')) return; // single value, let default handle
        
        e.preventDefault();
        
        setManualRows(prev => {
          const updated = [...prev];
          pastedRows.forEach((line, rOffset) => {
            const cols = line.split('\t');
            const targetRowIdx = startRowIdx + rOffset;
            // Ensure row exists
            while (updated.length <= targetRowIdx) updated.push({});
            cols.forEach((val, cOffset) => {
              const fieldIdx = startFieldIdx + cOffset;
              if (fieldIdx < groupFields.length) {
                updated[targetRowIdx] = { ...updated[targetRowIdx], [groupFields[fieldIdx].campo]: val.trim() };
              }
            });
          });
          return updated;
        });
        toast.success(`${pastedRows.length} linha(s) colada(s) do clipboard!`);
      };

      // Handle global paste on the table container (for pasting full blocks)
      const handleGlobalPaste = async () => {
        try {
          const clipText = await navigator.clipboard.readText();
          if (!clipText || !clipText.includes('\t')) {
            toast.info('Copie dados do Excel com colunas separadas por TAB');
            return;
          }
          const pastedRows = clipText.split(/\r?\n/).filter(line => line.trim());
          const allFields = fields;
          
          const newRows: Record<string, string>[] = pastedRows.map(line => {
            const cols = line.split('\t');
            const row: Record<string, string> = {};
            cols.forEach((val, idx) => {
              if (idx < allFields.length && val.trim()) {
                row[allFields[idx].campo] = val.trim();
              }
            });
            return row;
          }).filter(r => Object.keys(r).length > 0);
          
          if (newRows.length === 0) { toast.warning('Nenhum dado reconhecido'); return; }
          setManualRows(prev => [...prev.filter(r => Object.values(r).some(v => v?.trim())), ...newRows]);
          toast.success(`${newRows.length} registro(s) colado(s) com sucesso!`);
        } catch {
          toast.error('Não foi possível acessar o clipboard. Use Ctrl+V em uma célula.');
        }
      };

      const ROW_HEIGHT = 32;
      const VISIBLE_ROWS = 20;
      const OVERSCAN = 5;
      const containerHeight = VISIBLE_ROWS * ROW_HEIGHT;
      const totalHeight = manualRows.length * ROW_HEIGHT;
      const startIdx = Math.max(0, Math.floor(scrollTop / ROW_HEIGHT) - OVERSCAN);
      const endIdx = Math.min(manualRows.length, Math.ceil((scrollTop + containerHeight) / ROW_HEIGHT) + OVERSCAN);
      const visibleRows = manualRows.slice(startIdx, endIdx);
      const filledCount = manualRows.filter(r => Object.values(r).some(v => v?.trim())).length;

      const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
        setScrollTop(e.currentTarget.scrollTop);
      };

      return (
        <div className="space-y-3">
          <div className="text-center">
            <h3 className="text-lg font-semibold mb-1">Inserir Dados Manualmente</h3>
            <p className="text-sm text-muted-foreground">
              Preencha como uma planilha. <strong>Cole até 10.000+ registros do Excel (Ctrl+V)</strong>.
            </p>
          </div>

          <div className="flex gap-2 justify-between flex-wrap">
            <div className="flex gap-2 items-center">
              <Button variant="default" size="sm" onClick={() => setManualRows(prev => [...prev, ...Array.from({ length: 100 }, () => ({}))])}>
                + 100 Linhas
              </Button>
              <Button variant="outline" size="sm" onClick={() => setManualRows(prev => [...prev, ...Array.from({ length: 1000 }, () => ({}))])}>
                + 1.000
              </Button>
              <Button variant="ghost" size="sm" onClick={clearAllRows}>
                Limpar
              </Button>
              <div className="flex items-center gap-1 ml-2">
                <Input
                  placeholder="Ir p/ linha"
                  value={goToRow}
                  onChange={e => setGoToRow(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') {
                      const row = parseInt(goToRow) - 1;
                      if (row >= 0 && row < manualRows.length && scrollContainerRef.current) {
                        scrollContainerRef.current.scrollTop = row * ROW_HEIGHT;
                        setGoToRow('');
                      }
                    }
                  }}
                  className="w-24 h-7 text-xs"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="secondary" size="sm" onClick={handleGlobalPaste} title="Colar dados do Excel">
                <Copy className="h-4 w-4 mr-1" /> Colar do Excel
              </Button>
              <input ref={excelInputRef} type="file" accept=".xlsx,.xls,.csv" onChange={handleExcelImport} className="hidden" />
              <Button variant="outline" size="sm" onClick={downloadExcelTemplate}>
                <Download className="h-4 w-4 mr-1" /> Modelo
              </Button>
              <Button variant="outline" size="sm" onClick={() => excelInputRef.current?.click()}>
                <Upload className="h-4 w-4 mr-1" /> Importar
              </Button>
            </div>
          </div>

          <div className="text-xs text-muted-foreground flex items-center gap-2 bg-muted/50 p-2 rounded-md">
            <Badge variant="outline">{manualRows.length.toLocaleString()} linhas</Badge>
            <span>•</span>
            <Badge variant="secondary">{filledCount.toLocaleString()} preenchidas</Badge>
            <span>•</span>
            <span>{fields.length} colunas</span>
            <span>•</span>
            <span className="text-primary font-medium">💡 Ctrl+V para colar milhares de registros do Excel</span>
          </div>

          <div className="border rounded-lg overflow-hidden [&_::-webkit-scrollbar]:h-2 [&_::-webkit-scrollbar]:w-2 [&_::-webkit-scrollbar-track]:bg-muted/20 [&_::-webkit-scrollbar-thumb]:bg-muted-foreground/30 [&_::-webkit-scrollbar-thumb]:rounded-full">
            <div
              ref={scrollContainerRef}
              onScroll={handleScroll}
              className="overflow-auto"
              style={{ height: `${containerHeight + 40}px` }}
            >
              <div style={{ minWidth: `${fields.length * 140 + 100}px` }}>
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/30 sticky top-0 z-20">
                      <TableHead className="w-[45px] text-center text-xs">#</TableHead>
                      {fields.map(f => (
                        <TableHead key={f.campo} className="min-w-[130px] text-xs px-1" title={`${f.descricao} (${f.categoria})`}>
                          <div className="flex items-center gap-0.5">
                            <span className="truncate">{f.label}</span>
                            {f.obrigatorio && <span className="text-destructive">*</span>}
                          </div>
                        </TableHead>
                      ))}
                      <TableHead className="w-[50px] text-xs">×</TableHead>
                    </TableRow>
                  </TableHeader>
                </Table>
                <div style={{ height: `${totalHeight}px`, position: 'relative' }}>
                  <div style={{ position: 'absolute', top: `${startIdx * ROW_HEIGHT}px`, width: '100%' }}>
                    <Table>
                      <TableBody>
                        {visibleRows.map((row, vIdx) => {
                          const rowIdx = startIdx + vIdx;
                          return (
                            <TableRow key={rowIdx} style={{ height: `${ROW_HEIGHT}px` }}>
                              <TableCell className="text-center text-[10px] text-muted-foreground font-mono p-0 w-[45px]">{rowIdx + 1}</TableCell>
                              {fields.map((f, fIdx) => (
                                <TableCell key={f.campo} className="p-0.5 min-w-[130px]">
                                  <Input
                                    value={row[f.campo] || ''}
                                    onChange={e => updateRowField(rowIdx, f.campo, e.target.value)}
                                    onPaste={e => handlePaste(e, fields, rowIdx, fIdx)}
                                    placeholder={rowIdx === 0 ? (f.exemplo || '') : ''}
                                    className="text-xs h-7 rounded-sm border-transparent focus:border-primary px-1"
                                  />
                                </TableCell>
                              ))}
                              <TableCell className="p-0.5 w-[50px]">
                                <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={() => removeRow(rowIdx)} title="Remover">
                                  ×
                                </Button>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      );
    }

    if (dataSource === 'sistema') {
      const tbl = SYSTEM_TABLES.find(t => t.value === selectedTable);
      const suggestedTables = activeFields.flatMap(c => c.tabelas_sistema_sugeridas || []).filter((v, i, a) => a.indexOf(v) === i) || [];

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
            Vincule cada campo do agente <strong>{agentName}</strong> ao campo correspondente da {dataSource === 'api' ? 'API' : 'tabela'}
          </p>
        </div>

        <div className="bg-muted/50 rounded-lg p-3 mb-2">
          <p className="text-xs text-muted-foreground">
            💡 Para cada campo, selecione o campo correspondente da fonte de dados ou insira um valor fixo.
          </p>
        </div>

        <ScrollArea className="h-[500px]">
          {getGroupedFields().map(group => (
            <div key={group.categoria} className="mb-4">
              <div className="flex items-center gap-2 mb-2 sticky top-0 bg-background z-10 py-1">
                <Badge variant="secondary" className="text-xs font-semibold">{group.categoria}</Badge>
                <div className="h-px flex-1 bg-border" />
              </div>
              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[200px]">Campo do Agente</TableHead>
                      <TableHead className="w-[100px]">Tipo</TableHead>
                      <TableHead>Mapeamento / Valor</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {group.fields.map(field => {
                      const mapping = fieldMappings[field.campo];
                      const mappingType = mapping?.type || 'field';

                      return (
                        <TableRow key={field.campo}>
                          <TableCell className="align-top">
                            <div>
                              <span className="font-medium text-sm">{field.label}</span>
                              {field.obrigatorio && <Badge variant="destructive" className="text-[10px] ml-1">*</Badge>}
                              <p className="text-[10px] text-muted-foreground mt-0.5">{field.descricao}</p>
                            </div>
                          </TableCell>
                          <TableCell className="align-top">
                            <Select
                              value={mappingType}
                              onValueChange={v => setFieldMappings(prev => ({ ...prev, [field.campo]: { type: v as 'field' | 'fixed', value: '' } }))}
                            >
                              <SelectTrigger className="h-8 text-xs w-[90px]">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="field">Mapear</SelectItem>
                                <SelectItem value="fixed">Fixo</SelectItem>
                              </SelectContent>
                            </Select>
                          </TableCell>
                          <TableCell className="align-top">
                            {mappingType === 'field' ? (
                              <Select
                                value={mapping?.value || 'none'}
                                onValueChange={v => setFieldMappings(prev => ({
                                  ...prev,
                                  [field.campo]: { type: 'field', value: v === 'none' ? '' : v }
                                }))}
                              >
                                <SelectTrigger className="h-8 text-sm">
                                  <SelectValue placeholder="Selecione..." />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="none"><span className="text-muted-foreground">(Não mapear)</span></SelectItem>
                                  {availableColumns.map(c => (
                                    <SelectItem key={c} value={c}>{c}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            ) : (
                              <Input
                                value={mapping?.value || ''}
                                onChange={e => setFieldMappings(prev => ({ ...prev, [field.campo]: { type: 'fixed', value: e.target.value } }))}
                                placeholder={field.exemplo || 'Valor fixo...'}
                                className="text-sm h-8"
                              />
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </div>
          ))}
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
              <p className="font-medium flex items-center gap-2"><span>{"🤖"}</span> {agentName}</p>
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
            <p className="font-medium text-lg">{getMappedCount()} de {activeFields.length}</p>
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
                {activeFields.map(field => {
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
        <div className="flex gap-2">
          {saved && currentStep === totalSteps - 1 && (
            <Button variant="outline" onClick={() => { setSaved(false); setCurrentStep(2); }}>
              <Edit2 className="h-4 w-4 mr-1" /> Editar Dados
            </Button>
          )}
          {currentStep < totalSteps - 1 ? (
            <Button onClick={handleNext} disabled={!canGoNext()}>
              Próximo <ArrowRight className="h-4 w-4 ml-1" />
            </Button>
          ) : (
            <Button onClick={handleSave} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Check className="h-4 w-4 mr-2" />}
              {saved ? 'Salvar Alterações' : 'Salvar Configuração'}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
