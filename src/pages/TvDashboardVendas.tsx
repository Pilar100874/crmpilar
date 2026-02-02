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
  Calendar,
  Target,
  RefreshCw,
  Tv,
  Circle,
  Percent,
  Timer,
  ArrowLeft,
  CalendarDays,
  BarChart3
} from "lucide-react";
import { format, startOfMonth, subMonths } from "date-fns";
import { ptBR } from "date-fns/locale";
import ReactECharts from "echarts-for-react";

interface VendedorMetrics {
  id: string;
  nome: string;
  isOnline: boolean;
  pedidosPendentes: number;
  pedidosVendidos: number;
  valorTotal: number;
  chatsAtivos: number;
}

interface VendasPorHora {
  hora: string;
  valor: number;
  quantidade: number;
}

interface VendasMensais {
  mes: string;
  valor: number;
  quantidade: number;
}

export default function TvDashboardVendas() {
  const navigate = useNavigate();
  const [estabelecimentoId, setEstabelecimentoId] = useState<string>("");
  const [vendedores, setVendedores] = useState<VendedorMetrics[]>([]);
  const [totalVendasHoje, setTotalVendasHoje] = useState(0);
  const [totalValorHoje, setTotalValorHoje] = useState(0);
  const [totalValorMes, setTotalValorMes] = useState(0);
  const [totalVendasMes, setTotalVendasMes] = useState(0);
  const [totalValor12Meses, setTotalValor12Meses] = useState(0);
  const [totalVendas12Meses, setTotalVendas12Meses] = useState(0);
  const [metaDiaria, setMetaDiaria] = useState(50000);
  const [lastUpdate, setLastUpdate] = useState(new Date());
  const [loading, setLoading] = useState(true);
  const [vendasPorHora, setVendasPorHora] = useState<VendasPorHora[]>([]);
  const [vendasMensais, setVendasMensais] = useState<VendasMensais[]>([]);
  const [taxaConversao, setTaxaConversao] = useState(0);
  const [tempoMedioResposta, setTempoMedioResposta] = useState(0);

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
      loadTotaisHoje(id),
      loadTotaisMes(id),
      loadTotais12Meses(id),
      loadVendasPorHora(id),
      loadVendasMensais(id),
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

      const { data } = await supabase
        .from('orcamentos')
        .select('created_at, valor_total')
        .eq('estabelecimento_id', estabId)
        .in('status', ['aprovado', 'finalizado', 'faturado'])
        .gte('created_at', hoje.toISOString());

      const horasMap: Record<string, { valor: number; quantidade: number }> = {};
      const horaAtual = new Date().getHours();
      for (let h = 8; h <= horaAtual; h++) {
        const horaStr = `${h.toString().padStart(2, '0')}h`;
        horasMap[horaStr] = { valor: 0, quantidade: 0 };
      }

      (data || []).forEach((orc: any) => {
        const hora = new Date(orc.created_at).getHours();
        const horaStr = `${hora.toString().padStart(2, '0')}h`;
        if (horasMap[horaStr]) {
          horasMap[horaStr].valor += Number(orc.valor_total) || 0;
          horasMap[horaStr].quantidade++;
        }
      });

      setVendasPorHora(
        Object.entries(horasMap)
          .map(([hora, data]) => ({ hora, ...data }))
          .sort((a, b) => a.hora.localeCompare(b.hora))
      );
    } catch (error) {
      console.error('Erro ao carregar vendas por hora:', error);
    }
  };

  const loadVendasMensais = async (estabId: string) => {
    try {
      const data12MesesAtras = subMonths(new Date(), 12);

      const { data } = await supabase
        .from('orcamentos')
        .select('created_at, valor_total')
        .eq('estabelecimento_id', estabId)
        .in('status', ['aprovado', 'finalizado', 'faturado'])
        .gte('created_at', data12MesesAtras.toISOString());

      const mesesMap: Record<string, { valor: number; quantidade: number }> = {};
      
      for (let i = 11; i >= 0; i--) {
        const mes = subMonths(new Date(), i);
        const mesStr = format(mes, 'MMM/yy', { locale: ptBR });
        mesesMap[mesStr] = { valor: 0, quantidade: 0 };
      }

      (data || []).forEach((orc: any) => {
        const mesStr = format(new Date(orc.created_at), 'MMM/yy', { locale: ptBR });
        if (mesesMap[mesStr]) {
          mesesMap[mesStr].valor += Number(orc.valor_total) || 0;
          mesesMap[mesStr].quantidade++;
        }
      });

      setVendasMensais(
        Object.entries(mesesMap).map(([mes, data]) => ({ mes, ...data }))
      );
    } catch (error) {
      console.error('Erro ao carregar vendas mensais:', error);
    }
  };

  const loadTaxaConversao = async (estabId: string) => {
    try {
      const hoje = new Date();
      hoje.setHours(0, 0, 0, 0);

      const { count: totalCriados } = await supabase
        .from('orcamentos')
        .select('*', { count: 'exact', head: true })
        .eq('estabelecimento_id', estabId)
        .gte('created_at', hoje.toISOString());

      const { count: convertidos } = await supabase
        .from('orcamentos')
        .select('*', { count: 'exact', head: true })
        .eq('estabelecimento_id', estabId)
        .in('status', ['aprovado', 'finalizado', 'faturado'])
        .gte('created_at', hoje.toISOString());

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

      const { data } = await supabase
        .from('conversations')
        .select('sla_tempo_primeira_resposta')
        .eq('estabelecimento_id', estabId)
        .gte('created_at', hoje.toISOString())
        .not('sla_tempo_primeira_resposta', 'is', null);

      if (data && data.length > 0) {
        const tempos = data.map((c: any) => c.sla_tempo_primeira_resposta || 0).filter((t: number) => t > 0);
        const media = tempos.length > 0 
          ? tempos.reduce((a: number, b: number) => a + b, 0) / tempos.length 
          : 0;
        setTempoMedioResposta(Math.round(media / 60));
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

      const [{ data: usuarios }, { data: activities }, { data: atendentes }, { data: orcamentos }, { data: conversations }] = await Promise.all([
        supabase.from('usuarios').select('id, nome').eq('estabelecimento_id', estabId),
        supabase.from('user_activity_tracking').select('usuario_id, is_online').eq('estabelecimento_id', estabId),
        supabase.from('atendentes').select('id, usuario_id').eq('estabelecimento_id', estabId),
        supabase.from('orcamentos').select('id, vendedor_id, status, valor_total').eq('estabelecimento_id', estabId).gte('created_at', hoje.toISOString()).lt('created_at', amanha.toISOString()),
        supabase.from('conversations').select('id, atendente_atual_id').eq('estabelecimento_id', estabId).eq('chat_status', 'em_atendimento'),
      ]);

      const metricsMap = new Map<string, VendedorMetrics>();

      (usuarios || []).forEach(usuario => {
        const activity = (activities || []).find(a => a.usuario_id === usuario.id);
        const userOrcamentos = (orcamentos || []).filter(o => o.vendedor_id === usuario.id);
        const atendenteRecord = (atendentes || []).find(a => a.usuario_id === usuario.id);
        
        const chatsAtivos = atendenteRecord 
          ? (conversations || []).filter((c: any) => c.atendente_atual_id === atendenteRecord.id).length 
          : 0;

        const pedidosPendentes = userOrcamentos.filter(o => o.status === 'pendente' || o.status === 'rascunho').length;
        const pedidosVendidos = userOrcamentos.filter(o => ['aprovado', 'finalizado', 'faturado'].includes(o.status || '')).length;
        const valorTotal = userOrcamentos
          .filter(o => ['aprovado', 'finalizado', 'faturado'].includes(o.status || ''))
          .reduce((acc, o) => acc + (Number(o.valor_total) || 0), 0);

        metricsMap.set(usuario.id, {
          id: usuario.id,
          nome: usuario.nome,
          isOnline: activity?.is_online || false,
          pedidosPendentes,
          pedidosVendidos,
          valorTotal,
          chatsAtivos,
        });
      });

      setVendedores(
        Array.from(metricsMap.values()).sort((a, b) => b.valorTotal - a.valorTotal)
      );
    } catch (error) {
      console.error('Erro ao carregar vendedores:', error);
    }
  };

  const loadTotaisHoje = async (estabId: string) => {
    try {
      const hoje = new Date();
      hoje.setHours(0, 0, 0, 0);

      const { data } = await supabase
        .from('orcamentos')
        .select('id, valor_total')
        .eq('estabelecimento_id', estabId)
        .in('status', ['aprovado', 'finalizado', 'faturado'])
        .gte('created_at', hoje.toISOString());

      setTotalVendasHoje((data || []).length);
      setTotalValorHoje((data || []).reduce((acc, o) => acc + (Number(o.valor_total) || 0), 0));
    } catch (error) {
      console.error('Erro ao carregar totais:', error);
    }
  };

  const loadTotaisMes = async (estabId: string) => {
    try {
      const inicioMes = startOfMonth(new Date());

      const { data } = await supabase
        .from('orcamentos')
        .select('id, valor_total')
        .eq('estabelecimento_id', estabId)
        .in('status', ['aprovado', 'finalizado', 'faturado'])
        .gte('created_at', inicioMes.toISOString());

      setTotalVendasMes((data || []).length);
      setTotalValorMes((data || []).reduce((acc, o) => acc + (Number(o.valor_total) || 0), 0));
    } catch (error) {
      console.error('Erro ao carregar totais do mês:', error);
    }
  };

  const loadTotais12Meses = async (estabId: string) => {
    try {
      const data12MesesAtras = subMonths(new Date(), 12);

      const { data } = await supabase
        .from('orcamentos')
        .select('id, valor_total')
        .eq('estabelecimento_id', estabId)
        .in('status', ['aprovado', 'finalizado', 'faturado'])
        .gte('created_at', data12MesesAtras.toISOString());

      setTotalVendas12Meses((data || []).length);
      setTotalValor12Meses((data || []).reduce((acc, o) => acc + (Number(o.valor_total) || 0), 0));
    } catch (error) {
      console.error('Erro ao carregar totais 12 meses:', error);
    }
  };

  const onlineCount = vendedores.filter(v => v.isOnline).length;
  const progressoMeta = Math.min((totalValorHoje / metaDiaria) * 100, 100);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(value);
  };

  const formatCurrencyCompact = (value: number) => {
    if (value >= 1000000) return `R$ ${(value / 1000000).toFixed(1)}M`;
    if (value >= 1000) return `R$ ${(value / 1000).toFixed(0)}k`;
    return formatCurrency(value);
  };

  // Chart: Vendas por hora
  const vendasPorHoraChartOption = useMemo(() => ({
    tooltip: {
      trigger: 'axis',
      formatter: (params: any) => {
        const data = params[0];
        return `${data.name}<br/>${formatCurrency(data.value)}`;
      },
    },
    grid: { left: '5%', right: '5%', bottom: '10%', top: '10%', containLabel: true },
    xAxis: {
      type: 'category',
      data: vendasPorHora.map(v => v.hora),
      axisLabel: { color: '#94a3b8', fontSize: 9 },
      axisLine: { lineStyle: { color: '#334155' } },
    },
    yAxis: {
      type: 'value',
      axisLabel: { color: '#94a3b8', formatter: (val: number) => `${(val / 1000).toFixed(0)}k` },
      splitLine: { lineStyle: { color: '#1e293b' } },
    },
    series: [{
      type: 'bar',
      data: vendasPorHora.map(v => v.valor),
      itemStyle: {
        borderRadius: [4, 4, 0, 0],
        color: { type: 'linear', x: 0, y: 0, x2: 0, y2: 1, colorStops: [{ offset: 0, color: '#22c55e' }, { offset: 1, color: '#16a34a' }] },
      },
    }],
  }), [vendasPorHora]);

  // Chart: Vendas mensais (12 meses)
  const vendasMensaisChartOption = useMemo(() => ({
    tooltip: {
      trigger: 'axis',
      formatter: (params: any) => {
        const data = params[0];
        return `${data.name}<br/>${formatCurrency(data.value)}`;
      },
    },
    grid: { left: '5%', right: '5%', bottom: '15%', top: '10%', containLabel: true },
    xAxis: {
      type: 'category',
      data: vendasMensais.map(v => v.mes),
      axisLabel: { color: '#94a3b8', fontSize: 8, rotate: 45 },
      axisLine: { lineStyle: { color: '#334155' } },
    },
    yAxis: {
      type: 'value',
      axisLabel: { color: '#94a3b8', formatter: (val: number) => val >= 1000000 ? `${(val / 1000000).toFixed(0)}M` : `${(val / 1000).toFixed(0)}k` },
      splitLine: { lineStyle: { color: '#1e293b' } },
    },
    series: [{
      type: 'line',
      smooth: true,
      data: vendasMensais.map(v => v.valor),
      areaStyle: {
        color: { type: 'linear', x: 0, y: 0, x2: 0, y2: 1, colorStops: [{ offset: 0, color: 'rgba(59, 130, 246, 0.4)' }, { offset: 1, color: 'rgba(59, 130, 246, 0.05)' }] },
      },
      lineStyle: { color: '#3b82f6', width: 2 },
      itemStyle: { color: '#3b82f6' },
    }],
  }), [vendasMensais]);

  // Chart: Vendas por vendedor
  const vendasChartOption = useMemo(() => ({
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      formatter: (params: any) => `${params[0].name}<br/>${formatCurrency(params[0].value)}`,
    },
    grid: { left: '5%', right: '5%', bottom: '15%', top: '10%', containLabel: true },
    xAxis: {
      type: 'category',
      data: vendedores.slice(0, 6).map(v => v.nome.split(' ')[0]),
      axisLabel: { color: '#94a3b8', fontSize: 9 },
      axisLine: { lineStyle: { color: '#334155' } },
    },
    yAxis: {
      type: 'value',
      axisLabel: { color: '#94a3b8', formatter: (val: number) => `${(val / 1000).toFixed(0)}k` },
      splitLine: { lineStyle: { color: '#1e293b' } },
    },
    series: [{
      type: 'bar',
      data: vendedores.slice(0, 6).map(v => v.valorTotal),
      itemStyle: {
        borderRadius: [4, 4, 0, 0],
        color: { type: 'linear', x: 0, y: 0, x2: 0, y2: 1, colorStops: [{ offset: 0, color: '#8b5cf6' }, { offset: 1, color: '#6d28d9' }] },
      },
    }],
  }), [vendedores]);

  if (loading) {
    return (
      <div className="fixed inset-0 bg-slate-950 flex items-center justify-center">
        <RefreshCw className="h-8 w-8 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-slate-950 overflow-hidden p-3">
      {/* Header Compacto */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Button 
            variant="ghost" 
            size="icon"
            onClick={() => navigate(-1)}
            className="h-8 w-8 text-slate-400 hover:text-white hover:bg-slate-800"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <Tv className="h-5 w-5 text-blue-500" />
          <h1 className="text-lg font-bold text-white">Dashboard de Vendas</h1>
        </div>
        <div className="flex items-center gap-2 text-xs">
          <Badge className="bg-slate-800 text-slate-300 border-slate-700">
            <Circle className={`h-1.5 w-1.5 mr-1.5 ${onlineCount > 0 ? 'fill-green-500 text-green-500' : 'fill-slate-500 text-slate-500'}`} />
            {onlineCount} online
          </Badge>
          <span className="text-slate-500">{format(lastUpdate, 'HH:mm', { locale: ptBR })}</span>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-12 gap-2 h-[calc(100vh-60px)]">
        {/* Left - KPIs & Charts */}
        <div className="col-span-9 flex flex-col gap-2">
          {/* KPI Row */}
          <div className="grid grid-cols-7 gap-2">
            {/* Vendas Hoje */}
            <Card className="bg-slate-900/80 border-slate-800">
              <CardContent className="p-2">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-green-500/20">
                    <ShoppingCart className="h-4 w-4 text-green-400" />
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-500">Vendas Hoje</p>
                    <p className="text-lg font-bold text-green-400">{totalVendasHoje}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Faturamento Hoje */}
            <Card className="bg-slate-900/80 border-slate-800">
              <CardContent className="p-2">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-blue-500/20">
                    <DollarSign className="h-4 w-4 text-blue-400" />
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-500">Fat. Hoje</p>
                    <p className="text-sm font-bold text-blue-400">{formatCurrencyCompact(totalValorHoje)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Vendas Mês */}
            <Card className="bg-slate-900/80 border-slate-800">
              <CardContent className="p-2">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-cyan-500/20">
                    <CalendarDays className="h-4 w-4 text-cyan-400" />
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-500">Vendas Mês</p>
                    <p className="text-lg font-bold text-cyan-400">{totalVendasMes}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Faturamento Mês */}
            <Card className="bg-slate-900/80 border-slate-800">
              <CardContent className="p-2">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-indigo-500/20">
                    <BarChart3 className="h-4 w-4 text-indigo-400" />
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-500">Fat. Mês</p>
                    <p className="text-sm font-bold text-indigo-400">{formatCurrencyCompact(totalValorMes)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* 12 Meses */}
            <Card className="bg-slate-900/80 border-slate-800">
              <CardContent className="p-2">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-purple-500/20">
                    <TrendingUp className="h-4 w-4 text-purple-400" />
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-500">12 Meses</p>
                    <p className="text-sm font-bold text-purple-400">{formatCurrencyCompact(totalValor12Meses)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Taxa Conversão */}
            <Card className="bg-slate-900/80 border-slate-800">
              <CardContent className="p-2">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-amber-500/20">
                    <Percent className="h-4 w-4 text-amber-400" />
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-500">Conversão</p>
                    <p className="text-lg font-bold text-amber-400">{taxaConversao}%</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Tempo Resposta */}
            <Card className="bg-slate-900/80 border-slate-800">
              <CardContent className="p-2">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-pink-500/20">
                    <Timer className="h-4 w-4 text-pink-400" />
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-500">Resposta</p>
                    <p className="text-lg font-bold text-pink-400">{tempoMedioResposta}m</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Meta Diária */}
          <Card className="bg-slate-900/80 border-slate-800">
            <CardContent className="py-2 px-3">
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="text-slate-400 flex items-center gap-1">
                  <Target className="h-3 w-3" /> Meta Diária
                </span>
                <span className="text-white font-medium">
                  {formatCurrency(totalValorHoje)} / {formatCurrency(metaDiaria)} ({progressoMeta.toFixed(0)}%)
                </span>
              </div>
              <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-blue-500 to-cyan-400 transition-all duration-500"
                  style={{ width: `${progressoMeta}%` }}
                />
              </div>
            </CardContent>
          </Card>

          {/* Charts Row */}
          <div className="grid grid-cols-3 gap-2 flex-1 min-h-0">
            {/* Vendas por Hora */}
            <Card className="bg-slate-900/80 border-slate-800 flex flex-col">
              <CardHeader className="py-1.5 px-2">
                <CardTitle className="text-[10px] text-slate-400 flex items-center gap-1.5">
                  <Clock className="h-3 w-3 text-green-400" />
                  Vendas por Hora (Hoje)
                </CardTitle>
              </CardHeader>
              <CardContent className="flex-1 p-1 min-h-0">
                <ReactECharts option={vendasPorHoraChartOption} style={{ height: '100%' }} />
              </CardContent>
            </Card>

            {/* Vendas 12 Meses */}
            <Card className="bg-slate-900/80 border-slate-800 flex flex-col">
              <CardHeader className="py-1.5 px-2">
                <CardTitle className="text-[10px] text-slate-400 flex items-center gap-1.5">
                  <CalendarDays className="h-3 w-3 text-blue-400" />
                  Faturamento 12 Meses
                </CardTitle>
              </CardHeader>
              <CardContent className="flex-1 p-1 min-h-0">
                <ReactECharts option={vendasMensaisChartOption} style={{ height: '100%' }} />
              </CardContent>
            </Card>

            {/* Vendas por Vendedor */}
            <Card className="bg-slate-900/80 border-slate-800 flex flex-col">
              <CardHeader className="py-1.5 px-2">
                <CardTitle className="text-[10px] text-slate-400 flex items-center gap-1.5">
                  <Users className="h-3 w-3 text-purple-400" />
                  Ranking Vendedores
                </CardTitle>
              </CardHeader>
              <CardContent className="flex-1 p-1 min-h-0">
                <ReactECharts option={vendasChartOption} style={{ height: '100%' }} />
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Right - Team List */}
        <div className="col-span-3">
          <Card className="h-full bg-slate-900/80 border-slate-800 flex flex-col">
            <CardHeader className="py-2 px-3 border-b border-slate-800">
              <CardTitle className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-1.5 text-slate-300">
                  <Users className="h-3.5 w-3.5 text-blue-400" />
                  Equipe
                </div>
                <Badge className="bg-slate-800 text-slate-400 text-[10px]">
                  {onlineCount}/{vendedores.length}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="flex-1 p-0 overflow-hidden">
              <ScrollArea className="h-full">
                <div className="p-1.5 space-y-1">
                  {vendedores.map((vendedor, index) => (
                    <div 
                      key={vendedor.id}
                      className={`p-2 rounded-lg transition-all ${
                        vendedor.isOnline 
                          ? 'bg-slate-800/50 border border-slate-700/50' 
                          : 'bg-slate-900/50 border border-slate-800/50 opacity-60'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <div className={`w-1.5 h-1.5 rounded-full ${vendedor.isOnline ? 'bg-green-500' : 'bg-slate-600'}`} />
                          <span className="font-medium text-xs text-slate-200 truncate max-w-[80px]">
                            {vendedor.nome.split(' ')[0]}
                          </span>
                          {index < 3 && vendedor.valorTotal > 0 && (
                            <span className="text-[9px] px-1 py-0.5 rounded bg-amber-500/20 text-amber-400">
                              #{index + 1}
                            </span>
                          )}
                        </div>
                        <span className="font-bold text-xs text-blue-400">
                          {formatCurrencyCompact(vendedor.valorTotal)}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 mt-1 text-[9px] text-slate-500">
                        <span className="flex items-center gap-0.5">
                          <MessageSquare className="h-2.5 w-2.5" />
                          {vendedor.chatsAtivos}
                        </span>
                        <span className="flex items-center gap-0.5 text-amber-500">
                          <Clock className="h-2.5 w-2.5" />
                          {vendedor.pedidosPendentes}
                        </span>
                        <span className="flex items-center gap-0.5 text-green-500">
                          <ShoppingCart className="h-2.5 w-2.5" />
                          {vendedor.pedidosVendidos}
                        </span>
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