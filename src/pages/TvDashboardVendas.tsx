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
      <div className="fixed inset-0 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center">
        <RefreshCw className="h-12 w-12 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 overflow-hidden p-6">
      {/* Header Minimal */}
      <div className="absolute top-4 right-6 flex items-center gap-4 z-10">
        <Badge className="bg-black/40 backdrop-blur text-slate-300 border-slate-700/50 px-3 py-1.5 text-sm">
          <Circle className={`h-2 w-2 mr-2 ${onlineCount > 0 ? 'fill-green-500 text-green-500 animate-pulse' : 'fill-slate-500 text-slate-500'}`} />
          {onlineCount} online
        </Badge>
        <span className="text-slate-500 text-sm">{format(lastUpdate, 'HH:mm', { locale: ptBR })}</span>
        <Button 
          variant="ghost" 
          size="icon"
          onClick={() => navigate(-1)}
          className="h-9 w-9 text-slate-500 hover:text-white hover:bg-slate-800/50"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
      </div>

      {/* Main Grid - Optimized for 4K */}
      <div className="h-full flex flex-col gap-4">
        {/* KPI Row */}
        <div className="grid grid-cols-9 gap-3">
          {/* Vendas Hoje */}
          <Card className="bg-black/30 backdrop-blur-sm border-slate-800/50 hover:border-green-500/30 transition-colors">
            <CardContent className="p-4 flex items-center gap-4">
              <div className="p-3 rounded-xl bg-green-500/20">
                <ShoppingCart className="h-6 w-6 text-green-400" />
              </div>
              <div>
                <p className="text-xs text-slate-500 uppercase tracking-wider">Vendas Hoje</p>
                <p className="text-3xl font-bold text-green-400">{totalVendasHoje}</p>
              </div>
            </CardContent>
          </Card>

          {/* Faturamento Hoje */}
          <Card className="bg-black/30 backdrop-blur-sm border-slate-800/50 hover:border-blue-500/30 transition-colors">
            <CardContent className="p-4 flex items-center gap-4">
              <div className="p-3 rounded-xl bg-blue-500/20">
                <DollarSign className="h-6 w-6 text-blue-400" />
              </div>
              <div>
                <p className="text-xs text-slate-500 uppercase tracking-wider">Fat. Hoje</p>
                <p className="text-2xl font-bold text-blue-400">{formatCurrencyCompact(totalValorHoje)}</p>
              </div>
            </CardContent>
          </Card>

          {/* Vendas Mês */}
          <Card className="bg-black/30 backdrop-blur-sm border-slate-800/50 hover:border-cyan-500/30 transition-colors">
            <CardContent className="p-4 flex items-center gap-4">
              <div className="p-3 rounded-xl bg-cyan-500/20">
                <CalendarDays className="h-6 w-6 text-cyan-400" />
              </div>
              <div>
                <p className="text-xs text-slate-500 uppercase tracking-wider">Vendas Mês</p>
                <p className="text-3xl font-bold text-cyan-400">{totalVendasMes}</p>
              </div>
            </CardContent>
          </Card>

          {/* Faturamento Mês */}
          <Card className="bg-black/30 backdrop-blur-sm border-slate-800/50 hover:border-indigo-500/30 transition-colors">
            <CardContent className="p-4 flex items-center gap-4">
              <div className="p-3 rounded-xl bg-indigo-500/20">
                <BarChart3 className="h-6 w-6 text-indigo-400" />
              </div>
              <div>
                <p className="text-xs text-slate-500 uppercase tracking-wider">Fat. Mês</p>
                <p className="text-2xl font-bold text-indigo-400">{formatCurrencyCompact(totalValorMes)}</p>
              </div>
            </CardContent>
          </Card>

          {/* 12 Meses */}
          <Card className="bg-black/30 backdrop-blur-sm border-slate-800/50 hover:border-purple-500/30 transition-colors">
            <CardContent className="p-4 flex items-center gap-4">
              <div className="p-3 rounded-xl bg-purple-500/20">
                <TrendingUp className="h-6 w-6 text-purple-400" />
              </div>
              <div>
                <p className="text-xs text-slate-500 uppercase tracking-wider">12 Meses</p>
                <p className="text-2xl font-bold text-purple-400">{formatCurrencyCompact(totalValor12Meses)}</p>
              </div>
            </CardContent>
          </Card>

          {/* Ticket Médio */}
          <Card className="bg-black/30 backdrop-blur-sm border-slate-800/50 hover:border-orange-500/30 transition-colors">
            <CardContent className="p-4 flex items-center gap-4">
              <div className="p-3 rounded-xl bg-orange-500/20">
                <Target className="h-6 w-6 text-orange-400" />
              </div>
              <div>
                <p className="text-xs text-slate-500 uppercase tracking-wider">Ticket Médio</p>
                <p className="text-2xl font-bold text-orange-400">
                  {totalVendasHoje > 0 ? formatCurrencyCompact(totalValorHoje / totalVendasHoje) : 'R$ 0'}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Taxa Conversão */}
          <Card className="bg-black/30 backdrop-blur-sm border-slate-800/50 hover:border-amber-500/30 transition-colors">
            <CardContent className="p-4 flex items-center gap-4">
              <div className="p-3 rounded-xl bg-amber-500/20">
                <Percent className="h-6 w-6 text-amber-400" />
              </div>
              <div>
                <p className="text-xs text-slate-500 uppercase tracking-wider">Conversão</p>
                <p className="text-3xl font-bold text-amber-400">{taxaConversao}%</p>
              </div>
            </CardContent>
          </Card>

          {/* Tempo Resposta */}
          <Card className="bg-black/30 backdrop-blur-sm border-slate-800/50 hover:border-pink-500/30 transition-colors">
            <CardContent className="p-4 flex items-center gap-4">
              <div className="p-3 rounded-xl bg-pink-500/20">
                <Timer className="h-6 w-6 text-pink-400" />
              </div>
              <div>
                <p className="text-xs text-slate-500 uppercase tracking-wider">Resposta</p>
                <p className="text-3xl font-bold text-pink-400">{tempoMedioResposta}m</p>
              </div>
            </CardContent>
          </Card>

          {/* Meta Diária */}
          <Card className="bg-black/30 backdrop-blur-sm border-slate-800/50">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs text-slate-500 uppercase tracking-wider">Meta Diária</p>
                <span className="text-lg font-bold text-white">{progressoMeta.toFixed(0)}%</span>
              </div>
              <div className="h-3 bg-slate-800 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-blue-500 via-cyan-400 to-green-400 transition-all duration-1000"
                  style={{ width: `${progressoMeta}%` }}
                />
              </div>
              <p className="text-xs text-slate-500 mt-1.5">{formatCurrency(totalValorHoje)} / {formatCurrency(metaDiaria)}</p>
            </CardContent>
          </Card>
        </div>

        {/* Charts Row - Horizontal Layout */}
        <div className="flex-1 grid grid-cols-12 gap-4 min-h-0">
          {/* Main Charts Area */}
          <div className="col-span-9 grid grid-rows-2 gap-4">
            {/* Top Chart - Vendas 12 Meses (Full Width) */}
            <Card className="bg-black/30 backdrop-blur-sm border-slate-800/50 flex flex-col">
              <CardHeader className="py-3 px-4 border-b border-slate-800/50">
                <CardTitle className="text-sm text-slate-400 flex items-center gap-2">
                  <CalendarDays className="h-4 w-4 text-blue-400" />
                  Faturamento Últimos 12 Meses
                </CardTitle>
              </CardHeader>
              <CardContent className="flex-1 p-2 min-h-0">
                <ReactECharts option={vendasMensaisChartOption} style={{ height: '100%' }} />
              </CardContent>
            </Card>

            {/* Bottom Charts Row */}
            <div className="grid grid-cols-2 gap-4">
              {/* Vendas por Hora */}
              <Card className="bg-black/30 backdrop-blur-sm border-slate-800/50 flex flex-col">
                <CardHeader className="py-3 px-4 border-b border-slate-800/50">
                  <CardTitle className="text-sm text-slate-400 flex items-center gap-2">
                    <Clock className="h-4 w-4 text-green-400" />
                    Vendas por Hora (Hoje)
                  </CardTitle>
                </CardHeader>
                <CardContent className="flex-1 p-2 min-h-0">
                  <ReactECharts option={vendasPorHoraChartOption} style={{ height: '100%' }} />
                </CardContent>
              </Card>

              {/* Ranking Vendedores */}
              <Card className="bg-black/30 backdrop-blur-sm border-slate-800/50 flex flex-col">
                <CardHeader className="py-3 px-4 border-b border-slate-800/50">
                  <CardTitle className="text-sm text-slate-400 flex items-center gap-2">
                    <Users className="h-4 w-4 text-purple-400" />
                    Ranking Vendedores (Hoje)
                  </CardTitle>
                </CardHeader>
                <CardContent className="flex-1 p-2 min-h-0">
                  <ReactECharts option={vendasChartOption} style={{ height: '100%' }} />
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Right - Team List */}
          <div className="col-span-3">
            <Card className="h-full bg-black/30 backdrop-blur-sm border-slate-800/50 flex flex-col">
              <CardHeader className="py-3 px-4 border-b border-slate-800/50">
                <CardTitle className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2 text-slate-400">
                    <Users className="h-4 w-4 text-blue-400" />
                    Equipe em Tempo Real
                  </div>
                  <Badge className="bg-slate-800/80 text-slate-400 text-xs">
                    {onlineCount}/{vendedores.length}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="flex-1 p-0 overflow-hidden">
                <ScrollArea className="h-full">
                  <div className="p-3 space-y-2">
                    {vendedores.map((vendedor, index) => (
                      <div 
                        key={vendedor.id}
                        className={`p-3 rounded-xl transition-all ${
                          vendedor.isOnline 
                            ? 'bg-slate-800/40 border border-slate-700/50' 
                            : 'bg-slate-900/30 border border-slate-800/30 opacity-50'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className={`w-2.5 h-2.5 rounded-full ${vendedor.isOnline ? 'bg-green-500 animate-pulse' : 'bg-slate-600'}`} />
                            <span className="font-medium text-sm text-slate-200">
                              {vendedor.nome.split(' ')[0]}
                            </span>
                            {index < 3 && vendedor.valorTotal > 0 && (
                              <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${
                                index === 0 ? 'bg-amber-500/30 text-amber-400' :
                                index === 1 ? 'bg-slate-400/30 text-slate-300' :
                                'bg-orange-600/30 text-orange-400'
                              }`}>
                                #{index + 1}
                              </span>
                            )}
                          </div>
                          <span className="font-bold text-sm text-blue-400">
                            {formatCurrencyCompact(vendedor.valorTotal)}
                          </span>
                        </div>
                        <div className="flex items-center gap-4 mt-2 text-xs text-slate-500">
                          <span className="flex items-center gap-1">
                            <MessageSquare className="h-3 w-3" />
                            {vendedor.chatsAtivos} chats
                          </span>
                          <span className="flex items-center gap-1 text-amber-500">
                            <Clock className="h-3 w-3" />
                            {vendedor.pedidosPendentes} pend.
                          </span>
                          <span className="flex items-center gap-1 text-green-500">
                            <ShoppingCart className="h-3 w-3" />
                            {vendedor.pedidosVendidos} vendas
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
    </div>
  );
}