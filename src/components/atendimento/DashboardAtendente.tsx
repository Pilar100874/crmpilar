import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
      {/* Header com Status */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Dashboard do Atendente</CardTitle>
              <CardDescription>
                Status atual: {getStatusBadge(dashboard.atendente.status)}
              </CardDescription>
            </div>
            <div className="text-right text-sm">
              <p className="text-muted-foreground">Chats simultâneos</p>
              <p className="text-2xl font-bold">
                {dashboard.chats_ativos.length}/{dashboard.atendente.max_chats_simultaneos}
              </p>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Métricas do Dia */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Chats Atendidos Hoje</CardDescription>
            <CardTitle className="text-3xl">{dashboard.metricas_hoje?.total_chats || 0}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Chats Encerrados</CardDescription>
            <CardTitle className="text-3xl">{dashboard.metricas_hoje?.chats_encerrados || 0}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Tempo Médio (min)</CardDescription>
            <CardTitle className="text-3xl">
              {dashboard.metricas_hoje ? Math.round(dashboard.metricas_hoje.tempo_medio_atendimento / 60) : 0}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Avaliação Média</CardDescription>
            <CardTitle className="text-3xl">
              {dashboard.metricas_hoje?.avaliacao_media?.toFixed(1) || '-'}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Abas com Chats */}
      <Tabs defaultValue="ativos" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="ativos">
            Chats Ativos ({dashboard.chats_ativos.length})
          </TabsTrigger>
          <TabsTrigger value="espera">
            Em Espera ({dashboard.chats_em_espera.length})
          </TabsTrigger>
        </TabsList>
        
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
      <Card>
        <CardHeader>
          <CardTitle>Minhas Habilidades</CardTitle>
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
