import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { getEstabelecimentoId } from "@/lib/estabelecimentoUtils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
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
  Circle,
  Percent,
  Timer,
  Zap,
  ArrowLeft
} from "lucide-react";
import { format, startOfHour, subHours } from "date-fns";
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

interface VendasPorHora {
  hora: string;
  valor: number;
  quantidade: number;
}

export default function TvDashboardVendas() {
  const navigate = useNavigate();
  const [estabelecimentoId, setEstabelecimentoId] = useState<string>("");
  const [vendedores, setVendedores] = useState<VendedorMetrics[]>([]);
  const [statusResumo, setStatusResumo] = useState<OrcamentoStatus[]>([]);
  const [totalVendasHoje, setTotalVendasHoje] = useState(0);
  const [totalValorHoje, setTotalValorHoje] = useState(0);
  const [metaDiaria, setMetaDiaria] = useState(50000);
  const [lastUpdate, setLastUpdate] = useState(new Date());
  const [loading, setLoading] = useState(true);
  const [vendasPorHora, setVendasPorHora] = useState<VendasPorHora[]>([]);
  const [taxaConversao, setTaxaConversao] = useState(0);
  const [tempoMedioResposta, setTempoMedioResposta] = useState(0);
  const [totalOrcamentos, setTotalOrcamentos] = useState(0);

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
      loadVendasPorHora(id),
      loadTaxaConversao(id),
      loadTempoMedioResposta(id),
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

  const loadVendasPorHora = async (estabId: string) => {
    try {
      const hoje = new Date();
      hoje.setHours(0, 0, 0, 0);

      const { data, error } = await supabase
        .from('orcamentos')
        .select('created_at, valor_total, status')
        .eq('estabelecimento_id', estabId)
        .in('status', ['aprovado', 'finalizado', 'faturado'])
        .gte('created_at', hoje.toISOString());

      if (error) throw error;

      // Agrupar por hora
      const horasMap: Record<string, { valor: number; quantidade: number }> = {};
      
      // Inicializar todas as horas do dia até agora
      const horaAtual = new Date().getHours();
      for (let h = 8; h <= horaAtual; h++) {
        const horaStr = `${h.toString().padStart(2, '0')}:00`;
        horasMap[horaStr] = { valor: 0, quantidade: 0 };
      }

      (data || []).forEach((orc: any) => {
        const hora = new Date(orc.created_at).getHours();
        const horaStr = `${hora.toString().padStart(2, '0')}:00`;
        if (horasMap[horaStr]) {
          horasMap[horaStr].valor += Number(orc.valor_total) || 0;
          horasMap[horaStr].quantidade++;
        }
      });

      const vendasHora = Object.entries(horasMap)
        .map(([hora, data]) => ({ hora, ...data }))
        .sort((a, b) => a.hora.localeCompare(b.hora));

      setVendasPorHora(vendasHora);
    } catch (error) {
      console.error('Erro ao carregar vendas por hora:', error);
    }
  };

  const loadTaxaConversao = async (estabId: string) => {
    try {
      const hoje = new Date();
      hoje.setHours(0, 0, 0, 0);

      // Total de orçamentos criados hoje
      const { count: totalCriados } = await supabase
        .from('orcamentos')
        .select('*', { count: 'exact', head: true })
        .eq('estabelecimento_id', estabId)
        .gte('created_at', hoje.toISOString());

      // Orçamentos convertidos (aprovados, finalizados, faturados)
      const { count: convertidos } = await supabase
        .from('orcamentos')
        .select('*', { count: 'exact', head: true })
        .eq('estabelecimento_id', estabId)
        .in('status', ['aprovado', 'finalizado', 'faturado'])
        .gte('created_at', hoje.toISOString());

      setTotalOrcamentos(totalCriados || 0);
      const taxa = totalCriados && totalCriados > 0 
        ? ((convertidos || 0) / totalCriados) * 100 
        : 0;
      setTaxaConversao(Math.round(taxa));
    } catch (error) {
      console.error('Erro ao carregar taxa de conversão:', error);
    }
  };

  const loadTempoMedioResposta = async (estabId: string) => {
    try {
      const hoje = new Date();
      hoje.setHours(0, 0, 0, 0);

      // Buscar conversas com tempo de primeira resposta
      const { data, error } = await supabase
        .from('conversations')
        .select('sla_tempo_primeira_resposta')
        .eq('estabelecimento_id', estabId)
        .gte('created_at', hoje.toISOString())
        .not('sla_tempo_primeira_resposta', 'is', null);

      if (error) throw error;

      if (data && data.length > 0) {
        const tempos = data.map((c: any) => c.sla_tempo_primeira_resposta || 0).filter((t: number) => t > 0);
        const media = tempos.length > 0 
          ? tempos.reduce((a: number, b: number) => a + b, 0) / tempos.length 
          : 0;
        setTempoMedioResposta(Math.round(media / 60)); // Converter para minutos
      }
    } catch (error) {
      console.error('Erro ao carregar tempo médio de resposta:', error);
    }
  };

  const loadVendedores = async (estabId: string) => {
    try {
      const hoje = new Date();
      hoje.setHours(0, 0, 0, 0);
      const amanha = new Date(hoje);
      amanha.setDate(amanha.getDate() + 1);

      const { data: usuarios, error: usuariosError } = await supabase
        .from('usuarios')
        .select('id, nome, email')
        .eq('estabelecimento_id', estabId);

      if (usuariosError) throw usuariosError;

      const { data: activities } = await supabase
        .from('user_activity_tracking')
        .select('usuario_id, is_online')
        .eq('estabelecimento_id', estabId);

      const { data: atendentes } = await supabase
        .from('atendentes')
        .select('id, usuario_id')
        .eq('estabelecimento_id', estabId);

      const { data: orcamentos } = await supabase
        .from('orcamentos')
        .select('id, vendedor_id, status, valor_total')
        .eq('estabelecimento_id', estabId)
        .gte('created_at', hoje.toISOString())
        .lt('created_at', amanha.toISOString());

      const { data: conversations } = await supabase
        .from('conversations')
        .select('id, atendente_atual_id, canal, chat_status')
        .eq('estabelecimento_id', estabId)
        .eq('chat_status', 'em_atendimento');

      const { data: tarefas } = await supabase
        .from('calendario_tarefas')
        .select('id, user_id')
        .eq('estabelecimento_id', estabId)
        .eq('date', hoje.toISOString().split('T')[0]);

      const metricsMap = new Map<string, VendedorMetrics>();

      (usuarios || []).forEach(usuario => {
        const activity = (activities || []).find(a => a.usuario_id === usuario.id);
        const userOrcamentos = (orcamentos || []).filter(o => o.vendedor_id === usuario.id);
        const atendenteRecord = (atendentes || []).find(a => a.usuario_id === usuario.id);
        
        let chatsAtivos = 0;
        let emailsAtivos = 0;
        if (atendenteRecord) {
          const userConvs = (conversations || []).filter((c: any) => c.atendente_atual_id === atendenteRecord.id);
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

  // Chart: Vendas por hora
  const vendasPorHoraChartOption = useMemo(() => ({
    tooltip: {
      trigger: 'axis',
      formatter: (params: any) => {
        const data = params[0];
        return `${data.name}<br/>Vendas: ${formatCurrency(data.value)}<br/>Qtd: ${vendasPorHora.find(v => v.hora === data.name)?.quantidade || 0}`;
      },
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '3%',
      top: '15%',
      containLabel: true,
    },
    xAxis: {
      type: 'category',
      data: vendasPorHora.map(v => v.hora),
      axisLabel: {
        color: 'hsl(var(--muted-foreground))',
        fontSize: 10,
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
      type: 'line',
      smooth: true,
      data: vendasPorHora.map(v => v.valor),
      areaStyle: {
        color: {
          type: 'linear',
          x: 0, y: 0, x2: 0, y2: 1,
          colorStops: [
            { offset: 0, color: 'rgba(34, 197, 94, 0.4)' },
            { offset: 1, color: 'rgba(34, 197, 94, 0.05)' },
          ],
        },
      },
      lineStyle: { color: '#22c55e', width: 2 },
      itemStyle: { color: '#22c55e' },
    }],
  }), [vendasPorHora]);

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
      data: vendedores.slice(0, 8).map(v => v.nome.split(' ')[0]),
      axisLabel: {
        color: 'hsl(var(--muted-foreground))',
        fontSize: 10,
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
      data: vendedores.slice(0, 8).map(v => v.valorTotal),
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
      textStyle: { color: 'hsl(var(--foreground))', fontSize: 10 },
    },
    series: [{
      type: 'pie',
      radius: ['45%', '70%'],
      center: ['35%', '50%'],
      avoidLabelOverlap: false,
      itemStyle: {
        borderRadius: 6,
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
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <Button 
            variant="ghost" 
            size="icon"
            onClick={() => navigate(-1)}
            className="h-10 w-10 rounded-xl"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
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
      <div className="grid grid-cols-12 gap-3 h-[calc(100vh-100px)]">
        {/* Left Column - KPIs & Charts */}
        <div className="col-span-9 flex flex-col gap-3">
          {/* KPI Cards - Row 1 */}
          <div className="grid grid-cols-6 gap-2">
            <Card className="bg-gradient-to-br from-green-500/10 to-green-600/5 border-green-500/30">
              <CardContent className="p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground">Vendas Hoje</p>
                    <p className="text-2xl font-bold text-green-600">{totalVendasHoje}</p>
                  </div>
                  <div className="p-2 rounded-lg bg-green-500/20">
                    <ShoppingCart className="h-5 w-5 text-green-500" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-blue-500/10 to-blue-600/5 border-blue-500/30">
              <CardContent className="p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground">Faturamento</p>
                    <p className="text-xl font-bold text-blue-600">{formatCurrency(totalValorHoje)}</p>
                  </div>
                  <div className="p-2 rounded-lg bg-blue-500/20">
                    <DollarSign className="h-5 w-5 text-blue-500" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-purple-500/10 to-purple-600/5 border-purple-500/30">
              <CardContent className="p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground">Meta Diária</p>
                    <p className="text-2xl font-bold text-purple-600">{progressoMeta.toFixed(0)}%</p>
                  </div>
                  <div className="p-2 rounded-lg bg-purple-500/20">
                    <Target className="h-5 w-5 text-purple-500" />
                  </div>
                </div>
                <div className="mt-1 h-1.5 bg-purple-200 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-purple-500 to-purple-600 transition-all duration-500"
                    style={{ width: `${progressoMeta}%` }}
                  />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-orange-500/10 to-orange-600/5 border-orange-500/30">
              <CardContent className="p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground">Ticket Médio</p>
                    <p className="text-lg font-bold text-orange-600">
                      {totalVendasHoje > 0 ? formatCurrency(totalValorHoje / totalVendasHoje) : 'R$ 0'}
                    </p>
                  </div>
                  <div className="p-2 rounded-lg bg-orange-500/20">
                    <TrendingUp className="h-5 w-5 text-orange-500" />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Taxa de Conversão */}
            <Card className="bg-gradient-to-br from-cyan-500/10 to-cyan-600/5 border-cyan-500/30">
              <CardContent className="p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground">Taxa Conversão</p>
                    <p className="text-2xl font-bold text-cyan-600">{taxaConversao}%</p>
                    <p className="text-xs text-muted-foreground">{totalOrcamentos} orçamentos</p>
                  </div>
                  <div className="p-2 rounded-lg bg-cyan-500/20">
                    <Percent className="h-5 w-5 text-cyan-500" />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Tempo Médio de Resposta */}
            <Card className="bg-gradient-to-br from-pink-500/10 to-pink-600/5 border-pink-500/30">
              <CardContent className="p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground">Tempo Resposta</p>
                    <p className="text-2xl font-bold text-pink-600">{tempoMedioResposta}min</p>
                    <p className="text-xs text-muted-foreground">média chats</p>
                  </div>
                  <div className="p-2 rounded-lg bg-pink-500/20">
                    <Timer className="h-5 w-5 text-pink-500" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Charts Row */}
          <div className="grid grid-cols-3 gap-3 flex-1">
            {/* Vendas por Hora */}
            <Card className="border-primary/20">
              <CardHeader className="pb-1 pt-2 px-3">
                <CardTitle className="text-xs flex items-center gap-2">
                  <Clock className="h-3 w-3 text-primary" />
                  Vendas por Hora
                </CardTitle>
              </CardHeader>
              <CardContent className="h-[calc(100%-40px)] p-2">
                <ReactECharts option={vendasPorHoraChartOption} style={{ height: '100%' }} />
              </CardContent>
            </Card>

            {/* Vendas por Vendedor */}
            <Card className="border-primary/20">
              <CardHeader className="pb-1 pt-2 px-3">
                <CardTitle className="text-xs flex items-center gap-2">
                  <DollarSign className="h-3 w-3 text-primary" />
                  Vendas por Vendedor
                </CardTitle>
              </CardHeader>
              <CardContent className="h-[calc(100%-40px)] p-2">
                <ReactECharts option={vendasChartOption} style={{ height: '100%' }} />
              </CardContent>
            </Card>

            {/* Status dos Pedidos */}
            <Card className="border-primary/20">
              <CardHeader className="pb-1 pt-2 px-3">
                <CardTitle className="text-xs flex items-center gap-2">
                  <Activity className="h-3 w-3 text-primary" />
                  Status dos Pedidos
                </CardTitle>
              </CardHeader>
              <CardContent className="h-[calc(100%-40px)] p-2">
                <ReactECharts option={statusChartOption} style={{ height: '100%' }} />
              </CardContent>
            </Card>
          </div>

          {/* Status Summary */}
          <div className="grid grid-cols-6 gap-2">
            {statusResumo.map((s) => (
              <Card key={s.status} className="p-2" style={{ borderLeftColor: statusColors[s.status], borderLeftWidth: 3 }}>
                <div className="text-xs text-muted-foreground">{statusLabels[s.status] || s.status}</div>
                <div className="text-lg font-bold">{s.count}</div>
                <div className="text-xs text-muted-foreground">{formatCurrency(s.valor)}</div>
              </Card>
            ))}
          </div>
        </div>

        {/* Right Column - Team List */}
        <div className="col-span-3">
          <Card className="h-full border-primary/20">
            <CardHeader className="pb-2 pt-3 px-3">
              <CardTitle className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-primary" />
                  Equipe ({vendedores.length})
                </div>
                <Badge variant="outline" className="font-normal text-xs">
                  {onlineCount} ativos
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <ScrollArea className="h-[calc(100vh-180px)]">
                <div className="space-y-1 p-2">
                  {vendedores.map((vendedor, index) => (
                    <div 
                      key={vendedor.id}
                      className={`p-2 rounded-lg border transition-all ${
                        vendedor.isOnline 
                          ? 'bg-green-500/5 border-green-500/20' 
                          : 'bg-muted/30 border-transparent'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                          <div className={`w-2 h-2 rounded-full ${vendedor.isOnline ? 'bg-green-500' : 'bg-gray-400'}`} />
                          <span className="font-medium text-xs truncate max-w-[100px]">{vendedor.nome}</span>
                          {index < 3 && vendedor.valorTotal > 0 && (
                            <Badge variant="secondary" className="text-[10px] px-1">
                              #{index + 1}
                            </Badge>
                          )}
                        </div>
                        <span className="font-bold text-xs text-primary">
                          {formatCurrency(vendedor.valorTotal)}
                        </span>
                      </div>
                      <div className="grid grid-cols-5 gap-1 text-[10px]">
                        <div className="flex items-center gap-0.5 text-muted-foreground" title="Agenda">
                          <Calendar className="h-2.5 w-2.5" />
                          <span>{vendedor.agendaHoje}</span>
                        </div>
                        <div className="flex items-center gap-0.5 text-muted-foreground" title="Chats">
                          <MessageSquare className="h-2.5 w-2.5" />
                          <span>{vendedor.chatsAtivos}</span>
                        </div>
                        <div className="flex items-center gap-0.5 text-muted-foreground" title="Emails">
                          <Mail className="h-2.5 w-2.5" />
                          <span>{vendedor.emailsAtivos}</span>
                        </div>
                        <div className="flex items-center gap-0.5 text-amber-500" title="Pendentes">
                          <Clock className="h-2.5 w-2.5" />
                          <span>{vendedor.pedidosPendentes}</span>
                        </div>
                        <div className="flex items-center gap-0.5 text-green-500" title="Vendas">
                          <ShoppingCart className="h-2.5 w-2.5" />
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
