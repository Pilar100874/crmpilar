import { useState, useEffect, useRef } from 'react';
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
  Circle,
  Monitor,
  Eye,
  Maximize2,
  Minimize2,
  RefreshCw,
  X
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

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
  currentPage: string | null;
  currentRoute: string | null;
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
  updated_at: string;
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

type ExpandedSection = 'chats' | 'emails' | 'pedidos' | 'spy' | 'screen' | null;

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
  currentPage,
  currentRoute,
  onViewScreen,
  estabelecimentoId
}: UserMonitorRowProps) {
  const [expandedSection, setExpandedSection] = useState<ExpandedSection>(null);
  const [conversations, setConversations] = useState<ActiveConversation[]>([]);
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [loadingChats, setLoadingChats] = useState(false);
  
  // Detalhes para seções expandidas
  const [chatsDetail, setChatsDetail] = useState<ConversationDetail[]>([]);
  const [emailsDetail, setEmailsDetail] = useState<ConversationDetail[]>([]);
  const [pedidosDetail, setPedidosDetail] = useState<PedidoDetail[]>([]);
  const [filaDetail, setFilaDetail] = useState<ConversationDetail[]>([]);
  
  // Screen viewer state
  const [currentFrame, setCurrentFrame] = useState<string | null>(null);
  const [isScreenConnecting, setIsScreenConnecting] = useState(false);
  const [lastScreenUpdate, setLastScreenUpdate] = useState<Date | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const screenChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  // Screen viewer realtime connection
  useEffect(() => {
    if (expandedSection !== 'screen') {
      // Cleanup screen channel when not viewing
      if (screenChannelRef.current) {
        // Notify viewer stop
        supabase.functions.invoke('extension-status', {
          body: { usuario_id: usuarioId, action: 'viewer-stop' }
        }).catch(err => console.error('[Screen] Erro ao parar viewer:', err));
        
        supabase.removeChannel(screenChannelRef.current);
        screenChannelRef.current = null;
        setCurrentFrame(null);
        setLastScreenUpdate(null);
      }
      return;
    }

    // Start screen viewer
    const startScreenViewer = async () => {
      setIsScreenConnecting(true);
      
      try {
        // Notify viewer start
        await supabase.functions.invoke('extension-status', {
          body: { usuario_id: usuarioId, action: 'viewer-start' }
        });
        console.log('[Screen] Viewer iniciado para:', usuarioId);
      } catch (err) {
        console.error('[Screen] Erro ao iniciar viewer:', err);
      }

      // Connect to broadcast channel
      const channel = supabase.channel(`screen-share-${usuarioId}`)
        .on('broadcast', { event: 'frame' }, (payload) => {
          if (payload.payload?.frame) {
            setCurrentFrame(payload.payload.frame);
            setLastScreenUpdate(new Date());
            setIsScreenConnecting(false);
          }
        })
        .subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            console.log('[Screen] Conectado ao canal de tela');
            setIsScreenConnecting(false);
          }
        });

      screenChannelRef.current = channel;
    };

    startScreenViewer();

    return () => {
      if (screenChannelRef.current) {
        supabase.functions.invoke('extension-status', {
          body: { usuario_id: usuarioId, action: 'viewer-stop' }
        }).catch(err => console.error('[Screen] Erro ao parar viewer:', err));
        
        supabase.removeChannel(screenChannelRef.current);
        screenChannelRef.current = null;
      }
    };
  }, [expandedSection, usuarioId]);

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
          updated_at,
          customer:customers!conversations_customer_id_fkey(nome)
        `)
        .eq('atendente_atual_id', atendenteData.id)
        .eq('chat_status', 'em_atendimento')
        .neq('canal', 'email')
        .order('updated_at', { ascending: false })
        .limit(20);

      setChatsDetail((data as any) || []);
      
      // Também carregar conversas para spy
      setConversations((data as any) || []);
      if (data && data.length > 0) {
        loadChatMessages(data[0].id);
      }
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
          updated_at,
          customer:customers!conversations_customer_id_fkey(nome)
        `)
        .eq('atendente_atual_id', atendenteData.id)
        .eq('chat_status', 'em_atendimento')
        .eq('canal', 'email')
        .order('updated_at', { ascending: false })
        .limit(20);

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
      const result = await (supabase as any)
        .from('orcamentos')
        .select('id, numero, status, total, created_at, cliente_nome')
        .eq('estabelecimento_id', estabelecimentoId)
        .eq('usuario_id', usuarioId)
        .gte('created_at', hoje.toISOString())
        .order('created_at', { ascending: false })
        .limit(20);


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
          updated_at,
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

  const loadConversationsForSpy = async () => {
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

  const handleSectionClick = (section: ExpandedSection) => {
    if (expandedSection === section) {
      setExpandedSection(null);
    } else {
      setExpandedSection(section);
      // Carregar dados ao expandir
      if (section === 'chats') loadChatsDetail();
      if (section === 'emails') loadEmailsDetail();
      if (section === 'pedidos') loadPedidosDetail();
      if (section === 'spy') loadConversationsForSpy();
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

  const isOpen = expandedSection !== null;

  return (
    <div className="border rounded-lg bg-card overflow-hidden">
      {/* Linha Resumo */}
      <div className="flex items-center gap-4 p-3 hover:bg-accent/30 transition-colors">
        {/* Avatar + Nome + Tela Atual */}
        <div className="flex items-center gap-3 min-w-[280px]">
          <div className="relative">
            <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-sm font-medium">
              {usuario.nome?.charAt(0)?.toUpperCase() || '?'}
            </div>
            <div className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-card ${
              isOnline ? 'bg-green-500' : 'bg-gray-400'
            }`} />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <p className="text-sm font-medium truncate">{usuario.nome}</p>
              <div className="flex items-center gap-1">
                <div className={`w-2 h-2 rounded-full ${getStatusColor(status)}`} />
                <span className="text-xs text-muted-foreground">{getStatusLabel(status)}</span>
              </div>
            </div>
            {/* Tela Atual */}
            {isOnline && currentPage && (
              <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                <Monitor className="h-3 w-3" />
                <span className="truncate max-w-[200px]">{currentPage}</span>
              </div>
            )}
            {isOnline && !currentPage && (
              <div className="flex items-center gap-1 text-xs text-muted-foreground/50 mt-0.5">
                <Monitor className="h-3 w-3" />
                <span>Sem rastreamento</span>
              </div>
            )}
          </div>
        </div>

        {/* Métricas - Clicáveis para expandir */}
        <div className="flex items-center gap-4 flex-1">
          {/* Chats */}
          <Button 
            variant={expandedSection === 'chats' ? 'secondary' : 'ghost'}
            size="sm" 
            className={`h-auto p-2 gap-1.5 ${expandedSection === 'chats' ? 'ring-2 ring-blue-500/50' : 'hover:bg-blue-100 dark:hover:bg-blue-900/30'}`}
            onClick={() => handleSectionClick('chats')}
          >
            <MessageSquare className="h-4 w-4 text-blue-500" />
            <span className="text-sm font-medium">{chatsAtivos}</span>
            {expandedSection === 'chats' ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
          </Button>

          {/* Emails */}
          <Button 
            variant={expandedSection === 'emails' ? 'secondary' : 'ghost'}
            size="sm" 
            className={`h-auto p-2 gap-1.5 ${expandedSection === 'emails' ? 'ring-2 ring-purple-500/50' : 'hover:bg-purple-100 dark:hover:bg-purple-900/30'}`}
            onClick={() => handleSectionClick('emails')}
          >
            <Mail className="h-4 w-4 text-purple-500" />
            <span className="text-sm font-medium">{emailsAtivos}</span>
            {expandedSection === 'emails' ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
          </Button>

          {/* Pedidos Fechados */}
          <Button 
            variant={expandedSection === 'pedidos' ? 'secondary' : 'ghost'}
            size="sm" 
            className={`h-auto p-2 gap-1.5 ${expandedSection === 'pedidos' ? 'ring-2 ring-green-500/50' : 'hover:bg-green-100 dark:hover:bg-green-900/30'}`}
            onClick={() => handleSectionClick('pedidos')}
          >
            <ShoppingCart className="h-4 w-4 text-green-500" />
            <span className="text-sm font-medium">{pedidosFechados}</span>
            {expandedSection === 'pedidos' ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
          </Button>

          {/* Fila de Espera */}
          <Popover>
            <PopoverTrigger asChild>
              <Button 
                variant="ghost" 
                size="sm" 
                className={`h-auto p-2 gap-1.5 ${filaEspera > 0 ? 'hover:bg-yellow-100 dark:hover:bg-yellow-900/30' : ''}`}
                onClick={() => loadFilaDetail()}
              >
                <Clock className={`h-4 w-4 ${filaEspera > 0 ? 'text-yellow-500' : 'text-muted-foreground'}`} />
                <span className={`text-sm font-medium ${filaEspera > 0 ? 'text-yellow-600' : ''}`}>
                  {filaEspera}
                </span>
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-72 p-0">
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
          {/* Botão Monitorar em Tempo Real */}
          <Button
            variant={expandedSection === 'spy' ? 'secondary' : 'ghost'}
            size="sm"
            className={`h-8 gap-1.5 ${expandedSection === 'spy' ? 'ring-2 ring-cyan-500/50 text-cyan-600' : 'hover:bg-cyan-100 dark:hover:bg-cyan-900/30 text-cyan-500'}`}
            onClick={() => handleSectionClick('spy')}
          >
            <Eye className="h-4 w-4" />
            <span className="text-xs">Espiar</span>
          </Button>

          {/* Botão Ver Tela */}
          <Button
            variant={expandedSection === 'screen' ? 'secondary' : 'ghost'}
            size="sm"
            className={`h-8 gap-1.5 ${
              expandedSection === 'screen' 
                ? 'ring-2 ring-green-500/50 text-green-600' 
                : extensionActive 
                  ? 'hover:bg-green-100 dark:hover:bg-green-900/30 text-green-500'
                  : 'text-muted-foreground'
            }`}
            onClick={() => handleSectionClick('screen')}
            disabled={!extensionActive}
          >
            {extensionActive ? <Tv className="h-4 w-4" /> : <MonitorOff className="h-4 w-4" />}
            <span className="text-xs">Monitor</span>
            {expandedSection === 'screen' ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
          </Button>
          
          {!extensionActive && (
            <span className="text-[10px] text-muted-foreground">Extensão inativa</span>
          )}
        </div>
      </div>

      {/* Área Expandida */}
      {expandedSection && (
        <div className="border-t bg-muted/30 p-4">
          {/* Chats Detalhados */}
          {expandedSection === 'chats' && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 mb-3">
                <MessageSquare className="h-4 w-4 text-blue-500" />
                <p className="font-medium text-sm">Chats Ativos Hoje ({chatsDetail.length})</p>
              </div>
              {chatsDetail.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">Nenhum chat ativo</p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                  {chatsDetail.map((chat) => (
                    <div 
                      key={chat.id} 
                      className="flex items-center justify-between p-3 rounded-lg bg-background border hover:border-blue-300 transition-colors cursor-pointer"
                      onClick={() => {
                        setExpandedSection('spy');
                        loadChatMessages(chat.id);
                        loadConversationsForSpy();
                      }}
                    >
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                          <MessageSquare className="h-4 w-4 text-blue-500" />
                        </div>
                        <div>
                          <p className="text-sm font-medium">{chat.customer?.nome || 'Cliente'}</p>
                          <Badge variant="outline" className="text-[10px]">{chat.canal}</Badge>
                        </div>
                      </div>
                      <span className="text-xs text-muted-foreground">{formatTime(chat.updated_at || chat.created_at)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Emails Detalhados */}
          {expandedSection === 'emails' && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 mb-3">
                <Mail className="h-4 w-4 text-purple-500" />
                <p className="font-medium text-sm">Emails Ativos Hoje ({emailsDetail.length})</p>
              </div>
              {emailsDetail.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">Nenhum email ativo</p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                  {emailsDetail.map((email) => (
                    <div key={email.id} className="flex items-center justify-between p-3 rounded-lg bg-background border hover:border-purple-300 transition-colors">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                          <Mail className="h-4 w-4 text-purple-500" />
                        </div>
                        <div>
                          <p className="text-sm font-medium">{email.customer?.nome || 'Cliente'}</p>
                        </div>
                      </div>
                      <span className="text-xs text-muted-foreground">{formatTime(email.updated_at || email.created_at)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Pedidos Detalhados */}
          {expandedSection === 'pedidos' && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 mb-3">
                <ShoppingCart className="h-4 w-4 text-green-500" />
                <p className="font-medium text-sm">Pedidos Fechados Hoje ({pedidosDetail.length})</p>
              </div>
              {pedidosDetail.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">Nenhum pedido fechado hoje</p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                  {pedidosDetail.map((pedido) => (
                    <div key={pedido.id} className="flex items-center justify-between p-3 rounded-lg bg-background border hover:border-green-300 transition-colors">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                          <ShoppingCart className="h-4 w-4 text-green-500" />
                        </div>
                        <div>
                          <p className="text-sm font-medium">#{pedido.numero}</p>
                          <p className="text-xs text-muted-foreground">{pedido.cliente_nome}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium text-green-600">{formatCurrency(pedido.total)}</p>
                        <Badge variant="outline" className="text-[10px]">{pedido.status}</Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Espião de Chat em Tempo Real */}
          {expandedSection === 'spy' && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 mb-3">
                <Eye className="h-4 w-4 text-cyan-500" />
                <p className="font-medium text-sm">Monitoramento em Tempo Real</p>
                <Badge variant="outline" className="text-[10px] bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400">
                  <Circle className="h-2 w-2 fill-current mr-1 animate-pulse" />
                  AO VIVO
                </Badge>
              </div>
              
              {loadingChats ? (
                <div className="text-center py-8 text-muted-foreground text-sm">
                  Carregando conversas...
                </div>
              ) : conversations.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground text-sm">
                  Nenhuma conversa ativa para monitorar
                </div>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                  {/* Lista de Conversas */}
                  <div className="space-y-2">
                    <p className="text-xs font-medium text-muted-foreground mb-2">Selecione uma conversa</p>
                    <ScrollArea className="h-[300px]">
                      <div className="space-y-1 pr-2">
                        {conversations.map((conv) => (
                          <div
                            key={conv.id}
                            onClick={() => loadChatMessages(conv.id)}
                            className={`flex items-center gap-2 p-3 rounded-lg cursor-pointer transition-colors ${
                              selectedChatId === conv.id 
                                ? 'bg-cyan-100 dark:bg-cyan-900/30 border-2 border-cyan-500' 
                                : 'bg-background border hover:border-cyan-300'
                            }`}
                          >
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                              conv.canal === 'email' ? 'bg-purple-100 dark:bg-purple-900/30' : 'bg-blue-100 dark:bg-blue-900/30'
                            }`}>
                              {conv.canal === 'email' ? (
                                <Mail className="h-4 w-4 text-purple-500" />
                              ) : (
                                <MessageSquare className="h-4 w-4 text-blue-500" />
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate">{conv.customer?.nome || 'Cliente'}</p>
                              <Badge variant="outline" className="text-[10px]">{conv.canal}</Badge>
                            </div>
                            {selectedChatId === conv.id && (
                              <Circle className="h-2 w-2 fill-cyan-500 text-cyan-500 animate-pulse" />
                            )}
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  </div>

                  {/* Preview das Mensagens */}
                  <div className="lg:col-span-2 bg-background rounded-lg border-2 border-cyan-500/30">
                    <div className="p-3 border-b bg-cyan-50 dark:bg-cyan-900/20 rounded-t-lg flex items-center justify-between">
                      <p className="text-sm font-medium text-cyan-700 dark:text-cyan-400 flex items-center gap-2">
                        <Eye className="h-4 w-4" />
                        {selectedChatId ? 'Mensagens em tempo real' : 'Selecione uma conversa'}
                      </p>
                      {selectedChatId && (
                        <Badge variant="outline" className="text-[10px] animate-pulse">
                          <Circle className="h-2 w-2 fill-green-500 text-green-500 mr-1" />
                          Sincronizando
                        </Badge>
                      )}
                    </div>
                    <ScrollArea className="h-[300px]">
                      {!selectedChatId ? (
                        <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
                          Selecione uma conversa ao lado para espiar em tempo real
                        </div>
                      ) : chatMessages.length === 0 ? (
                        <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
                          Nenhuma mensagem ainda
                        </div>
                      ) : (
                        <div className="space-y-2 p-4">
                          {chatMessages.map((msg) => (
                            <div
                              key={msg.id}
                              className={`p-3 rounded-lg max-w-[85%] ${
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
          )}

          {/* Monitor de Tela em Tempo Real */}
          {expandedSection === 'screen' && (
            <div className={`space-y-3 ${isFullscreen ? 'fixed inset-0 z-50 bg-black p-4' : ''}`}>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Tv className="h-4 w-4 text-green-500" />
                  <p className="font-medium text-sm">Monitor de Tela: {usuario.nome}</p>
                  <Badge 
                    variant={currentFrame ? "default" : "secondary"} 
                    className={`text-[10px] ${currentFrame ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : ''}`}
                  >
                    {currentFrame ? (
                      <>
                        <Circle className="h-2 w-2 fill-current mr-1 animate-pulse" />
                        AO VIVO
                      </>
                    ) : (
                      'Aguardando'
                    )}
                  </Badge>
                </div>
                <div className="flex items-center gap-2">
                  {lastScreenUpdate && (
                    <span className="text-xs text-muted-foreground">
                      Última atualização: {lastScreenUpdate.toLocaleTimeString('pt-BR')}
                    </span>
                  )}
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-7 w-7" 
                    onClick={() => setIsFullscreen(!isFullscreen)}
                  >
                    {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
                  </Button>
                  {isFullscreen && (
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-7 w-7" 
                      onClick={() => {
                        setIsFullscreen(false);
                        setExpandedSection(null);
                      }}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
              
              <div className={`bg-background rounded-lg border-2 border-green-500/30 overflow-hidden ${isFullscreen ? 'h-[calc(100vh-100px)]' : ''}`}>
                {isScreenConnecting ? (
                  <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
                    <RefreshCw className="h-8 w-8 mb-4 animate-spin text-green-500" />
                    <p className="text-sm">Conectando ao canal de monitoramento...</p>
                    <p className="text-xs mt-2 text-muted-foreground">Aguardando frames da extensão do colaborador</p>
                  </div>
                ) : currentFrame ? (
                  <div className={`relative ${isFullscreen ? 'h-full flex items-center justify-center' : ''}`}>
                    <img 
                      src={currentFrame} 
                      alt="Tela do usuário"
                      className={`${isFullscreen ? 'max-h-full max-w-full object-contain' : 'w-full rounded-lg'}`}
                    />
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
                    <Monitor className="h-12 w-12 mb-4 opacity-30" />
                    <p className="text-sm">Aguardando frames da extensão...</p>
                    <p className="text-xs mt-2 text-muted-foreground">
                      O colaborador precisa ter a extensão ativa e compartilhando tela
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}