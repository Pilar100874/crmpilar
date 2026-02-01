import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getEstabelecimentoId } from "@/lib/estabelecimentoUtils";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Users, 
  MessageSquare, 
  Clock, 
  Activity, 
  Monitor as MonitorIcon, 
  Eye,
  Circle,
  RefreshCw,
  ArrowRight
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

interface UserActivity {
  id: string;
  usuario_id: string;
  current_route: string | null;
  current_page_title: string | null;
  session_started_at: string;
  last_activity_at: string;
  total_active_time_seconds: number;
  is_online: boolean;
  usuario?: {
    id: string;
    nome: string;
    email: string;
  };
}

interface AtendenteInfo {
  id: string;
  status: string;
  aceita_novos_chats: boolean;
  max_chats_simultaneos: number;
  usuario: {
    id: string;
    nome: string;
    email: string;
  };
  chats_ativos: number;
}

interface ConversationPreview {
  id: string;
  canal: string;
  chat_status: string;
  created_at: string;
  updated_at: string;
  customer: {
    id: string;
    nome: string;
    telefone?: string;
  };
  atendente?: {
    usuario: {
      nome: string;
    };
  };
}

export default function MonitorFuncionarios() {
  const [activities, setActivities] = useState<UserActivity[]>([]);
  const [atendentes, setAtendentes] = useState<AtendenteInfo[]>([]);
  const [filaEspera, setFilaEspera] = useState<ConversationPreview[]>([]);
  const [chatsAtivos, setChatsAtivos] = useState<ConversationPreview[]>([]);
  const [selectedChat, setSelectedChat] = useState<string | null>(null);
  const [chatMessages, setChatMessages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [estabelecimentoId, setEstabelecimentoId] = useState<string>("");

  useEffect(() => {
    init();
  }, []);

  const init = async () => {
    const estabId = await getEstabelecimentoId();
    if (estabId) {
      setEstabelecimentoId(estabId);
      await Promise.all([
        loadActivities(estabId),
        loadAtendentes(estabId),
        loadFilaEspera(estabId),
        loadChatsAtivos(estabId),
      ]);
      setupRealtime(estabId);
    }
    setLoading(false);
  };

  const setupRealtime = (estabId: string) => {
    const channel = supabase
      .channel('monitor-funcionarios')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'user_activity_tracking', filter: `estabelecimento_id=eq.${estabId}` },
        () => loadActivities(estabId)
      )
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'atendentes', filter: `estabelecimento_id=eq.${estabId}` },
        () => loadAtendentes(estabId)
      )
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'conversations', filter: `estabelecimento_id=eq.${estabId}` },
        () => {
          loadFilaEspera(estabId);
          loadChatsAtivos(estabId);
        }
      )
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'messages' },
        (payload: any) => {
          if (selectedChat && payload.new?.conversation_id === selectedChat) {
            loadChatMessages(selectedChat);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const loadActivities = async (estabId: string) => {
    try {
      const { data, error } = await supabase
        .from('user_activity_tracking')
        .select(`
          *,
          usuario:usuarios!user_activity_tracking_usuario_id_fkey(id, nome, email)
        `)
        .eq('estabelecimento_id', estabId)
        .order('last_activity_at', { ascending: false });

      if (error) throw error;
      setActivities((data as any) || []);
    } catch (error) {
      console.error('Erro ao carregar atividades:', error);
    }
  };

  const loadAtendentes = async (estabId: string) => {
    try {
      const { data, error } = await supabase
        .from('atendentes')
        .select(`
          id,
          status,
          aceita_novos_chats,
          max_chats_simultaneos,
          usuario:usuarios!atendentes_usuario_id_fkey(id, nome, email)
        `)
        .eq('estabelecimento_id', estabId);

      if (error) throw error;

      const atendentesComChats = await Promise.all((data || []).map(async (atendente) => {
        const { count } = await supabase
          .from('conversations')
          .select('*', { count: 'exact', head: true })
          .eq('atendente_atual_id', atendente.id)
          .eq('chat_status', 'em_atendimento');

        return {
          ...atendente,
          chats_ativos: count || 0,
        };
      }));

      setAtendentes(atendentesComChats as AtendenteInfo[]);
    } catch (error) {
      console.error('Erro ao carregar atendentes:', error);
    }
  };

  const loadFilaEspera = async (estabId: string) => {
    try {
      const { data, error } = await supabase
        .from('conversations')
        .select(`
          id,
          canal,
          chat_status,
          created_at,
          updated_at,
          customer:customers!conversations_customer_id_fkey(id, nome, telefone)
        `)
        .eq('estabelecimento_id', estabId)
        .eq('chat_status', 'em_fila')
        .order('created_at', { ascending: true });

      if (error) throw error;
      setFilaEspera(data || []);
    } catch (error) {
      console.error('Erro ao carregar fila:', error);
    }
  };

  const loadChatsAtivos = async (estabId: string) => {
    try {
      const { data, error } = await supabase
        .from('conversations')
        .select(`
          id,
          canal,
          chat_status,
          created_at,
          updated_at,
          customer:customers!conversations_customer_id_fkey(id, nome, telefone),
          atendente:atendentes!conversations_atendente_atual_id_fkey(
            usuario:usuarios!atendentes_usuario_id_fkey(nome)
          )
        `)
        .eq('estabelecimento_id', estabId)
        .eq('chat_status', 'em_atendimento')
        .order('updated_at', { ascending: false });

      if (error) throw error;
      setChatsAtivos(data || []);
    } catch (error) {
      console.error('Erro ao carregar chats ativos:', error);
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
      setChatMessages(data || []);
      setSelectedChat(chatId);
    } catch (error) {
      console.error('Erro ao carregar mensagens:', error);
    }
  };

  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (hours > 0) return `${hours}h ${minutes}min`;
    return `${minutes}min`;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'disponivel': return 'bg-green-500';
      case 'ocupado': return 'bg-yellow-500';
      case 'pausa': return 'bg-orange-500';
      case 'offline': return 'bg-gray-500';
      default: return 'bg-gray-500';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'disponivel': return 'Disponível';
      case 'ocupado': return 'Ocupado';
      case 'pausa': return 'Em Pausa';
      case 'offline': return 'Offline';
      default: return status;
    }
  };

  const onlineUsers = useMemo(() => 
    activities.filter(a => a.is_online), 
    [activities]
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-muted-foreground">Carregando...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <MonitorIcon className="h-6 w-6" />
            Monitor em Tempo Real
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="gap-1">
            <Circle className="h-2 w-2 fill-green-500 text-green-500" />
            {onlineUsers.length} online
          </Badge>
          <Button variant="outline" size="sm" onClick={() => init()}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Stats Cards - Compacto */}
      <div className="grid gap-3 grid-cols-4">
        <Card className="p-3">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
              <Users className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Online</p>
              <p className="text-xl font-bold">{onlineUsers.length}</p>
            </div>
          </div>
        </Card>
        <Card className="p-3">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
              <MessageSquare className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Chats Ativos</p>
              <p className="text-xl font-bold">{chatsAtivos.length}</p>
            </div>
          </div>
        </Card>
        <Card className="p-3">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg">
              <Clock className="h-5 w-5 text-yellow-600" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Na Fila</p>
              <p className="text-xl font-bold">{filaEspera.length}</p>
            </div>
          </div>
        </Card>
        <Card className="p-3">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
              <Activity className="h-5 w-5 text-purple-600" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Atendentes</p>
              <p className="text-xl font-bold">
                {atendentes.filter(a => a.status === 'disponivel' || a.status === 'ocupado').length}/{atendentes.length}
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* Main Grid - 3 colunas */}
      <div className="grid gap-4 lg:grid-cols-3">
        {/* Coluna 1: Usuários no Sistema + Atendentes */}
        <div className="space-y-4">
          {/* Usuários no Sistema */}
          <Card>
            <CardHeader className="py-3 px-4">
              <CardTitle className="text-sm flex items-center gap-2">
                <MonitorIcon className="h-4 w-4" />
                Usuários no Sistema ({activities.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <ScrollArea className="h-[280px]">
                <div className="space-y-1 p-2">
                  {activities.length === 0 ? (
                    <div className="text-center py-4 text-muted-foreground text-sm">
                      Nenhum usuário rastreado
                    </div>
                  ) : (
                    activities.map((activity) => (
                      <div
                        key={activity.id}
                        className="flex items-center gap-3 p-2 rounded-lg hover:bg-accent/50 transition-colors"
                      >
                        <div className="relative">
                          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-medium">
                            {activity.usuario?.nome?.charAt(0)?.toUpperCase() || '?'}
                          </div>
                          <div className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-background ${
                            activity.is_online ? 'bg-green-500' : 'bg-gray-400'
                          }`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{activity.usuario?.nome || 'Usuário'}</p>
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <MonitorIcon className="h-3 w-3" />
                            <span className="truncate">{activity.current_page_title || 'N/A'}</span>
                          </div>
                        </div>
                        <div className="text-right">
                          <Badge variant={activity.is_online ? "default" : "secondary"} className="text-[10px] px-1.5">
                            {activity.is_online ? 'Online' : 'Offline'}
                          </Badge>
                          <p className="text-[10px] text-muted-foreground mt-0.5">
                            {formatDuration(activity.total_active_time_seconds)}
                          </p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>

          {/* Atendentes */}
          <Card>
            <CardHeader className="py-3 px-4">
              <CardTitle className="text-sm flex items-center gap-2">
                <Users className="h-4 w-4" />
                Status dos Atendentes ({atendentes.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <ScrollArea className="h-[200px]">
                <div className="space-y-1 p-2">
                  {atendentes.map((atendente) => (
                    <div key={atendente.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-accent/50">
                      <div className="relative">
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-medium">
                          {atendente.usuario?.nome?.charAt(0)?.toUpperCase() || '?'}
                        </div>
                        <div className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-background ${getStatusColor(atendente.status)}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{atendente.usuario?.nome}</p>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-[10px] px-1">
                            {getStatusLabel(atendente.status)}
                          </Badge>
                          <span className="text-[10px] text-muted-foreground">
                            {atendente.chats_ativos}/{atendente.max_chats_simultaneos} chats
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </div>

        {/* Coluna 2: Fila + Chats Ativos */}
        <div className="space-y-4">
          {/* Fila de Espera */}
          <Card className={filaEspera.length > 0 ? 'border-yellow-500/50' : ''}>
            <CardHeader className="py-3 px-4">
              <CardTitle className="text-sm flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Fila de Espera ({filaEspera.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <ScrollArea className="h-[200px]">
                {filaEspera.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground text-sm">
                    Nenhum cliente na fila
                  </div>
                ) : (
                  <div className="space-y-1 p-2">
                    {filaEspera.map((chat, index) => (
                      <div
                        key={chat.id}
                        className="flex items-center gap-3 p-2 rounded-lg bg-yellow-50 dark:bg-yellow-900/10"
                      >
                        <div className="w-6 h-6 rounded-full bg-yellow-500 text-white flex items-center justify-center text-xs font-bold">
                          {index + 1}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{chat.customer?.nome || 'Cliente'}</p>
                          <p className="text-[10px] text-muted-foreground">{chat.customer?.telefone}</p>
                        </div>
                        <div className="text-right">
                          <Badge variant="outline" className="text-[10px]">{chat.canal}</Badge>
                          <p className="text-[10px] text-muted-foreground mt-0.5">
                            {formatDistanceToNow(new Date(chat.created_at), { locale: ptBR })}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>

          {/* Chats Ativos */}
          <Card>
            <CardHeader className="py-3 px-4">
              <CardTitle className="text-sm flex items-center gap-2">
                <MessageSquare className="h-4 w-4" />
                Chats em Atendimento ({chatsAtivos.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <ScrollArea className="h-[280px]">
                {chatsAtivos.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground text-sm">
                    Nenhum chat ativo
                  </div>
                ) : (
                  <div className="space-y-1 p-2">
                    {chatsAtivos.map((chat) => (
                      <div
                        key={chat.id}
                        onClick={() => loadChatMessages(chat.id)}
                        className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-colors ${
                          selectedChat === chat.id 
                            ? 'bg-primary/10 border border-primary/30' 
                            : 'hover:bg-accent/50'
                        }`}
                      >
                        <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                          <MessageSquare className="h-4 w-4 text-blue-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{chat.customer?.nome || 'Cliente'}</p>
                          <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                            <ArrowRight className="h-2.5 w-2.5" />
                            <span className="truncate">{chat.atendente?.usuario?.nome || 'N/A'}</span>
                          </div>
                        </div>
                        <div className="text-right">
                          <Badge variant="outline" className="text-[10px]">{chat.canal}</Badge>
                          <Eye className="h-3 w-3 text-muted-foreground ml-auto mt-1" />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </div>

        {/* Coluna 3: Preview do Chat */}
        <Card className="h-fit">
          <CardHeader className="py-3 px-4">
            <CardTitle className="text-sm flex items-center gap-2">
              <Eye className="h-4 w-4" />
              Visualização da Conversa
            </CardTitle>
            <CardDescription className="text-xs">
              {selectedChat ? 'Mensagens em tempo real' : 'Selecione um chat ao lado'}
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea className="h-[500px]">
              {!selectedChat ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Eye className="h-12 w-12 mx-auto mb-4 opacity-30" />
                  <p className="text-sm">Clique em um chat para visualizar</p>
                </div>
              ) : chatMessages.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-30" />
                  <p className="text-sm">Nenhuma mensagem</p>
                </div>
              ) : (
                <div className="space-y-2 p-3">
                  {chatMessages.map((msg) => (
                    <div
                      key={msg.id}
                      className={`p-2.5 rounded-lg max-w-[90%] ${
                        msg.sender === 'agent' || msg.direction === 'outgoing'
                          ? 'ml-auto bg-primary text-primary-foreground'
                          : 'bg-muted'
                      }`}
                    >
                      <p className="text-sm whitespace-pre-wrap break-words">{msg.content || msg.body}</p>
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
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
