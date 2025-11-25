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
      <div className="grid gap-6 md:grid-cols-4">
        <Card className="relative overflow-hidden border-primary/20 hover:border-primary/40 transition-all hover:shadow-lg group">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative">
            <CardTitle className="text-sm font-medium text-muted-foreground">Chats Ativos</CardTitle>
            <div className="p-2 rounded-lg bg-blue-500/10">
              <MessageSquare className="h-5 w-5 text-blue-500" />
            </div>
          </CardHeader>
          <CardContent className="relative">
            <div className="text-3xl font-bold tracking-tight">{dashboard.metricas_gerais.total_chats_ativos}</div>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden border-primary/20 hover:border-primary/40 transition-all hover:shadow-lg group">
          <div className="absolute inset-0 bg-gradient-to-br from-green-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative">
            <CardTitle className="text-sm font-medium text-muted-foreground">Em Fila</CardTitle>
            <div className="p-2 rounded-lg bg-green-500/10">
              <Users className="h-5 w-5 text-green-500" />
            </div>
          </CardHeader>
          <CardContent className="relative">
            <div className="text-3xl font-bold tracking-tight">{dashboard.metricas_gerais.total_chats_em_fila}</div>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden border-primary/20 hover:border-primary/40 transition-all hover:shadow-lg group">
          <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative">
            <CardTitle className="text-sm font-medium text-muted-foreground">Tempo Médio Espera</CardTitle>
            <div className="p-2 rounded-lg bg-purple-500/10">
              <Clock className="h-5 w-5 text-purple-500" />
            </div>
          </CardHeader>
          <CardContent className="relative">
            <div className="text-3xl font-bold tracking-tight">
              {dashboard.metricas_gerais.tempo_medio_espera}min
            </div>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden border-primary/20 hover:border-primary/40 transition-all hover:shadow-lg group">
          <div className="absolute inset-0 bg-gradient-to-br from-orange-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative">
            <CardTitle className="text-sm font-medium text-muted-foreground">Taxa Abandono</CardTitle>
            <div className="p-2 rounded-lg bg-orange-500/10">
              <TrendingDown className="h-5 w-5 text-orange-500" />
            </div>
          </CardHeader>
          <CardContent className="relative">
            <div className="text-3xl font-bold tracking-tight">
              {dashboard.metricas_gerais.taxa_abandono.toFixed(1)}%
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Abas Filas e Atendentes */}
      <Tabs defaultValue="filas" className="space-y-6">
        <div className="overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-border/50 scrollbar-track-transparent">
          <TabsList className="inline-flex w-auto bg-card/50 backdrop-blur-sm border border-border/40 rounded-xl p-1.5 shadow-md">
            <TabsTrigger 
              value="filas"
              className="data-[state=active]:bg-gradient-to-br data-[state=active]:from-primary/20 data-[state=active]:to-primary/10 data-[state=active]:text-primary data-[state=active]:shadow-sm transition-all duration-200 rounded-lg px-4 py-2.5 text-sm font-medium whitespace-nowrap"
            >
              Filas ({dashboard.filas.length})
            </TabsTrigger>
            <TabsTrigger 
              value="atendentes"
              className="data-[state=active]:bg-gradient-to-br data-[state=active]:from-primary/20 data-[state=active]:to-primary/10 data-[state=active]:text-primary data-[state=active]:shadow-sm transition-all duration-200 rounded-lg px-4 py-2.5 text-sm font-medium whitespace-nowrap"
            >
              Atendentes ({dashboard.atendentes.length})
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="filas" className="space-y-4">
          {dashboard.filas.map((fila) => (
            <Card key={fila.id} className="border-primary/20 hover:shadow-lg transition-all hover:border-primary/40">
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
            <Card key={atendente.id} className="border-primary/20 hover:shadow-lg transition-all hover:border-primary/40">
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
