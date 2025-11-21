import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  BarChart,
  LineChart,
  Users,
  Clock,
  MessageSquare,
  Star,
  TrendingUp,
  TrendingDown,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface MetricasViewProps {
  periodo?: "hoje" | "semana" | "mes";
  onChangePeriodo?: (periodo: string) => void;
  estabelecimentoId?: string;
}

type Periodo = "hoje" | "semana" | "mes";

interface MetricasState {
  total_atendimentos: number;
  tempo_medio: number; // minutos
  satisfacao: number; // 0-5
  taxa_resolucao: number; // %
  chats_ativos: number;
  chats_em_fila: number;
  atendentes_online: number;
  atendentes_total: number;
}

export const MetricasView = ({ periodo = "hoje", onChangePeriodo, estabelecimentoId }: MetricasViewProps) => {
  const [periodoSelecionado, setPeriodoSelecionado] = useState<Periodo>(periodo);
  const [metricas, setMetricas] = useState<MetricasState>({
    total_atendimentos: 0,
    tempo_medio: 0,
    satisfacao: 0,
    taxa_resolucao: 0,
    chats_ativos: 0,
    chats_em_fila: 0,
    atendentes_online: 0,
    atendentes_total: 0,
  });
  const [loading, setLoading] = useState(false);

  const handlePeriodoChange = (value: string) => {
    const p = value as Periodo;
    setPeriodoSelecionado(p);
    onChangePeriodo?.(value);
  };

  useEffect(() => {
    if (!estabelecimentoId) return;

    const calcularIntervalo = (p: Periodo) => {
      const agora = new Date();
      const inicio = new Date();

      if (p === "semana") {
        inicio.setDate(agora.getDate() - 7);
      } else if (p === "mes") {
        inicio.setDate(agora.getDate() - 30);
      } else {
        inicio.setHours(0, 0, 0, 0);
      }

      return { inicio, fim: agora };
    };

    const carregarMetricas = async () => {
      try {
        setLoading(true);
        const { inicio, fim } = calcularIntervalo(periodoSelecionado);

        // Conversas no período
        const { data: conversas, error: conversasError } = await supabase
          .from("conversations")
          .select(
            "id, created_at, tempo_atendimento_inicio, tempo_encerramento, avaliacao, chat_status, motivo_encerramento"
          )
          .eq("estabelecimento_id", estabelecimentoId)
          .gte("created_at", inicio.toISOString())
          .lte("created_at", fim.toISOString());

        if (conversasError) throw conversasError;

        const total_atendimentos = conversas?.length || 0;

        // Tempo médio de atendimento em minutos
        let tempo_medio = 0;
        if (conversas && conversas.length > 0) {
          const tempos = conversas
            .filter((c) => c.tempo_atendimento_inicio && c.tempo_encerramento)
            .map((c) => {
              const inicioAt = new Date(c.tempo_atendimento_inicio as string);
              const fimAt = new Date(c.tempo_encerramento as string);
              return (fimAt.getTime() - inicioAt.getTime()) / 1000 / 60;
            });

          if (tempos.length > 0) {
            tempo_medio = tempos.reduce((a, b) => a + b, 0) / tempos.length;
          }
        }

        // Satisfação média (1-5)
        let satisfacao = 0;
        if (conversas && conversas.length > 0) {
          const avaliadas = conversas.filter((c) => c.avaliacao !== null && c.avaliacao !== undefined);
          if (avaliadas.length > 0) {
            const soma = avaliadas.reduce((acc, c) => acc + (c.avaliacao as number), 0);
            satisfacao = soma / avaliadas.length;
          }
        }

        // Taxa de resolução: percentual de chats encerrados que não são abandono
        let taxa_resolucao = 0;
        if (conversas && conversas.length > 0) {
          const encerrados = conversas.filter((c) => c.chat_status === "encerrado");
          if (encerrados.length > 0) {
            const resolvidos = encerrados.filter((c) => {
              const motivo = (c.motivo_encerramento || "").toLowerCase();
              return !motivo.includes("abandono");
            });
            taxa_resolucao = (resolvidos.length / encerrados.length) * 100;
          }
        }

        // Status atual em tempo real
        const { data: chatsAtivos } = await supabase
          .from("conversations")
          .select("id")
          .eq("estabelecimento_id", estabelecimentoId)
          .in("chat_status", ["em_atendimento", "aguardando_cliente"]);

        const { data: chatsEmFila } = await supabase
          .from("conversations")
          .select("id")
          .eq("estabelecimento_id", estabelecimentoId)
          .eq("chat_status", "em_fila");

        const { data: atendentes } = await supabase
          .from("atendentes")
          .select("id, status")
          .eq("estabelecimento_id", estabelecimentoId);

        const atendentes_total = atendentes?.length || 0;
        const atendentes_online = (atendentes || []).filter((a) => a.status !== "offline").length;

        setMetricas({
          total_atendimentos,
          tempo_medio: Math.round(tempo_medio * 10) / 10,
          satisfacao: Math.round(satisfacao * 10) / 10,
          taxa_resolucao: Math.round(taxa_resolucao * 10) / 10,
          chats_ativos: chatsAtivos?.length || 0,
          chats_em_fila: chatsEmFila?.length || 0,
          atendentes_online,
          atendentes_total,
        });
      } catch (error) {
        console.error("[MetricasView] Erro ao carregar métricas:", error);
      } finally {
        setLoading(false);
      }
    };

    carregarMetricas();
  }, [estabelecimentoId, periodoSelecionado]);

  if (!estabelecimentoId) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Métricas e Relatórios</h2>
            <p className="text-muted-foreground">
              Selecione um estabelecimento para visualizar as métricas.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Métricas e Relatórios</h2>
          <p className="text-muted-foreground">
            Acompanhe o desempenho do seu time de atendimento
          </p>
        </div>
      </div>

      <Tabs value={periodoSelecionado} onValueChange={handlePeriodoChange} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="hoje">Hoje</TabsTrigger>
          <TabsTrigger value="semana">Última Semana</TabsTrigger>
          <TabsTrigger value="mes">Último Mês</TabsTrigger>
        </TabsList>

        <TabsContent value={periodoSelecionado} className="space-y-6">
          {/* Métricas Gerais */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Atendimentos</CardTitle>
                <MessageSquare className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{metricas.total_atendimentos}</div>
                <div className="flex items-center text-xs text-green-600 mt-1">
                  <TrendingUp className="h-3 w-3 mr-1" />
                  <span>Dados em tempo real</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Tempo Médio (min)</CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{metricas.tempo_medio}</div>
                <div className="flex items-center text-xs text-red-600 mt-1">
                  <TrendingDown className="h-3 w-3 mr-1" />
                  <span>Média do período selecionado</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Satisfação</CardTitle>
                <Star className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{metricas.satisfacao}/5.0</div>
                <div className="flex items-center text-xs text-green-600 mt-1">
                  <TrendingUp className="h-3 w-3 mr-1" />
                  <span>Média das avaliações</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Taxa Resolução</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{metricas.taxa_resolucao}%</div>
                <div className="flex items-center text-xs text-green-600 mt-1">
                  <TrendingUp className="h-3 w-3 mr-1" />
                  <span>Encerrados com sucesso</span>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Status Atual */}
          <Card>
            <CardHeader>
              <CardTitle>Status em Tempo Real</CardTitle>
              <CardDescription>Situação atual do atendimento</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="flex flex-col">
                  <span className="text-sm text-muted-foreground">Chats Ativos</span>
                  <span className="text-2xl font-bold">{metricas.chats_ativos}</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-sm text-muted-foreground">Em Fila</span>
                  <span className="text-2xl font-bold">{metricas.chats_em_fila}</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-sm text-muted-foreground">Atendentes Online</span>
                  <span className="text-2xl font-bold">
                    {metricas.atendentes_online}/{metricas.atendentes_total}
                  </span>
                </div>
                <div className="flex flex-col">
                  <span className="text-sm text-muted-foreground">Capacidade</span>
                  <span className="text-2xl font-bold">
                    {metricas.atendentes_online > 0
                      ? Math.round((metricas.chats_ativos / (metricas.atendentes_online * 3)) * 100)
                      : 0}
                    %
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Gráficos - Placeholder */}
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Atendimentos por Hora</CardTitle>
                <CardDescription>Distribuição de atendimentos ao longo do dia</CardDescription>
              </CardHeader>
              <CardContent className="h-64 flex items-center justify-center">
                <div className="text-center text-muted-foreground">
                  <BarChart className="h-12 w-12 mx-auto mb-2" />
                  <p>Gráfico será implementado</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Tempo Médio de Atendimento</CardTitle>
                <CardDescription>Evolução do tempo médio de atendimento</CardDescription>
              </CardHeader>
              <CardContent className="h-64 flex items-center justify-center">
                <div className="text-center text-muted-foreground">
                  <LineChart className="h-12 w-12 mx-auto mb-2" />
                  <p>Gráfico será implementado</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
