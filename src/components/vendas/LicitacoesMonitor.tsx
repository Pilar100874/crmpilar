import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { supabase } from '@/integrations/supabase/client';
import { 
  Activity, RefreshCw, CheckCircle2, XCircle, Clock, 
  Database, TrendingUp, AlertTriangle, Server, Zap
} from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface LicitacoesMonitorProps {
  estabelecimentoId: string;
}

interface RunLog {
  id: string;
  started_at: string;
  finished_at: string | null;
  status: string;
  source?: string | null;
  items_found: number | null;
  items_inserted: number | null;
  error: string | null;
}

interface FonteStatus {
  fonte: string;
  nome_display: string;
  ativo: boolean;
  ultima_sincronizacao: string | null;
  total_importados: number | null;
  lastRun: RunLog | null;
}

export default function LicitacoesMonitor({ estabelecimentoId }: LicitacoesMonitorProps) {
  const [runs, setRuns] = useState<RunLog[]>([]);
  const [fontes, setFontes] = useState<FonteStatus[]>([]);
  const [stats, setStats] = useState({
    totalOpportunities: 0,
    last24h: 0,
    avgScore: 0,
    successRate: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 30000); // Atualiza a cada 30s
    return () => clearInterval(interval);
  }, [estabelecimentoId]);

  const loadData = async () => {
    try {
      // Carregar últimas execuções
      const { data: runsData } = await supabase
        .from('licitacoes_runs')
        .select('*')
        .eq('estabelecimento_id', estabelecimentoId)
        .order('started_at', { ascending: false })
        .limit(50);
      setRuns(runsData || []);

      // Carregar fontes com status
      const { data: fontesData } = await supabase
        .from('licitacoes_fontes')
        .select('*')
        .eq('estabelecimento_id', estabelecimentoId);

      // Buscar último run de cada fonte
      const fontesWithStatus: FonteStatus[] = [];
      for (const f of (fontesData || [])) {
        const { data: lastRun } = await supabase
          .from('licitacoes_runs')
          .select('id, started_at, finished_at, status, source, items_found, items_inserted, error')
          .eq('estabelecimento_id', estabelecimentoId)
          .eq('source', f.fonte)
          .order('started_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        fontesWithStatus.push({
          fonte: f.fonte,
          nome_display: f.nome_display,
          ativo: f.ativo,
          ultima_sincronizacao: f.ultima_sincronizacao,
          total_importados: f.total_importados,
          lastRun: lastRun as RunLog | null
        });
      }
      setFontes(fontesWithStatus);

      // Estatísticas gerais
      const { count: totalOpps } = await supabase
        .from('licitacoes_opportunities')
        .select('*', { count: 'exact', head: true })
        .eq('estabelecimento_id', estabelecimentoId);

      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const { count: last24h } = await supabase
        .from('licitacoes_opportunities')
        .select('*', { count: 'exact', head: true })
        .eq('estabelecimento_id', estabelecimentoId)
        .gte('created_at', yesterday.toISOString());

      const { data: scoreData } = await supabase
        .from('licitacoes_opportunities')
        .select('score')
        .eq('estabelecimento_id', estabelecimentoId)
        .limit(100);
      
      const avgScore = scoreData && scoreData.length > 0
        ? Math.round(scoreData.reduce((a, b) => a + (b.score || 0), 0) / scoreData.length)
        : 0;

      // Taxa de sucesso das execuções
      const completedRuns = (runsData || []).filter(r => r.status === 'completed').length;
      const totalRuns = (runsData || []).length;
      const successRate = totalRuns > 0 ? Math.round((completedRuns / totalRuns) * 100) : 0;

      setStats({
        totalOpportunities: totalOpps || 0,
        last24h: last24h || 0,
        avgScore,
        successRate
      });

    } catch (err) {
      console.error('Erro ao carregar dados do monitor:', err);
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case 'failed':
      case 'error':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'running':
        return <RefreshCw className="h-4 w-4 text-blue-500 animate-spin" />;
      default:
        return <Clock className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge className="bg-green-500">Sucesso</Badge>;
      case 'failed':
      case 'error':
        return <Badge className="bg-red-500">Erro</Badge>;
      case 'running':
        return <Badge className="bg-blue-500">Executando</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getSourceLabel = (source: string | null) => {
    const labels: Record<string, string> = {
      'pncp': 'PNCP',
      'compras_gov': 'Compras.gov',
      'dados_sp': 'Dados SP',
      'alerta_licitacao': 'Alerta Licitação'
    };
    return source ? labels[source] || source : 'Geral';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Activity className="h-6 w-6 text-primary" />
            Monitor de Serviços
          </h2>
          <p className="text-muted-foreground">
            Acompanhe o status das integrações de licitações em tempo real
          </p>
        </div>
        <Button onClick={loadData} variant="outline" size="sm">
          <RefreshCw className="h-4 w-4 mr-2" />
          Atualizar
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-blue-500/10 to-blue-600/5 border-blue-200">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Oportunidades</p>
                <p className="text-3xl font-bold">{stats.totalOpportunities}</p>
              </div>
              <div className="h-12 w-12 bg-blue-500/20 rounded-full flex items-center justify-center">
                <Database className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-500/10 to-green-600/5 border-green-200">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Últimas 24h</p>
                <p className="text-3xl font-bold">{stats.last24h}</p>
              </div>
              <div className="h-12 w-12 bg-green-500/20 rounded-full flex items-center justify-center">
                <TrendingUp className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-500/10 to-purple-600/5 border-purple-200">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Score Médio</p>
                <p className="text-3xl font-bold">{stats.avgScore}</p>
              </div>
              <div className="h-12 w-12 bg-purple-500/20 rounded-full flex items-center justify-center">
                <Zap className="h-6 w-6 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className={`bg-gradient-to-br ${
          stats.successRate >= 80 ? 'from-green-500/10 to-green-600/5 border-green-200' :
          stats.successRate >= 50 ? 'from-yellow-500/10 to-yellow-600/5 border-yellow-200' :
          'from-red-500/10 to-red-600/5 border-red-200'
        }`}>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Taxa de Sucesso</p>
                <p className="text-3xl font-bold">{stats.successRate}%</p>
              </div>
              <div className={`h-12 w-12 rounded-full flex items-center justify-center ${
                stats.successRate >= 80 ? 'bg-green-500/20' :
                stats.successRate >= 50 ? 'bg-yellow-500/20' :
                'bg-red-500/20'
              }`}>
                {stats.successRate >= 80 ? (
                  <CheckCircle2 className="h-6 w-6 text-green-600" />
                ) : stats.successRate >= 50 ? (
                  <AlertTriangle className="h-6 w-6 text-yellow-600" />
                ) : (
                  <XCircle className="h-6 w-6 text-red-600" />
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Status das Fontes */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Server className="h-5 w-5" />
            Status das Fontes
          </CardTitle>
          <CardDescription>
            Monitoramento em tempo real de cada API de licitações
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {fontes.map((fonte) => (
              <Card key={fonte.fonte} className={`border ${
                fonte.lastRun?.status === 'completed' ? 'border-green-200 bg-green-50/50 dark:bg-green-950/20' :
                fonte.lastRun?.status === 'failed' || fonte.lastRun?.status === 'error' ? 'border-red-200 bg-red-50/50 dark:bg-red-950/20' :
                'border-muted'
              }`}>
                <CardContent className="pt-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium">{fonte.nome_display}</span>
                    {fonte.ativo ? (
                      <Badge variant="outline" className="bg-green-100 text-green-700 border-green-300">
                        Ativo
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="bg-gray-100 text-gray-500">
                        Inativo
                      </Badge>
                    )}
                  </div>
                  
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2">
                      {getStatusIcon(fonte.lastRun?.status || 'unknown')}
                      <span className="text-muted-foreground">
                        {fonte.lastRun?.status === 'completed' ? 'Última execução OK' :
                         fonte.lastRun?.status === 'failed' || fonte.lastRun?.status === 'error' ? 'Última execução com erro' :
                         fonte.lastRun?.status === 'running' ? 'Executando...' :
                         'Sem execuções'}
                      </span>
                    </div>
                    
                    {fonte.ultima_sincronizacao && (
                      <div className="text-xs text-muted-foreground">
                        Última sync: {formatDistanceToNow(new Date(fonte.ultima_sincronizacao), { 
                          addSuffix: true, 
                          locale: ptBR 
                        })}
                      </div>
                    )}
                    
                    {fonte.total_importados !== null && (
                      <div className="text-xs">
                        <span className="font-medium">{fonte.total_importados}</span> itens importados
                      </div>
                    )}

                    {fonte.lastRun?.error && (
                      <div className="text-xs text-red-500 mt-2 p-2 bg-red-100 dark:bg-red-900/30 rounded truncate">
                        {fonte.lastRun.error}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Histórico de Execuções */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Histórico de Execuções
          </CardTitle>
          <CardDescription>
            Últimas 50 execuções do bot de licitações
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[400px]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Status</TableHead>
                  <TableHead>Fonte</TableHead>
                  <TableHead>Início</TableHead>
                  <TableHead>Duração</TableHead>
                  <TableHead className="text-right">Encontrados</TableHead>
                  <TableHead className="text-right">Inseridos</TableHead>
                  <TableHead>Erro</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {runs.map((run) => {
                  const duration = run.finished_at && run.started_at
                    ? Math.round((new Date(run.finished_at).getTime() - new Date(run.started_at).getTime()) / 1000)
                    : null;
                  
                  return (
                    <TableRow key={run.id}>
                      <TableCell>{getStatusBadge(run.status)}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{getSourceLabel(run.source)}</Badge>
                      </TableCell>
                      <TableCell className="text-sm">
                        {format(new Date(run.started_at), "dd/MM HH:mm", { locale: ptBR })}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {duration !== null ? `${duration}s` : '-'}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {run.items_found ?? '-'}
                      </TableCell>
                      <TableCell className="text-right font-medium text-green-600">
                        {run.items_inserted ?? '-'}
                      </TableCell>
                      <TableCell className="max-w-[200px]">
                        {run.error && (
                          <span className="text-xs text-red-500 truncate block" title={run.error}>
                            {run.error}
                          </span>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
                {runs.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                      Nenhuma execução registrada ainda
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}
