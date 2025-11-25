import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, TrendingDown, Activity, Users, AlertTriangle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts';

interface SentimentDashboardProps {
  estabelecimentoId: string;
}

export default function SentimentDashboard({ estabelecimentoId }: SentimentDashboardProps) {
  const [stats, setStats] = useState<any>({
    total: 0,
    positivo: 0,
    neutro: 0,
    negativo: 0,
    scoreGeral: 0,
    alertasAtivos: 0
  });
  const [byAtendente, setByAtendente] = useState<any[]>([]);
  const [trend, setTrend] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, [estabelecimentoId]);

  const loadStats = async () => {
    // Stats gerais
    const { data: analyses } = await supabase
      .from('sentiment_analysis')
      .select('sentiment, score')
      .eq('estabelecimento_id', estabelecimentoId)
      .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString());

    if (analyses) {
      const total = analyses.length;
      const positivo = analyses.filter(a => a.sentiment === 'positivo').length;
      const neutro = analyses.filter(a => a.sentiment === 'neutro').length;
      const negativo = analyses.filter(a => a.sentiment === 'negativo').length;
      const scoreGeral = analyses.reduce((sum, a) => sum + a.score, 0) / total;

      setStats({
        total,
        positivo,
        neutro,
        negativo,
        scoreGeral: Math.round(scoreGeral * 100) / 100
      });
    }

    // Alertas ativos
    const { data: alerts } = await supabase
      .from('sentiment_alerts')
      .select('id')
      .eq('estabelecimento_id', estabelecimentoId)
      .eq('resolvido', false);

    if (alerts) {
      setStats((prev: any) => ({ ...prev, alertasAtivos: alerts.length }));
    }

    // Por atendente
    const { data: conversations } = await supabase
      .from('sentiment_conversation_summary')
      .select(`
        *,
        conversations!inner (
          atendente_atual_id,
          atendentes!inner (
            usuarios (nome)
          )
        )
      `)
      .eq('estabelecimento_id', estabelecimentoId)
      .not('conversations.atendente_atual_id', 'is', null);

    if (conversations) {
      const grouped = conversations.reduce((acc: any, curr: any) => {
        const atendenteName = curr.conversations?.atendentes?.usuarios?.nome || 'Sem atendente';
        if (!acc[atendenteName]) {
          acc[atendenteName] = {
            nome: atendenteName,
            total: 0,
            scoreGeral: 0,
            positivos: 0,
            negativos: 0
          };
        }
        acc[atendenteName].total++;
        acc[atendenteName].scoreGeral += curr.score_geral || 0;
        if (curr.sentimento_predominante === 'positivo') acc[atendenteName].positivos++;
        if (curr.sentimento_predominante === 'negativo') acc[atendenteName].negativos++;
        return acc;
      }, {});

      const atendenteStats = Object.values(grouped).map((g: any) => ({
        ...g,
        scoreGeral: Math.round((g.scoreGeral / g.total) * 100)
      }));

      setByAtendente(atendenteStats);
    }

    // Tendência (últimos 7 dias)
    const trendData = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
      const startOfDay = new Date(date.setHours(0, 0, 0, 0)).toISOString();
      const endOfDay = new Date(date.setHours(23, 59, 59, 999)).toISOString();

      const { data } = await supabase
        .from('sentiment_analysis')
        .select('sentiment, score')
        .eq('estabelecimento_id', estabelecimentoId)
        .gte('created_at', startOfDay)
        .lte('created_at', endOfDay);

      if (data) {
        const positivo = data.filter(a => a.sentiment === 'positivo').length;
        const neutro = data.filter(a => a.sentiment === 'neutro').length;
        const negativo = data.filter(a => a.sentiment === 'negativo').length;
        const score = data.length > 0 ? data.reduce((sum, a) => sum + a.score, 0) / data.length : 0;

        trendData.push({
          dia: date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
          positivo,
          neutro,
          negativo,
          score: Math.round(score * 100)
        });
      }
    }
    setTrend(trendData);

    setLoading(false);
  };

  const COLORS = ['#22c55e', '#eab308', '#ef4444'];

  const pieData = [
    { name: 'Positivo', value: stats.positivo, color: '#22c55e' },
    { name: 'Neutro', value: stats.neutro, color: '#eab308' },
    { name: 'Negativo', value: stats.negativo, color: '#ef4444' }
  ];

  if (loading) {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Dashboard de Sentimento</CardTitle>
            <CardDescription>Carregando análises...</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Analisado</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground">últimos 7 dias</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Score Geral</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{Math.round(stats.scoreGeral * 100)}%</div>
            <Progress value={stats.scoreGeral * 100} className="mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Sentimento Positivo</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-500">
              {stats.total > 0 ? Math.round((stats.positivo / stats.total) * 100) : 0}%
            </div>
            <p className="text-xs text-muted-foreground">{stats.positivo} mensagens</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Alertas Ativos</CardTitle>
            <AlertTriangle className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-500">{stats.alertasAtivos}</div>
            <p className="text-xs text-muted-foreground">requerem atenção</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Distribuição de Sentimentos</CardTitle>
            <CardDescription>Proporção dos últimos 7 dias</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Tendência de Score</CardTitle>
            <CardDescription>Últimos 7 dias</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={trend}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="dia" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="score" stroke="#8884d8" strokeWidth={2} name="Score %" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Performance por Atendente</CardTitle>
          <CardDescription>Score médio dos últimos 7 dias</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={byAtendente}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="nome" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="scoreGeral" fill="#8884d8" name="Score %" />
              <Bar dataKey="positivos" fill="#22c55e" name="Positivos" />
              <Bar dataKey="negativos" fill="#ef4444" name="Negativos" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}
