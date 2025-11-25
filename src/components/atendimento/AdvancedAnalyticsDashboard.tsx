import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { format, subDays, startOfDay, endOfDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Calendar as CalendarIcon, Download, TrendingUp, Users, Clock, Target, Award, BarChart3, Plus, FileText, HelpCircle } from 'lucide-react';
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
  const [filaFiltro, setFilaFiltro] = useState<string>('todas');
  const [atendenteFiltro, setAtendenteFiltro] = useState<string>('todos');
  const [canalFiltro, setCanalFiltro] = useState<string>('todos');
  const [filas, setFilas] = useState<any[]>([]);
  const [atendentes, setAtendentes] = useState<any[]>([]);
  const [metricasPorAtendente, setMetricasPorAtendente] = useState<any[]>([]);
  const [metricasPorCanal, setMetricasPorCanal] = useState<any[]>([]);
  const [novoRelatorioOpen, setNovoRelatorioOpen] = useState(false);
  const [nomeRelatorio, setNomeRelatorio] = useState('');
  const [tipoRelatorio, setTipoRelatorio] = useState('geral');
  const [metricasSelecionadas, setMetricasSelecionadas] = useState<string[]>([
    'volume', 'sla', 'fcr', 'aht', 'csat', 'nps'
  ]);
  const [helpDialogOpen, setHelpDialogOpen] = useState(false);

  useEffect(() => {
    loadMetricas();
    loadFilas();
    loadAtendentes();
    loadMetricasPorAtendente();
    loadMetricasPorCanal();
  }, [estabelecimentoId, dataInicio, dataFim, filaFiltro, atendenteFiltro, canalFiltro]);

  const loadFilas = async () => {
    try {
      const { data, error } = await supabase
        .from('filas_atendimento')
        .select('id, nome')
        .eq('estabelecimento_id', estabelecimentoId)
        .eq('ativa', true)
        .order('nome');
      
      if (error) throw error;
      setFilas(data || []);
    } catch (error: any) {
      console.error('Erro ao carregar filas:', error);
    }
  };

  const loadAtendentes = async () => {
    try {
      const { data, error } = await supabase
        .from('atendentes')
        .select('id, usuario_id, usuarios!inner(nome)')
        .eq('estabelecimento_id', estabelecimentoId)
        .order('usuarios.nome');
      
      if (error) throw error;
      setAtendentes(data || []);
    } catch (error: any) {
      console.error('Erro ao carregar atendentes:', error);
    }
  };

  const loadMetricas = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('metricas_agregadas')
        .select('*')
        .eq('estabelecimento_id', estabelecimentoId)
        .eq('periodo_tipo', 'dia')
        .gte('data', format(dataInicio, 'yyyy-MM-dd'))
        .lte('data', format(dataFim, 'yyyy-MM-dd'));

      if (filaFiltro !== 'todas') {
        query = query.eq('fila_id', filaFiltro);
      } else {
        query = query.is('fila_id', null);
      }

      if (atendenteFiltro !== 'todos') {
        query = query.eq('atendente_id', atendenteFiltro);
      } else {
        query = query.is('atendente_id', null);
      }

      if (canalFiltro !== 'todos') {
        query = query.eq('canal', canalFiltro);
      } else {
        query = query.is('canal', null);
      }

      query = query.order('data', { ascending: true });

      const { data, error } = await query;

      if (error) throw error;
      setMetricas(data || []);
    } catch (error: any) {
      console.error('Erro ao carregar métricas:', error);
      toast.error('Erro ao carregar métricas');
    } finally {
      setLoading(false);
    }
  };

  const loadMetricasPorAtendente = async () => {
    try {
      const { data, error } = await supabase
        .from('metricas_agregadas')
        .select('*, atendentes!inner(usuario_id, usuarios!inner(nome))')
        .eq('estabelecimento_id', estabelecimentoId)
        .eq('periodo_tipo', 'dia')
        .not('atendente_id', 'is', null)
        .gte('data', format(dataInicio, 'yyyy-MM-dd'))
        .lte('data', format(dataFim, 'yyyy-MM-dd'));

      if (error) throw error;
      
      // Agregar métricas por atendente
      const agregado = (data || []).reduce((acc: any, m: any) => {
        const atendenteId = m.atendente_id;
        if (!acc[atendenteId]) {
          acc[atendenteId] = {
            nome: m.atendentes?.usuarios?.nome || 'Desconhecido',
            total_chats: 0,
            taxa_fcr: 0,
            tempo_medio_atendimento: 0,
            avaliacao_media: 0,
            dias: 0,
          };
        }
        acc[atendenteId].total_chats += m.total_chats || 0;
        acc[atendenteId].taxa_fcr += m.taxa_fcr || 0;
        acc[atendenteId].tempo_medio_atendimento += m.tempo_medio_atendimento || 0;
        acc[atendenteId].avaliacao_media += m.avaliacao_media || 0;
        acc[atendenteId].dias += 1;
        return acc;
      }, {});

      setMetricasPorAtendente(Object.values(agregado));
    } catch (error: any) {
      console.error('Erro ao carregar métricas por atendente:', error);
    }
  };

  const loadMetricasPorCanal = async () => {
    try {
      const { data, error } = await supabase
        .from('metricas_agregadas')
        .select('*')
        .eq('estabelecimento_id', estabelecimentoId)
        .eq('periodo_tipo', 'dia')
        .not('canal', 'is', null)
        .gte('data', format(dataInicio, 'yyyy-MM-dd'))
        .lte('data', format(dataFim, 'yyyy-MM-dd'));

      if (error) throw error;
      
      // Agregar métricas por canal
      const agregado = (data || []).reduce((acc: any, m: any) => {
        const canal = m.canal || 'Desconhecido';
        if (!acc[canal]) {
          acc[canal] = {
            canal,
            total_chats: 0,
            taxa_fcr: 0,
            avaliacao_media: 0,
            dias: 0,
          };
        }
        acc[canal].total_chats += m.total_chats || 0;
        acc[canal].taxa_fcr += m.taxa_fcr || 0;
        acc[canal].avaliacao_media += m.avaliacao_media || 0;
        acc[canal].dias += 1;
        return acc;
      }, {});

      setMetricasPorCanal(Object.values(agregado));
    } catch (error: any) {
      console.error('Erro ao carregar métricas por canal:', error);
    }
  };

  const handleExport = async (formato: 'pdf' | 'excel' | 'csv') => {
    toast.info(`Exportando relatório em ${formato.toUpperCase()}...`);
    // Implementar exportação
  };

  const handleCriarRelatorio = () => {
    if (!nomeRelatorio.trim()) {
      toast.error('Informe um nome para o relatório');
      return;
    }

    toast.success(`Relatório "${nomeRelatorio}" criado com sucesso!`);
    setNovoRelatorioOpen(false);
    setNomeRelatorio('');
    setTipoRelatorio('geral');
    setMetricasSelecionadas(['volume', 'sla', 'fcr', 'aht', 'csat', 'nps']);
  };

  const toggleMetrica = (metrica: string) => {
    setMetricasSelecionadas(prev =>
      prev.includes(metrica)
        ? prev.filter(m => m !== metrica)
        : [...prev, metrica]
    );
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
    <div className="space-y-8 p-6">
      {/* Header com gradiente */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary/10 via-primary/5 to-background p-8 border border-primary/20">
        <div className="absolute inset-0 bg-grid-white/10 [mask-image:linear-gradient(0deg,white,rgba(255,255,255,0.5))]" />
        <div className="relative flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex items-start gap-3">
            <Button 
              variant="ghost" 
              size="icon"
              className="h-8 w-8 rounded-full hover:bg-primary/20 transition-colors"
              onClick={() => setHelpDialogOpen(true)}
            >
              <HelpCircle className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text">
                Analytics Avançado
              </h1>
              <p className="text-muted-foreground mt-1">
                Análise detalhada de performance e qualidade do atendimento
              </p>
            </div>
          </div>
            
          <div className="flex flex-wrap gap-3">
            <Dialog open={novoRelatorioOpen} onOpenChange={setNovoRelatorioOpen}>
              <DialogTrigger asChild>
                <Button className="bg-primary hover:bg-primary/90 shadow-lg shadow-primary/25 transition-all hover:shadow-xl hover:shadow-primary/30">
                  <Plus className="w-4 h-4 mr-2" />
                  Novo Relatório
                </Button>
              </DialogTrigger>
                <DialogContent className="max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>Criar Relatório Customizado</DialogTitle>
                    <DialogDescription>
                      Configure um relatório personalizado com as métricas desejadas
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="nome">Nome do Relatório</Label>
                      <Input
                        id="nome"
                        value={nomeRelatorio}
                        onChange={(e) => setNomeRelatorio(e.target.value)}
                        placeholder="Ex: Relatório Mensal de Performance"
                      />
                    </div>
                    <div>
                      <Label htmlFor="tipo">Tipo</Label>
                      <Select value={tipoRelatorio} onValueChange={setTipoRelatorio}>
                        <SelectTrigger id="tipo">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="geral">Geral</SelectItem>
                          <SelectItem value="atendente">Por Atendente</SelectItem>
                          <SelectItem value="fila">Por Fila</SelectItem>
                          <SelectItem value="canal">Por Canal</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Métricas</Label>
                      <div className="grid grid-cols-2 gap-3 mt-2">
                        {[
                          { id: 'volume', label: 'Volume Total' },
                          { id: 'sla', label: 'Taxa SLA' },
                          { id: 'fcr', label: 'FCR (First Contact Resolution)' },
                          { id: 'aht', label: 'AHT (Average Handle Time)' },
                          { id: 'csat', label: 'CSAT (Customer Satisfaction)' },
                          { id: 'nps', label: 'NPS (Net Promoter Score)' },
                        ].map((metrica) => (
                          <div key={metrica.id} className="flex items-center space-x-2">
                            <Checkbox
                              id={metrica.id}
                              checked={metricasSelecionadas.includes(metrica.id)}
                              onCheckedChange={() => toggleMetrica(metrica.id)}
                            />
                            <label
                              htmlFor={metrica.id}
                              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                            >
                              {metrica.label}
                            </label>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="flex justify-end gap-2">
                      <Button variant="outline" onClick={() => setNovoRelatorioOpen(false)}>
                        Cancelar
                      </Button>
                      <Button onClick={handleCriarRelatorio}>
                        Criar Relatório
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>

            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="border-primary/20 hover:border-primary/40 hover:bg-primary/5">
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

            <Button 
              variant="outline" 
              className="border-primary/20 hover:border-primary/40 hover:bg-primary/5"
              onClick={() => handleExport('pdf')}
            >
              <Download className="w-4 h-4 mr-2" />
              Exportar
            </Button>
          </div>
        </div>
      </div>

      {/* Dialog de Ajuda */}
      <Dialog open={helpDialogOpen} onOpenChange={setHelpDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Como usar o Analytics Avançado</DialogTitle>
            <DialogDescription>
              Guia completo de métricas e funcionalidades
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-6">
            <div>
              <h3 className="font-semibold text-lg mb-2">📊 Métricas Disponíveis</h3>
              <div className="space-y-4">
                <div>
                  <h4 className="font-semibold">FCR (First Contact Resolution)</h4>
                  <p className="text-sm text-muted-foreground">Taxa de resolução no primeiro contato</p>
                  <p className="text-sm mt-1">
                    <strong>Como calcular:</strong> (Chats resolvidos na primeira interação / Total de chats) × 100
                  </p>
                  <p className="text-sm mt-1">
                    <strong>Uso:</strong> Medir eficiência do atendimento
                  </p>
                </div>
                <div>
                  <h4 className="font-semibold">AHT (Average Handle Time)</h4>
                  <p className="text-sm text-muted-foreground">Tempo médio de atendimento</p>
                  <p className="text-sm mt-1">
                    <strong>Como calcular:</strong> Soma total de tempo de atendimento / Número de atendimentos
                  </p>
                  <p className="text-sm mt-1">
                    <strong>Uso:</strong> Otimizar alocação de recursos
                  </p>
                </div>
                <div>
                  <h4 className="font-semibold">CSAT (Customer Satisfaction)</h4>
                  <p className="text-sm text-muted-foreground">Satisfação do cliente</p>
                  <p className="text-sm mt-1">
                    <strong>Como calcular:</strong> Média das avaliações recebidas
                  </p>
                  <p className="text-sm mt-1">
                    <strong>Uso:</strong> Medir qualidade do atendimento
                  </p>
                </div>
                <div>
                  <h4 className="font-semibold">NPS (Net Promoter Score)</h4>
                  <p className="text-sm text-muted-foreground">Probabilidade de recomendação</p>
                  <p className="text-sm mt-1">
                    <strong>Como calcular:</strong> % Promotores - % Detratores
                  </p>
                  <p className="text-sm mt-1">
                    <strong>Uso:</strong> Medir lealdade do cliente
                  </p>
                </div>
              </div>
            </div>

            <div>
              <h3 className="font-semibold text-lg mb-2">📈 Dashboards Disponíveis</h3>
              <div className="space-y-3">
                <div>
                  <h4 className="font-semibold">Dashboard Principal</h4>
                  <p className="text-sm text-muted-foreground">
                    Visão geral de todas as métricas com gráficos de tendência e comparativos
                  </p>
                </div>
                <div>
                  <h4 className="font-semibold">Dashboard por Atendente</h4>
                  <p className="text-sm text-muted-foreground">
                    Performance individual, ranking de atendentes e metas vs. realizado
                  </p>
                </div>
                <div>
                  <h4 className="font-semibold">Dashboard por Canal</h4>
                  <p className="text-sm text-muted-foreground">
                    Distribuição de volume, métricas por canal (WhatsApp, WebChat, etc.) e comparativo de satisfação
                  </p>
                </div>
              </div>
            </div>

            <div>
              <h3 className="font-semibold text-lg mb-2">🔄 Agregação Automática</h3>
              <p className="text-sm text-muted-foreground">
                As métricas são agregadas automaticamente de forma diária através de uma Edge Function que:
              </p>
              <ul className="list-disc list-inside text-sm text-muted-foreground mt-2 space-y-1">
                <li>Executa diariamente às 00:00</li>
                <li>Calcula métricas do dia anterior</li>
                <li>Armazena na tabela metricas_agregadas</li>
              </ul>
            </div>

            <div>
              <h3 className="font-semibold text-lg mb-2">📝 Criar Relatório Customizado</h3>
              <ol className="list-decimal list-inside text-sm text-muted-foreground space-y-1">
                <li>Clique em "Novo Relatório"</li>
                <li>Configure nome, tipo, e período desejado</li>
                <li>Selecione filtros (fila, atendente, canal)</li>
                <li>Escolha quais métricas incluir</li>
                <li>Clique em "Criar Relatório"</li>
              </ol>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Cards de Métricas Principais com visual aprimorado */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="relative overflow-hidden border-primary/20 hover:border-primary/40 transition-all hover:shadow-lg group">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          <CardHeader className="flex flex-row items-center justify-between pb-2 relative">
            <CardTitle className="text-sm font-medium text-muted-foreground">Volume Total</CardTitle>
            <div className="p-2 rounded-lg bg-blue-500/10">
              <Users className="h-5 w-5 text-blue-500" />
            </div>
          </CardHeader>
          <CardContent className="relative">
            <div className="text-3xl font-bold tracking-tight">{metricsConsolidadas.totalChats}</div>
            <p className="text-sm text-muted-foreground mt-1">Chats no período</p>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden border-primary/20 hover:border-primary/40 transition-all hover:shadow-lg group">
          <div className="absolute inset-0 bg-gradient-to-br from-green-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          <CardHeader className="flex flex-row items-center justify-between pb-2 relative">
            <CardTitle className="text-sm font-medium text-muted-foreground">Taxa SLA</CardTitle>
            <div className="p-2 rounded-lg bg-green-500/10">
              <Target className="h-5 w-5 text-green-500" />
            </div>
          </CardHeader>
          <CardContent className="relative">
            <div className="text-3xl font-bold tracking-tight">{mediaSLA.toFixed(1)}%</div>
            <p className="text-sm text-muted-foreground mt-1">Cumprimento médio</p>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden border-primary/20 hover:border-primary/40 transition-all hover:shadow-lg group">
          <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          <CardHeader className="flex flex-row items-center justify-between pb-2 relative">
            <CardTitle className="text-sm font-medium text-muted-foreground">FCR</CardTitle>
            <div className="p-2 rounded-lg bg-purple-500/10">
              <Award className="h-5 w-5 text-purple-500" />
            </div>
          </CardHeader>
          <CardContent className="relative">
            <div className="text-3xl font-bold tracking-tight">{mediaFCR.toFixed(1)}%</div>
            <p className="text-sm text-muted-foreground mt-1">First Contact Resolution</p>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden border-primary/20 hover:border-primary/40 transition-all hover:shadow-lg group">
          <div className="absolute inset-0 bg-gradient-to-br from-orange-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          <CardHeader className="flex flex-row items-center justify-between pb-2 relative">
            <CardTitle className="text-sm font-medium text-muted-foreground">NPS Score</CardTitle>
            <div className="p-2 rounded-lg bg-orange-500/10">
              <TrendingUp className="h-5 w-5 text-orange-500" />
            </div>
          </CardHeader>
          <CardContent className="relative">
            <div className="text-3xl font-bold tracking-tight">{Math.round(mediaNPS)}</div>
            <p className="text-sm text-muted-foreground mt-1">
              {Math.round(mediaNPS) >= 50 ? '🎯 Excelente' : Math.round(mediaNPS) >= 0 ? '✅ Bom' : '⚠️ Precisa melhorar'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filtros com design aprimorado */}
      <Card className="border-primary/20">
        <CardHeader>
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-primary" />
            Filtros Avançados
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <Label>Fila</Label>
              <Select value={filaFiltro} onValueChange={setFilaFiltro}>
                <SelectTrigger>
                  <SelectValue placeholder="Todas as filas" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todas">Todas as filas</SelectItem>
                  {filas.map((fila) => (
                    <SelectItem key={fila.id} value={fila.id}>
                      {fila.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Atendente</Label>
              <Select value={atendenteFiltro} onValueChange={setAtendenteFiltro}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos os atendentes" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos os atendentes</SelectItem>
                  {atendentes.map((atendente: any) => (
                    <SelectItem key={atendente.id} value={atendente.id}>
                      {atendente.usuarios?.nome || 'Sem nome'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Canal</Label>
              <Select value={canalFiltro} onValueChange={setCanalFiltro}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos os canais" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos os canais</SelectItem>
                  <SelectItem value="whatsapp">WhatsApp</SelectItem>
                  <SelectItem value="webchat">WebChat</SelectItem>
                  <SelectItem value="telegram">Telegram</SelectItem>
                  <SelectItem value="email">Email</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Gráficos com design melhorado */}
      <Tabs defaultValue="principal" className="space-y-6">
        <div className="overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-border/50 scrollbar-track-transparent">
          <TabsList className="inline-flex w-auto bg-card/50 backdrop-blur-sm border border-border/40 rounded-xl p-1.5 shadow-md">
            <TabsTrigger 
              value="principal" 
              className="data-[state=active]:bg-gradient-to-br data-[state=active]:from-primary/20 data-[state=active]:to-primary/10 data-[state=active]:text-primary data-[state=active]:shadow-sm transition-all duration-200 rounded-lg px-4 py-2.5 text-sm font-medium whitespace-nowrap gap-2 inline-flex items-center"
            >
              <BarChart3 className="h-4 w-4" />
              Principal
            </TabsTrigger>
            <TabsTrigger 
              value="volume" 
              className="data-[state=active]:bg-gradient-to-br data-[state=active]:from-primary/20 data-[state=active]:to-primary/10 data-[state=active]:text-primary data-[state=active]:shadow-sm transition-all duration-200 rounded-lg px-4 py-2.5 text-sm font-medium whitespace-nowrap gap-2 inline-flex items-center"
            >
              <TrendingUp className="h-4 w-4" />
              Volume
            </TabsTrigger>
            <TabsTrigger 
              value="tempos" 
              className="data-[state=active]:bg-gradient-to-br data-[state=active]:from-primary/20 data-[state=active]:to-primary/10 data-[state=active]:text-primary data-[state=active]:shadow-sm transition-all duration-200 rounded-lg px-4 py-2.5 text-sm font-medium whitespace-nowrap gap-2 inline-flex items-center"
            >
              <Clock className="h-4 w-4" />
              Tempos
            </TabsTrigger>
            <TabsTrigger 
              value="nps" 
              className="data-[state=active]:bg-gradient-to-br data-[state=active]:from-primary/20 data-[state=active]:to-primary/10 data-[state=active]:text-primary data-[state=active]:shadow-sm transition-all duration-200 rounded-lg px-4 py-2.5 text-sm font-medium whitespace-nowrap gap-2 inline-flex items-center"
            >
              <Award className="h-4 w-4" />
              NPS/CSAT
            </TabsTrigger>
            <TabsTrigger 
              value="atendente" 
              className="data-[state=active]:bg-gradient-to-br data-[state=active]:from-primary/20 data-[state=active]:to-primary/10 data-[state=active]:text-primary data-[state=active]:shadow-sm transition-all duration-200 rounded-lg px-4 py-2.5 text-sm font-medium whitespace-nowrap gap-2 inline-flex items-center"
            >
              <Users className="h-4 w-4" />
              Por Atendente
            </TabsTrigger>
            <TabsTrigger 
              value="canal" 
              className="data-[state=active]:bg-gradient-to-br data-[state=active]:from-primary/20 data-[state=active]:to-primary/10 data-[state=active]:text-primary data-[state=active]:shadow-sm transition-all duration-200 rounded-lg px-4 py-2.5 text-sm font-medium whitespace-nowrap gap-2 inline-flex items-center"
            >
              <Target className="h-4 w-4" />
              Por Canal
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="principal" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="border-primary/20 shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <BarChart3 className="w-5 h-5 text-primary" />
                  </div>
                  Visão Geral - Volume
                </CardTitle>
              </CardHeader>
              <CardContent>
                {metricas.length > 0 ? (
                  <ReactECharts option={volumeChartOptions} style={{ height: '300px' }} />
                ) : (
                  <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                    Nenhum dado disponível
                  </div>
                )}
              </CardContent>
            </Card>
            <Card className="border-primary/20 shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <TrendingUp className="w-5 h-5 text-primary" />
                  </div>
                  NPS Score
                </CardTitle>
              </CardHeader>
              <CardContent>
                {metricas.length > 0 ? (
                  <ReactECharts option={npsChartOptions} style={{ height: '300px' }} />
                ) : (
                  <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                    Nenhum dado disponível
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="volume" className="space-y-6">
          <Card className="border-primary/20 shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-xl">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Users className="w-5 h-5 text-primary" />
                </div>
                Volume de Atendimentos e SLA
              </CardTitle>
              <CardDescription className="mt-2">Evolução diária do volume e cumprimento de SLA</CardDescription>
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

        <TabsContent value="tempos" className="space-y-6">
          <Card className="border-primary/20 shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-xl">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Clock className="w-5 h-5 text-primary" />
                </div>
                Tempos de Resposta e Atendimento
              </CardTitle>
              <CardDescription className="mt-2">Análise de tempos médios (AHT - Average Handle Time)</CardDescription>
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

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="relative overflow-hidden border-primary/20 hover:shadow-lg transition-all group">
              <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              <CardHeader className="relative">
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <Clock className="w-4 h-4 text-blue-500" />
                  Tempo Médio Primeira Resposta
                </CardTitle>
              </CardHeader>
              <CardContent className="relative">
                <div className="text-4xl font-bold tracking-tight">
                  {Math.floor((metricsConsolidadas.tempoMedioPrimeiraResposta / metricsConsolidadas.dias) / 60) || 0}min
                </div>
                <p className="text-sm text-muted-foreground mt-2">Média do período</p>
              </CardContent>
            </Card>

            <Card className="relative overflow-hidden border-primary/20 hover:shadow-lg transition-all group">
              <div className="absolute inset-0 bg-gradient-to-br from-green-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              <CardHeader className="relative">
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <Target className="w-4 h-4 text-green-500" />
                  AHT - Average Handle Time
                </CardTitle>
              </CardHeader>
              <CardContent className="relative">
                <div className="text-4xl font-bold tracking-tight">
                  {Math.floor((metricsConsolidadas.tempoMedioAtendimento / metricsConsolidadas.dias) / 60) || 0}min
                </div>
                <p className="text-sm text-muted-foreground mt-2">Tempo médio de atendimento</p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="nps" className="space-y-6">
          <Card className="border-primary/20 shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-xl">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Award className="w-5 h-5 text-primary" />
                </div>
                Net Promoter Score (NPS)
              </CardTitle>
              <CardDescription className="mt-2">Análise de satisfação do cliente</CardDescription>
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

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="relative overflow-hidden border-green-500/30 hover:shadow-lg hover:shadow-green-500/10 transition-all group">
              <div className="absolute inset-0 bg-gradient-to-br from-green-500/10 to-transparent" />
              <CardHeader className="relative">
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <div className="w-4 h-4 rounded-full bg-green-500 shadow-lg shadow-green-500/50" />
                  Promotores (9-10)
                </CardTitle>
              </CardHeader>
              <CardContent className="relative">
                <div className="text-4xl font-bold tracking-tight text-green-600 dark:text-green-400">
                  {metricas.reduce((acc, m) => acc + (m.nps_promotores || 0), 0)}
                </div>
                <p className="text-sm text-muted-foreground mt-2">Clientes leais</p>
              </CardContent>
            </Card>

            <Card className="relative overflow-hidden border-yellow-500/30 hover:shadow-lg hover:shadow-yellow-500/10 transition-all group">
              <div className="absolute inset-0 bg-gradient-to-br from-yellow-500/10 to-transparent" />
              <CardHeader className="relative">
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <div className="w-4 h-4 rounded-full bg-yellow-500 shadow-lg shadow-yellow-500/50" />
                  Neutros (7-8)
                </CardTitle>
              </CardHeader>
              <CardContent className="relative">
                <div className="text-4xl font-bold tracking-tight text-yellow-600 dark:text-yellow-400">
                  {metricas.reduce((acc, m) => acc + (m.nps_neutros || 0), 0)}
                </div>
                <p className="text-sm text-muted-foreground mt-2">Clientes passivos</p>
              </CardContent>
            </Card>

            <Card className="relative overflow-hidden border-red-500/30 hover:shadow-lg hover:shadow-red-500/10 transition-all group">
              <div className="absolute inset-0 bg-gradient-to-br from-red-500/10 to-transparent" />
              <CardHeader className="relative">
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <div className="w-4 h-4 rounded-full bg-red-500 shadow-lg shadow-red-500/50" />
                  Detratores (0-6)
                </CardTitle>
              </CardHeader>
              <CardContent className="relative">
                <div className="text-4xl font-bold tracking-tight text-red-600 dark:text-red-400">
                  {metricas.reduce((acc, m) => acc + (m.nps_detratores || 0), 0)}
                </div>
                <p className="text-sm text-muted-foreground mt-2">Requer atenção</p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="atendente" className="space-y-6">
          <Card className="border-primary/20 shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-xl">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Users className="w-5 h-5 text-primary" />
                </div>
                Performance por Atendente
              </CardTitle>
              <CardDescription className="mt-2">Ranking e métricas individuais dos atendentes</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {metricasPorAtendente.length > 0 ? (
                  <div className="space-y-2">
                    {metricasPorAtendente.map((atendente: any, index: number) => (
                      <div
                        key={index}
                        className="flex items-center justify-between p-5 border border-primary/20 rounded-xl hover:shadow-md hover:border-primary/40 transition-all bg-gradient-to-r from-transparent to-primary/5"
                      >
                        <div className="flex items-center gap-4">
                          <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground font-bold">
                            {index + 1}
                          </div>
                          <div>
                            <div className="font-semibold">{atendente.nome}</div>
                            <div className="text-sm text-muted-foreground">
                              {atendente.total_chats} chats atendidos
                            </div>
                          </div>
                        </div>
                        <div className="flex gap-6 text-sm">
                          <div className="text-center">
                            <div className="font-bold">
                              {((atendente.taxa_fcr / atendente.dias) || 0).toFixed(1)}%
                            </div>
                            <div className="text-muted-foreground">FCR</div>
                          </div>
                          <div className="text-center">
                            <div className="font-bold">
                              {Math.floor((atendente.tempo_medio_atendimento / atendente.dias) / 60) || 0}min
                            </div>
                            <div className="text-muted-foreground">AHT</div>
                          </div>
                          <div className="text-center">
                            <div className="font-bold">
                              {((atendente.avaliacao_media / atendente.dias) || 0).toFixed(1)}
                            </div>
                            <div className="text-muted-foreground">Avaliação</div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12 text-muted-foreground">
                    <Users className="w-16 h-16 mx-auto mb-4 opacity-50" />
                    <p>Nenhum dado de atendente disponível</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="canal" className="space-y-6">
          <Card className="border-primary/20 shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-xl">
                <div className="p-2 rounded-lg bg-primary/10">
                  <BarChart3 className="w-5 h-5 text-primary" />
                </div>
                Distribuição por Canal
              </CardTitle>
              <CardDescription className="mt-2">Métricas e comparativos entre canais de atendimento</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {metricasPorCanal.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {metricasPorCanal.map((canal: any, index: number) => (
                      <Card key={index} className="border-primary/20 hover:shadow-lg transition-all hover:border-primary/40">
                        <CardHeader className="bg-gradient-to-r from-primary/5 to-transparent">
                          <CardTitle className="text-lg capitalize font-semibold">{canal.canal}</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4 pt-6">
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Volume</span>
                            <span className="font-bold">{canal.total_chats}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">FCR</span>
                            <span className="font-bold">
                              {((canal.taxa_fcr / canal.dias) || 0).toFixed(1)}%
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Satisfação</span>
                            <span className="font-bold">
                              {((canal.avaliacao_media / canal.dias) || 0).toFixed(1)}
                            </span>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12 text-muted-foreground">
                    <BarChart3 className="w-16 h-16 mx-auto mb-4 opacity-50" />
                    <p>Nenhum dado de canal disponível</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
