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
import { Plus, Edit, Trash2, Bot, Wand2, Zap, Upload, X, Database, FileText, Brain, Package } from 'lucide-react';
import { toast } from 'sonner';
import { ChatAgentPromptWizard } from '@/components/config/ChatAgentPromptWizard';

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
  ativo: true,
  ordem: 0,
};

export default function ChatAgentsCRUD({ estabelecimentoId }: Props) {
  const { agents, loading, createAgent, updateAgent, deleteAgent } = useChatAgents(estabelecimentoId);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [agentToDelete, setAgentToDelete] = useState<ChatAgent | null>(null);
  const [editingAgent, setEditingAgent] = useState<ChatAgent | null>(null);
  const [formData, setFormData] = useState<Partial<ChatAgent>>(emptyForm);
  const [apiEndpoints, setApiEndpoints] = useState<ApiEndpoint[]>([]);
  const [kbFiles, setKbFiles] = useState<any[]>([]);
  const [uploading, setUploading] = useState(false);
  const [internalKbText, setInternalKbText] = useState('');

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

  const handleOpenCreate = () => {
    setEditingAgent(null);
    setFormData({ ...emptyForm });
    setKbFiles([]);
    setInternalKbText('');
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
      ativo: agent.ativo,
      ordem: agent.ordem,
    });
    const internalData = agent.knowledge_base_internal_data || [];
    setInternalKbText(internalData.map((item: any) => typeof item === 'string' ? item : JSON.stringify(item)).join('\n\n'));
    await loadKbFiles(agent.id);
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formData.nome?.trim()) {
      toast.error('Nome do agente é obrigatório');
      return;
    }
    if (!formData.system_prompt?.trim()) {
      toast.error('Prompt do sistema é obrigatório');
      return;
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
      await createAgent(saveData);
    }
    setDialogOpen(false);
  };

  const handleUploadKbFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!editingAgent || !e.target.files?.length) return;
    setUploading(true);
    try {
      const file = e.target.files[0];
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

      toast.success('Arquivo enviado!');
      await loadKbFiles(editingAgent.id);
    } catch (err: any) {
      toast.error(`Erro no upload: ${err.message}`);
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
    await deleteAgent(agentToDelete.id);
    setDeleteDialogOpen(false);
    setAgentToDelete(null);
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

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-sm text-muted-foreground">
          {agents.length} agente{agents.length !== 1 ? 's' : ''} configurado{agents.length !== 1 ? 's' : ''}
        </p>
        <Button onClick={handleOpenCreate}>
          <Plus className="h-4 w-4 mr-2" /> Novo Agente
        </Button>
      </div>

      {agents.length === 0 ? (
        <div className="text-center py-12 border rounded-lg border-dashed">
          <Bot className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
          <p className="text-muted-foreground">Nenhum agente criado ainda</p>
          <p className="text-xs text-muted-foreground mt-1">Crie agentes de IA para auxiliar no atendimento</p>
        </div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {agents.map(agent => (
            <Card key={agent.id} className={`transition-all ${!agent.ativo ? 'opacity-60' : ''}`}>
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
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col p-0">
          <DialogHeader className="px-6 pt-6 pb-0 shrink-0">
            <DialogTitle className="flex items-center gap-2">
              <span className="text-2xl">{formData.icone || '🤖'}</span>
              {editingAgent ? 'Editar Agente' : 'Novo Agente de Chat'}
            </DialogTitle>
            <DialogDescription>Configure um agente de IA para auxiliar no atendimento</DialogDescription>
          </DialogHeader>

          <Tabs defaultValue="identidade" className="flex-1 flex flex-col overflow-hidden">
            <div className="px-6 pt-4 shrink-0">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="identidade">Identidade</TabsTrigger>
                <TabsTrigger value="prompt">Prompt</TabsTrigger>
                <TabsTrigger value="conhecimento">Conhecimento</TabsTrigger>
                <TabsTrigger value="apis">APIs</TabsTrigger>
              </TabsList>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-4">
              <TabsContent value="identidade" className="mt-0 space-y-4">
                <div>
                  <Label>Nome *</Label>
                  <Input value={formData.nome || ''} onChange={e => setFormData({ ...formData, nome: e.target.value })} placeholder="Ex: Consultor de Estoque" />
                </div>
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
                />
              </TabsContent>

              <TabsContent value="conhecimento" className="mt-0 space-y-4">
                <div className="flex items-center justify-between rounded-lg border p-3">
                  <div className="space-y-0.5">
                    <Label className="flex items-center gap-2">
                      <Database className="h-4 w-4 text-primary" />
                      Usar Estoque do Sistema
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      O agente terá acesso aos produtos cadastrados no estoque do sistema (nome, código, preço, estoque disponível, marca, etc.).
                    </p>
                  </div>
                  <Switch
                    checked={formData.usar_estoque_sistema || false}
                    onCheckedChange={(checked) => setFormData({ ...formData, usar_estoque_sistema: checked })}
                  />
                </div>

                <div className="flex items-center justify-between rounded-lg border p-3">
                  <div className="space-y-0.5">
                    <Label className="flex items-center gap-2">
                      <Package className="h-4 w-4 text-primary" />
                      Usar Produtos Importados de Terceiros
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      O agente terá acesso aos dados de produtos de terceiros ativos e válidos para enriquecer suas respostas com informações de estoque, preços e detalhes dos fornecedores.
                    </p>
                  </div>
                  <Switch
                    checked={formData.usar_produtos_importados || false}
                    onCheckedChange={(checked) => setFormData({ ...formData, usar_produtos_importados: checked })}
                  />
                </div>

                <Separator />

                <div>
                  <Label>Tipo de Base de Conhecimento</Label>
                  <Select value={formData.knowledge_base_type} onValueChange={v => setFormData({ ...formData, knowledge_base_type: v as any })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="nenhuma">Nenhuma — Apenas o prompt do sistema</SelectItem>
                      <SelectItem value="interna">Interna — Textos inseridos manualmente</SelectItem>
                      <SelectItem value="externa">Externa — Upload de arquivos ou flags marcados</SelectItem>
                      <SelectItem value="terceiros">Terceiros — Base de conhecimento do modelo (Gemini, ChatGPT, etc.)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {formData.knowledge_base_type === 'interna' && (
                  <div>
                    <Label>Conteúdo da Base de Conhecimento</Label>
                    <p className="text-xs text-muted-foreground mb-2">
                      Insira o conteúdo que o agente deve usar como referência. Separe blocos de informação com linhas em branco.
                    </p>
                    <Textarea
                      value={internalKbText}
                      onChange={e => setInternalKbText(e.target.value)}
                      placeholder="Ex: Nosso horário de funcionamento é de segunda a sexta, das 8h às 18h..."
                      rows={10}
                      className="font-mono text-sm"
                    />
                  </div>
                )}

                {formData.knowledge_base_type === 'externa' && (
                  <div className="space-y-3 rounded-lg border p-4 bg-muted/30">
                    <div>
                      <Label className="flex items-center gap-2 text-base font-semibold">
                        <FileText className="h-5 w-5 text-primary" />
                        Arquivos da Base de Conhecimento
                      </Label>
                      <p className="text-xs text-muted-foreground mt-1 mb-3">
                        {editingAgent
                          ? 'Envie arquivos PDF, TXT, MD, CSV, XLSX, JSON ou DOCX para o agente usar como referência.'
                          : 'Salve o agente primeiro para poder enviar arquivos.'}
                      </p>
                      {editingAgent ? (
                        <div className="flex gap-2 items-center">
                          <Input
                            type="file"
                            accept=".pdf,.txt,.md,.csv,.xlsx,.json,.docx"
                            onChange={handleUploadKbFile}
                            disabled={uploading}
                            className="cursor-pointer"
                          />
                          {uploading && <span className="text-xs text-muted-foreground animate-pulse">Enviando...</span>}
                        </div>
                      ) : (
                        <div className="text-xs text-amber-600 bg-amber-50 rounded-lg p-2 flex items-start gap-2">
                          <span className="mt-0.5">⚠️</span>
                          <span>Salve o agente primeiro para habilitar o upload de arquivos.</span>
                        </div>
                      )}
                    </div>
                    {kbFiles.length > 0 && (
                      <div className="space-y-2">
                        {kbFiles.map(file => (
                          <div key={file.id} className="flex items-center justify-between border rounded-lg px-3 py-2 text-sm">
                            <div className="flex items-center gap-2 min-w-0">
                              <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
                              <span className="truncate">{file.nome_arquivo}</span>
                              <span className="text-xs text-muted-foreground">
                                {file.tamanho_bytes ? `${(file.tamanho_bytes / 1024).toFixed(1)} KB` : ''}
                              </span>
                            </div>
                            <Button variant="ghost" size="sm" onClick={() => handleDeleteKbFile(file.id, file.storage_path)}>
                              <X className="h-3 w-3" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {formData.knowledge_base_type === 'terceiros' && (
                  <div className="rounded-lg border p-4 space-y-3 bg-muted/30">
                    <div className="flex items-center gap-2">
                      <Brain className="h-5 w-5 text-primary" />
                      <div>
                        <p className="text-sm font-medium">Base de Conhecimento do Modelo</p>
                        <p className="text-xs text-muted-foreground">
                          O agente utilizará o conhecimento pré-treinado do modelo de IA selecionado (ex: Gemini, ChatGPT). 
                          Não é necessário enviar arquivos — o modelo responde com base no seu treinamento geral.
                        </p>
                      </div>
                    </div>
                    <div className="text-xs text-amber-600 bg-amber-50 rounded-lg p-2 flex items-start gap-2">
                      <span className="mt-0.5">⚠️</span>
                      <span>O modelo pode não ter informações específicas sobre seu negócio. Para dados exclusivos, use a opção "Interna" ou "Externa".</span>
                    </div>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="apis" className="mt-0 space-y-4">
                <div>
                  <Label>APIs de Dados (Estoque, Produtos, etc.)</Label>
                  <p className="text-xs text-muted-foreground mb-3">
                    Selecione os endpoints de API que o agente poderá consultar para obter dados em tempo real.
                    Configure os endpoints em "API Endpoints" no menu de configurações.
                  </p>
                  {apiEndpoints.length === 0 ? (
                    <div className="text-center py-6 border rounded-lg border-dashed">
                      <Database className="h-8 w-8 mx-auto text-muted-foreground/50 mb-2" />
                      <p className="text-sm text-muted-foreground">Nenhum endpoint de API configurado</p>
                      <p className="text-xs text-muted-foreground">Configure endpoints em Configurações &gt; API Endpoints</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {apiEndpoints.map(ep => (
                        <div key={ep.id} className="flex items-center space-x-3 border rounded-lg px-3 py-2">
                          <Checkbox
                            checked={(formData.api_endpoint_ids || []).includes(ep.id)}
                            onCheckedChange={() => toggleEndpoint(ep.id)}
                          />
                          <div className="min-w-0">
                            <p className="text-sm font-medium">{ep.name}</p>
                            <p className="text-xs text-muted-foreground truncate">{ep.description || ep.endpoint_path}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </TabsContent>
            </div>
          </Tabs>

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
    </div>
  );
}
