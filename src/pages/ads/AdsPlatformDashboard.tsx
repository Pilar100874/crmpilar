import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { 
  TrendingUp, TrendingDown, DollarSign, MousePointerClick, Eye, 
  Target, RefreshCw, Loader2, Calendar, BarChart3, Search,
  Facebook, Music2, ShoppingBag, Package
} from "lucide-react";
import { format, subDays, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { getEstabelecimentoId } from "@/lib/estabelecimentoUtils";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Legend } from "recharts";

const platformConfig: Record<string, { icon: any; color: string; name: string }> = {
  google_ads: { icon: Search, color: "#4285F4", name: "Google Ads" },
  meta_ads: { icon: Facebook, color: "#1877F2", name: "Meta Ads" },
  tiktok_ads: { icon: Music2, color: "#000000", name: "TikTok Ads" },
  mercadolivre_ads: { icon: ShoppingBag, color: "#FFE600", name: "Mercado Livre Ads" },
  amazon_ads: { icon: Package, color: "#FF9900", name: "Amazon Ads" },
};

interface AdsPlatformDashboardProps {
  platform?: string;
}

export default function AdsPlatformDashboard({ platform: platformProp }: AdsPlatformDashboardProps = {}) {
  const { platform: platformParam } = useParams<{ platform: string }>();
  const platform = platformProp || platformParam;
  const queryClient = useQueryClient();
  const [estabelecimentoId, setEstabelecimentoId] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState("30d");
  const [selectedAccount, setSelectedAccount] = useState<string>("all");

  useEffect(() => {
    getEstabelecimentoId().then(setEstabelecimentoId);
  }, []);

  const config = platformConfig[platform || ""] || platformConfig.google_ads;
  const Icon = config.icon;

  const getDateRange = () => {
    const now = new Date();
    switch (dateRange) {
      case "7d": return { start: subDays(now, 7), end: now };
      case "30d": return { start: subDays(now, 30), end: now };
      case "90d": return { start: subDays(now, 90), end: now };
      default: return { start: subDays(now, 30), end: now };
    }
  };

  const { data: platformData } = useQuery({
    queryKey: ["ad_platform", platform],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ad_platforms")
        .select("*")
        .eq("nome", platform)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!platform,
  });

  const { data: accounts } = useQuery({
    queryKey: ["ad_accounts", estabelecimentoId, platformData?.id],
    queryFn: async () => {
      if (!estabelecimentoId || !platformData?.id) return [];
      const { data, error } = await supabase
        .from("ad_accounts")
        .select("*")
        .eq("estabelecimento_id", estabelecimentoId)
        .eq("plataforma_id", platformData.id);
      if (error) throw error;
      return data;
    },
    enabled: !!estabelecimentoId && !!platformData?.id,
  });

  const { data: insights, isLoading, refetch } = useQuery({
    queryKey: ["ad_insights", estabelecimentoId, platformData?.id, dateRange, selectedAccount],
    queryFn: async () => {
      if (!estabelecimentoId || !platformData?.id) return [];
      const { start, end } = getDateRange();
      
      let query = supabase
        .from("ad_insights")
        .select("*")
        .eq("estabelecimento_id", estabelecimentoId)
        .eq("plataforma_id", platformData.id)
        .gte("data", format(start, "yyyy-MM-dd"))
        .lte("data", format(end, "yyyy-MM-dd"));
      
      if (selectedAccount !== "all") {
        query = query.eq("conta_id", selectedAccount);
      }
      
      const { data, error } = await query.order("data", { ascending: true });
      if (error) throw error;
      return data;
    },
    enabled: !!estabelecimentoId && !!platformData?.id,
  });

  const syncMutation = useMutation({
    mutationFn: async () => {
      // TODO: Implementar chamada real para sincronização
      await new Promise(resolve => setTimeout(resolve, 3000));
      toast.success("Sincronização iniciada");
    },
    onError: (error: any) => {
      toast.error("Erro ao sincronizar: " + error.message);
    },
  });

  // Calcular métricas
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
  const cpm = totals.impressoes > 0 ? (totals.gastos / totals.impressoes) * 1000 : 0;
  const ctr = totals.impressoes > 0 ? (totals.cliques / totals.impressoes) * 100 : 0;

  // Dados para gráfico diário
  const dailyData = insights?.reduce((acc: any[], item) => {
    const existing = acc.find(d => d.data === item.data);
    if (existing) {
      existing.gastos += Number(item.gastos || 0);
      existing.receita += Number(item.receita || 0);
      existing.cliques += item.cliques || 0;
      existing.conversoes += item.conversoes || 0;
    } else {
      acc.push({
        data: item.data,
        gastos: Number(item.gastos || 0),
        receita: Number(item.receita || 0),
        cliques: item.cliques || 0,
        conversoes: item.conversoes || 0,
      });
    }
    return acc;
  }, []) || [];

  // Campanhas únicas
  const campaigns = insights?.reduce((acc: any[], item) => {
    const key = item.campanha || "Sem nome";
    const existing = acc.find(d => d.campanha === key);
    if (existing) {
      existing.gastos += Number(item.gastos || 0);
      existing.receita += Number(item.receita || 0);
      existing.cliques += item.cliques || 0;
      existing.impressoes += item.impressoes || 0;
      existing.conversoes += item.conversoes || 0;
    } else {
      acc.push({
        campanha: key,
        gastos: Number(item.gastos || 0),
        receita: Number(item.receita || 0),
        cliques: item.cliques || 0,
        impressoes: item.impressoes || 0,
        conversoes: item.conversoes || 0,
      });
    }
    return acc;
  }, []).sort((a, b) => b.gastos - a.gastos) || [];

  return (
    <div className="min-h-screen bg-background p-3 sm:p-4 md:p-6">
      <div className="max-w-7xl mx-auto space-y-4 sm:space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-xl" style={{ backgroundColor: `${config.color}20` }}>
              <Icon className="h-8 w-8" style={{ color: config.color }} />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold">{config.name}</h1>
              <p className="text-muted-foreground">
                {accounts?.length || 0} conta(s) conectada(s)
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Select value={dateRange} onValueChange={setDateRange}>
              <SelectTrigger className="w-[140px]">
                <Calendar className="h-4 w-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7d">Últimos 7 dias</SelectItem>
                <SelectItem value="30d">Últimos 30 dias</SelectItem>
                <SelectItem value="90d">Últimos 90 dias</SelectItem>
              </SelectContent>
            </Select>
            {accounts && accounts.length > 1 && (
              <Select value={selectedAccount} onValueChange={setSelectedAccount}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Todas contas" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas contas</SelectItem>
                  {accounts.map(a => (
                    <SelectItem key={a.id} value={a.id}>{a.nome_conta}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            <Button 
              onClick={() => syncMutation.mutate()} 
              disabled={syncMutation.isPending}
            >
              {syncMutation.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4 mr-2" />
              )}
              Atualizar
            </Button>
          </div>
        </div>

        {/* Métricas */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <DollarSign className="h-4 w-4 text-red-500" />
                <span className="text-xs text-muted-foreground">Gastos</span>
              </div>
              <p className="text-xl font-bold">R$ {totals.gastos.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="h-4 w-4 text-green-500" />
                <span className="text-xs text-muted-foreground">Receita</span>
              </div>
              <p className="text-xl font-bold">R$ {totals.receita.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <BarChart3 className="h-4 w-4 text-blue-500" />
                <span className="text-xs text-muted-foreground">ROAS</span>
              </div>
              <p className="text-xl font-bold">{roas.toFixed(2)}x</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <MousePointerClick className="h-4 w-4 text-orange-500" />
                <span className="text-xs text-muted-foreground">Cliques</span>
              </div>
              <p className="text-xl font-bold">{totals.cliques.toLocaleString("pt-BR")}</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <Eye className="h-4 w-4 text-purple-500" />
                <span className="text-xs text-muted-foreground">Impressões</span>
              </div>
              <p className="text-xl font-bold">{totals.impressoes.toLocaleString("pt-BR")}</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <Target className="h-4 w-4 text-cyan-500" />
                <span className="text-xs text-muted-foreground">Conversões</span>
              </div>
              <p className="text-xl font-bold">{totals.conversoes.toLocaleString("pt-BR")}</p>
            </CardContent>
          </Card>
        </div>

        {/* Métricas calculadas */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="bg-muted/30">
            <CardContent className="p-4 text-center">
              <p className="text-xs text-muted-foreground mb-1">CPC</p>
              <p className="text-lg font-bold">R$ {cpc.toFixed(2)}</p>
            </CardContent>
          </Card>
          <Card className="bg-muted/30">
            <CardContent className="p-4 text-center">
              <p className="text-xs text-muted-foreground mb-1">CPM</p>
              <p className="text-lg font-bold">R$ {cpm.toFixed(2)}</p>
            </CardContent>
          </Card>
          <Card className="bg-muted/30">
            <CardContent className="p-4 text-center">
              <p className="text-xs text-muted-foreground mb-1">CTR</p>
              <p className="text-lg font-bold">{ctr.toFixed(2)}%</p>
            </CardContent>
          </Card>
          <Card className="bg-muted/30">
            <CardContent className="p-4 text-center">
              <p className="text-xs text-muted-foreground mb-1">ROI</p>
              <p className={`text-lg font-bold ${roi >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                {roi.toFixed(1)}%
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Gráfico */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Evolução Diária</CardTitle>
            <CardDescription>Gastos vs Receita no período</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
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
                    formatter={(value: number, name: string) => {
                      if (name === "cliques" || name === "conversoes") return value.toLocaleString("pt-BR");
                      return `R$ ${value.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`;
                    }}
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

        {/* Tabela de campanhas */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Campanhas</CardTitle>
            <CardDescription>{campaigns.length} campanhas no período</CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[400px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Campanha</TableHead>
                    <TableHead className="text-right">Gastos</TableHead>
                    <TableHead className="text-right">Receita</TableHead>
                    <TableHead className="text-right">ROAS</TableHead>
                    <TableHead className="text-right">Cliques</TableHead>
                    <TableHead className="text-right">Conversões</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {campaigns.map((campaign, index) => {
                    const campaignRoas = campaign.gastos > 0 ? campaign.receita / campaign.gastos : 0;
                    
                    return (
                      <TableRow key={index}>
                        <TableCell className="font-medium">{campaign.campanha}</TableCell>
                        <TableCell className="text-right text-red-500">
                          R$ {campaign.gastos.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                        </TableCell>
                        <TableCell className="text-right text-green-500">
                          R$ {campaign.receita.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                        </TableCell>
                        <TableCell className="text-right">
                          <Badge variant={campaignRoas >= 1 ? "default" : "destructive"}>
                            {campaignRoas.toFixed(2)}x
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">{campaign.cliques.toLocaleString("pt-BR")}</TableCell>
                        <TableCell className="text-right">{campaign.conversoes.toLocaleString("pt-BR")}</TableCell>
                      </TableRow>
                    );
                  })}
                  {campaigns.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                        Nenhuma campanha encontrada no período
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
