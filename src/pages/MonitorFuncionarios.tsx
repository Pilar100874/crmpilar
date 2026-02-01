import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getEstabelecimentoId } from "@/lib/estabelecimentoUtils";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Users, 
  MessageSquare, 
  Clock, 
  Activity, 
  Monitor as MonitorIcon, 
  Eye,
  Circle,
  Search,
  RefreshCw
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

interface UserActivity {
  id: string;
  usuario_id: string;
  current_route: string;
  current_page_title: string;
  session_started_at: string;
  last_activity_at: string;
  total_active_time_seconds: number;
  is_online: boolean;
  usuario?: {
    id: string;
    nome: string;
    email: string;
    avatar_url?: string;
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
  ultima_mensagem?: string;
}

export default function MonitorFuncionarios() {
  const [activities, setActivities] = useState<UserActivity[]>([]);
  const [atendentes, setAtendentes] = useState<AtendenteInfo[]>([]);
  const [filaEspera, setFilaEspera] = useState<ConversationPreview[]>([]);
  const [chatsAtivos, setChatsAtivos] = useState<ConversationPreview[]>([]);
  const [selectedChat, setSelectedChat] = useState<string | null>(null);
  const [chatMessages, setChatMessages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
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

      // Contar chats ativos por atendente
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

  const filteredActivities = useMemo(() => 
    activities.filter(a => 
      a.usuario?.nome?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      a.current_page_title?.toLowerCase().includes(searchTerm.toLowerCase())
    ),
    [activities, searchTerm]
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-muted-foreground">Carregando...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <MonitorIcon className="h-8 w-8" />
            Monitor de Funcionários
          </h1>
          <p className="text-muted-foreground mt-1">
            Acompanhe atividades, chats e filas em tempo real
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="gap-1">
            <Circle className="h-2 w-2 fill-green-500 text-green-500" />
            {onlineUsers.length} online
          </Badge>
          <Button variant="outline" size="sm" onClick={() => init()}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Atualizar
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-lg">
                <Users className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Usuários Online</p>
                <p className="text-2xl font-bold">{onlineUsers.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                <MessageSquare className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Chats Ativos</p>
                <p className="text-2xl font-bold">{chatsAtivos.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg">
                <Clock className="h-6 w-6 text-yellow-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Na Fila</p>
                <p className="text-2xl font-bold">{filaEspera.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                <Activity className="h-6 w-6 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Atendentes</p>
                <p className="text-2xl font-bold">
                  {atendentes.filter(a => a.status === 'disponivel' || a.status === 'ocupado').length}/{atendentes.length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs defaultValue="atividades" className="space-y-4">
        <TabsList>
          <TabsTrigger value="atividades" className="gap-2">
            <MonitorIcon className="h-4 w-4" />
            Atividades
          </TabsTrigger>
          <TabsTrigger value="atendentes" className="gap-2">
            <Users className="h-4 w-4" />
            Atendentes
          </TabsTrigger>
          <TabsTrigger value="fila" className="gap-2">
            <Clock className="h-4 w-4" />
            Fila de Espera ({filaEspera.length})
          </TabsTrigger>
          <TabsTrigger value="chats" className="gap-2">
            <MessageSquare className="h-4 w-4" />
            Chats Ativos ({chatsAtivos.length})
          </TabsTrigger>
        </TabsList>

        {/* Tab: Atividades dos Usuários */}
        <TabsContent value="atividades" className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar usuário ou tela..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Usuários no Sistema</CardTitle>
              <CardDescription>Veja em tempo real onde cada usuário está navegando</CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[500px]">
                <div className="space-y-3">
                  {filteredActivities.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      Nenhuma atividade registrada
                    </div>
                  ) : (
                    filteredActivities.map((activity) => (
                      <div
                        key={activity.id}
                        className="flex items-center justify-between p-4 rounded-lg border hover:bg-accent/50 transition-colors"
                      >
                        <div className="flex items-center gap-4">
                          <div className="relative">
                            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                              <span className="text-sm font-medium">
                                {activity.usuario?.nome?.charAt(0)?.toUpperCase() || '?'}
                              </span>
                            </div>
                            <div className={`absolute -bottom-1 -right-1 w-3 h-3 rounded-full border-2 border-background ${
                              activity.is_online ? 'bg-green-500' : 'bg-gray-400'
                            }`} />
                          </div>
                          <div>
                            <p className="font-medium">{activity.usuario?.nome || 'Usuário'}</p>
                            <p className="text-sm text-muted-foreground">{activity.usuario?.email}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-6">
                          <div className="text-right">
                            <div className="flex items-center gap-2">
                              <MonitorIcon className="h-4 w-4 text-muted-foreground" />
                              <span className="font-medium">{activity.current_page_title || 'Desconhecido'}</span>
                            </div>
                            <p className="text-xs text-muted-foreground">
                              {activity.current_route}
                            </p>
                          </div>
                          <div className="text-right min-w-[120px]">
                            <p className="text-sm">
                              {activity.is_online ? (
                                <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                                  Online
                                </Badge>
                              ) : (
                                <Badge variant="outline" className="bg-gray-50 text-gray-600">
                                  Offline
                                </Badge>
                              )}
                            </p>
                            <p className="text-xs text-muted-foreground mt-1">
                              {formatDistanceToNow(new Date(activity.last_activity_at), {
                                addSuffix: true,
                                locale: ptBR
                              })}
                            </p>
                          </div>
                          <div className="text-right min-w-[80px]">
                            <p className="text-sm font-medium">
                              {formatDuration(activity.total_active_time_seconds)}
                            </p>
                            <p className="text-xs text-muted-foreground">tempo ativo</p>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab: Status dos Atendentes */}
        <TabsContent value="atendentes" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Status dos Atendentes</CardTitle>
              <CardDescription>Visão geral dos atendentes e suas capacidades</CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[500px]">
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {atendentes.map((atendente) => (
                    <Card key={atendente.id} className="hover:shadow-md transition-shadow">
                      <CardContent className="pt-6">
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex items-center gap-3">
                            <div className="relative">
                              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                                <span className="text-lg font-medium">
                                  {atendente.usuario?.nome?.charAt(0)?.toUpperCase() || '?'}
                                </span>
                              </div>
                              <div className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-background ${getStatusColor(atendente.status)}`} />
                            </div>
                            <div>
                              <p className="font-medium">{atendente.usuario?.nome}</p>
                              <Badge variant="outline" className="mt-1">
                                {getStatusLabel(atendente.status)}
                              </Badge>
                            </div>
                          </div>
                        </div>
                        <div className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Chats ativos</span>
                            <span className="font-medium">
                              {atendente.chats_ativos} / {atendente.max_chats_simultaneos}
                            </span>
                          </div>
                          <div className="w-full bg-secondary rounded-full h-2">
                            <div 
                              className="bg-primary rounded-full h-2 transition-all"
                              style={{ 
                                width: `${Math.min((atendente.chats_ativos / atendente.max_chats_simultaneos) * 100, 100)}%` 
                              }}
                            />
                          </div>
                          <div className="flex items-center gap-2 text-sm">
                            <span className={`w-2 h-2 rounded-full ${atendente.aceita_novos_chats ? 'bg-green-500' : 'bg-red-500'}`} />
                            <span className="text-muted-foreground">
                              {atendente.aceita_novos_chats ? 'Aceita novos chats' : 'Não aceita novos chats'}
                            </span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab: Fila de Espera */}
        <TabsContent value="fila" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Fila de Espera</CardTitle>
              <CardDescription>Clientes aguardando atendimento</CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[500px]">
                {filaEspera.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Nenhum cliente na fila</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {filaEspera.map((chat, index) => (
                      <div
                        key={chat.id}
                        className="flex items-center justify-between p-4 rounded-lg border hover:bg-accent/50 transition-colors"
                      >
                        <div className="flex items-center gap-4">
                          <div className="w-8 h-8 rounded-full bg-yellow-100 text-yellow-700 flex items-center justify-center font-bold text-sm">
                            {index + 1}
                          </div>
                          <div>
                            <p className="font-medium">{chat.customer?.nome || 'Cliente'}</p>
                            <p className="text-sm text-muted-foreground">{chat.customer?.telefone}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <Badge variant="outline">{chat.canal}</Badge>
                          <div className="text-right">
                            <p className="text-sm font-medium">
                              {formatDistanceToNow(new Date(chat.created_at), {
                                addSuffix: false,
                                locale: ptBR
                              })}
                            </p>
                            <p className="text-xs text-muted-foreground">aguardando</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab: Chats Ativos */}
        <TabsContent value="chats" className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-2">
            {/* Lista de Chats */}
            <Card>
              <CardHeader>
                <CardTitle>Conversas em Andamento</CardTitle>
                <CardDescription>Clique para visualizar a conversa</CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[500px]">
                  {chatsAtivos.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground">
                      <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>Nenhum chat ativo</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {chatsAtivos.map((chat) => (
                        <div
                          key={chat.id}
                          onClick={() => loadChatMessages(chat.id)}
                          className={`p-4 rounded-lg border cursor-pointer transition-colors ${
                            selectedChat === chat.id 
                              ? 'border-primary bg-primary/5' 
                              : 'hover:bg-accent/50'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="font-medium">{chat.customer?.nome || 'Cliente'}</p>
                              <p className="text-sm text-muted-foreground">
                                Atendente: {chat.atendente?.usuario?.nome || 'N/A'}
                              </p>
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge variant="outline">{chat.canal}</Badge>
                              <Eye className="h-4 w-4 text-muted-foreground" />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </CardContent>
            </Card>

            {/* Preview do Chat */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Eye className="h-5 w-5" />
                  Visualização da Conversa
                </CardTitle>
                <CardDescription>
                  {selectedChat ? 'Mensagens do chat selecionado' : 'Selecione um chat para visualizar'}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[500px]">
                  {!selectedChat ? (
                    <div className="text-center py-12 text-muted-foreground">
                      <Eye className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>Selecione um chat à esquerda</p>
                    </div>
                  ) : chatMessages.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground">
                      <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>Nenhuma mensagem encontrada</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {chatMessages.map((msg) => (
                        <div
                          key={msg.id}
                          className={`p-3 rounded-lg max-w-[85%] ${
                            msg.sender === 'agent' || msg.direction === 'outgoing'
                              ? 'ml-auto bg-primary text-primary-foreground'
                              : 'bg-muted'
                          }`}
                        >
                          <p className="text-sm whitespace-pre-wrap">{msg.content || msg.body}</p>
                          <p className="text-xs opacity-70 mt-1">
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
        </TabsContent>
      </Tabs>
    </div>
  );
}
