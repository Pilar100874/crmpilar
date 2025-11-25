import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AlertTriangle, CheckCircle2, Clock, TrendingUp, TrendingDown, Activity } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface SLAMetrics {
  total_chats: number;
  chats_dentro_sla: number;
  chats_fora_sla: number;
  taxa_cumprimento: number;
  violacoes_primeira_resposta: number;
  violacoes_resposta_subsequente: number;
  violacoes_resolucao: number;
  tempo_medio_primeira_resposta: number;
  tempo_medio_resolucao: number;
}

interface SLAViolation {
  id: string;
  conversation_id: string;
  tipo_violacao: string;
  tempo_esperado: number;
  tempo_real: number;
  tempo_excedido: number;
  porcentagem_excedida: number;
  prioridade_chat: string;
  fila_id: string | null;
  atendente_id: string | null;
  alerta_enviado: boolean;
  escalado: boolean;
  resolvido: boolean;
  created_at: string;
  conversations: {
    customer_id: string;
    customers: {
      nome: string;
    };
  };
  filas_atendimento: {
    nome: string;
  } | null;
  atendentes: {
    usuario_id: string;
    usuarios: {
      nome: string;
    };
  } | null;
}

export default function SLADashboard({ estabelecimentoId }: { estabelecimentoId: string }) {
  const [metrics, setMetrics] = useState<SLAMetrics | null>(null);
  const [violations, setViolations] = useState<SLAViolation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadMetrics();
    loadViolations();

    // Configurar listener em tempo real para violações
    const channel = supabase
      .channel('sla_violations_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'sla_violations',
        },
        () => {
          loadMetrics();
          loadViolations();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [estabelecimentoId]);

  const loadMetrics = async () => {
    try {
      // Buscar conversas dos últimos 30 dias
      const dataLimite = new Date();
      dataLimite.setDate(dataLimite.getDate() - 30);

      const { data: conversations, error } = await supabase
        .from('conversations')
        .select('*')
        .eq('estabelecimento_id', estabelecimentoId)
        .gte('created_at', dataLimite.toISOString());

      if (error) throw error;

      const total = conversations?.length || 0;
      const dentroDeSLA = conversations?.filter(c => 
        !c.sla_violacao_primeira_resposta && 
        !c.sla_violacao_resposta_subsequente && 
        !c.sla_violacao_resolucao
      ).length || 0;
      const foraDeSLA = total - dentroDeSLA;

      // Buscar violações
      const { data: violacoesData, error: violacoesError } = await supabase
        .from('sla_violations')
        .select('tipo_violacao')
        .gte('created_at', dataLimite.toISOString());

      if (violacoesError) throw violacoesError;

      const violacoesPrimeiraResposta = violacoesData?.filter(v => v.tipo_violacao === 'primeira_resposta').length || 0;
      const violacoesRespostaSubsequente = violacoesData?.filter(v => v.tipo_violacao === 'resposta_subsequente').length || 0;
      const violacoesResolucao = violacoesData?.filter(v => v.tipo_violacao === 'resolucao').length || 0;

      // Calcular tempos médios
      const temposPrimeiraResposta = conversations?.filter(c => c.sla_tempo_primeira_resposta).map(c => c.sla_tempo_primeira_resposta) || [];
      const temposResolucao = conversations?.filter(c => c.sla_tempo_total_resolucao).map(c => c.sla_tempo_total_resolucao) || [];

      const tempoMedioPrimeiraResposta = temposPrimeiraResposta.length > 0
        ? temposPrimeiraResposta.reduce((a, b) => a + b, 0) / temposPrimeiraResposta.length
        : 0;

      const tempoMedioResolucao = temposResolucao.length > 0
        ? temposResolucao.reduce((a, b) => a + b, 0) / temposResolucao.length
        : 0;

      setMetrics({
        total_chats: total,
        chats_dentro_sla: dentroDeSLA,
        chats_fora_sla: foraDeSLA,
        taxa_cumprimento: total > 0 ? (dentroDeSLA / total) * 100 : 0,
        violacoes_primeira_resposta: violacoesPrimeiraResposta,
        violacoes_resposta_subsequente: violacoesRespostaSubsequente,
        violacoes_resolucao: violacoesResolucao,
        tempo_medio_primeira_resposta: tempoMedioPrimeiraResposta,
        tempo_medio_resolucao: tempoMedioResolucao,
      });
    } catch (error: any) {
      console.error('Erro ao carregar métricas de SLA:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadViolations = async () => {
    try {
      const { data, error } = await supabase
        .from('sla_violations')
        .select(`
          *,
          conversations!inner (
            customer_id,
            customers (nome)
          ),
          filas_atendimento!sla_violations_fila_id_fkey (nome),
          atendentes!sla_violations_atendente_id_fkey (
            usuario_id,
            usuarios (nome)
          )
        `)
        .eq('conversations.estabelecimento_id', estabelecimentoId)
        .eq('resolvido', false)
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;
      setViolations(data as any || []);
    } catch (error: any) {
      console.error('Erro ao carregar violações:', error);
    }
  };

  const formatarTempo = (segundos: number) => {
    const horas = Math.floor(segundos / 3600);
    const minutos = Math.floor((segundos % 3600) / 60);
    if (horas > 0) return `${horas}h ${minutos}min`;
    return `${minutos}min`;
  };

  const getTipoViolacaoLabel = (tipo: string) => {
    const labels: Record<string, string> = {
      primeira_resposta: 'Primeira Resposta',
      resposta_subsequente: 'Resposta Subsequente',
      resolucao: 'Resolução Total',
    };
    return labels[tipo] || tipo;
  };

  if (loading) {
    return <div className="text-center py-8">Carregando...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header com gradiente */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary/10 via-primary/5 to-background p-8 border border-primary/20">
        <div className="absolute inset-0 bg-grid-white/10 [mask-image:linear-gradient(0deg,white,rgba(255,255,255,0.5))]" />
        <div className="relative">
          <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text">
            Dashboard SLA
          </h1>
          <p className="text-muted-foreground mt-1">
            Monitore o cumprimento dos níveis de serviço em tempo real
          </p>
        </div>
      </div>

      {/* Métricas Principais */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="relative overflow-hidden border-primary/20 hover:border-primary/40 transition-all hover:shadow-lg group">
          <div className="absolute inset-0 bg-gradient-to-br from-green-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          <CardHeader className="flex flex-row items-center justify-between pb-2 relative">
            <CardTitle className="text-sm font-medium text-muted-foreground">Taxa de Cumprimento</CardTitle>
            <div className="p-2 rounded-lg bg-green-500/10">
              <Activity className="h-5 w-5 text-green-500" />
            </div>
          </CardHeader>
          <CardContent className="relative">
            <div className="text-3xl font-bold tracking-tight">{metrics?.taxa_cumprimento.toFixed(1)}%</div>
            <Progress value={metrics?.taxa_cumprimento} className="mt-2" />
            <p className="text-sm text-muted-foreground mt-2">
              {metrics?.chats_dentro_sla} de {metrics?.total_chats} chats
            </p>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden border-primary/20 hover:border-primary/40 transition-all hover:shadow-lg group">
          <div className="absolute inset-0 bg-gradient-to-br from-red-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          <CardHeader className="flex flex-row items-center justify-between pb-2 relative">
            <CardTitle className="text-sm font-medium text-muted-foreground">Violações Ativas</CardTitle>
            <div className="p-2 rounded-lg bg-red-500/10">
              <AlertTriangle className="h-5 w-5 text-red-500" />
            </div>
          </CardHeader>
          <CardContent className="relative">
            <div className="text-3xl font-bold tracking-tight">{metrics?.chats_fora_sla}</div>
            <div className="flex items-center gap-2 mt-2">
              {metrics && metrics.chats_fora_sla > metrics.chats_dentro_sla ? (
                <>
                  <TrendingUp className="h-4 w-4 text-red-500" />
                  <span className="text-xs text-red-500">Acima da média</span>
                </>
              ) : (
                <>
                  <TrendingDown className="h-4 w-4 text-green-500" />
                  <span className="text-xs text-green-500">Abaixo da média</span>
                </>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden border-primary/20 hover:border-primary/40 transition-all hover:shadow-lg group">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          <CardHeader className="flex flex-row items-center justify-between pb-2 relative">
            <CardTitle className="text-sm font-medium text-muted-foreground">Tempo Médio 1ª Resposta</CardTitle>
            <div className="p-2 rounded-lg bg-blue-500/10">
              <Clock className="h-5 w-5 text-blue-500" />
            </div>
          </CardHeader>
          <CardContent className="relative">
            <div className="text-3xl font-bold tracking-tight">
              {formatarTempo(metrics?.tempo_medio_primeira_resposta || 0)}
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              Últimos 30 dias
            </p>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden border-primary/20 hover:border-primary/40 transition-all hover:shadow-lg group">
          <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          <CardHeader className="flex flex-row items-center justify-between pb-2 relative">
            <CardTitle className="text-sm font-medium text-muted-foreground">Tempo Médio Resolução</CardTitle>
            <div className="p-2 rounded-lg bg-purple-500/10">
              <CheckCircle2 className="h-5 w-5 text-purple-500" />
            </div>
          </CardHeader>
          <CardContent className="relative">
            <div className="text-3xl font-bold tracking-tight">
              {formatarTempo(metrics?.tempo_medio_resolucao || 0)}
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              Últimos 30 dias
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Violações por Tipo */}
      <Card className="border-primary/20 shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-primary/10">
              <AlertTriangle className="w-5 h-5 text-primary" />
            </div>
            Violações por Tipo
          </CardTitle>
          <CardDescription>Últimos 30 dias</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Primeira Resposta</span>
                <span className="font-medium">{metrics?.violacoes_primeira_resposta}</span>
              </div>
              <Progress 
                value={(metrics?.violacoes_primeira_resposta || 0) / (metrics?.total_chats || 1) * 100} 
                className="h-2"
              />
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Respostas Subsequentes</span>
                <span className="font-medium">{metrics?.violacoes_resposta_subsequente}</span>
              </div>
              <Progress 
                value={(metrics?.violacoes_resposta_subsequente || 0) / (metrics?.total_chats || 1) * 100} 
                className="h-2"
              />
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Resolução Total</span>
                <span className="font-medium">{metrics?.violacoes_resolucao}</span>
              </div>
              <Progress 
                value={(metrics?.violacoes_resolucao || 0) / (metrics?.total_chats || 1) * 100} 
                className="h-2"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Violações Recentes */}
      <Card className="border-primary/20 shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-primary/10">
              <Activity className="w-5 h-5 text-primary" />
            </div>
            Violações Ativas Recentes
          </CardTitle>
          <CardDescription>
            Violações de SLA que ainda não foram resolvidas
          </CardDescription>
        </CardHeader>
        <CardContent>
          {violations.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <CheckCircle2 className="w-12 h-12 mx-auto mb-2 text-green-500" />
              <p>Nenhuma violação ativa no momento!</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Fila</TableHead>
                  <TableHead>Atendente</TableHead>
                  <TableHead>Excedido</TableHead>
                  <TableHead>Tempo</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {violations.map((violation) => (
                  <TableRow key={violation.id}>
                    <TableCell className="font-medium">
                      {violation.conversations?.customers?.nome || 'Cliente não identificado'}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {getTipoViolacaoLabel(violation.tipo_violacao)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {violation.filas_atendimento?.nome || '-'}
                    </TableCell>
                    <TableCell>
                      {violation.atendentes?.usuarios?.nome || '-'}
                    </TableCell>
                    <TableCell>
                      <span className="text-red-600 font-medium">
                        +{violation.porcentagem_excedida.toFixed(0)}%
                      </span>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(violation.created_at), {
                        addSuffix: true,
                        locale: ptBR,
                      })}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        {violation.alerta_enviado && (
                          <Badge variant="secondary" className="text-xs">
                            Alertado
                          </Badge>
                        )}
                        {violation.escalado && (
                          <Badge variant="destructive" className="text-xs">
                            Escalado
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
