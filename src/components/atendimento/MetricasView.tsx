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
  TrendingDown
} from "lucide-react";

interface MetricasViewProps {
  periodo?: 'hoje' | 'semana' | 'mes';
  onChangePeriodo?: (periodo: string) => void;
}

export const MetricasView = ({ periodo = 'hoje', onChangePeriodo }: MetricasViewProps) => {
  // TODO: Implementar lógica real de métricas
  const metricas = {
    total_atendimentos: 245,
    tempo_medio: 8.5,
    satisfacao: 4.7,
    taxa_resolucao: 92.3,
    chats_ativos: 12,
    chats_em_fila: 5,
    atendentes_online: 8,
    atendentes_total: 12
  };

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

      <Tabs value={periodo} onValueChange={onChangePeriodo} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="hoje">Hoje</TabsTrigger>
          <TabsTrigger value="semana">Última Semana</TabsTrigger>
          <TabsTrigger value="mes">Último Mês</TabsTrigger>
        </TabsList>

        <TabsContent value={periodo} className="space-y-6">
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
                  <span>+12% vs ontem</span>
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
                  <span>+2.3% vs ontem</span>
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
                  <span>+0.2 vs ontem</span>
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
                  <span>+3.1% vs ontem</span>
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
                    {Math.round((metricas.chats_ativos / (metricas.atendentes_online * 3)) * 100)}%
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
};
