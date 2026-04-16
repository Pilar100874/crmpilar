import { useState, useEffect } from 'react';
import { useChatAgents, ChatAgent } from '@/hooks/useChatAgents';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';

import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Table as UITable, TableHeader, TableBody, TableHead, TableRow, TableCell } from '@/components/ui/table';
import { Plus, Edit, Trash2, Bot, Wand2, Zap, Upload, X, Database, FileText, Brain, Package, Table, Filter, Eye, Download, Loader2, Network, Layers, BarChart3, Sparkles, Settings, ListChecks } from 'lucide-react';
import AgentHelpGuide from '@/components/config/agents/AgentHelpGuide';
import AgentCustomFieldsManager from '@/components/config/agents/AgentCustomFieldsManager';
import { toast } from 'sonner';
import { ChatAgentPromptWizard } from '@/components/config/ChatAgentPromptWizard';
import RulesAssistantChat from '@/components/config/RulesAssistantChat';
import AgentTemplateSetup from '@/components/config/agents/AgentTemplateSetup';
import AgentDataWizard from '@/components/config/agents/AgentDataWizard';
import AgentOrchestratorView from '@/components/config/agents/AgentOrchestratorView';
import AgentPerformanceDashboard from '@/components/config/agents/AgentPerformanceDashboard';
import AgentGlobalSettings from '@/components/config/agents/AgentGlobalSettings';
import * as XLSX from 'xlsx';
import { AGENT_TEMPLATES } from '@/constants/agentTemplates';

function AgentDataWizardGate({ estabelecimentoId, agentId, agentName }: { estabelecimentoId: string; agentId?: string; agentName?: string }) {
  const [hasFields, setHasFields] = useState<boolean | null>(null);
  const [customFields, setCustomFields] = useState<any[]>([]);
  useEffect(() => {
    if (!agentId) return;
    supabase.from('chat_agent_custom_fields').select('*')
      .eq('agent_id', agentId).eq('ativo', true).order('ordem')
      .then(({ data, count }) => {
        const fields = data || [];
        setCustomFields(fields);
        setHasFields(fields.length > 0);
      });
  }, [agentId]);

  if (hasFields === null) return <div className="flex items-center justify-center p-8"><Loader2 className="h-6 w-6 animate-spin" /></div>;
  if (!hasFields) return (
    <div className="flex flex-col items-center justify-center p-12 text-center space-y-4">
      <ListChecks className="h-12 w-12 text-muted-foreground" />
      <div>
        <h3 className="text-lg font-semibold">Nenhum campo customizado encontrado</h3>
        <p className="text-sm text-muted-foreground mt-1">Para utilizar o Wizard de Dados, primeiro crie os campos necessários na aba <strong>Campos</strong>.</p>
      </div>
    </div>
  );
  return <AgentDataWizard estabelecimentoId={estabelecimentoId} onClose={() => {}} agentName={agentName} agentId={agentId} customFields={customFields} />;
}

const detectAgentDomain = (agentName: string): string | undefined => {
  const lower = agentName.toLowerCase();
  const match = AGENT_TEMPLATES.find(t => lower.includes(t.nome.toLowerCase().replace('agente ', '')));
  if (match) return match.dominio;
  const keywords: Record<string, string[]> = {
    cadastro_clientes: ['cadastro de cliente', 'cadastro cliente'],
    cadastro_produtos: ['cadastro', 'produto', 'material'],
    tabela_precos: ['preço', 'tabela de preço', 'pricing'],
    estoque: ['estoque', 'inventário', 'armazém'],
    comercial: ['comercial', 'vendas', 'venda'],
    clientes: ['cliente', 'inteligência'],
    financeira: ['financeiro', 'crédito', 'cobrança'],
    logistica: ['logístic', 'frete', 'entrega'],
    tecnica: ['técnic', 'suporte técnico'],
    margem: ['margem', 'estratégia'],
    recompra: ['recompra', 'oportunidade'],
    objecoes: ['objeç', 'persuasão'],
    mix: ['cross', 'mix', 'up-sell'],
  };
  for (const [domain, kws] of Object.entries(keywords)) {
    if (kws.some(kw => lower.includes(kw))) return domain;
  }
  return undefined;
};

const MODELOS_IA = [
  { value: 'google/gemini-3-flash-preview', label: 'Gemini 3 Flash (Rápido)' },
  { value: 'google/gemini-2.5-flash', label: 'Gemini 2.5 Flash (Balanceado)' },
  { value: 'google/gemini-2.5-pro', label: 'Gemini 2.5 Pro (Avançado)' },
  { value: 'openai/gpt-5-mini', label: 'GPT-5 Mini (Balanceado)' },
  { value: 'openai/gpt-5', label: 'GPT-5 (Avançado)' },
];

const EMOJIS = ['🤖', '🧠', '💡', '🎯', '📦', '🛒', '💬', '🔧', '📋', '🏷️', '⚡', '🌟', '🎓', '🏥', '🔍'];

interface Props {
  estabelecimentoId: string;
}

interface ApiEndpoint {
  id: string;
  name: string;
  description: string | null;
  endpoint_path: string;
}

const emptyForm: Partial<ChatAgent> = {
  nome: '',
  descricao: '',
  icone: '🤖',
  cor: '#8B5CF6',
  modo_operacao: 'sugerir',
  permite_cliente: false,
  system_prompt: '',
  modelo_ia: 'google/gemini-3-flash-preview',
  knowledge_base_type: 'nenhuma',
  knowledge_base_internal_data: [],
  api_endpoint_ids: [],
  usar_produtos_importados: false,
  usar_estoque_sistema: false,
  resposta_formato_tabela: false,
  acumular_filtros: false,
  regras_busca_personalizada: '',
  api_endpoint_config: {},
  solicitar_cnpj: false,
  gerar_pre_orcamento: false,
  tipo_agente: 'especifico',
  restringir_base_conhecimento: false,
  sub_agent_ids: [],
  ativo: true,
  ordem: 0,
};

