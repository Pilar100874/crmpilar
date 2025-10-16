import Layout from "@/components/Layout";
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
    <Layout>
      <div className="p-8 space-y-8 animate-fade-in bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 min-h-full">
        <div>
          <h1 className="text-3xl font-bold mb-2 text-white">Dashboard</h1>
          <p className="text-white/70">
            Visão geral do seu atendimento omnicanal
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {stats.map((stat) => (
            <Card key={stat.title} className="hover:shadow-md transition-shadow bg-slate-800 border-slate-700">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-white">
                  {stat.title}
                </CardTitle>
                <stat.icon className={`h-4 w-4 ${stat.color}`} />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-white">{stat.value}</div>
                <p className="text-xs text-white/70 mt-1">
                  {stat.description}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <Card className="bg-slate-800 border-slate-700">
            <CardHeader>
              <CardTitle className="text-white">Atividade Recente</CardTitle>
              <CardDescription className="text-white/70">
                Últimas interações da plataforma
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="flex items-center gap-4 p-3 rounded-lg hover:bg-slate-700/50 transition-colors">
                    <div className="w-2 h-2 rounded-full bg-primary animate-pulse-glow" />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-white">Nova conversa iniciada</p>
                      <p className="text-xs text-white/70">
                        Há {i * 5} minutos
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="bg-slate-800 border-slate-700">
            <CardHeader>
              <CardTitle className="text-white">Canais Ativos</CardTitle>
              <CardDescription className="text-white/70">
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
                      <span className="text-sm font-medium text-white">{channel.name}</span>
                      <span className="text-sm text-white/70">
                        {channel.percentage}%
                      </span>
                    </div>
                    <div className="w-full h-2 bg-slate-700 rounded-full overflow-hidden">
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
    </Layout>
  );
}
