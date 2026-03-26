import { useState, useRef, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Send, ArrowLeft, Copy, Bot, Sparkles, Plus, MessageSquare, Trash2, Clock, Eraser, X, CheckSquare, ShoppingCart, FileText, Filter, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format, formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from '@/lib/toast-config';
import { supabase } from '@/integrations/supabase/client';
import { useChatAgents, type ChatAgent } from '@/hooks/useChatAgents';
import { getEstabelecimentoId } from '@/lib/estabelecimentoUtils';
import { parseAgentTableData, AgentTableRenderer } from '@/components/chat/AgentTableRenderer';
import { ScrollArea } from '@/components/ui/scroll-area';
import { DeleteConfirmDialog } from '@/components/ui/delete-confirm-dialog';

// Extract active filters from last assistant message
function extractActiveFilters(messages: { role: string; content: string }[]): string[] {
  for (let i = messages.length - 1; i >= 0; i--) {
    if (messages[i].role === 'assistant') {
      const content = messages[i].content;
      const match = content.match(/Filtros?\s*ativo[s]?\s*:\s*(.+?)(?:\n|$)/i);
      if (match) {
        return match[1].split('|').map(f => f.trim()).filter(f => f.length > 0);
      }
    }
  }
  return [];
}

interface AgentMessage {
  id?: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface ChatSession {
  id: string;
  agent_id: string;
  titulo: string;
  created_at: string;
  updated_at: string;
}

export default function AgentChat() {
  const [estabelecimentoId, setEstabelecimentoId] = useState<string | null>(null);
  const [usuarioId, setUsuarioId] = useState<string | null>(null);
  const { agents, loading: agentsLoading } = useChatAgents(estabelecimentoId);
  const [selectedAgent, setSelectedAgent] = useState<ChatAgent | null>(null);
  const [messages, setMessages] = useState<AgentMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [loadingSessions, setLoadingSessions] = useState(false);
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedSessionIds, setSelectedSessionIds] = useState<Set<string>>(new Set());
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteAllMode, setDeleteAllMode] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [cnpjCliente, setCnpjCliente] = useState<string | null>(null);
  const [preOrderItems, setPreOrderItems] = useState<any[] | null>(null);
  const [showPreOrder, setShowPreOrder] = useState(false);
  const [savingPreOrder, setSavingPreOrder] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const init = async () => {
      const estId = await getEstabelecimentoId();
      setEstabelecimentoId(estId);
      const { data: { user } } = await supabase.auth.getUser();
      if (user && estId) {
        const { data: usuario } = await supabase.from('usuarios').select('id').eq('auth_user_id', user.id).single();
        if (usuario) setUsuarioId(usuario.id);
      }
    };
    init();
  }, []);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, isLoading]);

  const activeAgents = agents.filter(a => a.ativo);

  // Load sessions for selected agent
  const loadSessions = useCallback(async (agentId: string) => {
    if (!usuarioId) return;
    setLoadingSessions(true);
    const { data } = await supabase
      .from('agent_chat_sessions')
      .select('*')
      .eq('agent_id', agentId)
      .eq('usuario_id', usuarioId)
      .order('updated_at', { ascending: false })
      .limit(50);
    setSessions((data as ChatSession[]) || []);
    setLoadingSessions(false);
  }, [usuarioId]);

  // Load messages for a session
  const loadSessionMessages = useCallback(async (sessionId: string) => {
    const { data } = await supabase
      .from('agent_chat_messages')
      .select('*')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: true });
    if (data) {
      setMessages(data.map((m: any) => ({
        id: m.id,
        role: m.role as 'user' | 'assistant',
        content: m.content,
        timestamp: new Date(m.created_at),
      })));
    }
  }, []);

  const handleSelectAgent = async (agent: ChatAgent) => {
    setSelectedAgent(agent);
    setMessages([]);
    setInput('');
    setActiveSessionId(null);
    setCnpjCliente(null);
    setPreOrderItems(null);
    setShowPreOrder(false);
    await loadSessions(agent.id);
  };

  const handleBack = () => {
    setSelectedAgent(null);
    setMessages([]);
    setInput('');
    setActiveSessionId(null);
    setSessions([]);
    setSelectionMode(false);
    setSelectedSessionIds(new Set());
    setCnpjCliente(null);
    setPreOrderItems(null);
    setShowPreOrder(false);
  };

  const handleSelectSession = async (session: ChatSession) => {
    if (selectionMode) {
      setSelectedSessionIds(prev => {
        const next = new Set(prev);
        if (next.has(session.id)) next.delete(session.id);
        else next.add(session.id);
        return next;
      });
      return;
    }
    setActiveSessionId(session.id);
    await loadSessionMessages(session.id);
  };

  const handleNewChat = () => {
    setActiveSessionId(null);
    setMessages([]);
    setInput('');
  };

  const handleDeleteSession = async (sessionId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const { error } = await supabase.from('agent_chat_sessions').delete().eq('id', sessionId);
    if (!error) {
      setSessions(prev => prev.filter(s => s.id !== sessionId));
      if (activeSessionId === sessionId) {
        setActiveSessionId(null);
        setMessages([]);
      }
      toast.success('Conversa excluída');
    }
  };

  const toggleSelectionMode = () => {
    setSelectionMode(prev => !prev);
    setSelectedSessionIds(new Set());
  };

  const toggleSelectAll = () => {
    if (selectedSessionIds.size === sessions.length) {
      setSelectedSessionIds(new Set());
    } else {
      setSelectedSessionIds(new Set(sessions.map(s => s.id)));
    }
  };

  const handleBulkDelete = () => {
    if (selectedSessionIds.size === 0) return;
    setDeleteAllMode(false);
    setShowDeleteConfirm(true);
  };

  const handleDeleteAll = () => {
    if (sessions.length === 0) return;
    setDeleteAllMode(true);
    setShowDeleteConfirm(true);
  };

  const confirmDelete = async () => {
    setIsDeleting(true);
    try {
      const idsToDelete = deleteAllMode ? sessions.map(s => s.id) : Array.from(selectedSessionIds);
      
      for (const id of idsToDelete) {
        await supabase.from('agent_chat_sessions').delete().eq('id', id);
      }

      setSessions(prev => prev.filter(s => !idsToDelete.includes(s.id)));
      if (idsToDelete.includes(activeSessionId || '')) {
        setActiveSessionId(null);
        setMessages([]);
      }
      setSelectionMode(false);
      setSelectedSessionIds(new Set());
      toast.success(`${idsToDelete.length} conversa(s) excluída(s)`);
    } catch {
      toast.error('Erro ao excluir conversas');
    } finally {
      setIsDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  const handleSend = useCallback(async () => {
    if (!input.trim() || !selectedAgent || isLoading || !usuarioId || !estabelecimentoId) return;
    const msg = input.trim();
    setInput('');

    const newUserMsg: AgentMessage = { role: 'user', content: msg, timestamp: new Date() };
    const newMessages = [...messages, newUserMsg];
    setMessages(newMessages);
    setIsLoading(true);

    try {
      // Create session if needed
      let sessionId = activeSessionId;
      if (!sessionId) {
        const titulo = msg.length > 60 ? msg.substring(0, 57) + '...' : msg;
        const { data: newSession, error: sessError } = await supabase
          .from('agent_chat_sessions')
          .insert({
            agent_id: selectedAgent.id,
            estabelecimento_id: estabelecimentoId,
            usuario_id: usuarioId,
            titulo,
          })
          .select()
          .single();
        if (sessError) throw sessError;
        sessionId = newSession.id;
        setActiveSessionId(sessionId);
        setSessions(prev => [newSession as ChatSession, ...prev]);
      } else {
        // Update session timestamp
        await supabase.from('agent_chat_sessions').update({ updated_at: new Date().toISOString() }).eq('id', sessionId);
      }

      // Save user message
      await supabase.from('agent_chat_messages').insert({
        session_id: sessionId,
        role: 'user',
        content: msg,
      });

      // Try to extract CNPJ from user message
      let currentCnpj = cnpjCliente;
      if ((selectedAgent as any).solicitar_cnpj && !currentCnpj) {
        const cnpjMatch = msg.match(/\d{2}\.?\d{3}\.?\d{3}\/?\d{4}-?\d{2}/);
        if (cnpjMatch) {
          currentCnpj = cnpjMatch[0].replace(/\D/g, '');
          setCnpjCliente(currentCnpj);
        }
      }

      // Call agent
      const { data, error } = await supabase.functions.invoke('chat-agent-execute', {
        body: {
          agent_id: selectedAgent.id,
          mensagem_cliente: msg,
          historico_chat: newMessages.map(m => ({ role: m.role, content: m.content })),
          modo_privado: true,
          contexto_chat_cliente: '',
          cnpj_cliente: currentCnpj || undefined,
        },
      });
      if (error) throw error;

      const assistantMsg: AgentMessage = { role: 'assistant', content: data.resposta, timestamp: new Date() };
      setMessages([...newMessages, assistantMsg]);

      // Detect pre-order data
      if (data.pre_order_data && data.pre_order_data.length > 0) {
        setPreOrderItems(data.pre_order_data);
        setShowPreOrder(true);
      }

      // Save assistant message
      await supabase.from('agent_chat_messages').insert({
        session_id: sessionId,
        role: 'assistant',
        content: data.resposta,
      });
    } catch (err: any) {
      toast.error(err.message || 'Erro ao consultar agente');
    } finally {
      setIsLoading(false);
    }
  }, [input, selectedAgent, isLoading, messages, usuarioId, estabelecimentoId, activeSessionId, cnpjCliente]);

  const handleCopy = (text: string) => { navigator.clipboard.writeText(text); toast.success('Copiado!'); };

  const handleSavePreOrder = async () => {
    if (!preOrderItems?.length || !estabelecimentoId || !usuarioId) return;
    setSavingPreOrder(true);
    try {
      // Find customer by CNPJ
      let clienteId: string | null = null;
      if (cnpjCliente) {
        const { data: customer } = await supabase
          .from('customers')
          .select('id')
          .eq('estabelecimento_id', estabelecimentoId)
          .or(`cnpj_cpf.eq.${cnpjCliente}`)
          .limit(1)
          .maybeSingle();
        clienteId = customer?.id || null;
      }

      // Create orcamento
      const { data: orc, error: orcError } = await supabase
        .from('orcamentos')
        .insert({
          estabelecimento_id: estabelecimentoId,
          vendedor_id: usuarioId,
          cliente_id: clienteId,
          status: 'rascunho',
          observacao: `Pré-orçamento gerado pelo agente "${selectedAgent?.nome}" via chat`,
        } as any)
        .select()
        .single();

      if (orcError) throw orcError;

      // Insert items
      for (const item of preOrderItems) {
        await supabase.from('orcamento_itens').insert({
          orcamento_id: orc.id,
          produto_nome: item.produto || 'Item',
          quantidade: parseFloat(item.quantidade) || 1,
          valor_unitario: 0,
          largura: item.largura || null,
          comprimento: item.comprimento || null,
          gramatura: item.gramatura || null,
          observacao: item.observacao || '',
        } as any);
      }

      toast.success(`Pré-orçamento criado com ${preOrderItems.length} item(ns)!`);
      setShowPreOrder(false);
    } catch (err: any) {
      toast.error('Erro ao salvar pré-orçamento: ' + (err.message || ''));
    } finally {
      setSavingPreOrder(false);
    }
  };

  // Agent selection screen
  if (!selectedAgent) {
    return (
      <div className="flex flex-col h-[100dvh] max-h-[100dvh] bg-background">
        <div className="border-b px-6 py-4">
          <h1 className="text-xl font-bold text-foreground flex items-center gap-2"><Bot className="h-6 w-6 text-primary" />Agentes de IA</h1>
          <p className="text-sm text-muted-foreground mt-1">Selecione um agente para iniciar uma conversa</p>
        </div>
        <div className="flex-1 overflow-y-auto p-6">
          {agentsLoading ? (
            <div className="flex items-center justify-center py-20"><div className="h-8 w-8 border-4 border-primary border-t-transparent rounded-full animate-spin" /></div>
          ) : activeAgents.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
              <Bot className="h-16 w-16 mb-4 opacity-30" /><p className="text-lg font-medium">Nenhum agente disponível</p><p className="text-sm">Configure seus agentes nas configurações de atendimento</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 max-w-4xl">
              {activeAgents.map(agent => {
                const color = agent.cor || '#6366f1';
                return (
                  <button key={agent.id} onClick={() => handleSelectAgent(agent)} className="text-left rounded-2xl border-2 p-5 transition-all hover:shadow-lg hover:scale-[1.02] active:scale-[0.98] group" style={{ borderColor: color + '30', background: color + '08' }}>
                    <div className="flex items-center gap-3 mb-3">
                      <div className="h-12 w-12 rounded-full flex items-center justify-center text-2xl flex-shrink-0" style={{ backgroundColor: color + '20' }}>{agent.icone}</div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold truncate" style={{ color }}>{agent.nome}</p>
                        <Badge variant="outline" className="text-[10px] mt-0.5" style={{ borderColor: color + '40', color }}>{agent.modelo_ia.split('/').pop()}</Badge>
                      </div>
                    </div>
                    {agent.descricao && <p className="text-xs text-muted-foreground line-clamp-2">{agent.descricao}</p>}
                    <div className="mt-3 flex items-center gap-1.5 text-xs font-medium opacity-0 group-hover:opacity-100 transition-opacity" style={{ color }}><Sparkles className="h-3.5 w-3.5" />Iniciar conversa</div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    );
  }

  const agentColor = selectedAgent.cor || '#6366f1';

  return (
    <div className="flex h-[100dvh] max-h-[100dvh] overflow-hidden bg-background">
      {/* Sidebar - Conversations List */}
      <div className="w-64 border-r flex flex-col bg-muted/30 max-h-full">
        <div className="p-3 border-b space-y-2">
          <Button onClick={handleNewChat} className="w-full gap-2 rounded-xl" size="sm" style={{ backgroundColor: agentColor }}>
            <Plus className="h-4 w-4" /> Nova conversa
          </Button>
          {sessions.length > 0 && (
            <div className="flex gap-1">
              {selectionMode ? (
                <>
                  <Button variant="ghost" size="sm" className="flex-1 gap-1 text-[10px] h-7" onClick={toggleSelectAll}>
                    <CheckSquare className="h-3 w-3" />
                    {selectedSessionIds.size === sessions.length ? 'Desmarcar' : 'Selecionar tudo'}
                  </Button>
                  <Button variant="destructive" size="sm" className="flex-1 gap-1 text-[10px] h-7" onClick={handleBulkDelete} disabled={selectedSessionIds.size === 0}>
                    <Trash2 className="h-3 w-3" /> Excluir ({selectedSessionIds.size})
                  </Button>
                  <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={toggleSelectionMode}>
                    <X className="h-3 w-3" />
                  </Button>
                </>
              ) : (
                <>
                  <Button variant="ghost" size="sm" className="flex-1 gap-1 text-[10px] h-7 text-muted-foreground" onClick={toggleSelectionMode}>
                    <CheckSquare className="h-3 w-3" /> Selecionar
                  </Button>
                  <Button variant="ghost" size="sm" className="flex-1 gap-1 text-[10px] h-7 text-destructive hover:text-destructive" onClick={handleDeleteAll}>
                    <Eraser className="h-3 w-3" /> Limpar tudo
                  </Button>
                </>
              )}
            </div>
          )}
        </div>
        <ScrollArea className="flex-1">
          <div className="p-2 space-y-1">
            {loadingSessions ? (
              <div className="flex justify-center py-4"><div className="h-5 w-5 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>
            ) : sessions.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-4">Nenhuma conversa anterior</p>
            ) : sessions.map(session => (
              <button
                key={session.id}
                onClick={() => handleSelectSession(session)}
                className={cn(
                  "w-full text-left rounded-lg px-3 py-2.5 text-sm transition-colors group flex items-start gap-2",
                  selectionMode && selectedSessionIds.has(session.id)
                    ? "bg-primary/15 text-foreground"
                    : activeSessionId === session.id
                      ? "bg-primary/10 text-foreground"
                      : "hover:bg-muted text-muted-foreground hover:text-foreground"
                )}
              >
                {selectionMode ? (
                  <Checkbox
                    checked={selectedSessionIds.has(session.id)}
                    className="mt-0.5 flex-shrink-0"
                    onClick={(e) => e.stopPropagation()}
                    onCheckedChange={() => {
                      setSelectedSessionIds(prev => {
                        const next = new Set(prev);
                        if (next.has(session.id)) next.delete(session.id);
                        else next.add(session.id);
                        return next;
                      });
                    }}
                  />
                ) : (
                  <MessageSquare className="h-4 w-4 mt-0.5 flex-shrink-0 opacity-50" />
                )}
                <div className="flex-1 min-w-0">
                  <p className="truncate text-xs font-medium">{session.titulo}</p>
                  <p className="text-[10px] opacity-60 flex items-center gap-1 mt-0.5">
                    <Clock className="h-2.5 w-2.5" />
                    {formatDistanceToNow(new Date(session.updated_at), { addSuffix: true, locale: ptBR })}
                  </p>
                </div>
                {!selectionMode && (
                  <button
                    onClick={(e) => handleDeleteSession(session.id, e)}
                    className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-destructive/10 rounded"
                  >
                    <Trash2 className="h-3 w-3 text-destructive" />
                  </button>
                )}
              </button>
            ))}
          </div>
        </ScrollArea>
        <div className="p-3 border-t">
          <Button variant="ghost" size="sm" className="w-full gap-2 text-xs" onClick={handleBack}>
            <ArrowLeft className="h-3.5 w-3.5" /> Voltar aos agentes
          </Button>
        </div>
      </div>

      <DeleteConfirmDialog
        open={showDeleteConfirm}
        onOpenChange={setShowDeleteConfirm}
        onConfirm={confirmDelete}
        isLoading={isDeleting}
        title="Limpar conversas"
        description={deleteAllMode
          ? `Tem certeza que deseja excluir todas as ${sessions.length} conversas? Esta ação não pode ser desfeita.`
          : `Tem certeza que deseja excluir ${selectedSessionIds.size} conversa(s) selecionada(s)? Esta ação não pode ser desfeita.`
        }
      />

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
        <div className="border-b px-4 py-3 flex items-center gap-3" style={{ background: agentColor + '08' }}>
          <div className="h-10 w-10 rounded-full flex items-center justify-center text-xl flex-shrink-0" style={{ backgroundColor: agentColor + '20' }}>{selectedAgent.icone}</div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold" style={{ color: agentColor }}>{selectedAgent.nome}</p>
            <p className="text-xs text-muted-foreground truncate">{selectedAgent.descricao || 'Agente de IA'}</p>
          </div>
        </div>

        <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.length === 0 && !isLoading && (
            <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
              <div className="h-16 w-16 rounded-full flex items-center justify-center text-3xl mb-4" style={{ backgroundColor: agentColor + '15' }}>{selectedAgent.icone}</div>
              <p className="font-medium" style={{ color: agentColor }}>Converse com {selectedAgent.nome}</p>
              <p className="text-sm mt-1">Envie uma mensagem para começar</p>
            </div>
          )}
          {messages.map((msg, i) => {
            const parsed = msg.role === 'assistant' ? parseAgentTableData(msg.content) : null;
            return (
              <div key={msg.id || i} className={cn("flex gap-2", msg.role === 'user' ? 'justify-end' : 'justify-start')}>
                {msg.role === 'assistant' && <div className="h-8 w-8 rounded-full flex items-center justify-center text-sm flex-shrink-0 mt-1" style={{ backgroundColor: agentColor + '20' }}>{selectedAgent.icone}</div>}
                <div className="max-w-[80%] space-y-1">
                  <div className={cn("rounded-2xl px-4 py-2.5 text-sm whitespace-pre-wrap", msg.role === 'user' ? "bg-primary text-primary-foreground rounded-br-md" : "bg-muted/80 text-foreground rounded-bl-md")}>
                    {parsed ? parsed.text : msg.content}
                    {parsed?.tableData && <AgentTableRenderer data={parsed.tableData} />}
                  </div>
                  <div className="flex items-center gap-2 px-1">
                    <span className="text-[10px] text-muted-foreground">{format(msg.timestamp, "HH:mm", { locale: ptBR })}</span>
                    {msg.role === 'assistant' && <button onClick={() => handleCopy(msg.content)} className="text-muted-foreground hover:text-foreground transition-colors"><Copy className="h-3 w-3" /></button>}
                  </div>
                </div>
              </div>
            );
          })}
          {isLoading && (
            <div className="flex gap-2">
              <div className="h-8 w-8 rounded-full flex items-center justify-center text-sm flex-shrink-0" style={{ backgroundColor: agentColor + '20' }}>{selectedAgent.icone}</div>
              <div className="bg-muted/80 rounded-2xl rounded-bl-md px-4 py-3">
                <div className="flex gap-1.5">
                  <div className="w-2 h-2 rounded-full animate-bounce" style={{ backgroundColor: agentColor, animationDelay: '0ms' }} />
                  <div className="w-2 h-2 rounded-full animate-bounce" style={{ backgroundColor: agentColor, animationDelay: '150ms' }} />
                  <div className="w-2 h-2 rounded-full animate-bounce" style={{ backgroundColor: agentColor, animationDelay: '300ms' }} />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Pre-order banner */}
        {showPreOrder && preOrderItems && preOrderItems.length > 0 && (
          <div className="border-t bg-accent/20 p-3 flex-shrink-0">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <ShoppingCart className="h-4 w-4 text-primary" />
                <span className="text-sm font-semibold">Pré-Orçamento Detectado ({preOrderItems.length} itens)</span>
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => setShowPreOrder(false)}>
                  <X className="h-3 w-3 mr-1" /> Dispensar
                </Button>
                <Button size="sm" onClick={handleSavePreOrder} disabled={savingPreOrder} style={{ backgroundColor: agentColor }}>
                  <FileText className="h-3 w-3 mr-1 text-white" />
                  <span className="text-white">{savingPreOrder ? 'Salvando...' : 'Salvar como Orçamento'}</span>
                </Button>
              </div>
            </div>
            <div className="max-h-32 overflow-y-auto space-y-1">
              {preOrderItems.map((item: any, i: number) => (
                <div key={i} className="text-xs bg-background rounded px-2 py-1 flex justify-between">
                  <span className="font-medium">{item.produto}</span>
                  <span className="text-muted-foreground">Qtd: {item.quantidade || '1'} {item.gramatura ? `| ${item.gramatura}g` : ''} {item.largura ? `| L:${item.largura}` : ''}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* CNPJ indicator */}
        {cnpjCliente && (
          <div className="px-4 py-1 bg-muted/50 border-t flex items-center gap-2 flex-shrink-0">
            <span className="text-[10px] text-muted-foreground">CNPJ: {cnpjCliente}</span>
          </div>
        )}

        {/* Active filters bar */}
        {(() => {
          const activeFilters = (selectedAgent as any)?.acumular_filtros ? extractActiveFilters(messages) : [];
          if (activeFilters.length === 0) return null;
          return (
            <div className="border-t px-4 py-2 flex-shrink-0 bg-muted/30">
              <div className="flex items-center gap-2 flex-wrap">
                <Filter className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                <span className="text-[10px] text-muted-foreground font-medium">Filtros:</span>
                {activeFilters.map((filter, idx) => (
                  <Badge key={idx} variant="secondary" className="text-[11px] gap-1 pl-2 pr-1 py-0.5 cursor-pointer hover:bg-destructive/10 transition-colors group" onClick={() => {
                    const filterName = filter.split('=')[0]?.trim();
                    setInput(`remover filtro ${filterName}`);
                    setTimeout(() => handleSend(), 100);
                  }}>
                    {filter}
                    <XCircle className="h-3 w-3 text-muted-foreground group-hover:text-destructive transition-colors" />
                  </Badge>
                ))}
                <Button variant="ghost" size="sm" className="h-6 text-[10px] px-2 text-destructive hover:text-destructive hover:bg-destructive/10" onClick={() => {
                  setInput('limpar todos os filtros');
                  setTimeout(() => handleSend(), 100);
                }}>
                  <Eraser className="h-3 w-3 mr-1" /> Limpar tudo
                </Button>
              </div>
            </div>
          );
        })()}

        <div className="border-t p-4 flex-shrink-0" style={{ background: agentColor + '05' }}>
          <div className="flex items-end gap-2">
            <Textarea ref={textareaRef} value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }} placeholder={`Pergunte ao ${selectedAgent.nome}...`} className="min-h-[44px] max-h-[120px] resize-none rounded-xl text-sm" disabled={isLoading} />
            <Button onClick={handleSend} disabled={!input.trim() || isLoading} size="icon" className="rounded-full h-10 w-10 flex-shrink-0" style={{ backgroundColor: agentColor }}><Send className="h-4 w-4 text-white" /></Button>
          </div>
        </div>
      </div>
    </div>
  );
}
