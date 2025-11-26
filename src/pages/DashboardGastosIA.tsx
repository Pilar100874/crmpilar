import { useState, useEffect } from "react";
import Layout from "@/components/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Brain, TrendingUp, DollarSign, Activity, Calendar, Filter } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { format, subDays, startOfDay, endOfDay } from "date-fns";
import { ptBR } from "date-fns/locale";

interface UsageLog {
  id: string;
  contexto: string;
  provider: string;
  model: string;
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
  custo_estimado: number;
  duracao_ms: number | null;
  sucesso: boolean;
  created_at: string;
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d', '#ffc658'];

const CONTEXTO_LABELS: Record<string, string> = {
  suggest_response: "Sugestão de Resposta",
  summarize: "Resumo",
  translate: "Tradução",
  sentiment: "Análise de Sentimento",
  kb_articles: "Artigos KB",
  extract_items: "Extração de Itens",
  suggest_products: "Sugestão de Produtos",
  default: "Padrão"
};

export default function DashboardGastosIA() {
  const [logs, setLogs] = useState<UsageLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [periodo, setPeriodo] = useState("7");
  const [estabelecimentoId, setEstabelecimentoId] = useState<string | null>(null);

  useEffect(() => {
    loadEstabelecimento();
  }, []);

  useEffect(() => {
    if (estabelecimentoId) {
      loadLogs();
    }
  }, [estabelecimentoId, periodo]);

  const loadEstabelecimento = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: usuario } = await supabase
        .from("usuarios")
        .select("estabelecimento_id")
        .eq("auth_user_id", user.id)
        .single();

