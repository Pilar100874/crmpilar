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
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
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

  const loadConversations = async () => {
    setLoadingChats(true);
    try {
      // Buscar o atendente_id pelo usuario_id
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
      
      // Auto-seleciona o primeiro chat se houver
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

            {/* Métricas */}
            <div className="flex items-center gap-6 flex-1">
              {/* Chats */}
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger>
                    <div className="flex items-center gap-1.5">
                      <MessageSquare className="h-4 w-4 text-blue-500" />
                      <span className="text-sm font-medium">{chatsAtivos}</span>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>Chats ativos</TooltipContent>
                </Tooltip>
              </TooltipProvider>

              {/* Emails */}
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger>
                    <div className="flex items-center gap-1.5">
                      <Mail className="h-4 w-4 text-purple-500" />
                      <span className="text-sm font-medium">{emailsAtivos}</span>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>Emails ativos</TooltipContent>
                </Tooltip>
              </TooltipProvider>

              {/* Pedidos Fechados */}
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger>
                    <div className="flex items-center gap-1.5">
                      <ShoppingCart className="h-4 w-4 text-green-500" />
                      <span className="text-sm font-medium">{pedidosFechados}</span>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>Pedidos fechados hoje</TooltipContent>
                </Tooltip>
              </TooltipProvider>

              {/* Fila de Espera */}
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger>
                    <div className="flex items-center gap-1.5">
                      <Clock className={`h-4 w-4 ${filaEspera > 0 ? 'text-yellow-500' : 'text-muted-foreground'}`} />
                      <span className={`text-sm font-medium ${filaEspera > 0 ? 'text-yellow-600' : ''}`}>
                        {filaEspera}
                      </span>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>Clientes na fila</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>

            {/* Ações */}
            <div className="flex items-center gap-2">
              {/* Botão Ver Tela */}
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
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
                  </TooltipTrigger>
                  <TooltipContent>
                    {extensionActive ? 'Ver tela' : 'Extensão inativa'}
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>

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
                      onClick={() => loadChatMessages(conv.id)}
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
