import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getEstabelecimentoId } from "@/lib/estabelecimentoUtils";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Users, MessageSquare, Clock, Activity, AlertCircle } from "lucide-react";
import type { FilaAtendimento } from "@/types/atendimento";

interface FilaMetrics {
  fila: FilaAtendimento;
  chatsEmFila: number;
  chatsEmAtendimento: number;
  atendentesDisponiveis: number;
  atendentesTotal: number;
  tempoMedioEspera: number;
}

export default function MonitorarFilas() {
  const [metricas, setMetricas] = useState<FilaMetrics[]>([]);
  const [loading, setLoading] = useState(true);
  const [estabelecimentoId, setEstabelecimentoId] = useState<string>("");

  useEffect(() => {
    init();
  }, []);

  const init = async () => {
    const estabId = await getEstabelecimentoId();
    if (estabId) {
      setEstabelecimentoId(estabId);
      await loadMetricas(estabId);
      
      // Configurar realtime para atualizações
      const channel = supabase
        .channel('filas-monitoring')
        .on('postgres_changes', 
          { event: '*', schema: 'public', table: 'conversations', filter: `estabelecimento_id=eq.${estabId}` },
          () => loadMetricas(estabId)
        )
        .on('postgres_changes',
          { event: '*', schema: 'public', table: 'atendentes', filter: `estabelecimento_id=eq.${estabId}` },
          () => loadMetricas(estabId)
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  };

  const loadMetricas = async (estabId: string) => {
    try {
      setLoading(true);

      // Buscar filas ativas
      const { data: filas, error: filasError } = await supabase
        .from("filas_atendimento")
        .select("*")
        .eq("estabelecimento_id", estabId)
        .eq("ativa", true)
        .order("prioridade", { ascending: false });

      if (filasError) throw filasError;

      // Buscar métricas para cada fila
      const metricasPromises = (filas || []).map(async (fila) => {
        // Chats em fila
        const { count: chatsEmFila } = await supabase
          .from("conversations")
          .select("*", { count: 'exact', head: true })
          .eq("estabelecimento_id", estabId)
          .eq("fila_id", fila.id)
          .eq("chat_status", "em_fila");

        // Chats em atendimento
        const { count: chatsEmAtendimento } = await supabase
          .from("conversations")
          .select("*", { count: 'exact', head: true })
          .eq("estabelecimento_id", estabId)
          .eq("fila_id", fila.id)
          .eq("chat_status", "em_atendimento");

        // Atendentes da fila
        const { data: atendentesData } = await supabase
          .from("atendente_filas")
          .select(`
            atendente_id,
            atendentes!inner (
              id,
              status
            )
          `)
          .eq("fila_id", fila.id);

        const atendentesTotal = atendentesData?.length || 0;
        const atendentesDisponiveis = atendentesData?.filter(
          (af: any) => af.atendentes.status === 'disponivel' || af.atendentes.status === 'ocupado'
        ).length || 0;

        // Calcular tempo médio de espera (últimas 2 horas)
        const duasHorasAtras = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
        const { data: chatsRecentes } = await supabase
          .from("conversations")
          .select("tempo_espera_inicio, tempo_atendimento_inicio")
          .eq("estabelecimento_id", estabId)
          .eq("fila_id", fila.id)
          .not("tempo_espera_inicio", "is", null)
          .not("tempo_atendimento_inicio", "is", null)
          .gte("tempo_espera_inicio", duasHorasAtras);

        let tempoMedioEspera = 0;
        if (chatsRecentes && chatsRecentes.length > 0) {
          const temposEspera = chatsRecentes.map(chat => {
            const inicio = new Date(chat.tempo_espera_inicio!).getTime();
            const atendimento = new Date(chat.tempo_atendimento_inicio!).getTime();
            return (atendimento - inicio) / 1000; // em segundos
          });
          tempoMedioEspera = temposEspera.reduce((a, b) => a + b, 0) / temposEspera.length;
        }

        return {
          fila,
          chatsEmFila: chatsEmFila || 0,
          chatsEmAtendimento: chatsEmAtendimento || 0,
          atendentesDisponiveis,
          atendentesTotal,
          tempoMedioEspera
        };
      });

      const metricasData = await Promise.all(metricasPromises);
      setMetricas(metricasData);
    } catch (error) {
      console.error("Erro ao carregar métricas:", error);
    } finally {
      setLoading(false);
    }
  };

  const formatTempo = (segundos: number) => {
    if (segundos < 60) return `${Math.round(segundos)}s`;
    const minutos = Math.floor(segundos / 60);
    if (minutos < 60) return `${minutos}min`;
    const horas = Math.floor(minutos / 60);
    const minutosRestantes = minutos % 60;
    return `${horas}h ${minutosRestantes}min`;
  };

  const getStatusBadge = (fila: FilaMetrics) => {
    const capacidade = (fila.atendentesDisponiveis * fila.fila.max_chats_por_atendente);
    const cargaAtual = fila.chatsEmAtendimento + fila.chatsEmFila;
    const percentual = capacidade > 0 ? (cargaAtual / capacidade) * 100 : 0;

    if (fila.atendentesDisponiveis === 0) {
      return <Badge variant="destructive" className="flex items-center gap-1"><AlertCircle className="h-3 w-3" /> Sem Atendentes</Badge>;
    }
    if (percentual >= 90) {
      return <Badge variant="destructive" className="flex items-center gap-1"><Activity className="h-3 w-3" /> Crítico ({Math.round(percentual)}%)</Badge>;
    }
    if (percentual >= 70) {
      return <Badge className="bg-yellow-600 flex items-center gap-1"><Activity className="h-3 w-3" /> Alto ({Math.round(percentual)}%)</Badge>;
    }
    return <Badge variant="secondary" className="flex items-center gap-1"><Activity className="h-3 w-3" /> Normal ({Math.round(percentual)}%)</Badge>;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-muted-foreground">Carregando métricas...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 md:p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Monitor de Filas</h1>
        <p className="text-muted-foreground mt-1">
          Acompanhe o status e métricas das filas de atendimento em tempo real
        </p>
      </div>

      {metricas.length === 0 ? (
        <Card>
          <CardContent className="py-12">
            <div className="text-center text-muted-foreground">
              Nenhuma fila ativa encontrada
            </div>
          </CardContent>
        </Card>
      ) : (
        <ScrollArea className="h-[calc(100vh-200px)]">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {metricas.map((metrica) => (
              <Card key={metrica.fila.id} className="hover:shadow-lg transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1 flex-1">
                      <CardTitle className="text-lg">{metrica.fila.nome}</CardTitle>
                      {metrica.fila.descricao && (
                        <CardDescription className="text-xs line-clamp-2">
                          {metrica.fila.descricao}
                        </CardDescription>
                      )}
                    </div>
                    {getStatusBadge(metrica)}
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-accent/50 rounded-lg p-3">
                      <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                        <MessageSquare className="h-3 w-3" />
                        Em Fila
                      </div>
                      <div className="text-2xl font-bold">{metrica.chatsEmFila}</div>
                    </div>

                    <div className="bg-accent/50 rounded-lg p-3">
                      <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                        <Activity className="h-3 w-3" />
                        Em Atendimento
                      </div>
                      <div className="text-2xl font-bold">{metrica.chatsEmAtendimento}</div>
                    </div>
                  </div>

                  <div className="space-y-2 pt-2 border-t">
                    <div className="flex items-center justify-between text-sm">
                      <span className="flex items-center gap-2 text-muted-foreground">
                        <Users className="h-4 w-4" />
                        Atendentes
                      </span>
                      <span className="font-medium">
                        {metrica.atendentesDisponiveis} / {metrica.atendentesTotal}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-sm">
                      <span className="flex items-center gap-2 text-muted-foreground">
                        <Clock className="h-4 w-4" />
                        Tempo Médio
                      </span>
                      <span className="font-medium">
                        {metrica.tempoMedioEspera > 0 ? formatTempo(metrica.tempoMedioEspera) : '-'}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Capacidade Máx.</span>
                      <span className="font-medium">
                        {metrica.atendentesDisponiveis * metrica.fila.max_chats_por_atendente}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </ScrollArea>
      )}
    </div>
  );
}
