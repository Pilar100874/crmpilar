import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { MessageSquare, Users, TrendingUp, Clock } from "lucide-react";

export default function Dashboard() {
  const stats = [
    {
      title: "Conversas Ativas",
      value: "24",
      description: "+12% desde ontem",
      icon: MessageSquare,
      color: "text-primary",
    },
    {
      title: "Clientes Atendidos",
      value: "156",
      description: "+8% esta semana",
      icon: Users,
      color: "text-success",
    },
    {
      title: "Taxa de Resolução",
      value: "94%",
      description: "+2% este mês",
      icon: TrendingUp,
      color: "text-accent",
    },
    {
      title: "Tempo Médio",
      value: "3.2min",
      description: "-15% este mês",
      icon: Clock,
      color: "text-warning",
    },
  ];

  return (
    <div className="p-8 space-y-8 animate-fade-in bg-white min-h-full">
        <div>
          <h1 className="text-lg font-bold mb-2 text-foreground">Dashboard</h1>
          <p className="text-muted-foreground">
            Visão geral do seu atendimento omnicanal
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {stats.map((stat) => (
            <Card key={stat.title} className="hover:shadow-md transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  {stat.title}
                </CardTitle>
                <stat.icon className={`h-4 w-4 ${stat.color}`} />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-foreground">{stat.value}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  {stat.description}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Atividade Recente</CardTitle>
              <CardDescription>
                Últimas interações da plataforma
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="flex items-center gap-4 p-3 rounded-lg hover:bg-muted/50 transition-colors">
                    <div className="w-2 h-2 rounded-full bg-primary animate-pulse-glow" />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-foreground">Nova conversa iniciada</p>
                      <p className="text-xs text-muted-foreground">
                        Há {i * 5} minutos
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Canais Ativos</CardTitle>
              <CardDescription>
                Distribuição de atendimentos por canal
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {[
                  { name: "WhatsApp", percentage: 65, color: "bg-success" },
                  { name: "Web Chat", percentage: 25, color: "bg-primary" },
                  { name: "Telegram", percentage: 10, color: "bg-accent" },
                ].map((channel) => (
                  <div key={channel.name}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-foreground">{channel.name}</span>
                      <span className="text-sm text-muted-foreground">
                        {channel.percentage}%
                      </span>
                    </div>
                    <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className={`h-full ${channel.color} transition-all duration-500`}
                        style={{ width: `${channel.percentage}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
  );
}
