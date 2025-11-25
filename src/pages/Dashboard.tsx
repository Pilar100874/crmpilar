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
    <div className="space-y-6 p-6">
      {/* Header com gradiente */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary/10 via-primary/5 to-background p-8 border border-primary/20">
        <div className="absolute inset-0 bg-grid-white/10 [mask-image:linear-gradient(0deg,white,rgba(255,255,255,0.5))]" />
        <div className="relative">
          <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text">
            Dashboard
          </h1>
          <p className="text-muted-foreground mt-1">
            Visão geral do seu atendimento omnicanal
          </p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat, index) => {
          const colors = [
            { bg: 'from-blue-500/10', icon: 'bg-blue-500/10', iconColor: 'text-blue-500', border: 'border-blue-500/30' },
            { bg: 'from-green-500/10', icon: 'bg-green-500/10', iconColor: 'text-green-500', border: 'border-green-500/30' },
            { bg: 'from-purple-500/10', icon: 'bg-purple-500/10', iconColor: 'text-purple-500', border: 'border-purple-500/30' },
            { bg: 'from-orange-500/10', icon: 'bg-orange-500/10', iconColor: 'text-orange-500', border: 'border-orange-500/30' }
          ];
          const color = colors[index % colors.length];
          
          return (
            <Card key={stat.title} className={`relative overflow-hidden border-primary/20 hover:border-primary/40 transition-all hover:shadow-lg group ${color.border}`}>
              <div className={`absolute inset-0 bg-gradient-to-br ${color.bg} to-transparent opacity-0 group-hover:opacity-100 transition-opacity`} />
              <CardHeader className="flex flex-row items-center justify-between pb-2 relative">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {stat.title}
                </CardTitle>
                <div className={`p-2 rounded-lg ${color.icon}`}>
                  <stat.icon className={`h-5 w-5 ${color.iconColor}`} />
                </div>
              </CardHeader>
              <CardContent className="relative">
                <div className="text-3xl font-bold tracking-tight">{stat.value}</div>
                <p className="text-sm text-muted-foreground mt-1">
                  {stat.description}
                </p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="border-primary/20 shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-primary/10">
                <MessageSquare className="w-5 h-5 text-primary" />
              </div>
              Atividade Recente
            </CardTitle>
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

        <Card className="border-primary/20 shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-primary/10">
                <TrendingUp className="w-5 h-5 text-primary" />
              </div>
              Canais Ativos
            </CardTitle>
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
