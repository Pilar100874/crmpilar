import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { format, subDays, startOfDay, endOfDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Calendar as CalendarIcon, Download, TrendingUp, Users, Clock, Target, Award, BarChart3 } from 'lucide-react';
import ReactECharts from 'echarts-for-react';
import { toast } from '@/lib/toast-config';

interface MetricaAgregada {
  data: string;
  total_chats: number;
  chats_dentro_sla: number;
  chats_fora_sla: number;
  taxa_cumprimento_sla: number;
  taxa_fcr: number;
  tempo_medio_primeira_resposta: number;
  tempo_medio_atendimento: number;
  avaliacao_media: number;
  nps_score: number;
  nps_promotores: number;
  nps_neutros: number;
  nps_detratores: number;
}

export default function AdvancedAnalyticsDashboard({ estabelecimentoId }: { estabelecimentoId: string }) {
  const [metricas, setMetricas] = useState<MetricaAgregada[]>([]);
  const [loading, setLoading] = useState(true);
  const [dataInicio, setDataInicio] = useState<Date>(subDays(new Date(), 30));
  const [dataFim, setDataFim] = useState<Date>(new Date());
  const [periodoComparacao, setPeriodoComparacao] = useState('mes_anterior');

  useEffect(() => {
    loadMetricas();
  }, [estabelecimentoId, dataInicio, dataFim]);

  const loadMetricas = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('metricas_agregadas')
        .select('*')
        .eq('estabelecimento_id', estabelecimentoId)
        .eq('periodo_tipo', 'dia')
        .is('fila_id', null)
        .is('atendente_id', null)
        .is('canal', null)
        .gte('data', format(dataInicio, 'yyyy-MM-dd'))
        .lte('data', format(dataFim, 'yyyy-MM-dd'))
        .order('data', { ascending: true });

      if (error) throw error;
      setMetricas(data || []);
    } catch (error: any) {
      console.error('Erro ao carregar métricas:', error);
      toast.error('Erro ao carregar métricas');
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async (formato: 'pdf' | 'excel' | 'csv') => {
    toast.info(`Exportando relatório em ${formato.toUpperCase()}...`);
    // Implementar exportação
  };

  // Calcular métricas consolidadas
  const metricsConsolidadas = metricas.reduce((acc, m) => ({
    totalChats: acc.totalChats + m.total_chats,
    taxaSLA: acc.taxaSLA + (m.taxa_cumprimento_sla || 0),
    taxaFCR: acc.taxaFCR + (m.taxa_fcr || 0),
    tempoMedioPrimeiraResposta: acc.tempoMedioPrimeiraResposta + (m.tempo_medio_primeira_resposta || 0),
    tempoMedioAtendimento: acc.tempoMedioAtendimento + (m.tempo_medio_atendimento || 0),
    avaliacaoMedia: acc.avaliacaoMedia + (m.avaliacao_media || 0),
    npsScore: acc.npsScore + (m.nps_score || 0),
    dias: acc.dias + 1,
  }), {
    totalChats: 0,
    taxaSLA: 0,
    taxaFCR: 0,
    tempoMedioPrimeiraResposta: 0,
    tempoMedioAtendimento: 0,
    avaliacaoMedia: 0,
    npsScore: 0,
    dias: 0,
  });

  const mediaSLA = metricsConsolidadas.dias > 0 ? metricsConsolidadas.taxaSLA / metricsConsolidadas.dias : 0;
  const mediaFCR = metricsConsolidadas.dias > 0 ? metricsConsolidadas.taxaFCR / metricsConsolidadas.dias : 0;
  const mediaAvaliacao = metricsConsolidadas.dias > 0 ? metricsConsolidadas.avaliacaoMedia / metricsConsolidadas.dias : 0;
  const mediaNPS = metricsConsolidadas.dias > 0 ? metricsConsolidadas.npsScore / metricsConsolidadas.dias : 0;

  // Opções do gráfico de volume
  const volumeChartOptions = {
    tooltip: {
      trigger: 'axis',
    },
    legend: {
      data: ['Total de Chats', 'Dentro do SLA', 'Fora do SLA'],
    },
    xAxis: {
      type: 'category',
      data: metricas.map(m => format(new Date(m.data), 'dd/MM')),
    },
    yAxis: {
      type: 'value',
    },
    series: [
      {
        name: 'Total de Chats',
        type: 'line',
        data: metricas.map(m => m.total_chats),
        smooth: true,
      },
      {
        name: 'Dentro do SLA',
        type: 'line',
        data: metricas.map(m => m.chats_dentro_sla),
        smooth: true,
        areaStyle: { opacity: 0.3 },
      },
      {
        name: 'Fora do SLA',
        type: 'line',
        data: metricas.map(m => m.chats_fora_sla),
        smooth: true,
        areaStyle: { opacity: 0.3 },
      },
    ],
  };

  // Opções do gráfico de NPS
  const npsChartOptions = {
    tooltip: {
      trigger: 'axis',
    },
    legend: {
      data: ['Promotores', 'Neutros', 'Detratores', 'Score NPS'],
    },
    xAxis: {
      type: 'category',
      data: metricas.map(m => format(new Date(m.data), 'dd/MM')),
    },
    yAxis: [
      {
        type: 'value',
        name: 'Quantidade',
      },
      {
        type: 'value',
        name: 'Score',
        min: -100,
        max: 100,
      },
    ],
    series: [
      {
        name: 'Promotores',
        type: 'bar',
        stack: 'total',
        data: metricas.map(m => m.nps_promotores || 0),
        itemStyle: { color: '#22c55e' },
      },
      {
        name: 'Neutros',
        type: 'bar',
        stack: 'total',
        data: metricas.map(m => m.nps_neutros || 0),
        itemStyle: { color: '#eab308' },
      },
      {
        name: 'Detratores',
        type: 'bar',
        stack: 'total',
        data: metricas.map(m => m.nps_detratores || 0),
        itemStyle: { color: '#ef4444' },
      },
      {
        name: 'Score NPS',
        type: 'line',
        yAxisIndex: 1,
        data: metricas.map(m => m.nps_score || 0),
        smooth: true,
        lineStyle: { width: 3 },
      },
    ],
  };

  // Opções do gráfico de tempos
  const temposChartOptions = {
    tooltip: {
      trigger: 'axis',
      formatter: (params: any) => {
        let result = params[0].axisValue + '<br/>';
        params.forEach((param: any) => {
          const minutos = Math.floor(param.value / 60);
          result += `${param.marker} ${param.seriesName}: ${minutos}min<br/>`;
        });
        return result;
      },
    },
    legend: {
      data: ['Primeira Resposta', 'Tempo de Atendimento'],
    },
    xAxis: {
      type: 'category',
      data: metricas.map(m => format(new Date(m.data), 'dd/MM')),
    },
    yAxis: {
      type: 'value',
      name: 'Segundos',
    },
    series: [
      {
        name: 'Primeira Resposta',
        type: 'line',
        data: metricas.map(m => m.tempo_medio_primeira_resposta || 0),
        smooth: true,
      },
      {
        name: 'Tempo de Atendimento',
        type: 'line',
        data: metricas.map(m => m.tempo_medio_atendimento || 0),
        smooth: true,
      },
    ],
  };

  return (
    <div className="space-y-6">
      {/* Controles e Filtros */}
      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <CardTitle>Analytics Avançado</CardTitle>
              <CardDescription>
                Análise detalhada de performance e qualidade do atendimento
              </CardDescription>
            </div>
            
            <div className="flex flex-wrap gap-2">
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm">
                    <CalendarIcon className="w-4 h-4 mr-2" />
                    {format(dataInicio, 'dd/MM/yyyy')} - {format(dataFim, 'dd/MM/yyyy')}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="end">
                  <div className="p-4 space-y-4">
                    <div>
                      <Label className="text-sm font-medium">Data Início</Label>
                      <Calendar
                        mode="single"
                        selected={dataInicio}
                        onSelect={(date) => date && setDataInicio(date)}
                        locale={ptBR}
                      />
                    </div>
                    <div>
                      <Label className="text-sm font-medium">Data Fim</Label>
                      <Calendar
                        mode="single"
                        selected={dataFim}
                        onSelect={(date) => date && setDataFim(date)}
                        locale={ptBR}
                      />
                    </div>
                  </div>
                </PopoverContent>
              </Popover>

              <Button variant="outline" size="sm" onClick={() => handleExport('pdf')}>
                <Download className="w-4 h-4 mr-2" />
                Exportar
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Cards de Métricas Principais */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Volume Total</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metricsConsolidadas.totalChats}</div>
            <p className="text-xs text-muted-foreground">Chats no período</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Taxa SLA</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{mediaSLA.toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground">Cumprimento médio</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">FCR</CardTitle>
            <Award className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{mediaFCR.toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground">First Contact Resolution</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">NPS Score</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{Math.round(mediaNPS)}</div>
            <p className="text-xs text-muted-foreground">
              {Math.round(mediaNPS) >= 50 ? 'Excelente' : Math.round(mediaNPS) >= 0 ? 'Bom' : 'Precisa melhorar'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Gráficos */}
      <Tabs defaultValue="volume" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="volume">Volume</TabsTrigger>
          <TabsTrigger value="tempos">Tempos</TabsTrigger>
          <TabsTrigger value="nps">NPS</TabsTrigger>
          <TabsTrigger value="comparacao">Comparação</TabsTrigger>
        </TabsList>

        <TabsContent value="volume" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Volume de Atendimentos e SLA</CardTitle>
              <CardDescription>Evolução diária do volume e cumprimento de SLA</CardDescription>
            </CardHeader>
            <CardContent>
              {metricas.length > 0 ? (
                <ReactECharts option={volumeChartOptions} style={{ height: '400px' }} />
              ) : (
                <div className="h-[400px] flex items-center justify-center text-muted-foreground">
                  Nenhum dado disponível para o período selecionado
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="tempos" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Tempos de Resposta e Atendimento</CardTitle>
              <CardDescription>Análise de tempos médios (AHT - Average Handle Time)</CardDescription>
            </CardHeader>
            <CardContent>
              {metricas.length > 0 ? (
                <ReactECharts option={temposChartOptions} style={{ height: '400px' }} />
              ) : (
                <div className="h-[400px] flex items-center justify-center text-muted-foreground">
                  Nenhum dado disponível para o período selecionado
                </div>
              )}
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Tempo Médio Primeira Resposta</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">
                  {Math.floor((metricsConsolidadas.tempoMedioPrimeiraResposta / metricsConsolidadas.dias) / 60) || 0}min
                </div>
                <p className="text-xs text-muted-foreground mt-1">Média do período</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm">AHT - Average Handle Time</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">
                  {Math.floor((metricsConsolidadas.tempoMedioAtendimento / metricsConsolidadas.dias) / 60) || 0}min
                </div>
                <p className="text-xs text-muted-foreground mt-1">Tempo médio de atendimento</p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="nps" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Net Promoter Score (NPS)</CardTitle>
              <CardDescription>Análise de satisfação do cliente</CardDescription>
            </CardHeader>
            <CardContent>
              {metricas.length > 0 ? (
                <ReactECharts option={npsChartOptions} style={{ height: '400px' }} />
              ) : (
                <div className="h-[400px] flex items-center justify-center text-muted-foreground">
                  Nenhum dado disponível para o período selecionado
                </div>
              )}
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-green-500" />
                  Promotores (9-10)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">
                  {metricas.reduce((acc, m) => acc + (m.nps_promotores || 0), 0)}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-yellow-500" />
                  Neutros (7-8)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">
                  {metricas.reduce((acc, m) => acc + (m.nps_neutros || 0), 0)}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-red-500" />
                  Detratores (0-6)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">
                  {metricas.reduce((acc, m) => acc + (m.nps_detratores || 0), 0)}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="comparacao" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Comparação de Períodos</CardTitle>
              <CardDescription>
                Compare o desempenho atual com períodos anteriores
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <Select value={periodoComparacao} onValueChange={setPeriodoComparacao}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="semana_anterior">Semana Anterior</SelectItem>
                    <SelectItem value="mes_anterior">Mês Anterior</SelectItem>
                    <SelectItem value="trimestre_anterior">Trimestre Anterior</SelectItem>
                    <SelectItem value="ano_anterior">Ano Anterior</SelectItem>
                  </SelectContent>
                </Select>

                <div className="text-center py-12 text-muted-foreground">
                  <BarChart3 className="w-16 h-16 mx-auto mb-4 opacity-50" />
                  <p>Comparação de períodos em desenvolvimento</p>
                  <p className="text-sm mt-2">Em breve: comparações lado a lado com crescimento %</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
