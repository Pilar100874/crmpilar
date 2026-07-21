import { useState, useEffect, useMemo } from "react";
import TvNotificationBarAuto from "@/components/tv/TvNotificationBarAuto";
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
import { useFullscreen } from "@/hooks/useFullscreen";
import { callTvDeviceFunction, getTvDeviceToken } from "@/lib/tvDeviceClient";

interface VendedorMetrics {
  id: string;
  nome: string;
  isOnline: boolean;
  agendaHoje: number;
  chatsFinalizados: number;
  emailsEnviados: number;
  emailsRecebidos: number;
  orcamentosTotal: number;
  orcamentosPendentes: number;
  orcamentosAprovados: number;
  orcamentosFaturados: number;
  valorTotal: number;
  valorMes: number;
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
  useFullscreen(true);
  const tvDeviceToken = useMemo(() => getTvDeviceToken(), []);
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
    if (!estabelecimentoId && !tvDeviceToken) return;
    const interval = setInterval(loadAllData, 30000);
    return () => clearInterval(interval);
  }, [estabelecimentoId, tvDeviceToken]);

  const init = async () => {
    if (tvDeviceToken) {
      await loadAllData();
      setLoading(false);
      return;
    }

    const estabId = await getEstabelecimentoId();
    if (estabId) {
      setEstabelecimentoId(estabId);
      await loadAllData(estabId);
      setupRealtime(estabId);
    }
    setLoading(false);
  };

  const loadAllData = async (estabId?: string) => {
    if (tvDeviceToken) {
      const data = await callTvDeviceFunction<any>('tv-dashboard-vendas', tvDeviceToken);
      setEstabelecimentoId(data.estabelecimento_id || "");
      setVendedores(data.vendedores || []);
      setTotalVendasHoje(data.totalVendasHoje || 0);
      setTotalValorHoje(data.totalValorHoje || 0);
      setTotalValorMes(data.totalValorMes || 0);
      setTotalVendasMes(data.totalVendasMes || 0);
      setTotalValor12Meses(data.totalValor12Meses || 0);
      setTotalVendas12Meses(data.totalVendas12Meses || 0);
      setVendasPorHora(data.vendasPorHora || []);
      setVendasMensais(data.vendasMensais || []);
      setTaxaConversao(data.taxaConversao || 0);
      setTempoMedioResposta(data.tempoMedioResposta || 0);
      setLastUpdate(new Date());
      return;
    }

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
      const inicioMes = startOfMonth(new Date());
      const hojeStr = hoje.toISOString().split('T')[0];

      // Fetch base data
      const [{ data: usuarios }, { data: activities }, { data: atendentes }] = await Promise.all([
        supabase.from('usuarios').select('id, nome').eq('estabelecimento_id', estabId),
        supabase.from('user_activity_tracking').select('usuario_id, is_online').eq('estabelecimento_id', estabId),
        supabase.from('atendentes').select('id, usuario_id').eq('estabelecimento_id', estabId),
      ]);

      // Fetch orcamentos
      const { data: orcamentosHoje } = await supabase
        .from('orcamentos')
        .select('id, vendedor_id, status, valor_total')
        .eq('estabelecimento_id', estabId)
        .gte('created_at', hoje.toISOString())
        .lt('created_at', amanha.toISOString());

      const { data: orcamentosMes } = await supabase
        .from('orcamentos')
        .select('id, vendedor_id, status, valor_total')
        .eq('estabelecimento_id', estabId)
        .gte('created_at', inicioMes.toISOString());

      // Fetch conversations - simplified query
      const { data: conversationsFinalizadas } = await supabase
        .from('conversations')
        .select('id, atendente_atual_id, canal')
        .eq('estabelecimento_id', estabId)
        .eq('chat_status', 'encerrado')
        .gte('updated_at', hoje.toISOString());

      // Fetch tarefas
      const { data: tarefas } = await supabase
        .from('calendario_tarefas')
        .select('id, user_id')
        .eq('estabelecimento_id', estabId)
        .eq('date', hojeStr);

      // Note: emails table query skipped due to type issues - will show 0 for now
      const emailsEnviados: any[] = [];
      const emailsRecebidos: any[] = [];

      const metricsMap = new Map<string, VendedorMetrics>();

      (usuarios || []).forEach(usuario => {
        const activity = (activities || []).find(a => a.usuario_id === usuario.id);
        const userOrcamentosHoje = (orcamentosHoje || []).filter(o => o.vendedor_id === usuario.id);
        const userOrcamentosMes = (orcamentosMes || []).filter(o => o.vendedor_id === usuario.id);
        const atendenteRecord = (atendentes || []).find(a => a.usuario_id === usuario.id);
        
        const chatsFinalizados = atendenteRecord 
          ? (conversationsFinalizadas || []).filter((c: any) => c.atendente_atual_id === atendenteRecord.id).length 
          : 0;

        const agendaHoje = (tarefas || []).filter((t: any) => t.user_id === usuario.id).length;
        const userEmailsEnviados = (emailsEnviados || []).filter((e: any) => e.usuario_id === usuario.id).length;
        const userEmailsRecebidos = (emailsRecebidos || []).filter((e: any) => e.usuario_id === usuario.id).length;

        const orcamentosPendentes = userOrcamentosHoje.filter(o => o.status === 'pendente' || o.status === 'rascunho').length;
        const orcamentosAprovados = userOrcamentosHoje.filter(o => o.status === 'aprovado' || o.status === 'finalizado').length;
        const orcamentosFaturados = userOrcamentosHoje.filter(o => o.status === 'faturado').length;
        const orcamentosTotal = userOrcamentosHoje.length;

        const valorTotal = userOrcamentosHoje
          .filter(o => ['aprovado', 'finalizado', 'faturado'].includes(o.status || ''))
          .reduce((acc, o) => acc + (Number(o.valor_total) || 0), 0);
        const valorMes = userOrcamentosMes
          .filter(o => ['aprovado', 'finalizado', 'faturado'].includes(o.status || ''))
          .reduce((acc, o) => acc + (Number(o.valor_total) || 0), 0);

        metricsMap.set(usuario.id, {
          id: usuario.id,
          nome: usuario.nome,
          isOnline: activity?.is_online || false,
          agendaHoje,
          chatsFinalizados,
          emailsEnviados: userEmailsEnviados,
          emailsRecebidos: userEmailsRecebidos,
          orcamentosTotal,
          orcamentosPendentes,
          orcamentosAprovados,
          orcamentosFaturados,
          valorTotal,
          valorMes,
        });
      });

      setVendedores(
        Array.from(metricsMap.values()).sort((a, b) => b.valorMes - a.valorMes)
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
      <div className="fixed inset-0 bg-gradient-to-br from-foreground via-foreground/90 to-foreground flex items-center justify-center">
        <RefreshCw className="h-12 w-12 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-gradient-to-br from-foreground via-foreground/90 to-foreground overflow-y-auto md:overflow-hidden p-3 sm:p-4 md:p-6">
      {/* Header Minimal - apenas botão voltar */}
      <div className="absolute top-2 right-2 sm:top-4 sm:right-6 z-10">
        <Button 
          variant="ghost" 
          size="icon"
          onClick={() => navigate(-1)}
          className="h-9 w-9 text-muted-foreground hover:text-white hover:bg-foreground/80/50"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
      </div>

      {/* Main Grid - Optimized for 4K */}
      <div className="md:h-full flex flex-col gap-3 sm:gap-4 md:gap-5 pt-10 md:pt-0">
        {/* KPI Row - 2 rows of cards for better readability */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 sm:gap-3 md:gap-4">
          {/* Vendas Hoje */}
          <div className="bg-gradient-to-br from-green-500/20 to-green-600/5 rounded-2xl border border-green-500/30 p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-green-300/70 font-medium mb-1">Vendas Hoje</p>
                <p className="text-3xl sm:text-4xl lg:text-5xl font-bold text-green-400">{totalVendasHoje}</p>
              </div>
              <div className="p-4 rounded-2xl bg-green-500/20">
                <ShoppingCart className="h-8 w-8 text-green-400" />
              </div>
            </div>
          </div>

          {/* Faturamento Hoje */}
          <div className="bg-gradient-to-br from-blue-500/20 to-blue-600/5 rounded-2xl border border-blue-500/30 p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-blue-300/70 font-medium mb-1">Faturamento Hoje</p>
                <p className="text-2xl sm:text-3xl lg:text-4xl font-bold text-blue-400">{formatCurrencyCompact(totalValorHoje)}</p>
              </div>
              <div className="p-4 rounded-2xl bg-blue-500/20">
                <DollarSign className="h-8 w-8 text-blue-400" />
              </div>
            </div>
          </div>

          {/* Faturamento Mês */}
          <div className="bg-gradient-to-br from-cyan-500/20 to-cyan-600/5 rounded-2xl border border-cyan-500/30 p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-cyan-300/70 font-medium mb-1">Faturamento Mês</p>
                <p className="text-2xl sm:text-3xl lg:text-4xl font-bold text-cyan-400">{formatCurrencyCompact(totalValorMes)}</p>
                <p className="text-xs text-cyan-400/60 mt-1">{totalVendasMes} vendas</p>
              </div>
              <div className="p-4 rounded-2xl bg-cyan-500/20">
                <CalendarDays className="h-8 w-8 text-cyan-400" />
              </div>
            </div>
          </div>

          {/* Faturamento 12 Meses */}
          <div className="bg-gradient-to-br from-purple-500/20 to-purple-600/5 rounded-2xl border border-purple-500/30 p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-purple-300/70 font-medium mb-1">Últimos 12 Meses</p>
                <p className="text-2xl sm:text-3xl lg:text-4xl font-bold text-purple-400">{formatCurrencyCompact(totalValor12Meses)}</p>
                <p className="text-xs text-purple-400/60 mt-1">{totalVendas12Meses} vendas</p>
              </div>
              <div className="p-4 rounded-2xl bg-purple-500/20">
                <TrendingUp className="h-8 w-8 text-purple-400" />
              </div>
            </div>
          </div>

          {/* Meta Diária com Progress */}
          <div className="bg-gradient-to-br from-amber-500/20 to-orange-600/5 rounded-2xl border border-amber-500/30 p-5">
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="text-sm text-amber-300/70 font-medium mb-1">Meta Diária</p>
                <p className="text-2xl sm:text-3xl lg:text-4xl font-bold text-amber-400">{progressoMeta.toFixed(0)}%</p>
              </div>
              <div className="p-4 rounded-2xl bg-amber-500/20">
                <Target className="h-8 w-8 text-amber-400" />
              </div>
            </div>
            <div className="h-2.5 bg-foreground/80 rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-amber-500 to-orange-400 transition-all duration-1000"
                style={{ width: `${progressoMeta}%` }}
              />
            </div>
            <p className="text-xs text-amber-400/60 mt-2">{formatCurrency(totalValorHoje)} / {formatCurrency(metaDiaria)}</p>
          </div>
        </div>

        {/* Secondary KPIs Row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 md:gap-4">
          {/* Ticket Médio */}
          <div className="bg-black/30 backdrop-blur-sm rounded-xl border border-border/50 px-5 py-3 flex items-center gap-4">
            <div className="p-2.5 rounded-xl bg-orange-500/20">
              <BarChart3 className="h-5 w-5 text-orange-400" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Ticket Médio</p>
              <p className="text-xl font-bold text-orange-400">
                {totalVendasHoje > 0 ? formatCurrencyCompact(totalValorHoje / totalVendasHoje) : 'R$ 0'}
              </p>
            </div>
          </div>

          {/* Taxa Conversão */}
          <div className="bg-black/30 backdrop-blur-sm rounded-xl border border-border/50 px-5 py-3 flex items-center gap-4">
            <div className="p-2.5 rounded-xl bg-emerald-500/20">
              <Percent className="h-5 w-5 text-emerald-400" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Taxa Conversão</p>
              <p className="text-xl font-bold text-emerald-400">{taxaConversao}%</p>
            </div>
          </div>

          {/* Tempo Resposta */}
          <div className="bg-black/30 backdrop-blur-sm rounded-xl border border-border/50 px-5 py-3 flex items-center gap-4">
            <div className="p-2.5 rounded-xl bg-pink-500/20">
              <Timer className="h-5 w-5 text-pink-400" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Tempo Resposta</p>
              <p className="text-xl font-bold text-pink-400">{tempoMedioResposta} min</p>
            </div>
          </div>

          {/* Online */}
          <div className="bg-black/30 backdrop-blur-sm rounded-xl border border-border/50 px-5 py-3 flex items-center gap-4">
            <div className="p-2.5 rounded-xl bg-green-500/20">
              <Users className="h-5 w-5 text-green-400" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Equipe Online</p>
              <p className="text-xl font-bold text-green-400">{onlineCount} <span className="text-muted-foreground font-normal text-sm">/ {vendedores.length}</span></p>
            </div>
          </div>
        </div>

        {/* Team List - Full Width Vertical Layout */}
        <div className="flex-1 min-h-[400px] md:min-h-0">
          <Card className="h-full bg-black/30 backdrop-blur-sm border-border/50 flex flex-col">
            <CardHeader className="py-2 px-3 sm:px-6 border-b border-border/50">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-muted-foreground/60">
                  <Users className="h-5 w-5 text-blue-400" />
                  <span className="text-sm sm:text-base font-semibold">Ranking de Vendas</span>
                </div>
                {/* Column Headers - hidden on mobile */}
                <div className="hidden lg:flex items-center gap-4 text-[10px] text-muted-foreground uppercase tracking-wider">
                  <span className="w-12 text-center">Agenda</span>
                  <span className="w-12 text-center">Chats</span>
                  <span className="w-16 text-center">E-mails</span>
                  <span className="w-32 text-center">Orçamentos</span>
                  <span className="w-24 text-right">Hoje</span>
                  <span className="w-24 text-right">Mês</span>
                </div>
              </div>
            </CardHeader>
            <CardContent className="flex-1 p-0 overflow-hidden">
              <div className="h-full overflow-y-auto">
                <div className="p-1 space-y-0.5">
                  {vendedores.map((vendedor, index) => (
                    <div 
                      key={vendedor.id}
                      className={`px-2 sm:px-3 py-1.5 rounded transition-all flex flex-wrap lg:flex-nowrap items-center justify-between gap-2 ${
                        vendedor.isOnline 
                          ? 'bg-foreground/80/50 border border-border/40' 
                          : 'bg-foreground/90/30 border border-transparent opacity-60'
                      }`}
                    >
                      {/* Left - Ranking & Name */}
                      <div className="flex items-center gap-2 min-w-[140px] lg:min-w-[160px]">
                        <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                          index === 0 ? 'bg-amber-500/30 text-amber-400' :
                          index === 1 ? 'bg-muted-foreground/40/30 text-muted-foreground/60' :
                          index === 2 ? 'bg-orange-600/30 text-orange-400' :
                          'bg-foreground/80/50 text-muted-foreground'
                        }`}>
                          {index + 1}
                        </div>
                        <div className="flex items-center gap-1.5">
                          <div className={`w-1.5 h-1.5 rounded-full ${vendedor.isOnline ? 'bg-green-500' : 'bg-muted-foreground/80'}`} />
                          <span className="font-medium text-[11px] text-muted-foreground truncate max-w-[120px]">
                            {vendedor.nome}
                          </span>
                        </div>
                      </div>

                      {/* Right - Metrics */}
                      <div className="flex items-center gap-2 sm:gap-3 flex-wrap justify-end">
                        {/* Agenda */}
                        <div className="w-10 text-center">
                          <div className="flex items-center justify-center gap-0.5">
                            <Calendar className="h-2.5 w-2.5 text-purple-400" />
                            <span className="text-[10px] font-medium text-purple-400">{vendedor.agendaHoje}</span>
                          </div>
                        </div>

                        {/* Chats */}
                        <div className="w-10 text-center">
                          <div className="flex items-center justify-center gap-0.5">
                            <MessageSquare className="h-2.5 w-2.5 text-cyan-400" />
                            <span className="text-[10px] font-medium text-cyan-400">{vendedor.chatsFinalizados}</span>
                          </div>
                        </div>

                        {/* Emails - hidden on small screens */}
                        <div className="hidden sm:block w-14 text-center">
                          <div className="flex items-center justify-center gap-0.5 text-[9px]">
                            <span className="text-green-400">↑{vendedor.emailsEnviados}</span>
                            <span className="text-muted-foreground">/</span>
                            <span className="text-blue-400">↓{vendedor.emailsRecebidos}</span>
                          </div>
                        </div>

                        {/* Orçamentos */}
                        <div className="w-28 hidden md:flex items-center justify-center gap-0.5">
                          <span className="px-1 py-0.5 rounded text-[8px] bg-muted-foreground/50 text-muted-foreground">{vendedor.orcamentosTotal}</span>
                          <span className="px-1 py-0.5 rounded text-[8px] bg-amber-500/20 text-amber-400">{vendedor.orcamentosPendentes}P</span>
                          <span className="px-1 py-0.5 rounded text-[8px] bg-green-500/20 text-green-400">{vendedor.orcamentosAprovados}A</span>
                          <span className="px-1 py-0.5 rounded text-[8px] bg-blue-500/20 text-blue-400">{vendedor.orcamentosFaturados}F</span>
                        </div>

                        {/* Daily Sales */}
                        <div className="w-16 sm:w-20 text-right">
                          <p className="text-[11px] sm:text-sm font-bold text-green-400">{formatCurrencyCompact(vendedor.valorTotal)}</p>
                        </div>
                        
                        {/* Monthly Sales */}
                        <div className="w-16 sm:w-20 text-right">
                          <p className="text-[11px] sm:text-sm font-bold text-blue-400">{formatCurrencyCompact(vendedor.valorMes)}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
      <TvNotificationBarAuto />
    </div>
  );
}