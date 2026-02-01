import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getEstabelecimentoId } from "@/lib/estabelecimentoUtils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Users, 
  MessageSquare, 
  Clock, 
  Activity, 
  Monitor as MonitorIcon, 
  Circle,
  RefreshCw,
  ShoppingCart
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScreenViewer } from "@/components/monitor/ScreenViewer";
import { UserMonitorRow } from "@/components/monitor/UserMonitorRow";

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
  usuario_id: string;
  status: string;
  aceita_novos_chats: boolean;
  max_chats_simultaneos: number;
  usuario: {
    id: string;
    nome: string;
    email: string;
  };
  chats_ativos: number;
  emails_ativos: number;
}

interface UserMetrics {
  usuarioId: string;
  nome: string;
  email: string;
  isOnline: boolean;
  status: string;
  chatsAtivos: number;
  emailsAtivos: number;
  pedidosFechados: number;
  filaEspera: number;
  extensionActive: boolean;
  currentPage: string | null;
  currentRoute: string | null;
}

export default function MonitorFuncionarios() {
  const [activities, setActivities] = useState<UserActivity[]>([]);
  const [atendentes, setAtendentes] = useState<AtendenteInfo[]>([]);
  const [filaEsperaTotal, setFilaEsperaTotal] = useState(0);
  const [chatsAtivosTotal, setChatsAtivosTotal] = useState(0);
  const [pedidosHojeTotal, setPedidosHojeTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [estabelecimentoId, setEstabelecimentoId] = useState<string>("");
  const [viewingScreen, setViewingScreen] = useState<{usuarioId: string, nome: string} | null>(null);
  const [extensionStatuses, setExtensionStatuses] = useState<Record<string, boolean>>({});
  const [pedidosPorUsuario, setPedidosPorUsuario] = useState<Record<string, number>>({});

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
        loadExtensionStatuses(estabId),
        loadPedidosHoje(estabId),
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
        { event: '*', schema: 'public', table: 'orcamentos', filter: `estabelecimento_id=eq.${estabId}` },
        () => loadPedidosHoje(estabId)
      )
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'screen_monitor_consent', filter: `estabelecimento_id=eq.${estabId}` },
        () => loadExtensionStatuses(estabId)
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const loadExtensionStatuses = async (estabId: string) => {
    try {
      const { data, error } = await supabase
        .from('screen_monitor_consent')
        .select('usuario_id, is_sharing, last_frame_at')
        .eq('estabelecimento_id', estabId);

      if (error) throw error;

      const statuses: Record<string, boolean> = {};
      (data || []).forEach((item: any) => {
        const lastFrame = item.last_frame_at ? new Date(item.last_frame_at) : null;
        const isRecent = lastFrame && (Date.now() - lastFrame.getTime()) < 30000;
        statuses[item.usuario_id] = item.is_sharing && isRecent;
      });
      setExtensionStatuses(statuses);
    } catch (error) {
      console.error('Erro ao carregar status das extensões:', error);
    }
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
          usuario_id,
          status,
          aceita_novos_chats,
          max_chats_simultaneos,
          usuario:usuarios!atendentes_usuario_id_fkey(id, nome, email)
        `)
        .eq('estabelecimento_id', estabId);

      if (error) throw error;

      const atendentesComMetricas = await Promise.all((data || []).map(async (atendente) => {
        // Contar chats (WhatsApp, webchat, etc)
        const { count: chatsCount } = await supabase
          .from('conversations')
          .select('*', { count: 'exact', head: true })
          .eq('atendente_atual_id', atendente.id)
          .eq('chat_status', 'em_atendimento')
          .neq('canal', 'email');

        // Contar emails
        const { count: emailsCount } = await supabase
          .from('conversations')
          .select('*', { count: 'exact', head: true })
          .eq('atendente_atual_id', atendente.id)
          .eq('chat_status', 'em_atendimento')
          .eq('canal', 'email');

        return {
          ...atendente,
          chats_ativos: chatsCount || 0,
          emails_ativos: emailsCount || 0,
        };
      }));

      setAtendentes(atendentesComMetricas as AtendenteInfo[]);
    } catch (error) {
      console.error('Erro ao carregar atendentes:', error);
    }
  };

  const loadFilaEspera = async (estabId: string) => {
    try {
      const { count, error } = await supabase
        .from('conversations')
        .select('*', { count: 'exact', head: true })
        .eq('estabelecimento_id', estabId)
        .eq('chat_status', 'em_fila');

      if (error) throw error;
      setFilaEsperaTotal(count || 0);
    } catch (error) {
      console.error('Erro ao carregar fila:', error);
    }
  };

  const loadChatsAtivos = async (estabId: string) => {
    try {
      const { count, error } = await supabase
        .from('conversations')
        .select('*', { count: 'exact', head: true })
        .eq('estabelecimento_id', estabId)
        .eq('chat_status', 'em_atendimento');

      if (error) throw error;
      setChatsAtivosTotal(count || 0);
    } catch (error) {
      console.error('Erro ao carregar chats ativos:', error);
    }
  };

  const loadPedidosHoje = async (estabId: string) => {
    try {
      const hoje = new Date();
      hoje.setHours(0, 0, 0, 0);
      
      const { data, error } = await supabase
        .from('orcamentos')
        .select('id, usuario_id')
        .eq('estabelecimento_id', estabId)
        .in('status', ['aprovado', 'finalizado', 'faturado'])
        .gte('created_at', hoje.toISOString());

      if (error) throw error;

      // Agrupar por usuario_id
      const porUsuario: Record<string, number> = {};
      (data || []).forEach((orcamento: any) => {
        if (orcamento.usuario_id) {
          porUsuario[orcamento.usuario_id] = (porUsuario[orcamento.usuario_id] || 0) + 1;
        }
      });

      setPedidosPorUsuario(porUsuario);
      setPedidosHojeTotal(data?.length || 0);
    } catch (error) {
      console.error('Erro ao carregar pedidos:', error);
    }
  };

  // Combinar dados dos atendentes com atividades para criar métricas
  const userMetrics: UserMetrics[] = useMemo(() => {
    const metricsMap = new Map<string, UserMetrics>();

    // Primeiro, adicionar todos os atendentes
    atendentes.forEach(atendente => {
      if (atendente.usuario) {
        const activity = activities.find(a => a.usuario_id === atendente.usuario_id);
        metricsMap.set(atendente.usuario_id, {
          usuarioId: atendente.usuario_id,
          nome: atendente.usuario.nome,
          email: atendente.usuario.email,
          isOnline: activity?.is_online || false,
          status: atendente.status,
          chatsAtivos: atendente.chats_ativos,
          emailsAtivos: atendente.emails_ativos,
          pedidosFechados: pedidosPorUsuario[atendente.usuario_id] || 0,
          filaEspera: 0,
          extensionActive: extensionStatuses[atendente.usuario_id] || false,
          currentPage: activity?.current_page_title || null,
          currentRoute: activity?.current_route || null,
        });
      }
    });

    // Adicionar usuários que não são atendentes mas estão no tracking
    activities.forEach(activity => {
      if (!metricsMap.has(activity.usuario_id) && activity.usuario) {
        metricsMap.set(activity.usuario_id, {
          usuarioId: activity.usuario_id,
          nome: activity.usuario.nome,
          email: activity.usuario.email,
          isOnline: activity.is_online,
          status: 'offline',
          chatsAtivos: 0,
          emailsAtivos: 0,
          pedidosFechados: pedidosPorUsuario[activity.usuario_id] || 0,
          filaEspera: 0,
          extensionActive: extensionStatuses[activity.usuario_id] || false,
          currentPage: activity.current_page_title,
          currentRoute: activity.current_route,
        });
      }
    });

    return Array.from(metricsMap.values()).sort((a, b) => {
      // Online primeiro, depois por nome
      if (a.isOnline !== b.isOnline) return a.isOnline ? -1 : 1;
      return a.nome.localeCompare(b.nome);
    });
  }, [atendentes, activities, extensionStatuses, pedidosPorUsuario]);

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

      {/* Lista de Usuários */}
      <Card>
        <CardHeader className="py-3 px-4">
          <CardTitle className="text-sm flex items-center gap-2">
            <Activity className="h-4 w-4" />
            Equipe ({userMetrics.length})
            <span className="text-xs text-muted-foreground ml-2">
              Clique em um usuário para ver conversas em tempo real
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-2">
          <ScrollArea className="max-h-[calc(100vh-320px)]">
            <div className="space-y-2">
              {userMetrics.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  Nenhum usuário encontrado
                </div>
              ) : (
                userMetrics.map((user) => (
                  <UserMonitorRow
                    key={user.usuarioId}
                    usuario={{
                      id: user.usuarioId,
                      nome: user.nome,
                      email: user.email,
                    }}
                    usuarioId={user.usuarioId}
                    isOnline={user.isOnline}
                    status={user.status}
                    chatsAtivos={user.chatsAtivos}
                    emailsAtivos={user.emailsAtivos}
                    pedidosFechados={user.pedidosFechados}
                    filaEspera={filaEsperaTotal}
                    extensionActive={user.extensionActive}
                    currentPage={user.currentPage}
                    currentRoute={user.currentRoute}
                    onViewScreen={() => setViewingScreen({
                      usuarioId: user.usuarioId,
                      nome: user.nome
                    })}
                    estabelecimentoId={estabelecimentoId}
                  />
                ))
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Modal de visualização de tela */}
      {viewingScreen && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="w-full max-w-4xl">
            <ScreenViewer
              usuarioId={viewingScreen.usuarioId}
              usuarioNome={viewingScreen.nome}
              onClose={() => setViewingScreen(null)}
            />
          </div>
        </div>
      )}
    </div>
  );
}