      if (usuario) {
        setEstabelecimentoId(usuario.estabelecimento_id);
      }
    } catch (error: any) {
      console.error("Erro ao carregar estabelecimento:", error);
    }
  };

  const loadLogs = async () => {
    try {
      setLoading(true);
      const dataInicio = startOfDay(subDays(new Date(), parseInt(periodo)));
      const dataFim = endOfDay(new Date());

      const { data, error } = await supabase
        .from("ia_usage_log")
        .select("*")
        .eq("estabelecimento_id", estabelecimentoId!)
        .gte("created_at", dataInicio.toISOString())
        .lte("created_at", dataFim.toISOString())
        .order("created_at", { ascending: false });

      if (error) throw error;
      setLogs(data || []);
    } catch (error: any) {
      console.error("Erro ao carregar logs:", error);
      toast.error("Erro ao carregar dados de uso");
    } finally {
      setLoading(false);
    }
  };

  // Calcular métricas
  const totalChamadas = logs.length;
  const chamadasSucesso = logs.filter(l => l.sucesso).length;
  const totalTokens = logs.reduce((sum, l) => sum + l.total_tokens, 0);
  const custoTotal = logs.reduce((sum, l) => sum + parseFloat(l.custo_estimado.toString()), 0);
  const duracaoMedia = logs.filter(l => l.duracao_ms).reduce((sum, l) => sum + (l.duracao_ms || 0), 0) / logs.filter(l => l.duracao_ms).length || 0;

  // Dados por contexto
  const usoPorContexto = Object.entries(
    logs.reduce((acc, log) => {
      const contexto = CONTEXTO_LABELS[log.contexto] || log.contexto;
      if (!acc[contexto]) {
        acc[contexto] = { chamadas: 0, custo: 0 };
      }
      acc[contexto].chamadas++;
      acc[contexto].custo += parseFloat(log.custo_estimado.toString());
      return acc;
    }, {} as Record<string, { chamadas: number; custo: number }>)
  ).map(([name, data]) => ({
    name,
    chamadas: data.chamadas,
    custo: data.custo.toFixed(4)
  }));

  // Dados por provider
  const usoPorProvider = Object.entries(
    logs.reduce((acc, log) => {
      if (!acc[log.provider]) {
        acc[log.provider] = { chamadas: 0, custo: 0 };
      }
      acc[log.provider].chamadas++;
      acc[log.provider].custo += parseFloat(log.custo_estimado.toString());
      return acc;
    }, {} as Record<string, { chamadas: number; custo: number }>)
  ).map(([name, data]) => ({
    name,
    value: data.chamadas,
    custo: data.custo
  }));

  // Dados temporais (últimos dias)
  const usoPorDia = Object.entries(
    logs.reduce((acc, log) => {
      const dia = format(new Date(log.created_at), "dd/MM", { locale: ptBR });
      if (!acc[dia]) {
        acc[dia] = { chamadas: 0, custo: 0, tokens: 0 };
      }
      acc[dia].chamadas++;
      acc[dia].custo += parseFloat(log.custo_estimado.toString());
      acc[dia].tokens += log.total_tokens;
      return acc;
    }, {} as Record<string, { chamadas: number; custo: number; tokens: number }>)
  ).map(([dia, data]) => ({
    dia,
    chamadas: data.chamadas,
    custo: parseFloat(data.custo.toFixed(4)),
    tokens: data.tokens
  })).reverse();

  if (loading) {
    return (
      <Layout>
        <div className="p-6">Carregando dados...</div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Brain className="h-8 w-8" />
              Gastos com IA
            </h1>
            <p className="text-muted-foreground">
              Monitore o uso e custos de IA em tempo real
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <Select value={periodo} onValueChange={setPeriodo}>
              <SelectTrigger className="w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">Últimas 24 horas</SelectItem>
                <SelectItem value="7">Últimos 7 dias</SelectItem>
                <SelectItem value="30">Últimos 30 dias</SelectItem>
                <SelectItem value="90">Últimos 90 dias</SelectItem>
              </SelectContent>
            </Select>
            <Button onClick={loadLogs} variant="outline" size="icon">
              <Activity className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Cards de Métricas */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total de Chamadas</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalChamadas.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">
                {chamadasSucesso} sucesso ({((chamadasSucesso / totalChamadas) * 100).toFixed(1)}%)
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Custo Total</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                ${custoTotal.toFixed(4)}
              </div>
              <p className="text-xs text-muted-foreground">
                Média: ${totalChamadas > 0 ? (custoTotal / totalChamadas).toFixed(4) : "0"} por chamada
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total de Tokens</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {(totalTokens / 1000).toFixed(1)}K
              </div>
              <p className="text-xs text-muted-foreground">
                Média: {totalChamadas > 0 ? Math.round(totalTokens / totalChamadas) : 0} por chamada
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Tempo Médio</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {duracaoMedia.toFixed(0)}ms
              </div>
              <p className="text-xs text-muted-foreground">
                Duração média de resposta
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Gráficos */}
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Uso ao Longo do Tempo</CardTitle>
              <CardDescription>Chamadas e custos por dia</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={usoPorDia}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="dia" />
                  <YAxis yAxisId="left" />
                  <YAxis yAxisId="right" orientation="right" />
                  <Tooltip />
                  <Legend />
                  <Line yAxisId="left" type="monotone" dataKey="chamadas" stroke="#8884d8" name="Chamadas" />
                  <Line yAxisId="right" type="monotone" dataKey="custo" stroke="#82ca9d" name="Custo ($)" />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Uso por Provedor</CardTitle>
              <CardDescription>Distribuição de chamadas por provedor</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={usoPorProvider}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {usoPorProvider.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Uso por Contexto</CardTitle>
              <CardDescription>Chamadas por funcionalidade</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={usoPorContexto}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="chamadas" fill="#8884d8" name="Chamadas" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Custo por Contexto</CardTitle>
              <CardDescription>Gastos por funcionalidade</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={usoPorContexto}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="custo" fill="#82ca9d" name="Custo ($)" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Logs Recentes */}
        <Card>
          <CardHeader>
            <CardTitle>Chamadas Recentes</CardTitle>
            <CardDescription>Últimas {Math.min(10, logs.length)} chamadas de IA</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {logs.slice(0, 10).map((log) => (
                <div key={log.id} className="flex items-center justify-between p-3 rounded-lg border">
                  <div className="flex-1">
                    <div className="font-medium">{CONTEXTO_LABELS[log.contexto] || log.contexto}</div>
                    <div className="text-sm text-muted-foreground">
                      {log.provider} • {log.model}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-medium">${parseFloat(log.custo_estimado.toString()).toFixed(4)}</div>
                    <div className="text-sm text-muted-foreground">
                      {log.total_tokens.toLocaleString()} tokens
                    </div>
                  </div>
                  <div className="ml-4 text-xs text-muted-foreground">
                    {format(new Date(log.created_at), "dd/MM HH:mm", { locale: ptBR })}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}