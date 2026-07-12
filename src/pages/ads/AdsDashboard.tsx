import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  TrendingUp, TrendingDown, DollarSign, MousePointerClick, Eye, 
  Target, RefreshCw, Loader2, Search, Facebook, Music2, 
  ShoppingBag, Package, BarChart3, PieChart, Calendar
} from "lucide-react";
import { format, subDays, startOfMonth, endOfMonth, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { getEstabelecimentoId } from "@/lib/estabelecimentoUtils";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Legend, PieChart as RechartsPie, Pie, Cell } from "recharts";
import AdsHealthScore from "@/components/ads/AdsHealthScore";
import { AdsBenchmarks } from "@/components/ads/AdsBenchmarks";
import { AdsPeriodComparison } from "@/components/ads/AdsPeriodComparison";

const platformIcons: Record<string, any> = {
  google_ads: Search,
  meta_ads: Facebook,
  tiktok_ads: Music2,
  mercadolivre_ads: ShoppingBag,
  amazon_ads: Package,
};

const platformColors: Record<string, string> = {
  google_ads: "#4285F4",
  meta_ads: "#1877F2",
  tiktok_ads: "#000000",
  mercadolivre_ads: "#FFE600",
  amazon_ads: "#FF9900",
};

export default function AdsDashboard() {
  const [estabelecimentoId, setEstabelecimentoId] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState("30d");
  const [selectedPlatform, setSelectedPlatform] = useState<string>("all");

  useEffect(() => {
    getEstabelecimentoId().then(setEstabelecimentoId);
  }, []);

  const getDateRange = () => {
    const now = new Date();
    switch (dateRange) {
      case "7d": return { start: subDays(now, 7), end: now };
      case "30d": return { start: subDays(now, 30), end: now };
      case "90d": return { start: subDays(now, 90), end: now };
      case "month": return { start: startOfMonth(now), end: endOfMonth(now) };
      default: return { start: subDays(now, 30), end: now };
    }
  };

  const { data: platforms } = useQuery({
    queryKey: ["ad_platforms"],
    queryFn: async () => {
      const { data, error } = await supabase.from("ad_platforms").select("*").eq("ativo", true);
      if (error) throw error;
      return data;
    },
  });

  const { data: accounts } = useQuery({
    queryKey: ["ad_accounts", estabelecimentoId],
    queryFn: async () => {
      if (!estabelecimentoId) return [];
      const { data, error } = await supabase
        .from("ad_accounts")
        .select("*, plataforma:ad_platforms(*)")
        .eq("estabelecimento_id", estabelecimentoId);
      if (error) throw error;
      return data;
    },
    enabled: !!estabelecimentoId,
  });

  const { data: insights, isLoading: loadingInsights } = useQuery({
    queryKey: ["ad_insights", estabelecimentoId, dateRange, selectedPlatform],
    queryFn: async () => {
      if (!estabelecimentoId) return [];
      const { start, end } = getDateRange();
      
      let query = supabase
        .from("ad_insights")
        .select("*, plataforma:ad_platforms(*)")
        .eq("estabelecimento_id", estabelecimentoId)
        .gte("data", format(start, "yyyy-MM-dd"))
        .lte("data", format(end, "yyyy-MM-dd"));
      
      if (selectedPlatform !== "all") {
        query = query.eq("plataforma_id", selectedPlatform);
      }
      
      const { data, error } = await query.order("data", { ascending: true });
      if (error) throw error;
      return data;
    },
    enabled: !!estabelecimentoId,
  });

  // Calcular métricas totais
  const totals = insights?.reduce((acc, item) => ({
    gastos: acc.gastos + Number(item.gastos || 0),
    receita: acc.receita + Number(item.receita || 0),
    cliques: acc.cliques + (item.cliques || 0),
    impressoes: acc.impressoes + (item.impressoes || 0),
    conversoes: acc.conversoes + (item.conversoes || 0),
  }), { gastos: 0, receita: 0, cliques: 0, impressoes: 0, conversoes: 0 }) || { gastos: 0, receita: 0, cliques: 0, impressoes: 0, conversoes: 0 };

  const roas = totals.gastos > 0 ? totals.receita / totals.gastos : 0;
  const roi = totals.gastos > 0 ? ((totals.receita - totals.gastos) / totals.gastos) * 100 : 0;
  const cpc = totals.cliques > 0 ? totals.gastos / totals.cliques : 0;
  const ctr = totals.impressoes > 0 ? (totals.cliques / totals.impressoes) * 100 : 0;

  // Dados para gráfico de evolução diária
  const dailyData = insights?.reduce((acc: any[], item) => {
    const existing = acc.find(d => d.data === item.data);
    if (existing) {
      existing.gastos += Number(item.gastos || 0);
      existing.receita += Number(item.receita || 0);
    } else {
      acc.push({
        data: item.data,
        gastos: Number(item.gastos || 0),
        receita: Number(item.receita || 0),
      });
    }
    return acc;
  }, []) || [];

  // Dados por plataforma
  const platformData = insights?.reduce((acc: any[], item) => {
    const platformName = item.plataforma?.nome_display || "Outro";
    const existing = acc.find(d => d.name === platformName);
    if (existing) {
      existing.gastos += Number(item.gastos || 0);
      existing.receita += Number(item.receita || 0);
    } else {
      acc.push({
        name: platformName,
        gastos: Number(item.gastos || 0),
        receita: Number(item.receita || 0),
        color: platformColors[item.plataforma?.nome] || "#666",
      });
    }
    return acc;
  }, []) || [];

  // Ranking de campanhas
  const campaignRanking = insights?.reduce((acc: any[], item) => {
    const key = `${item.campanha}-${item.plataforma?.nome}`;
    const existing = acc.find(d => d.key === key);
    if (existing) {
      existing.gastos += Number(item.gastos || 0);
      existing.receita += Number(item.receita || 0);
    } else {
      acc.push({
        key,
        campanha: item.campanha || "Sem nome",
        plataforma: item.plataforma?.nome_display || "Outro",
        gastos: Number(item.gastos || 0),
        receita: Number(item.receita || 0),
      });
    }
    return acc;
  }, []).sort((a, b) => (b.receita - b.gastos) - (a.receita - a.gastos)).slice(0, 10) || [];

  return (
    <div className="min-h-screen bg-background p-3 sm:p-4 md:p-6">
      <div className="max-w-7xl mx-auto space-y-4 sm:space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
              Painel Unificado de Anúncios
            </h1>
            <p className="text-muted-foreground mt-1">
              Visão consolidada de todas as plataformas de anúncios
            </p>
          </div>
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 w-full sm:w-auto">
            <Select value={dateRange} onValueChange={setDateRange}>
              <SelectTrigger className="w-full sm:w-[140px]">
                <Calendar className="h-4 w-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7d">Últimos 7 dias</SelectItem>
                <SelectItem value="30d">Últimos 30 dias</SelectItem>
                <SelectItem value="90d">Últimos 90 dias</SelectItem>
                <SelectItem value="month">Este mês</SelectItem>
              </SelectContent>
            </Select>
            <Select value={selectedPlatform} onValueChange={setSelectedPlatform}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Todas plataformas" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas plataformas</SelectItem>
                {platforms?.map(p => (
                  <SelectItem key={p.id} value={p.id}>{p.nome_display}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <AdsHealthScore />

        {estabelecimentoId && <AdsPeriodComparison estabelecimentoId={estabelecimentoId} />}
        <AdsBenchmarks />



        {/* Métricas principais */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
          <Card className="bg-gradient-to-br from-red-500/10 to-red-600/5 border-red-500/20">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <DollarSign className="h-4 w-4 text-red-500" />
                <span className="text-xs text-muted-foreground">Gastos</span>
              </div>
              <p className="text-2xl font-bold">R$ {totals.gastos.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</p>
            </CardContent>
          </Card>
          
          <Card className="bg-gradient-to-br from-green-500/10 to-green-600/5 border-green-500/20">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="h-4 w-4 text-green-500" />
                <span className="text-xs text-muted-foreground">Receita</span>
              </div>
              <p className="text-2xl font-bold">R$ {totals.receita.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-blue-500/10 to-blue-600/5 border-blue-500/20">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <BarChart3 className="h-4 w-4 text-blue-500" />
                <span className="text-xs text-muted-foreground">ROAS</span>
              </div>
              <p className="text-2xl font-bold">{roas.toFixed(2)}x</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-purple-500/10 to-purple-600/5 border-purple-500/20">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <PieChart className="h-4 w-4 text-purple-500" />
                <span className="text-xs text-muted-foreground">ROI</span>
              </div>
              <p className="text-2xl font-bold">{roi.toFixed(1)}%</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-orange-500/10 to-orange-600/5 border-orange-500/20">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <MousePointerClick className="h-4 w-4 text-orange-500" />
                <span className="text-xs text-muted-foreground">Cliques</span>
              </div>
              <p className="text-2xl font-bold">{totals.cliques.toLocaleString("pt-BR")}</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-cyan-500/10 to-cyan-600/5 border-cyan-500/20">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <Target className="h-4 w-4 text-cyan-500" />
                <span className="text-xs text-muted-foreground">Conversões</span>
              </div>
              <p className="text-2xl font-bold">{totals.conversoes.toLocaleString("pt-BR")}</p>
            </CardContent>
          </Card>
        </div>

        {/* Gráficos */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Evolução diária */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Evolução Gastos vs Receita</CardTitle>
              <CardDescription>Comparativo diário no período</CardDescription>
            </CardHeader>
            <CardContent>
              {loadingInsights ? (
                <div className="h-[300px] flex items-center justify-center">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={dailyData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis 
                      dataKey="data" 
                      tickFormatter={(v) => format(parseISO(v), "dd/MM")}
                      className="text-xs"
                    />
                    <YAxis className="text-xs" />
                    <Tooltip 
                      formatter={(value: number) => `R$ ${value.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`}
                      labelFormatter={(v) => format(parseISO(v as string), "dd/MM/yyyy")}
                    />
                    <Legend />
                    <Line type="monotone" dataKey="gastos" name="Gastos" stroke="#ef4444" strokeWidth={2} dot={false} />
                    <Line type="monotone" dataKey="receita" name="Receita" stroke="#22c55e" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          {/* Por plataforma */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Gastos por Plataforma</CardTitle>
              <CardDescription>Distribuição de investimento</CardDescription>
            </CardHeader>
            <CardContent>
              {loadingInsights ? (
                <div className="h-[300px] flex items-center justify-center">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={platformData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="name" className="text-xs" />
                    <YAxis className="text-xs" />
                    <Tooltip 
                      formatter={(value: number) => `R$ ${value.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`}
                    />
                    <Legend />
                    <Bar dataKey="gastos" name="Gastos" fill="#ef4444" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="receita" name="Receita" fill="#22c55e" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Ranking de campanhas */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Top 10 Campanhas Mais Lucrativas</CardTitle>
            <CardDescription>Ranking por lucro (Receita - Gastos)</CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[400px]">
              <div className="space-y-2">
                {campaignRanking.map((campaign, index) => {
                  const lucro = campaign.receita - campaign.gastos;
                  const roasCamp = campaign.gastos > 0 ? campaign.receita / campaign.gastos : 0;
                  
                  return (
                    <div key={campaign.key} className="flex items-center gap-4 p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
                      <span className="text-2xl font-bold text-muted-foreground w-8">#{index + 1}</span>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{campaign.campanha}</p>
                        <p className="text-xs text-muted-foreground">{campaign.plataforma}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm">
                          Gastos: <span className="text-red-500">R$ {campaign.gastos.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</span>
                        </p>
                        <p className="text-sm">
                          Receita: <span className="text-green-500">R$ {campaign.receita.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</span>
                        </p>
                      </div>
                      <div className="text-right min-w-[100px]">
                        <p className={`text-lg font-bold ${lucro >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                          {lucro >= 0 ? '+' : ''}R$ {lucro.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                        </p>
                        <Badge variant={roasCamp >= 1 ? "default" : "destructive"} className="text-xs">
                          ROAS: {roasCamp.toFixed(2)}x
                        </Badge>
                      </div>
                    </div>
                  );
                })}
                {campaignRanking.length === 0 && (
                  <div className="text-center py-10 text-muted-foreground">
                    <BarChart3 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Nenhum dado de campanha disponível</p>
                    <p className="text-sm">Configure suas contas de anúncios para começar</p>
                  </div>
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Cards de plataformas */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
          {platforms?.map(platform => {
            const Icon = platformIcons[platform.nome] || Search;
            const platformInsights = insights?.filter(i => i.plataforma_id === platform.id) || [];
            const platformTotal = platformInsights.reduce((acc, i) => acc + Number(i.gastos || 0), 0);
            const platformContas = accounts?.filter(a => a.plataforma_id === platform.id) || [];
            
            return (
              <Card key={platform.id} className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => setSelectedPlatform(platform.id)}>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="p-2 rounded-lg" style={{ backgroundColor: `${platformColors[platform.nome]}20` }}>
                      <Icon className="h-5 w-5" style={{ color: platformColors[platform.nome] }} />
                    </div>
                    <div>
                      <p className="font-medium text-sm">{platform.nome_display}</p>
                      <p className="text-xs text-muted-foreground">{platformContas.length} conta(s)</p>
                    </div>
                  </div>
                  <p className="text-lg font-bold">
                    R$ {platformTotal.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                  </p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}
