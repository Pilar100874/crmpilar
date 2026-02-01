import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { 
  ChevronDown, 
  ChevronUp, 
  MessageSquare, 
  Mail, 
  ShoppingCart, 
  Clock, 
  Tv, 
  MonitorOff,
  Circle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

interface UserMonitorRowProps {
  usuario: {
    id: string;
    nome: string;
    email: string;
  };
  usuarioId: string;
  isOnline: boolean;
  status: string;
  chatsAtivos: number;
  emailsAtivos: number;
  pedidosFechados: number;
  filaEspera: number;
  extensionActive: boolean;
  onViewScreen: () => void;
  estabelecimentoId: string;
}

interface ChatMessage {
  id: string;
  content?: string;
  body?: string;
  text?: string;
  sender: string;
  direction?: string;
  created_at: string;
}

interface ActiveConversation {
  id: string;
  canal: string;
  customer: {
    nome: string;
  };
}

interface ConversationDetail {
  id: string;
  canal: string;
  created_at: string;
  customer: {
    nome: string;
  };
}

interface PedidoDetail {
  id: string;
  numero: string;
  status: string;
  total: number;
  created_at: string;
  cliente_nome?: string;
}

export function UserMonitorRow({
  usuario,
  usuarioId,
  isOnline,
  status,
  chatsAtivos,
  emailsAtivos,
  pedidosFechados,
  filaEspera,
  extensionActive,
  onViewScreen,
  estabelecimentoId
}: UserMonitorRowProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [conversations, setConversations] = useState<ActiveConversation[]>([]);
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [loadingChats, setLoadingChats] = useState(false);
  
  // Detalhes para popovers
  const [chatsDetail, setChatsDetail] = useState<ConversationDetail[]>([]);
  const [emailsDetail, setEmailsDetail] = useState<ConversationDetail[]>([]);
  const [pedidosDetail, setPedidosDetail] = useState<PedidoDetail[]>([]);
  const [filaDetail, setFilaDetail] = useState<ConversationDetail[]>([]);

  // Carregar conversas do atendente quando expandir
  useEffect(() => {
    if (isOpen) {
      loadConversations();
    }
  }, [isOpen, usuarioId]);

  // Realtime para mensagens
  useEffect(() => {
    if (!selectedChatId) return;

    const channel = supabase
      .channel(`chat-spy-${selectedChatId}`)
      .on('postgres_changes', 
        { event: 'INSERT', schema: 'public', table: 'messages', filter: `conversation_id=eq.${selectedChatId}` },
        (payload) => {
          setChatMessages(prev => [...prev, payload.new as ChatMessage]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedChatId]);

  const loadChatsDetail = async () => {
    try {
      const { data: atendenteData } = await supabase
        .from('atendentes')
        .select('id')
        .eq('usuario_id', usuarioId)
        .eq('estabelecimento_id', estabelecimentoId)
        .single();

      if (!atendenteData) return;

      const { data } = await supabase
        .from('conversations')
        .select(`
          id,
          canal,
          created_at,
          customer:customers!conversations_customer_id_fkey(nome)
        `)
        .eq('atendente_atual_id', atendenteData.id)
        .eq('chat_status', 'em_atendimento')
        .neq('canal', 'email')
        .order('updated_at', { ascending: false })
        .limit(10);

      setChatsDetail((data as any) || []);
    } catch (error) {
      console.error('Erro ao carregar detalhes dos chats:', error);
    }
  };

  const loadEmailsDetail = async () => {
    try {
      const { data: atendenteData } = await supabase
        .from('atendentes')
        .select('id')
        .eq('usuario_id', usuarioId)
        .eq('estabelecimento_id', estabelecimentoId)
        .single();

      if (!atendenteData) return;

      const { data } = await supabase
        .from('conversations')
        .select(`
          id,
          canal,
          created_at,
          customer:customers!conversations_customer_id_fkey(nome)
        `)
        .eq('atendente_atual_id', atendenteData.id)
        .eq('chat_status', 'em_atendimento')
        .eq('canal', 'email')
        .order('updated_at', { ascending: false })
        .limit(10);

      setEmailsDetail((data as any) || []);
    } catch (error) {
      console.error('Erro ao carregar detalhes dos emails:', error);
    }
  };

  const loadPedidosDetail = async () => {
    try {
      const hoje = new Date();
      hoje.setHours(0, 0, 0, 0);

      // @ts-ignore - tipo muito complexo para inferir
      const result = await supabase
        .from('orcamentos')
        .select('id, numero, status, total, created_at, cliente_nome')
        .eq('estabelecimento_id', estabelecimentoId)
        .eq('usuario_id', usuarioId)
        .gte('created_at', hoje.toISOString())
        .order('created_at', { ascending: false })
        .limit(10);

      const data: any[] = result.data || [];
      
      const filtered = data.filter((p) => 
        ['aprovado', 'finalizado', 'faturado'].includes(p.status)
      );

      const formatted: PedidoDetail[] = filtered.map((p) => ({
        id: p.id,
        numero: p.numero || '-',
        status: p.status,
        total: p.total || 0,
        created_at: p.created_at,
        cliente_nome: p.cliente_nome || 'Cliente'
      }));

      setPedidosDetail(formatted);
    } catch (error) {
      console.error('Erro ao carregar detalhes dos pedidos:', error);
    }
  };

  const loadFilaDetail = async () => {
    try {
      const { data } = await supabase
        .from('conversations')
        .select(`
          id,
          canal,
          created_at,
          customer:customers!conversations_customer_id_fkey(nome)
        `)
        .eq('estabelecimento_id', estabelecimentoId)
        .eq('chat_status', 'em_fila')
        .order('created_at', { ascending: true })
        .limit(10);

      setFilaDetail((data as any) || []);
    } catch (error) {
      console.error('Erro ao carregar detalhes da fila:', error);
    }
  };

  const loadConversations = async () => {
    setLoadingChats(true);
    try {
      const { data: atendenteData } = await supabase
        .from('atendentes')
        .select('id')
        .eq('usuario_id', usuarioId)
        .eq('estabelecimento_id', estabelecimentoId)
        .single();

      if (!atendenteData) {
        setConversations([]);
        return;
      }

      const { data, error } = await supabase
        .from('conversations')
        .select(`
          id,
          canal,
          customer:customers!conversations_customer_id_fkey(nome)
        `)
        .eq('atendente_atual_id', atendenteData.id)
        .eq('chat_status', 'em_atendimento')
        .order('updated_at', { ascending: false });

      if (error) throw error;
      setConversations((data as any) || []);
      
      if (data && data.length > 0) {
        loadChatMessages(data[0].id);
      }
    } catch (error) {
      console.error('Erro ao carregar conversas:', error);
    } finally {
      setLoadingChats(false);
    }
  };

  const loadChatMessages = async (chatId: string) => {
    try {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', chatId)
        .order('created_at', { ascending: true })
        .limit(50);

      if (error) throw error;
      setChatMessages((data as ChatMessage[]) || []);
      setSelectedChatId(chatId);
    } catch (error) {
      console.error('Erro ao carregar mensagens:', error);
    }
  };

  const getStatusColor = (s: string) => {
    switch (s) {
      case 'disponivel': return 'bg-green-500';
      case 'ocupado': return 'bg-yellow-500';
      case 'pausa': return 'bg-orange-500';
      case 'offline': return 'bg-gray-500';
      default: return 'bg-gray-500';
    }
  };

  const getStatusLabel = (s: string) => {
    switch (s) {
      case 'disponivel': return 'Disponível';
      case 'ocupado': return 'Ocupado';
      case 'pausa': return 'Em Pausa';
      case 'offline': return 'Offline';
      default: return s;
    }
  };

  const formatTime = (date: string) => {
    return new Date(date).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <div className="border rounded-lg bg-card overflow-hidden">
        {/* Linha Resumo */}
        <CollapsibleTrigger asChild>
          <div className="flex items-center gap-4 p-3 hover:bg-accent/50 cursor-pointer transition-colors">
            {/* Avatar + Nome */}
            <div className="flex items-center gap-3 min-w-[200px]">
              <div className="relative">
                <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-sm font-medium">
                  {usuario.nome?.charAt(0)?.toUpperCase() || '?'}
                </div>
                <div className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-card ${
                  isOnline ? 'bg-green-500' : 'bg-gray-400'
                }`} />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium truncate">{usuario.nome}</p>
                <div className="flex items-center gap-1">
                  <div className={`w-2 h-2 rounded-full ${getStatusColor(status)}`} />
                  <span className="text-xs text-muted-foreground">{getStatusLabel(status)}</span>
                </div>
              </div>
            </div>

            {/* Métricas com Popovers */}
            <div className="flex items-center gap-6 flex-1">
              {/* Chats */}
              <Popover>
                <PopoverTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="h-auto p-1 hover:bg-blue-100 dark:hover:bg-blue-900/30"
                    onClick={(e) => {
                      e.stopPropagation();
                      loadChatsDetail();
                    }}
                  >
                    <div className="flex items-center gap-1.5">
                      <MessageSquare className="h-4 w-4 text-blue-500" />
                      <span className="text-sm font-medium">{chatsAtivos}</span>
                    </div>
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-72 p-0" onClick={(e) => e.stopPropagation()}>
                  <div className="p-3 border-b">
                    <p className="font-medium text-sm flex items-center gap-2">
                      <MessageSquare className="h-4 w-4 text-blue-500" />
                      Chats Ativos ({chatsAtivos})
                    </p>
                  </div>
                  <ScrollArea className="max-h-[200px]">
                    {chatsDetail.length === 0 ? (
                      <p className="p-3 text-sm text-muted-foreground">Nenhum chat ativo</p>
                    ) : (
                      <div className="p-2 space-y-1">
                        {chatsDetail.map((chat) => (
                          <div key={chat.id} className="flex items-center justify-between p-2 rounded hover:bg-accent/50">
                            <div>
                              <p className="text-sm font-medium">{chat.customer?.nome || 'Cliente'}</p>
                              <Badge variant="outline" className="text-[10px]">{chat.canal}</Badge>
                            </div>
                            <span className="text-xs text-muted-foreground">{formatTime(chat.created_at)}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </ScrollArea>
                </PopoverContent>
              </Popover>

              {/* Emails */}
              <Popover>
                <PopoverTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="h-auto p-1 hover:bg-purple-100 dark:hover:bg-purple-900/30"
                    onClick={(e) => {
                      e.stopPropagation();
                      loadEmailsDetail();
                    }}
                  >
                    <div className="flex items-center gap-1.5">
                      <Mail className="h-4 w-4 text-purple-500" />
                      <span className="text-sm font-medium">{emailsAtivos}</span>
                    </div>
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-72 p-0" onClick={(e) => e.stopPropagation()}>
                  <div className="p-3 border-b">
                    <p className="font-medium text-sm flex items-center gap-2">
                      <Mail className="h-4 w-4 text-purple-500" />
                      Emails Ativos ({emailsAtivos})
                    </p>
                  </div>
                  <ScrollArea className="max-h-[200px]">
                    {emailsDetail.length === 0 ? (
                      <p className="p-3 text-sm text-muted-foreground">Nenhum email ativo</p>
                    ) : (
                      <div className="p-2 space-y-1">
                        {emailsDetail.map((email) => (
                          <div key={email.id} className="flex items-center justify-between p-2 rounded hover:bg-accent/50">
                            <p className="text-sm font-medium">{email.customer?.nome || 'Cliente'}</p>
                            <span className="text-xs text-muted-foreground">{formatTime(email.created_at)}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </ScrollArea>
                </PopoverContent>
              </Popover>

              {/* Pedidos Fechados */}
              <Popover>
                <PopoverTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="h-auto p-1 hover:bg-green-100 dark:hover:bg-green-900/30"
                    onClick={(e) => {
                      e.stopPropagation();
                      loadPedidosDetail();
                    }}
                  >
                    <div className="flex items-center gap-1.5">
                      <ShoppingCart className="h-4 w-4 text-green-500" />
                      <span className="text-sm font-medium">{pedidosFechados}</span>
                    </div>
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-80 p-0" onClick={(e) => e.stopPropagation()}>
                  <div className="p-3 border-b">
                    <p className="font-medium text-sm flex items-center gap-2">
                      <ShoppingCart className="h-4 w-4 text-green-500" />
                      Pedidos Fechados Hoje ({pedidosFechados})
                    </p>
                  </div>
                  <ScrollArea className="max-h-[200px]">
                    {pedidosDetail.length === 0 ? (
                      <p className="p-3 text-sm text-muted-foreground">Nenhum pedido fechado hoje</p>
                    ) : (
                      <div className="p-2 space-y-1">
                        {pedidosDetail.map((pedido) => (
                          <div key={pedido.id} className="flex items-center justify-between p-2 rounded hover:bg-accent/50">
                            <div>
                              <p className="text-sm font-medium">#{pedido.numero}</p>
                              <p className="text-xs text-muted-foreground">{pedido.cliente_nome || 'Cliente'}</p>
                            </div>
                            <div className="text-right">
                              <p className="text-sm font-medium text-green-600">{formatCurrency(pedido.total)}</p>
                              <Badge variant="outline" className="text-[10px]">{pedido.status}</Badge>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </ScrollArea>
                </PopoverContent>
              </Popover>

              {/* Fila de Espera */}
              <Popover>
                <PopoverTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className={`h-auto p-1 ${filaEspera > 0 ? 'hover:bg-yellow-100 dark:hover:bg-yellow-900/30' : ''}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      loadFilaDetail();
                    }}
                  >
                    <div className="flex items-center gap-1.5">
                      <Clock className={`h-4 w-4 ${filaEspera > 0 ? 'text-yellow-500' : 'text-muted-foreground'}`} />
                      <span className={`text-sm font-medium ${filaEspera > 0 ? 'text-yellow-600' : ''}`}>
                        {filaEspera}
                      </span>
                    </div>
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-72 p-0" onClick={(e) => e.stopPropagation()}>
                  <div className="p-3 border-b">
                    <p className="font-medium text-sm flex items-center gap-2">
                      <Clock className="h-4 w-4 text-yellow-500" />
                      Fila de Espera ({filaEspera})
                    </p>
                  </div>
                  <ScrollArea className="max-h-[200px]">
                    {filaDetail.length === 0 ? (
                      <p className="p-3 text-sm text-muted-foreground">Nenhum cliente na fila</p>
                    ) : (
                      <div className="p-2 space-y-1">
                        {filaDetail.map((item, index) => (
                          <div key={item.id} className="flex items-center gap-2 p-2 rounded hover:bg-accent/50">
                            <div className="w-5 h-5 rounded-full bg-yellow-500 text-white flex items-center justify-center text-xs font-bold">
                              {index + 1}
                            </div>
                            <div className="flex-1">
                              <p className="text-sm font-medium">{item.customer?.nome || 'Cliente'}</p>
                              <Badge variant="outline" className="text-[10px]">{item.canal}</Badge>
                            </div>
                            <span className="text-xs text-muted-foreground">{formatTime(item.created_at)}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </ScrollArea>
                </PopoverContent>
              </Popover>
            </div>

            {/* Ações */}
            <div className="flex items-center gap-2">
              {/* Botão Ver Tela */}
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className={`h-8 w-8 ${extensionActive ? 'text-green-500 hover:text-green-600' : 'text-muted-foreground'}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (extensionActive) onViewScreen();
                    }}
                    disabled={!extensionActive}
                  >
                    {extensionActive ? <Tv className="h-4 w-4" /> : <MonitorOff className="h-4 w-4" />}
                  </Button>
                </PopoverTrigger>
                {!extensionActive && (
                  <PopoverContent className="w-48 p-2" onClick={(e) => e.stopPropagation()}>
                    <p className="text-xs text-muted-foreground">
                      Extensão de monitoramento não está ativa para este usuário.
                    </p>
                  </PopoverContent>
                )}
              </Popover>

              {/* Indicador de chats para expandir */}
              {chatsAtivos > 0 && (
                <Badge variant="outline" className="gap-1">
                  {isOpen ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                  Ver chats
                </Badge>
              )}
            </div>
          </div>
        </CollapsibleTrigger>

        {/* Área Expandida - Conversas */}
        <CollapsibleContent>
          <div className="border-t bg-muted/30 p-3">
            {loadingChats ? (
              <div className="text-center py-4 text-muted-foreground text-sm">
                Carregando conversas...
              </div>
            ) : conversations.length === 0 ? (
              <div className="text-center py-4 text-muted-foreground text-sm">
                Nenhuma conversa ativa
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
                {/* Lista de Conversas */}
                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground mb-2">Conversas Ativas</p>
                  {conversations.map((conv) => (
                    <div
                      key={conv.id}
                      onClick={(e) => {
                        e.stopPropagation();
                        loadChatMessages(conv.id);
                      }}
                      className={`flex items-center gap-2 p-2 rounded-lg cursor-pointer transition-colors ${
                        selectedChatId === conv.id 
                          ? 'bg-primary/10 border border-primary/30' 
                          : 'hover:bg-accent/50'
                      }`}
                    >
                      <MessageSquare className="h-4 w-4 text-blue-500" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm truncate">{conv.customer?.nome || 'Cliente'}</p>
                        <Badge variant="outline" className="text-[10px]">{conv.canal}</Badge>
                      </div>
                      {selectedChatId === conv.id && (
                        <Circle className="h-2 w-2 fill-green-500 text-green-500" />
                      )}
                    </div>
                  ))}
                </div>

                {/* Preview das Mensagens */}
                <div className="lg:col-span-2 bg-background rounded-lg border">
                  <div className="p-2 border-b">
                    <p className="text-xs font-medium text-muted-foreground">
                      {selectedChatId ? 'Mensagens em tempo real' : 'Selecione uma conversa'}
                    </p>
                  </div>
                  <ScrollArea className="h-[250px]">
                    {!selectedChatId ? (
                      <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
                        Selecione uma conversa ao lado
                      </div>
                    ) : chatMessages.length === 0 ? (
                      <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
                        Nenhuma mensagem
                      </div>
                    ) : (
                      <div className="space-y-2 p-3">
                        {chatMessages.map((msg) => (
                          <div
                            key={msg.id}
                            className={`p-2 rounded-lg max-w-[85%] ${
                              msg.sender === 'agent' || msg.direction === 'outgoing'
                                ? 'ml-auto bg-primary text-primary-foreground'
                                : 'bg-muted'
                            }`}
                          >
                            <p className="text-sm whitespace-pre-wrap break-words">
                              {msg.content || msg.body || msg.text}
                            </p>
                            <p className="text-[10px] opacity-70 mt-1">
                              {new Date(msg.created_at).toLocaleTimeString('pt-BR', {
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </p>
                          </div>
                        ))}
                      </div>
                    )}
                  </ScrollArea>
                </div>
              </div>
            )}
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}