export default function ChatAgentsCRUD({ estabelecimentoId }: Props) {
  const { agents, loading, createAgent, updateAgent, deleteAgent, refetch } = useChatAgents(estabelecimentoId);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [agentToDelete, setAgentToDelete] = useState<ChatAgent | null>(null);
  const [editingAgent, setEditingAgent] = useState<ChatAgent | null>(null);
  const [dialogTab, setDialogTab] = useState('identidade');
  const [formData, setFormData] = useState<Partial<ChatAgent>>(emptyForm);
  const [apiEndpoints, setApiEndpoints] = useState<ApiEndpoint[]>([]);
  const [kbFiles, setKbFiles] = useState<any[]>([]);
  const [uploading, setUploading] = useState(false);
  const [internalKbText, setInternalKbText] = useState('');
  const [previewType, setPreviewType] = useState<'estoque' | 'importados' | 'api' | null>(null);
  const [previewApiId, setPreviewApiId] = useState<string>('');
  const [previewApiName, setPreviewApiName] = useState<string>('');
  const [previewData, setPreviewData] = useState<any[]>([]);
  const [previewColumns, setPreviewColumns] = useState<string[]>([]);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewTab, setPreviewTab] = useState<'conhecimento' | 'apis' | null>(null);
  const [mainTab, setMainTab] = useState('agentes');
  const [showSetup, setShowSetup] = useState(false);
  const [autoOpenOrchestratorId, setAutoOpenOrchestratorId] = useState<string | null>(null);

  useEffect(() => {
    loadApiEndpoints();
  }, [estabelecimentoId]);

  const loadApiEndpoints = async () => {
    const { data } = await supabase
      .from('api_endpoints')
      .select('id, name, description, endpoint_path')
      .eq('estabelecimento_id', estabelecimentoId)
      .eq('active', true)
      .order('name');
    setApiEndpoints((data || []) as ApiEndpoint[]);
  };

  const loadKbFiles = async (agentId: string) => {
    const { data } = await supabase
      .from('chat_agent_kb_files')
      .select('*')
      .eq('agent_id', agentId)
      .order('created_at', { ascending: false });
    setKbFiles(data || []);
  };

  const handleOpenCreate = (presetType?: 'especifico' | 'orquestrador') => {
    setEditingAgent(null);
    setFormData({ ...emptyForm, ...(presetType ? { tipo_agente: presetType } : {}) });
    setKbFiles([]);
    setInternalKbText('');
    setDialogTab('identidade');
    setDialogOpen(true);
  };

  const handleOpenEdit = async (agent: ChatAgent) => {
    setEditingAgent(agent);
    setFormData({
      nome: agent.nome,
      descricao: agent.descricao,
      icone: agent.icone,
      cor: agent.cor,
      modo_operacao: agent.modo_operacao,
      permite_cliente: agent.permite_cliente,
      system_prompt: agent.system_prompt,
      modelo_ia: agent.modelo_ia,
      knowledge_base_type: agent.knowledge_base_type,
      knowledge_base_internal_data: agent.knowledge_base_internal_data || [],
      api_endpoint_ids: agent.api_endpoint_ids || [],
      usar_produtos_importados: agent.usar_produtos_importados ?? false,
      usar_estoque_sistema: agent.usar_estoque_sistema ?? false,
      resposta_formato_tabela: (agent as any).resposta_formato_tabela ?? false,
      acumular_filtros: (agent as any).acumular_filtros ?? false,
      regras_busca_personalizada: (agent as any).regras_busca_personalizada || '',
      api_endpoint_config: (agent as any).api_endpoint_config || {},
      solicitar_cnpj: (agent as any).solicitar_cnpj ?? false,
      gerar_pre_orcamento: (agent as any).gerar_pre_orcamento ?? false,
      tipo_agente: (agent as any).tipo_agente || 'especifico',
      sub_agent_ids: (agent as any).sub_agent_ids || [],
      restringir_base_conhecimento: (agent as any).restringir_base_conhecimento ?? false,
      ativo: agent.ativo,
      ordem: agent.ordem,
    });
    const internalData = agent.knowledge_base_internal_data || [];
    setInternalKbText(internalData.map((item: any) => typeof item === 'string' ? item : JSON.stringify(item)).join('\n\n'));
    await loadKbFiles(agent.id);
    setDialogTab('identidade');
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formData.nome?.trim()) {
      toast.error('Nome do agente é obrigatório');
      return;
    }
    // Prompt obrigatório apenas na edição de agente específico (orquestrador gera automaticamente)
    if (editingAgent && !formData.system_prompt?.trim() && (formData as any).tipo_agente !== 'orquestrador') {
      toast.error('Prompt do sistema é obrigatório');
      return;
    }
    // Auto-gerar prompt para orquestrador se estiver vazio
    if ((formData as any).tipo_agente === 'orquestrador' && !formData.system_prompt?.trim()) {
      const subIds = (formData as any).sub_agent_ids || [];
      const subNames = agents.filter(a => subIds.includes(a.id)).map(a => `${a.icone} ${a.nome}`);
      const autoPrompt = `Você é o orquestrador "${formData.nome}". Sua função é analisar a intenção do usuário e direcionar para o agente especialista mais adequado.\n\nAGENTES DISPONÍVEIS:\n${subNames.length ? subNames.map(n => `• ${n}`).join('\n') : '(nenhum agente vinculado ainda)'}\n\nREGRAS:\n• Identifique a intenção do usuário e acione o agente mais adequado\n• Se a pergunta envolver múltiplas áreas, combine as respostas\n• Seja claro e objetivo no direcionamento`;
      formData.system_prompt = autoPrompt;
    }

    const saveData = {
      ...formData,
      knowledge_base_internal_data: formData.knowledge_base_type === 'interna'
        ? internalKbText.split('\n\n').filter(Boolean).map(t => t.trim())
        : formData.knowledge_base_internal_data,
    };

    if (editingAgent) {
      await updateAgent(editingAgent.id, saveData);
    } else {
      const newAgent = await createAgent(saveData);
      if (newAgent) {
        // If orchestrator, switch to workflow tab and auto-open it
        if ((saveData as any).tipo_agente === 'orquestrador') {
          setAutoOpenOrchestratorId(newAgent.id);
          setMainTab('orquestrador');
          setDialogOpen(false);
        } else {
          // Re-open dialog in edit mode so Campos tab becomes available
          setEditingAgent(newAgent);
          setFormData({
            ...saveData,
            id: newAgent.id,
            created_at: newAgent.created_at,
            updated_at: newAgent.updated_at,
            estabelecimento_id: newAgent.estabelecimento_id,
          } as any);
          setDialogTab('campos');
          toast.success('Agente criado! Configure os campos do agente.');
        }
        return;
      }
    }
    setDialogOpen(false);
  };

  const handleUploadKbFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!editingAgent || !e.target.files?.length) return;
    setUploading(true);
    const files = Array.from(e.target.files);
    let successCount = 0;
    let errorCount = 0;
    try {
      for (const file of files) {
        try {
          const filePath = `chat-agents/${editingAgent.id}/${Date.now()}_${file.name}`;
          const { error: uploadError } = await supabase.storage
            .from('agent-knowledge-base')
            .upload(filePath, file);
          if (uploadError) throw uploadError;

          const { error: dbError } = await supabase
            .from('chat_agent_kb_files')
            .insert({
              agent_id: editingAgent.id,
              nome_arquivo: file.name,
              storage_path: filePath,
              mime_type: file.type,
              tamanho_bytes: file.size,
            } as any);
          if (dbError) throw dbError;
          successCount++;
        } catch {
          errorCount++;
        }
      }
      if (successCount > 0) toast.success(`${successCount} arquivo(s) enviado(s)!`);
      if (errorCount > 0) toast.error(`${errorCount} arquivo(s) com erro no upload.`);
      await loadKbFiles(editingAgent.id);
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteKbFile = async (fileId: string, storagePath: string) => {
    await supabase.storage.from('agent-knowledge-base').remove([storagePath]);
    await supabase.from('chat_agent_kb_files').delete().eq('id', fileId);
    setKbFiles(kbFiles.filter(f => f.id !== fileId));
    toast.success('Arquivo removido');
  };

  const confirmDelete = async () => {
    if (!agentToDelete) return;
    // Block deletion of any agent (specialist or orchestrator) used as sub-agent in any orchestrator
    const parentOrchs = agents.filter(a =>
      a.tipo_agente === 'orquestrador' &&
      a.id !== agentToDelete.id &&
      (a.sub_agent_ids || []).includes(agentToDelete.id)
    );
    if (parentOrchs.length > 0) {
      const names = parentOrchs.map(p => `"${p.nome}"`).join(', ');
      toast.error(`Não é possível excluir: este agente está vinculado ao(s) orquestrador(es) ${names}. Remova o vínculo primeiro.`);
      setDeleteDialogOpen(false);
      setAgentToDelete(null);
      return;
    }
    await deleteAgent(agentToDelete.id);
    setDeleteDialogOpen(false);
    setAgentToDelete(null);
  };

  const loadPreviewData = async (type: 'estoque' | 'importados' | 'api', apiId?: string, apiName?: string, tab?: 'conhecimento' | 'apis') => {
    setPreviewType(type);
    setPreviewApiId(apiId || '');
    setPreviewApiName(apiName || '');
    setPreviewLoading(true);
    setPreviewData([]);
    setPreviewColumns([]);
    setPreviewTab(tab || (type === 'api' ? 'apis' : 'conhecimento'));
    try {
      if (type === 'estoque') {
        const { data } = await supabase
          .from('produtos')
          .select('nome, codigo, marca, gramatura, largura, comprimento, estoque, preco_tabela, preco_minimo, material, ativo')
          .eq('estabelecimento_id', estabelecimentoId)
          .limit(200);
        const rows = data || [];
        setPreviewData(rows);
        setPreviewColumns(rows.length ? Object.keys(rows[0]) : []);
      } else if (type === 'importados') {
        // Buscar apenas produtos de relatórios ativos (mesma lógica do PDF/Excel da tela de importação)
        const { data: activeReports } = await supabase
          .from('relatorios_importacao')
          .select('id, nome')
          .eq('estabelecimento_id', estabelecimentoId)
          .eq('ativo', true);
        
        const activeIds = (activeReports || []).map(r => r.id);
        const reportNameMap: Record<string, string> = {};
        (activeReports || []).forEach((r: any) => { reportNameMap[r.id] = r.nome; });
        
        if (activeIds.length === 0) {
          setPreviewData([]);
          setPreviewColumns(['origem', 'nome', 'quantidade', 'gramatura', 'largura', 'comprimento', 'tipo', 'obs', 'embalagem', 'numero_folhas', 'diametro']);
        } else {
          const { data } = await supabase
            .from('produtos_importados')
            .select('relatorio_importacao_id, nome, quantidade, gramatura, largura, comprimento, tipo, obs, embalagem, numero_folhas, diametro')
            .eq('estabelecimento_id', estabelecimentoId)
            .in('relatorio_importacao_id', activeIds)
            .order('created_at', { ascending: false })
            .limit(200);
          const rows = (data || []).map((row: any) => {
            const { relatorio_importacao_id, ...rest } = row;
            return { origem: reportNameMap[relatorio_importacao_id] || 'Desconhecido', ...rest };
          });
          setPreviewData(rows);
          setPreviewColumns(rows.length ? Object.keys(rows[0]) : []);
        }
      } else if (type === 'api' && apiId) {
        // Buscar endpoint_path para montar URL completa (mesma lógica da tela de teste de API)
        const { data: ep } = await supabase
          .from('api_endpoints')
          .select('endpoint_path')
          .eq('id', apiId)
          .maybeSingle();
        if (ep) {
          const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
          const url = `https://${projectId}.supabase.co/functions/v1/execute-dynamic-query/${ep.endpoint_path}`;
          const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ endpoint_id: apiId }),
          });
          const result = await response.json();
          const rawData = Array.isArray(result)
            ? result
            : Array.isArray(result?.data)
              ? result.data
              : [];
          const rows = rawData.slice(0, 200).map((row: any) => ({ origem: apiName || 'API', ...row }));
          setPreviewData(rows);
          setPreviewColumns(rows.length ? Object.keys(rows[0]) : []);
        }
      }
    } catch (error: any) {
      toast.error(error?.message || 'Erro ao carregar preview');
    } finally {
      setPreviewLoading(false);
    }
  };

  const exportPreviewExcel = () => {
    if (!previewData.length || !previewType) return;
    const label = previewType === 'estoque' ? 'Estoque_Sistema' : previewType === 'importados' ? 'Produtos_Importados' : `API_${previewApiName || 'dados'}`;
    const ws = XLSX.utils.json_to_sheet(previewData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, label.substring(0, 31));
    XLSX.writeFile(wb, `${label}.xlsx`);
    toast.success('Excel exportado!');
  };

  const toggleEndpoint = (endpointId: string) => {
    const current = formData.api_endpoint_ids || [];
    if (current.includes(endpointId)) {
      setFormData({ ...formData, api_endpoint_ids: current.filter(id => id !== endpointId) });
    } else {
      setFormData({ ...formData, api_endpoint_ids: [...current, endpointId] });
    }
  };

  if (loading) return <div className="text-center py-8 text-muted-foreground">Carregando...</div>;

  if (showSetup) {
    return <AgentTemplateSetup estabelecimentoId={estabelecimentoId} onComplete={() => { setShowSetup(false); refetch(); }} />;
  }

  return (
    <div className="space-y-4">
      <Tabs value={mainTab} onValueChange={setMainTab}>
        <div className="flex items-center justify-between mb-4">
          <TabsList>
            <TabsTrigger value="agentes" className="gap-1"><Bot className="h-4 w-4" /> Agentes</TabsTrigger>
            <TabsTrigger value="geral" className="gap-1"><Settings className="h-4 w-4" /> Geral</TabsTrigger>
            
            <TabsTrigger value="orquestrador" className="gap-1"><Network className="h-4 w-4" /> Orquestrador</TabsTrigger>
            <TabsTrigger value="dashboard" className="gap-1"><BarChart3 className="h-4 w-4" /> Dashboard</TabsTrigger>
          </TabsList>
          <div className="flex gap-2">
            <AgentHelpGuide />
            {agents.length === 0 && (
              <Button variant="outline" onClick={() => setShowSetup(true)}>
                <Sparkles className="h-4 w-4 mr-2" /> Configuração Rápida
              </Button>
            )}
            {mainTab === 'agentes' && (
              <Button onClick={() => handleOpenCreate()}>
                <Plus className="h-4 w-4 mr-2" /> Novo Agente
              </Button>
            )}
          </div>
        </div>

        <TabsContent value="agentes" className="mt-0" forceMount>
      <div className="flex justify-between items-center mb-3">
        <p className="text-sm text-muted-foreground">
          {agents.length} agente{agents.length !== 1 ? 's' : ''} configurado{agents.length !== 1 ? 's' : ''}
        </p>
        {agents.length > 0 && (
          <Button variant="outline" size="sm" onClick={() => setShowSetup(true)}>
            <Sparkles className="h-4 w-4 mr-1" /> Adicionar Templates
          </Button>
        )}
      </div>

      {agents.length === 0 ? (
        <div className="text-center py-12 border rounded-lg border-dashed">
          <Bot className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
          <p className="text-muted-foreground">Nenhum agente criado ainda</p>
          <Button variant="link" size="sm" onClick={() => setShowSetup(true)}>
            <Sparkles className="h-4 w-4 mr-1" /> Usar Configuração Rápida
          </Button>
        </div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {agents.map(agent => (
            <Card key={agent.id} className={`transition-all ${(agent as any).tipo_agente === 'orquestrador' ? 'border-primary/30 bg-primary/5 dark:bg-primary/10 hover:border-primary/50 hover:bg-primary/10' : ''} ${!agent.ativo ? 'opacity-60' : ''}`}>
              <CardHeader className="pb-2 flex flex-row items-start justify-between space-y-0">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-2xl">{agent.icone}</span>
                  <div className="min-w-0">
                    <CardTitle className="text-sm truncate">{agent.nome}</CardTitle>
                    <CardDescription className="text-xs truncate">{agent.descricao || 'Sem descrição'}</CardDescription>
                  </div>
                </div>
                <Switch
                  checked={agent.ativo}
                  onCheckedChange={(checked) => updateAgent(agent.id, { ativo: checked } as any)}
                />
              </CardHeader>
              <CardContent className="pt-2">
                <div className="flex flex-wrap gap-1 mb-3">
                  <Badge variant={agent.permite_cliente ? 'default' : 'secondary'} className="text-xs">
                    {agent.permite_cliente ? <Zap className="h-3 w-3 mr-1" /> : <Wand2 className="h-3 w-3 mr-1" />}
                    {agent.permite_cliente ? 'Atende cliente' : 'Somente interno'}
                  </Badge>
                  {(agent as any).tipo_agente === 'orquestrador' && (
                    <Badge className="text-xs bg-primary/20 text-primary border-primary/30">
                      <Network className="h-3 w-3 mr-1" />
                      Orquestrador · {((agent as any).sub_agent_ids || []).length} agentes
                    </Badge>
                  )}
                  {agent.knowledge_base_type !== 'nenhuma' && (
                    <Badge variant="outline" className="text-xs">
                      <Brain className="h-3 w-3 mr-1" />
                      KB {agent.knowledge_base_type === 'interna' ? 'Interna' : agent.knowledge_base_type === 'terceiros' ? 'Terceiros' : 'Externa'}
                    </Badge>
                  )}
                  {(agent.api_endpoint_ids || []).length > 0 && (
                    <Badge variant="outline" className="text-xs">
                      <Database className="h-3 w-3 mr-1" />
                      {(agent.api_endpoint_ids || []).length} API{(agent.api_endpoint_ids || []).length > 1 ? 's' : ''}
                    </Badge>
                  )}
                  {agent.usar_estoque_sistema && (
                    <Badge variant="outline" className="text-xs">
                      <Database className="h-3 w-3 mr-1" />
                      Estoque
                    </Badge>
                  )}
                  {agent.usar_produtos_importados && (
                    <Badge variant="outline" className="text-xs">
                      <Package className="h-3 w-3 mr-1" />
                      Prod. Terceiros
                    </Badge>
                  )}
                  {/* Mostrar vínculo com orquestrador(es) para agentes não-orquestradores */}
                  {(agent as any).tipo_agente !== 'orquestrador' && (() => {
                    const parentOrchs = agents.filter(a => 
                      (a as any).tipo_agente === 'orquestrador' && 
                      ((a as any).sub_agent_ids || []).includes(agent.id)
                    );
                    return parentOrchs.length > 0 ? parentOrchs.map(p => (
                      <Badge key={p.id} variant="outline" className="text-xs border-primary/30 text-primary">
                        <Network className="h-3 w-3 mr-1" />
                        {p.nome}
                      </Badge>
                    )) : (
                      <Badge variant="outline" className="text-xs text-muted-foreground border-dashed">
                        Sem vínculo
                      </Badge>
                    );
                  })()}
                </div>
                <div className="flex gap-1 justify-end">
                  <Button variant="ghost" size="sm" onClick={() => handleOpenEdit(agent)}>
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => { setAgentToDelete(agent); setDeleteDialogOpen(true); }}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Dialog de Criar/Editar */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-[1180px] w-[calc(100vw-2rem)] max-h-[90vh] overflow-hidden flex flex-col p-0">
          <DialogHeader className="px-6 pt-6 pb-0 shrink-0">
            <DialogTitle className="flex items-center gap-2">
              <span className="text-2xl">{formData.icone || '🤖'}</span>
              {editingAgent ? 'Editar Agente' : 'Novo Agente de Chat'}
            </DialogTitle>
            <DialogDescription>Configure um agente de IA para auxiliar no atendimento</DialogDescription>
          </DialogHeader>

          <div className="flex-1 min-h-0 flex overflow-hidden">
            <Tabs value={dialogTab} onValueChange={setDialogTab} className="flex-1 min-w-0 flex flex-col overflow-hidden">
            <div className="px-6 pt-4 shrink-0">
              <TabsList className={`grid w-full ${(formData as any).tipo_agente === 'orquestrador' ? 'grid-cols-3' : 'grid-cols-6'}`}>
                <TabsTrigger value="identidade">Identidade</TabsTrigger>
                <TabsTrigger value="prompt">Prompt</TabsTrigger>
                {(formData as any).tipo_agente !== 'orquestrador' && (
                  <TabsTrigger value="campos" disabled={!editingAgent}>
                    <ListChecks className="h-3 w-3 mr-1" /> Campos
                  </TabsTrigger>
                )}
                {(formData as any).tipo_agente !== 'orquestrador' && (
                  <TabsTrigger value="regras">Regras</TabsTrigger>
                )}
                {(formData as any).tipo_agente !== 'orquestrador' && (
                  <TabsTrigger value="conhecimento">Conhecimento</TabsTrigger>
                )}
                {(formData as any).tipo_agente !== 'orquestrador' && (
                  <TabsTrigger value="dados">
                    <Database className="h-3 w-3 mr-1" /> Dados
                  </TabsTrigger>
                )}
              </TabsList>
            </div>

            <div className="flex-1 min-h-0 overflow-y-auto px-6 py-4">
              <TabsContent value="identidade" className="mt-0 space-y-4">
                <div>
                  <Label>Nome *</Label>
                  <Input value={formData.nome || ''} onChange={e => setFormData({ ...formData, nome: e.target.value })} placeholder="Ex: Consultor de Estoque" />
                </div>
                <div>
                  <Label>Tipo de Agente</Label>
                  <Select value={(formData as any).tipo_agente || 'especifico'} onValueChange={v => setFormData({ ...formData, tipo_agente: v as any })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="especifico">
                        <span className="flex items-center gap-2"><Bot className="h-4 w-4" /> Específico — Foca em uma única tarefa</span>
                      </SelectItem>
                      <SelectItem value="orquestrador">
                        <span className="flex items-center gap-2"><Network className="h-4 w-4" /> Orquestrador — Combina capacidades de vários agentes</span>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
{(formData as any).tipo_agente === 'orquestrador' && (
                  <div className="rounded-lg border p-4 space-y-2 bg-primary/5 border-primary/20">
                    <Label className="flex items-center gap-2 text-base font-semibold">
                      <Layers className="h-5 w-5 text-primary" />
                      Sub-Agentes (Capacidades)
                    </Label>
                    {((formData as any).sub_agent_ids || []).length > 0 ? (
                      <div className="space-y-1">
                        <p className="text-xs text-primary font-medium">
                          ✓ {((formData as any).sub_agent_ids || []).length} sub-agente(s) vinculado(s)
                        </p>
                        <div className="flex flex-wrap gap-1">
                          {((formData as any).sub_agent_ids || []).map((sid: string) => {
                            const sub = agents.find(a => a.id === sid);
                            return sub ? (
                              <Badge key={sid} variant="outline" className="text-xs">
                                {sub.icone} {sub.nome}
                              </Badge>
                            ) : null;
                          })}
                        </div>
                      </div>
                    ) : (
                      <p className="text-xs text-muted-foreground">Nenhum sub-agente vinculado.</p>
                    )}
                    <p className="text-xs text-muted-foreground italic flex items-center gap-1">
                      <Network className="h-3 w-3" />
                      Gerencie vínculos pelo Workflow Visual na aba Workflow.
                    </p>
                  </div>
                )}
                <div>
                  <Label>Descrição</Label>
                  <Input value={formData.descricao || ''} onChange={e => setFormData({ ...formData, descricao: e.target.value })} placeholder="Ex: Ajuda a encontrar produtos no estoque" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Ícone</Label>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {EMOJIS.map(emoji => (
                        <button
                          key={emoji}
                          type="button"
                          onClick={() => setFormData({ ...formData, icone: emoji })}
                          className={`text-xl p-1 rounded hover:bg-muted ${formData.icone === emoji ? 'bg-primary/20 ring-2 ring-primary' : ''}`}
                        >
                          {emoji}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <Label>Cor</Label>
                    <div className="flex gap-2 mt-1">
                      <Input type="color" value={formData.cor || '#8B5CF6'} onChange={e => setFormData({ ...formData, cor: e.target.value })} className="w-16 h-10" />
                      <Input value={formData.cor || '#8B5CF6'} onChange={e => setFormData({ ...formData, cor: e.target.value })} className="flex-1" />
                    </div>
                  </div>
                </div>
                <div className="flex items-center justify-between rounded-lg border p-3">
                  <div className="space-y-0.5">
                    <Label>Pode ser direcionado ao cliente</Label>
                    <p className="text-xs text-muted-foreground">
                      Se desativado, o agente só conversa com o atendente (chat privado) e não pode responder diretamente ao cliente.
                    </p>
                  </div>
                  <Switch
                    checked={formData.permite_cliente !== false}
                    onCheckedChange={(checked) => setFormData({ ...formData, permite_cliente: checked })}
                  />
                </div>
                <div className="flex items-center justify-between rounded-lg border p-3 border-dashed bg-muted/30">
                  <div className="space-y-0.5">
                    <Label className="flex items-center gap-2">
                      <Table className="h-4 w-4 text-primary" />
                      Respostas em Formato Tabela
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      Quando ativado, respostas com listas ou dados tabulares serão exibidas como tabela interativa com opção de download Excel.
                    </p>
                  </div>
                  <Switch
                    checked={formData.resposta_formato_tabela || false}
                    onCheckedChange={(checked) => setFormData({ ...formData, resposta_formato_tabela: checked })}
                  />
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg border">
                  <div className="space-y-0.5">
                    <Label className="flex items-center gap-2">
                      <Filter className="h-4 w-4 text-primary" />
                      Acumular Filtros Progressivamente
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      Quando ativado, o agente memoriza critérios de busca anteriores e pergunta se deseja acumulá-los com novos filtros.
                    </p>
                  </div>
                  <Switch
                    checked={formData.acumular_filtros || false}
                    onCheckedChange={(checked) => setFormData({ ...formData, acumular_filtros: checked })}
                  />
                </div>
                <div className="flex items-center justify-between rounded-lg border p-3 border-dashed bg-muted/30">
                  <div className="space-y-0.5">
                    <Label className="flex items-center gap-2">
                      <Brain className="h-4 w-4 text-primary" />
                      Solicitar CNPJ do Cliente
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      Ao iniciar, o agente pergunta o CNPJ para identificar o cliente e buscar histórico de compras.
                    </p>
                  </div>
                  <Switch
                    checked={(formData as any).solicitar_cnpj || false}
                    onCheckedChange={(checked) => setFormData({ ...formData, solicitar_cnpj: checked } as any)}
                  />
                </div>
                <div className="flex items-center justify-between rounded-lg border p-3 border-dashed bg-muted/30">
                  <div className="space-y-0.5">
                    <Label className="flex items-center gap-2">
                      <Package className="h-4 w-4 text-primary" />
                      Gerar Pré-Orçamento
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      Ao final da conversa, salva automaticamente os itens de interesse como rascunho de orçamento.
                    </p>
                  </div>
                  <Switch
                    checked={(formData as any).gerar_pre_orcamento || false}
                    onCheckedChange={(checked) => setFormData({ ...formData, gerar_pre_orcamento: checked } as any)}
                  />
                </div>
                <div>
                  <Label>Modelo de IA</Label>
                  <Select value={formData.modelo_ia} onValueChange={v => setFormData({ ...formData, modelo_ia: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {MODELOS_IA.map(m => (
                        <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Ordem</Label>
                  <Input type="number" value={formData.ordem || 0} onChange={e => setFormData({ ...formData, ordem: parseInt(e.target.value) || 0 })} />
                </div>
              </TabsContent>

              <TabsContent value="prompt" className="mt-0">
                <ChatAgentPromptWizard
                  value={formData.system_prompt || ''}
                  onChange={prompt => setFormData({ ...formData, system_prompt: prompt })}
                  agentName={formData.nome}
                  knowledgeBaseType={formData.knowledge_base_type}
                  knowledgeBaseSummary={
                    formData.knowledge_base_type === 'interna'
                      ? internalKbText
                      : formData.knowledge_base_type === 'externa'
                        ? kbFiles.map(f => `Arquivo: ${f.nome_arquivo}`).join('\n')
                        : undefined
                  }
                />
              </TabsContent>

              <TabsContent value="campos" className="mt-0">
                {editingAgent ? (
                  <AgentCustomFieldsManager
                    agentId={editingAgent.id}
                    estabelecimentoId={estabelecimentoId}
                    agentDomain={detectAgentDomain(editingAgent.nome)}
                    agentName={editingAgent.nome}
                    agentDescription={editingAgent.descricao || ''}
                  />
                ) : (
                  <div className="text-center py-8 text-muted-foreground text-sm">
                    Salve o agente primeiro para configurar campos personalizados
                  </div>
                )}
              </TabsContent>

              <TabsContent value="regras" className="mt-0 space-y-4">
                <div>
                  <Label className="text-base font-semibold">Regras de Busca Personalizada</Label>
                  <p className="text-xs text-muted-foreground mt-1 mb-3">
                    Defina regras de negócio para como o agente deve buscar produtos, sugerir alternativas, calcular cortes e interagir com o cliente.
                  </p>
                </div>

                <RulesAssistantChat
                  currentRules={(formData as any).regras_busca_personalizada || ''}
                  onApplyRules={(rules) => setFormData({ ...formData, regras_busca_personalizada: rules } as any)}
                />

                <div>
                  <Label>Regras atuais (editável)</Label>
                  <Textarea
                    value={(formData as any).regras_busca_personalizada || ''}
                    onChange={e => setFormData({ ...formData, regras_busca_personalizada: e.target.value } as any)}
                    placeholder="As regras geradas pelo assistente aparecerão aqui. Você também pode editar manualmente."
                    className="mt-2 min-h-[120px] text-xs font-mono"
                  />
                </div>
              </TabsContent>

              <TabsContent value="conhecimento" className="mt-0">
                <ScrollArea className="h-[60vh]">
                <div className="space-y-4">
                <div>
                  <Label className="text-base font-semibold">Tipo de Base de Conhecimento</Label>
                  <p className="text-xs text-muted-foreground mb-2">Define como o agente obtém informações para responder.</p>
                  <Select value={formData.knowledge_base_type} onValueChange={v => {
                    const tipo = v as any;
                    const resetFlags = tipo === 'nenhuma' || tipo === 'terceiros';
                    setFormData({
                      ...formData,
                      knowledge_base_type: tipo,
                      ...(resetFlags ? { usar_estoque_sistema: false, usar_produtos_importados: false, api_endpoint_ids: [] } : {}),
                    });
                  }}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="nenhuma">Somente Prompt — Responde apenas com as instruções do prompt</SelectItem>
                      <SelectItem value="interna">Interna — Prompt + textos digitados + flags + APIs</SelectItem>
                      <SelectItem value="externa">Externa — Prompt + upload de arquivos + flags + APIs</SelectItem>
                      <SelectItem value="terceiros">Terceiros — Usa conhecimento do modelo (Gemini, ChatGPT, etc.)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {formData.knowledge_base_type !== 'nenhuma' && formData.knowledge_base_type !== 'terceiros' && (
                  <div className="flex items-center justify-between rounded-lg border p-3 bg-muted/30">
                    <div className="space-y-0.5">
                      <Label className="text-sm font-medium">🔒 Restringir à Base de Conhecimento</Label>
                      <p className="text-xs text-muted-foreground">
                        Quando ativo, o agente responderá <strong>exclusivamente</strong> com base nos dados da base de conhecimento anexada. Perguntas fora do escopo serão recusadas educadamente.
                      </p>
                    </div>
                    <Switch
                      checked={(formData as any).restringir_base_conhecimento || false}
                      onCheckedChange={v => setFormData({ ...formData, restringir_base_conhecimento: v } as any)}
                    />
                  </div>
                )}

                {formData.knowledge_base_type === 'nenhuma' && (
                  <div className="rounded-lg border p-3 bg-muted/30 text-xs text-muted-foreground">
                    O agente responderá <strong>apenas</strong> com base no texto do prompt do sistema. Nenhuma fonte de dados adicional será utilizada.
                  </div>
                )}

                {formData.knowledge_base_type === 'terceiros' && (
                  <div className="rounded-lg border p-4 space-y-3 bg-muted/30">
                    <div className="flex items-center gap-2">
                      <Brain className="h-5 w-5 text-primary" />
                      <div>
                        <p className="text-sm font-medium">Base de Conhecimento do Modelo</p>
                        <p className="text-xs text-muted-foreground">
                          O agente utilizará o conhecimento pré-treinado do modelo de IA selecionado. Não é necessário enviar arquivos.
                        </p>
                      </div>
                    </div>
                    <div className="text-xs text-amber-600 bg-amber-50 rounded-lg p-2 flex items-start gap-2">
                      <span className="mt-0.5">⚠️</span>
                      <span>O modelo pode não ter informações específicas sobre seu negócio. Para dados exclusivos, use "Interna" ou "Externa".</span>
                    </div>
                  </div>
                )}

                {/* Fontes de dados do sistema — visível para interna e externa */}
                {(formData.knowledge_base_type === 'interna' || formData.knowledge_base_type === 'externa') && (
                  <>
                    <Separator />
                    <Label className="text-sm font-semibold">Fontes de Dados do Sistema</Label>
                    <div className="flex items-center justify-between rounded-lg border p-3">
                      <div className="space-y-0.5">
                        <Label className="flex items-center gap-2">
                          <Database className="h-4 w-4 text-primary" />
                          Usar Estoque do Sistema
                        </Label>
                        <p className="text-xs text-muted-foreground">Acesso aos produtos cadastrados no estoque (nome, código, preço, estoque, marca, etc.).</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => loadPreviewData('estoque', undefined, undefined, 'conhecimento')} title="Visualizar dados">
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Switch checked={formData.usar_estoque_sistema || false} onCheckedChange={(checked) => setFormData({ ...formData, usar_estoque_sistema: checked })} />
                      </div>
                    </div>
                    <div className="flex items-center justify-between rounded-lg border p-3">
                      <div className="space-y-0.5">
                        <Label className="flex items-center gap-2">
                          <Package className="h-4 w-4 text-primary" />
                          Usar Produtos Importados de Terceiros
                        </Label>
                        <p className="text-xs text-muted-foreground">Acesso aos dados de produtos de terceiros ativos e válidos.</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => loadPreviewData('importados', undefined, undefined, 'conhecimento')} title="Visualizar dados">
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Switch checked={formData.usar_produtos_importados || false} onCheckedChange={(checked) => setFormData({ ...formData, usar_produtos_importados: checked })} />
                      </div>
                    </div>
                  </>
                )}

                {/* Conteúdo textual — apenas interna */}
                {formData.knowledge_base_type === 'interna' && (
                  <>
                    <Separator />
                    <div>
                      <Label>Conteúdo da Base de Conhecimento</Label>
                      <Textarea
                        value={internalKbText}
                        onChange={e => setInternalKbText(e.target.value)}
                        placeholder="Ex: Nosso horário de funcionamento é de segunda a sexta, das 8h às 18h..."
                        rows={10}
                        className="font-mono text-sm"
                      />
                    </div>
                  </>
                )}

                {/* Upload de arquivos — apenas externa */}
                {formData.knowledge_base_type === 'externa' && (
                  <>
                    <Separator />
                    <div className="space-y-3 rounded-lg border p-4 bg-muted/30">
                      <Label className="flex items-center gap-2 text-base font-semibold">
                        <FileText className="h-5 w-5 text-primary" />
                        Arquivos da Base de Conhecimento
                      </Label>
                      <p className="text-xs text-muted-foreground">
                        {editingAgent
                          ? 'Envie arquivos PDF, TXT, MD, CSV, XLSX, JSON ou DOCX para o agente usar como referência.'
                          : 'Salve o agente primeiro para poder enviar arquivos.'}
                      </p>
                      {editingAgent ? (
                        <div className="flex gap-2 items-center">
                          <Input type="file" accept=".pdf,.txt,.md,.csv,.xlsx,.json,.docx" onChange={handleUploadKbFile} disabled={uploading} multiple className="cursor-pointer" />
                          {uploading && <span className="text-xs text-muted-foreground animate-pulse">Enviando...</span>}
                        </div>
                      ) : (
                        <div className="text-xs text-amber-600 bg-amber-50 rounded-lg p-2 flex items-start gap-2">
                          <span className="mt-0.5">⚠️</span>
                          <span>Salve o agente primeiro para habilitar o upload de arquivos.</span>
                        </div>
                      )}
                      {kbFiles.length > 0 && (
                        <div className="space-y-2">
                          {kbFiles.map(file => (
                            <div key={file.id} className="flex items-center justify-between border rounded-lg px-3 py-2 text-sm">
                              <div className="flex items-center gap-2 min-w-0">
                                <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
                                <span className="truncate">{file.nome_arquivo}</span>
                                <span className="text-xs text-muted-foreground">{file.tamanho_bytes ? `${(file.tamanho_bytes / 1024).toFixed(1)} KB` : ''}</span>
                              </div>
                              <Button variant="ghost" size="sm" onClick={() => handleDeleteKbFile(file.id, file.storage_path)}><X className="h-3 w-3" /></Button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </>
                )}

                {/* APIs de dados — visível para interna e externa */}
                {(formData.knowledge_base_type === 'interna' || formData.knowledge_base_type === 'externa') && (
                  <>
                    <Separator />
                    <div>
                      <Label className="text-sm font-semibold">APIs de Dados</Label>
                      <p className="text-xs text-muted-foreground mb-3">
                        Selecione os endpoints de API que o agente poderá consultar para obter dados em tempo real.
                      </p>
                      {apiEndpoints.length === 0 ? (
                        <div className="text-center py-6 border rounded-lg border-dashed">
                          <Database className="h-8 w-8 mx-auto text-muted-foreground/50 mb-2" />
                          <p className="text-sm text-muted-foreground">Nenhum endpoint de API configurado</p>
                          <p className="text-xs text-muted-foreground">Configure endpoints em Configurações &gt; API Endpoints</p>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {apiEndpoints.map(ep => {
                            const isChecked = (formData.api_endpoint_ids || []).includes(ep.id);
                            const epConfig = ((formData as any).api_endpoint_config || {})[ep.id];
                            const epTipo = epConfig?.tipo || 'estoque';
                            return (
                             <div key={ep.id} className="border rounded-lg px-3 py-2 space-y-2">
                              <div className="flex items-center space-x-3">
                                <Checkbox
                                  checked={isChecked}
                                  onCheckedChange={() => toggleEndpoint(ep.id)}
                                />
                                <div className="min-w-0 flex-1">
                                  <p className="text-sm font-medium">{ep.name}</p>
                                  <p className="text-xs text-muted-foreground truncate">{ep.description || ep.endpoint_path}</p>
                                </div>
                                <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => loadPreviewData('api', ep.id, ep.name, 'conhecimento')} title="Visualizar dados">
                                  <Eye className="h-4 w-4" />
                                </Button>
                              </div>
                              {isChecked && (
                                <div className="ml-8">
                                  <Select
                                    value={epTipo}
                                    onValueChange={(v) => {
                                      const config = { ...((formData as any).api_endpoint_config || {}) };
                                      config[ep.id] = { tipo: v };
                                      setFormData({ ...formData, api_endpoint_config: config } as any);
                                    }}
                                  >
                                    <SelectTrigger className="h-8 text-xs w-56">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="estoque">📦 Dados de Estoque</SelectItem>
                                      <SelectItem value="compras_cliente">🛒 Compras do Cliente</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>
                              )}
                             </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </>
                )}
                </div>
                </ScrollArea>
              </TabsContent>

              <TabsContent value="dados" className="mt-0">
                <AgentDataWizardGate estabelecimentoId={estabelecimentoId} agentId={editingAgent?.id} agentName={editingAgent?.nome} />
              </TabsContent>

              </div>
            </Tabs>

            {previewType && (
              <div className="hidden lg:flex w-[420px] border-l bg-muted/20 flex-col shrink-0">
                <div className="px-4 py-4 border-b bg-background shrink-0">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <Eye className="h-5 w-5 text-primary shrink-0" />
                        <p className="text-sm font-semibold truncate">
                          {previewType === 'estoque' ? 'Preview · Estoque do Sistema' : previewType === 'importados' ? 'Preview · Produtos Importados de Terceiros' : `Preview · API ${previewApiName}`}
                        </p>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {previewLoading ? 'Carregando dados...' : `${previewData.length} registros${previewData.length >= 200 ? ' (máx. 200)' : ''}`}
                      </p>
                    </div>
                    <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => { setPreviewType(null); setPreviewTab(null); }}>
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="mt-3">
                    <Button variant="outline" size="sm" onClick={exportPreviewExcel} disabled={!previewData.length}>
                      <Download className="h-4 w-4 mr-1" /> Exportar Excel
                    </Button>
                  </div>
                </div>
                <div className="flex-1 min-h-0 overflow-auto">
                  {previewLoading ? (
                    <div className="flex items-center justify-center h-full"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
                  ) : previewData.length === 0 ? (
                    <div className="flex items-center justify-center h-full text-sm text-muted-foreground px-4">Nenhum dado encontrado.</div>
                  ) : (
                    <div className="overflow-auto h-full p-4">
                      <UITable className="min-w-max">
                        <TableHeader>
                          <TableRow>
                            {previewColumns.map((col) => (
                              <TableHead key={col} className="whitespace-nowrap text-xs">{col}</TableHead>
                            ))}
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {previewData.map((row, index) => (
                            <TableRow key={index}>
                              {previewColumns.map((col) => (
                                <TableCell key={col} className="text-xs whitespace-nowrap max-w-[200px] truncate">
                                  {row[col] != null ? String(row[col]) : '-'}
                                </TableCell>
                              ))}
                            </TableRow>
                          ))}
                        </TableBody>
                      </UITable>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          <DialogFooter className="px-6 py-4 border-t shrink-0">
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave}>{editingAgent ? 'Atualizar' : 'Criar Agente'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirmação de exclusão */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Agente</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir o agente "{agentToDelete?.nome}"? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete}>Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

        </TabsContent>

        <TabsContent value="geral" className="mt-0">
          <AgentGlobalSettings estabelecimentoId={estabelecimentoId} />
        </TabsContent>


        <TabsContent value="orquestrador" className="mt-0">
          <AgentOrchestratorView agents={agents} estabelecimentoId={estabelecimentoId} onUpdate={refetch} onCreateAgent={() => handleOpenCreate('orquestrador')} onEditAgent={handleOpenEdit} onDeleteAgent={(agent) => { setAgentToDelete(agent); setDeleteDialogOpen(true); }} autoOpenOrchestratorId={autoOpenOrchestratorId} onAutoOpenConsumed={() => setAutoOpenOrchestratorId(null)} />
        </TabsContent>



        <TabsContent value="dashboard" className="mt-0">
          <AgentPerformanceDashboard estabelecimentoId={estabelecimentoId} agents={agents} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
