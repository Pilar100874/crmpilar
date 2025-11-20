import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Users, MessageSquare, Clock, TrendingDown } from "lucide-react";
import type { DashboardSupervisor } from "@/types/atendimento";

interface DashboardSupervisorProps {
  dashboard: DashboardSupervisor | null;
  onForcarTransferencia?: (chatId: string) => void;
  onEncerrarChat?: (chatId: string) => void;
}

export const DashboardSupervisorComponent = ({ dashboard, onForcarTransferencia, onEncerrarChat }: DashboardSupervisorProps) => {
  if (!dashboard) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Carregando dashboard...</p>
      </div>
    );
  }

  const getStatusBadge = (status: string) => {
    const variants = {
      disponivel: "default",
      ocupado: "secondary",
      ausente: "outline",
      offline: "destructive",
      pausa: "secondary"
    } as const;
    
    return <Badge variant={variants[status as keyof typeof variants] || "default"}>{status}</Badge>;
  };

  return (
    <div className="space-y-6">
      {/* Métricas Gerais */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Chats Ativos</CardTitle>
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dashboard.metricas_gerais.total_chats_ativos}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Em Fila</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dashboard.metricas_gerais.total_chats_em_fila}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tempo Médio Espera</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {Math.round(dashboard.metricas_gerais.tempo_medio_espera / 60)}min
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Taxa Abandono</CardTitle>
            <TrendingDown className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {dashboard.metricas_gerais.taxa_abandono.toFixed(1)}%
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Abas Filas e Atendentes */}
      <Tabs defaultValue="filas" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="filas">
            Filas ({dashboard.filas.length})
          </TabsTrigger>
          <TabsTrigger value="atendentes">
            Atendentes ({dashboard.atendentes.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="filas" className="space-y-4">
          {dashboard.filas.map((fila) => (
            <Card key={fila.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-base">{fila.nome}</CardTitle>
                    <CardDescription>{fila.descricao}</CardDescription>
                  </div>
                  <Badge variant={fila.ativa ? "default" : "secondary"}>
                    {fila.ativa ? "Ativa" : "Inativa"}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Chats em Fila</p>
                    <p className="text-2xl font-bold">{fila.chats_em_fila}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Atendentes Disponíveis</p>
                    <p className="text-2xl font-bold">{fila.atendentes_disponiveis}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Total Atendentes</p>
                    <p className="text-2xl font-bold">{fila.atendentes_total}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="atendentes" className="space-y-4">
          {dashboard.atendentes.map((atendente) => (
            <Card key={atendente.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-base">{atendente.usuario.nome}</CardTitle>
                    <CardDescription>{atendente.usuario.email}</CardDescription>
                  </div>
                  {getStatusBadge(atendente.status)}
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div className="text-sm">
                    <p className="text-muted-foreground">Chats Ativos</p>
                    <p className="text-xl font-bold">
                      {atendente.chats_ativos}/{atendente.max_chats_simultaneos}
                    </p>
                  </div>
                  <div className="space-x-2">
                    <Button size="sm" variant="outline">Ver Detalhes</Button>
                    <Button size="sm" variant="outline">Forçar Pausa</Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>
      </Tabs>
    </div>
  );
};
