import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Users } from "lucide-react";
import type { DashboardAtendente } from "@/types/atendimento";

interface DashboardAtendenteProps {
  dashboard: DashboardAtendente | null;
  onChangeStatus: (status: string) => void;
}

export const DashboardAtendenteComponent = ({ dashboard, onChangeStatus }: DashboardAtendenteProps) => {
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
      {/* Métricas do Dia */}
      <div className="grid gap-6 md:grid-cols-4">
        <Card className="relative overflow-hidden border-primary/20 hover:border-primary/40 transition-all hover:shadow-lg group">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          <CardHeader className="pb-2 relative">
            <CardDescription>Chats Atendidos Hoje</CardDescription>
            <CardTitle className="text-3xl font-bold tracking-tight">{dashboard.metricas_hoje?.total_chats || 0}</CardTitle>
          </CardHeader>
        </Card>
        <Card className="relative overflow-hidden border-primary/20 hover:border-primary/40 transition-all hover:shadow-lg group">
          <div className="absolute inset-0 bg-gradient-to-br from-green-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          <CardHeader className="pb-2 relative">
            <CardDescription>Chats Encerrados</CardDescription>
            <CardTitle className="text-3xl font-bold tracking-tight">{dashboard.metricas_hoje?.chats_encerrados || 0}</CardTitle>
          </CardHeader>
        </Card>
        <Card className="relative overflow-hidden border-primary/20 hover:border-primary/40 transition-all hover:shadow-lg group">
          <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          <CardHeader className="pb-2 relative">
            <CardDescription>Tempo Médio (min)</CardDescription>
            <CardTitle className="text-3xl font-bold tracking-tight">
              {dashboard.metricas_hoje ? Math.round(dashboard.metricas_hoje.tempo_medio_atendimento / 60) : 0}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card className="relative overflow-hidden border-primary/20 hover:border-primary/40 transition-all hover:shadow-lg group">
          <div className="absolute inset-0 bg-gradient-to-br from-orange-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          <CardHeader className="pb-2 relative">
            <CardDescription>Avaliação Média</CardDescription>
            <CardTitle className="text-3xl font-bold tracking-tight">
              {dashboard.metricas_hoje?.avaliacao_media?.toFixed(1) || '-'}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Abas com Chats */}
      <Tabs defaultValue="ativos" className="space-y-6">
        <div className="overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-border/50 scrollbar-track-transparent">
          <TabsList className="inline-flex w-auto bg-card/50 backdrop-blur-sm border border-border/40 rounded-xl p-1.5 shadow-md">
            <TabsTrigger 
              value="ativos"
              className="data-[state=active]:bg-gradient-to-br data-[state=active]:from-primary/20 data-[state=active]:to-primary/10 data-[state=active]:text-primary data-[state=active]:shadow-sm transition-all duration-200 rounded-lg px-4 py-2.5 text-sm font-medium whitespace-nowrap"
            >
              Chats Ativos ({dashboard.chats_ativos.length})
            </TabsTrigger>
            <TabsTrigger 
              value="espera"
              className="data-[state=active]:bg-gradient-to-br data-[state=active]:from-primary/20 data-[state=active]:to-primary/10 data-[state=active]:text-primary data-[state=active]:shadow-sm transition-all duration-200 rounded-lg px-4 py-2.5 text-sm font-medium whitespace-nowrap"
            >
              Em Espera ({dashboard.chats_em_espera.length})
            </TabsTrigger>
          </TabsList>
        </div>
        
        <TabsContent value="ativos" className="space-y-4">
          {dashboard.chats_ativos.length === 0 ? (
            <Card>
              <CardContent className="pt-6">
                <p className="text-center text-muted-foreground">Nenhum chat ativo no momento</p>
              </CardContent>
            </Card>
          ) : (
            dashboard.chats_ativos.map((chat) => (
              <Card key={chat.id} className="cursor-pointer hover:bg-accent transition-colors">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">Chat #{chat.id.slice(0, 8)}</CardTitle>
                    <Badge>{chat.chat_status}</Badge>
                  </div>
                  <CardDescription>
                    Canal: {chat.canal} | Prioridade: {chat.prioridade || 'normal'}
                  </CardDescription>
                </CardHeader>
              </Card>
            ))
          )}
        </TabsContent>
        
        <TabsContent value="espera" className="space-y-4">
          {dashboard.chats_em_espera.length === 0 ? (
            <Card>
              <CardContent className="pt-6">
                <p className="text-center text-muted-foreground">Nenhum chat em espera</p>
              </CardContent>
            </Card>
          ) : (
            dashboard.chats_em_espera.map((chat) => (
              <Card key={chat.id} className="cursor-pointer hover:bg-accent transition-colors">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">Chat #{chat.id.slice(0, 8)}</CardTitle>
                    <Badge variant="outline">{chat.chat_status}</Badge>
                  </div>
                  <CardDescription>
                    Canal: {chat.canal} | Aguardando há: {/* calcular tempo */}
                  </CardDescription>
                </CardHeader>
              </Card>
            ))
          )}
        </TabsContent>
      </Tabs>

      {/* Skills do Atendente */}
      <Card className="border-primary/20 shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-primary/10">
              <Users className="w-5 h-5 text-primary" />
            </div>
            Minhas Habilidades
          </CardTitle>
          <CardDescription>Skills e níveis de proficiência</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {dashboard.skills.length === 0 ? (
              <p className="text-muted-foreground">Nenhuma skill configurada</p>
            ) : (
              dashboard.skills.map((skillData: any) => (
                <div key={skillData.id} className="flex items-center justify-between p-2 border rounded">
                  <div className="flex items-center gap-2">
                    {skillData.skill?.cor && (
                      <div 
                        className="w-3 h-3 rounded-full" 
                        style={{ backgroundColor: skillData.skill.cor }}
                      />
                    )}
                    <span className="font-medium">{skillData.skill?.nome || 'Skill sem nome'}</span>
                  </div>
                  <Badge variant="outline">Nível {skillData.nivel}</Badge>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
