import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getEstabelecimentoId } from "@/lib/estabelecimentoUtils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  ShoppingCart, 
  Users, 
  DollarSign, 
  Clock, 
  TrendingUp,
  MessageSquare,
  Mail,
  Calendar,
  Activity,
  Target,
  ArrowUp,
  ArrowDown,
  RefreshCw,
  Tv,
  Circle
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import ReactECharts from "echarts-for-react";

interface VendedorMetrics {
  id: string;
  nome: string;
  email: string;
  isOnline: boolean;
  pedidosPendentes: number;
  pedidosAprovados: number;
  pedidosFaturados: number;
  valorTotal: number;
  chatsAtivos: number;
  emailsAtivos: number;
  agendaHoje: number;
}

interface OrcamentoStatus {
  status: string;
  count: number;
  valor: number;
}

export default function TvDashboardVendas() {
  const [estabelecimentoId, setEstabelecimentoId] = useState<string>("");
  const [vendedores, setVendedores] = useState<VendedorMetrics[]>([]);
  const [statusResumo, setStatusResumo] = useState<OrcamentoStatus[]>([]);
  const [totalVendasHoje, setTotalVendasHoje] = useState(0);
  const [totalValorHoje, setTotalValorHoje] = useState(0);
  const [metaDiaria, setMetaDiaria] = useState(50000);
  const [lastUpdate, setLastUpdate] = useState(new Date());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    init();
  }, []);

  useEffect(() => {
    if (!estabelecimentoId) return;

    const interval = setInterval(loadAllData, 30000);
    return () => clearInterval(interval);
  }, [estabelecimentoId]);

  const init = async () => {
    const estabId = await getEstabelecimentoId();
    if (estabId) {
      setEstabelecimentoId(estabId);
      await loadAllData(estabId);
      setupRealtime(estabId);
    }
    setLoading(false);
  };

  const loadAllData = async (estabId?: string) => {
    const id = estabId || estabelecimentoId;
    if (!id) return;

    await Promise.all([
      loadVendedores(id),
      loadStatusResumo(id),
      loadTotaisHoje(id),
    ]);
    setLastUpdate(new Date());
  };

  const setupRealtime = (estabId: string) => {
    const channel = supabase
      .channel('tv-dashboard-vendas')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'orcamentos', filter: `estabelecimento_id=eq.${estabId}` },
        () => loadAllData()
      )
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'conversations', filter: `estabelecimento_id=eq.${estabId}` },
        () => loadAllData()
      )
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'user_activity_tracking', filter: `estabelecimento_id=eq.${estabId}` },
        () => loadAllData()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const loadVendedores = async (estabId: string) => {
    try {
      const hoje = new Date();
      hoje.setHours(0, 0, 0, 0);
      const amanha = new Date(hoje);
      amanha.setDate(amanha.getDate() + 1);

      // Get all usuarios
      const { data: usuarios, error: usuariosError } = await supabase
        .from('usuarios')
        .select('id, nome, email')
        .eq('estabelecimento_id', estabId);

      if (usuariosError) throw usuariosError;

      // Get activity tracking for online status
      const { data: activities } = await supabase
        .from('user_activity_tracking')
        .select('usuario_id, is_online')
        .eq('estabelecimento_id', estabId);

      // Get atendentes info
      const { data: atendentes } = await supabase
        .from('atendentes')
        .select('usuario_id')
        .eq('estabelecimento_id', estabId);

      const atendenteIds = new Set((atendentes || []).map(a => a.usuario_id));

      // Get orcamentos for today
      const { data: orcamentos } = await supabase
        .from('orcamentos')
        .select('id, vendedor_id, status, valor_total')
        .eq('estabelecimento_id', estabId)
        .gte('created_at', hoje.toISOString())
        .lt('created_at', amanha.toISOString());

      // Get conversations
      const { data: conversations } = await supabase
        .from('conversations')
        .select('id, atendente_atual_id, canal, chat_status')
        .eq('estabelecimento_id', estabId)
        .eq('chat_status', 'em_atendimento');

      // Get agenda today
      const { data: tarefas } = await supabase
        .from('calendario_tarefas')
        .select('id, user_id')
        .eq('estabelecimento_id', estabId)
        .eq('date', hoje.toISOString().split('T')[0]);

      // Build metrics per user
      const metricsMap = new Map<string, VendedorMetrics>();

      (usuarios || []).forEach(usuario => {
        const activity = (activities || []).find(a => a.usuario_id === usuario.id);
        const userOrcamentos = (orcamentos || []).filter(o => o.vendedor_id === usuario.id);
        const atendenteId = (atendentes || []).find(a => a.usuario_id === usuario.id);
        
        let chatsAtivos = 0;
        let emailsAtivos = 0;
        if (atendenteId) {
          const userConvs = (conversations || []).filter((c: any) => c.atendente_atual_id === atendenteId);
          chatsAtivos = userConvs.filter((c: any) => c.canal !== 'email').length;
          emailsAtivos = userConvs.filter((c: any) => c.canal === 'email').length;
        }

        const agendaHoje = (tarefas || []).filter((t: any) => t.user_id === usuario.id).length;

        const pedidosPendentes = userOrcamentos.filter(o => o.status === 'pendente' || o.status === 'rascunho').length;
        const pedidosAprovados = userOrcamentos.filter(o => o.status === 'aprovado' || o.status === 'finalizado').length;
        const pedidosFaturados = userOrcamentos.filter(o => o.status === 'faturado').length;
        const valorTotal = userOrcamentos
          .filter(o => ['aprovado', 'finalizado', 'faturado'].includes(o.status || ''))
          .reduce((acc, o) => acc + (Number(o.valor_total) || 0), 0);

        metricsMap.set(usuario.id, {
          id: usuario.id,
          nome: usuario.nome,
          email: usuario.email,
          isOnline: activity?.is_online || false,
          pedidosPendentes,
          pedidosAprovados,
          pedidosFaturados,
          valorTotal,
          chatsAtivos,
          emailsAtivos,
          agendaHoje,
        });
      });

      const sortedVendedores = Array.from(metricsMap.values())
        .sort((a, b) => b.valorTotal - a.valorTotal);

      setVendedores(sortedVendedores);
    } catch (error) {
      console.error('Erro ao carregar vendedores:', error);
    }
  };

  const loadStatusResumo = async (estabId: string) => {
    try {
      const hoje = new Date();
      hoje.setHours(0, 0, 0, 0);

      const { data, error } = await supabase
        .from('orcamentos')
        .select('status, valor_total')
        .eq('estabelecimento_id', estabId)
        .gte('created_at', hoje.toISOString());

      if (error) throw error;

      const statusMap: Record<string, { count: number; valor: number }> = {};
      (data || []).forEach((orc: any) => {
        const s = orc.status || 'pendente';
        if (!statusMap[s]) statusMap[s] = { count: 0, valor: 0 };
        statusMap[s].count++;
        statusMap[s].valor += Number(orc.valor_total) || 0;
      });

      const resumo = Object.entries(statusMap).map(([status, data]) => ({
        status,
        count: data.count,
        valor: data.valor,
      }));

      setStatusResumo(resumo);
    } catch (error) {
      console.error('Erro ao carregar resumo:', error);
    }
  };

  const loadTotaisHoje = async (estabId: string) => {
    try {
      const hoje = new Date();
      hoje.setHours(0, 0, 0, 0);

      const { data, error } = await supabase
        .from('orcamentos')
        .select('id, valor_total, status')
        .eq('estabelecimento_id', estabId)
        .in('status', ['aprovado', 'finalizado', 'faturado'])
        .gte('created_at', hoje.toISOString());

      if (error) throw error;

      setTotalVendasHoje((data || []).length);
      setTotalValorHoje((data || []).reduce((acc, o) => acc + (Number(o.valor_total) || 0), 0));
    } catch (error) {
      console.error('Erro ao carregar totais:', error);
    }
  };

  const onlineCount = vendedores.filter(v => v.isOnline).length;
  const progressoMeta = Math.min((totalValorHoje / metaDiaria) * 100, 100);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  const statusColors: Record<string, string> = {
    pendente: '#f59e0b',
    rascunho: '#6b7280',
    aprovado: '#22c55e',
    finalizado: '#3b82f6',
    faturado: '#8b5cf6',
    cancelado: '#ef4444',
  };

  const statusLabels: Record<string, string> = {
    pendente: 'Pendente',
    rascunho: 'Rascunho',
    aprovado: 'Aprovado',
    finalizado: 'Finalizado',
    faturado: 'Faturado',
    cancelado: 'Cancelado',
  };

  // Chart: Vendas por vendedor
  const vendasChartOption = useMemo(() => ({
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      formatter: (params: any) => {
        const data = params[0];
        return `${data.name}<br/>Vendas: ${formatCurrency(data.value)}`;
      },
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '3%',
      top: '10%',
      containLabel: true,
    },
    xAxis: {
      type: 'category',
      data: vendedores.slice(0, 10).map(v => v.nome.split(' ')[0]),
      axisLabel: {
        color: 'hsl(var(--muted-foreground))',
        fontSize: 11,
      },
      axisLine: { lineStyle: { color: 'hsl(var(--border))' } },
    },
    yAxis: {
      type: 'value',
      axisLabel: {
        color: 'hsl(var(--muted-foreground))',
        formatter: (val: number) => `R$ ${(val / 1000).toFixed(0)}k`,
      },
      splitLine: { lineStyle: { color: 'hsl(var(--border))', type: 'dashed' } },
    },
    series: [{
      type: 'bar',
      data: vendedores.slice(0, 10).map(v => v.valorTotal),
      itemStyle: {
        borderRadius: [4, 4, 0, 0],
        color: {
          type: 'linear',
          x: 0, y: 0, x2: 0, y2: 1,
          colorStops: [
            { offset: 0, color: '#3b82f6' },
            { offset: 1, color: '#1d4ed8' },
          ],
        },
      },
    }],
  }), [vendedores]);

  // Chart: Status distribution
  const statusChartOption = useMemo(() => ({
    tooltip: {
      trigger: 'item',
      formatter: '{b}: {c} ({d}%)',
    },
    legend: {
      orient: 'vertical',
      right: '5%',
      top: 'center',
      textStyle: { color: 'hsl(var(--foreground))' },
    },
    series: [{
      type: 'pie',
      radius: ['50%', '70%'],
      center: ['35%', '50%'],
      avoidLabelOverlap: false,
      itemStyle: {
        borderRadius: 8,
        borderColor: 'hsl(var(--background))',
        borderWidth: 2,
      },
      label: { show: false },
      labelLine: { show: false },
      data: statusResumo.map(s => ({
        name: statusLabels[s.status] || s.status,
        value: s.count,
        itemStyle: { color: statusColors[s.status] || '#6b7280' },
      })),
    }],
  }), [statusResumo]);

  if (loading) {
    return (
      <div className="fixed inset-0 bg-background flex items-center justify-center">
        <RefreshCw className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-gradient-to-br from-background via-background to-muted/20 overflow-hidden p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-primary/10">
            <Tv className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Dashboard de Vendas</h1>
            <p className="text-sm text-muted-foreground">
              Atualizado às {format(lastUpdate, 'HH:mm:ss', { locale: ptBR })}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant="secondary" className="text-base px-3 py-1">
            <Circle className={`h-2 w-2 mr-2 ${onlineCount > 0 ? 'fill-green-500 text-green-500' : 'fill-gray-400 text-gray-400'}`} />
            {onlineCount} online
          </Badge>
          <Badge variant="outline" className="text-base px-3 py-1">
            {format(new Date(), 'dd/MM/yyyy', { locale: ptBR })}
          </Badge>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-12 gap-4 h-[calc(100vh-120px)]">
        {/* Left Column - KPIs & Charts */}
        <div className="col-span-8 flex flex-col gap-4">
          {/* KPI Cards */}
          <div className="grid grid-cols-4 gap-3">
            <Card className="bg-gradient-to-br from-green-500/10 to-green-600/5 border-green-500/30">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Vendas Hoje</p>
                    <p className="text-3xl font-bold text-green-600">{totalVendasHoje}</p>
                  </div>
                  <div className="p-3 rounded-xl bg-green-500/20">
                    <ShoppingCart className="h-6 w-6 text-green-500" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-blue-500/10 to-blue-600/5 border-blue-500/30">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Faturamento</p>
                    <p className="text-2xl font-bold text-blue-600">{formatCurrency(totalValorHoje)}</p>
                  </div>
                  <div className="p-3 rounded-xl bg-blue-500/20">
                    <DollarSign className="h-6 w-6 text-blue-500" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-purple-500/10 to-purple-600/5 border-purple-500/30">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Meta Diária</p>
                    <p className="text-2xl font-bold text-purple-600">{progressoMeta.toFixed(0)}%</p>
                  </div>
                  <div className="p-3 rounded-xl bg-purple-500/20">
                    <Target className="h-6 w-6 text-purple-500" />
                  </div>
                </div>
                <div className="mt-2 h-2 bg-purple-200 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-purple-500 to-purple-600 transition-all duration-500"
                    style={{ width: `${progressoMeta}%` }}
                  />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-orange-500/10 to-orange-600/5 border-orange-500/30">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Ticket Médio</p>
                    <p className="text-2xl font-bold text-orange-600">
                      {totalVendasHoje > 0 ? formatCurrency(totalValorHoje / totalVendasHoje) : 'R$ 0'}
                    </p>
                  </div>
                  <div className="p-3 rounded-xl bg-orange-500/20">
                    <TrendingUp className="h-6 w-6 text-orange-500" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Charts Row */}
          <div className="grid grid-cols-2 gap-4 flex-1">
            <Card className="border-primary/20">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-primary" />
                  Vendas por Vendedor (Top 10)
                </CardTitle>
              </CardHeader>
              <CardContent className="h-[calc(100%-60px)]">
                <ReactECharts option={vendasChartOption} style={{ height: '100%' }} />
              </CardContent>
            </Card>

            <Card className="border-primary/20">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Activity className="h-4 w-4 text-primary" />
                  Status dos Pedidos
                </CardTitle>
              </CardHeader>
              <CardContent className="h-[calc(100%-60px)]">
                <ReactECharts option={statusChartOption} style={{ height: '100%' }} />
              </CardContent>
            </Card>
          </div>

          {/* Status Summary */}
          <div className="grid grid-cols-6 gap-2">
            {statusResumo.map((s) => (
              <Card key={s.status} className="p-3" style={{ borderLeftColor: statusColors[s.status], borderLeftWidth: 3 }}>
                <div className="text-xs text-muted-foreground">{statusLabels[s.status] || s.status}</div>
                <div className="text-xl font-bold">{s.count}</div>
                <div className="text-xs text-muted-foreground">{formatCurrency(s.valor)}</div>
              </Card>
            ))}
          </div>
        </div>

        {/* Right Column - Team List */}
        <div className="col-span-4">
          <Card className="h-full border-primary/20">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-primary" />
                  Equipe ({vendedores.length})
                </div>
                <Badge variant="outline" className="font-normal">
                  {onlineCount} ativos
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <ScrollArea className="h-[calc(100vh-240px)]">
                <div className="space-y-1 p-3">
                  {vendedores.map((vendedor, index) => (
                    <div 
                      key={vendedor.id}
                      className={`p-3 rounded-lg border transition-all ${
                        vendedor.isOnline 
                          ? 'bg-green-500/5 border-green-500/20' 
                          : 'bg-muted/30 border-transparent'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <div className={`w-2 h-2 rounded-full ${vendedor.isOnline ? 'bg-green-500' : 'bg-gray-400'}`} />
                          <span className="font-medium text-sm truncate max-w-[120px]">{vendedor.nome}</span>
                          {index < 3 && vendedor.valorTotal > 0 && (
                            <Badge variant="secondary" className="text-xs">
                              #{index + 1}
                            </Badge>
                          )}
                        </div>
                        <span className="font-bold text-sm text-primary">
                          {formatCurrency(vendedor.valorTotal)}
                        </span>
                      </div>
                      <div className="grid grid-cols-5 gap-1 text-xs">
                        <div className="flex items-center gap-1 text-muted-foreground">
                          <Calendar className="h-3 w-3" />
                          <span>{vendedor.agendaHoje}</span>
                        </div>
                        <div className="flex items-center gap-1 text-muted-foreground">
                          <MessageSquare className="h-3 w-3" />
                          <span>{vendedor.chatsAtivos}</span>
                        </div>
                        <div className="flex items-center gap-1 text-muted-foreground">
                          <Mail className="h-3 w-3" />
                          <span>{vendedor.emailsAtivos}</span>
                        </div>
                        <div className="flex items-center gap-1 text-amber-500">
                          <Clock className="h-3 w-3" />
                          <span>{vendedor.pedidosPendentes}</span>
                        </div>
                        <div className="flex items-center gap-1 text-green-500">
                          <ShoppingCart className="h-3 w-3" />
                          <span>{vendedor.pedidosAprovados + vendedor.pedidosFaturados}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
