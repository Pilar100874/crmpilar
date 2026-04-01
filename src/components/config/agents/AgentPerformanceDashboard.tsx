import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { ChatAgent } from '@/hooks/useChatAgents';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { BarChart3, TrendingUp, Users, Clock, AlertTriangle, CheckCircle, MessageSquare, Bot, ArrowUpRight, ArrowDownRight } from 'lucide-react';

interface Props {
  estabelecimentoId: string;
  agents: ChatAgent[];
}

interface DecisionLog {
  id: string;
  intencao_detectada: string | null;
  agentes_acionados: string[];
  decisao: string | null;
  confianca: number;
  escalonado_humano: boolean;
  motivo_escalonamento: string | null;
  created_at: string;
}

interface EscalationEvent {
  id: string;
  motivo: string;
  categoria: string;
  severidade: string;
  resolvido: boolean;
  created_at: string;
}

export default function AgentPerformanceDashboard({ estabelecimentoId, agents }: Props) {
  const [decisionLogs, setDecisionLogs] = useState<DecisionLog[]>([]);
  const [escalations, setEscalations] = useState<EscalationEvent[]>([]);
  const [sessionCount, setSessionCount] = useState(0);
  const [messageCount, setMessageCount] = useState(0);

  const fetchData = useCallback(async () => {
    const [logs, esc, sessions, msgs] = await Promise.all([
      supabase.from('agent_decision_logs').select('*').eq('estabelecimento_id', estabelecimentoId).order('created_at', { ascending: false }).limit(50),
      supabase.from('agent_escalation_events').select('*').eq('estabelecimento_id', estabelecimentoId).order('created_at', { ascending: false }).limit(50),
      supabase.from('agent_chat_sessions').select('id', { count: 'exact' }).eq('estabelecimento_id', estabelecimentoId),
      supabase.from('agent_chat_messages').select('id', { count: 'exact' }),
    ]);
    setDecisionLogs((logs.data || []) as DecisionLog[]);
    setEscalations((esc.data || []) as EscalationEvent[]);
    setSessionCount(sessions.count || 0);
    setMessageCount(msgs.count || 0);
  }, [estabelecimentoId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const totalDecisions = decisionLogs.length;
  const escalatedCount = decisionLogs.filter(d => d.escalonado_humano).length;
  const resolvedWithoutHuman = totalDecisions - escalatedCount;
  const avgConfidence = totalDecisions > 0 ? (decisionLogs.reduce((s, d) => s + (d.confianca || 0), 0) / totalDecisions).toFixed(1) : '0';
  const resolvedEscalations = escalations.filter(e => e.resolvido).length;
  const pendingEscalations = escalations.filter(e => !e.resolvido).length;

  // Count by agent
  const agentUsage: Record<string, number> = {};
  decisionLogs.forEach(d => {
    (d.agentes_acionados || []).forEach(name => {
      agentUsage[name] = (agentUsage[name] || 0) + 1;
    });
  });

  // Count by intent
  const intentCount: Record<string, number> = {};
  decisionLogs.forEach(d => {
    if (d.intencao_detectada) {
      intentCount[d.intencao_detectada] = (intentCount[d.intencao_detectada] || 0) + 1;
    }
  });

  const kpis = [
    { label: 'Total Sessões', value: sessionCount, icon: Users, color: 'text-blue-500' },
    { label: 'Total Mensagens', value: messageCount, icon: MessageSquare, color: 'text-green-500' },
    { label: 'Agentes Ativos', value: agents.filter(a => a.ativo).length, icon: Bot, color: 'text-purple-500' },
    { label: 'Decisões Registradas', value: totalDecisions, icon: BarChart3, color: 'text-orange-500' },
    { label: 'Resolução s/ Humano', value: totalDecisions > 0 ? `${((resolvedWithoutHuman / totalDecisions) * 100).toFixed(0)}%` : 'N/A', icon: CheckCircle, color: 'text-emerald-500' },
    { label: 'Taxa Escalonamento', value: totalDecisions > 0 ? `${((escalatedCount / totalDecisions) * 100).toFixed(0)}%` : 'N/A', icon: AlertTriangle, color: 'text-red-500' },
    { label: 'Confiança Média', value: `${avgConfidence}%`, icon: TrendingUp, color: 'text-indigo-500' },
    { label: 'Escalonamentos Pendentes', value: pendingEscalations, icon: Clock, color: 'text-amber-500' },
  ];

  return (
    <div className="space-y-6">
      {/* KPIs */}
      <div className="grid gap-3 grid-cols-2 md:grid-cols-4">
        {kpis.map((kpi, i) => (
          <Card key={i}>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <kpi.icon className={`h-8 w-8 ${kpi.color}`} />
                <div>
                  <p className="text-2xl font-bold">{kpi.value}</p>
                  <p className="text-xs text-muted-foreground">{kpi.label}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {/* Usage by agent */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Acionamentos por Agente</CardTitle>
          </CardHeader>
          <CardContent>
            {Object.keys(agentUsage).length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-4">Nenhum dado ainda</p>
            ) : (
              <div className="space-y-2">
                {Object.entries(agentUsage).sort((a, b) => b[1] - a[1]).map(([name, count]) => {
                  const agent = agents.find(a => a.nome === name);
                  const max = Math.max(...Object.values(agentUsage));
                  return (
                    <div key={name} className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className="flex items-center gap-1">{agent?.icone || '🤖'} {name}</span>
                        <span className="font-medium">{count}</span>
                      </div>
                      <div className="h-2 bg-muted rounded-full overflow-hidden">
                        <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${(count / max) * 100}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Intents distribution */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Intenções Detectadas</CardTitle>
          </CardHeader>
          <CardContent>
            {Object.keys(intentCount).length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-4">Nenhum dado ainda</p>
            ) : (
              <div className="space-y-2">
                {Object.entries(intentCount).sort((a, b) => b[1] - a[1]).map(([intent, count]) => (
                  <div key={intent} className="flex justify-between items-center text-xs">
                    <Badge variant="outline" className="text-xs">{intent}</Badge>
                    <span className="font-medium">{count}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent logs */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Últimas Decisões do Orquestrador</CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-64">
              {decisionLogs.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-4">Nenhuma decisão registrada</p>
              ) : (
                <div className="space-y-3">
                  {decisionLogs.slice(0, 20).map(log => (
                    <div key={log.id} className="border-b pb-2 last:border-0">
                      <div className="flex items-center gap-2 text-xs">
                        <Badge variant={log.escalonado_humano ? 'destructive' : 'default'} className="text-xs">
                          {log.escalonado_humano ? '↗ Escalonado' : '✓ Resolvido'}
                        </Badge>
                        {log.intencao_detectada && <Badge variant="outline" className="text-xs">{log.intencao_detectada}</Badge>}
                        <span className="text-muted-foreground ml-auto">{new Date(log.created_at).toLocaleString('pt-BR')}</span>
                      </div>
                      {log.decisao && <p className="text-xs mt-1 line-clamp-2">{log.decisao}</p>}
                      {(log.agentes_acionados || []).length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1">
                          {log.agentes_acionados.map((a, i) => <Badge key={i} variant="secondary" className="text-xs">{a}</Badge>)}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Escalonamentos Recentes</CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-64">
              {escalations.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-4">Nenhum escalonamento registrado</p>
              ) : (
                <div className="space-y-3">
                  {escalations.slice(0, 20).map(esc => (
                    <div key={esc.id} className="border-b pb-2 last:border-0">
                      <div className="flex items-center gap-2 text-xs">
                        <Badge variant={esc.resolvido ? 'default' : 'destructive'} className="text-xs">
                          {esc.resolvido ? '✓ Resolvido' : '⏳ Pendente'}
                        </Badge>
                        <Badge variant="outline" className="text-xs">{esc.categoria}</Badge>
                        <Badge variant="outline" className={`text-xs ${esc.severidade === 'critica' ? 'border-red-500 text-red-500' : esc.severidade === 'alta' ? 'border-orange-500 text-orange-500' : ''}`}>
                          {esc.severidade}
                        </Badge>
                        <span className="text-muted-foreground ml-auto">{new Date(esc.created_at).toLocaleString('pt-BR')}</span>
                      </div>
                      <p className="text-xs mt-1">{esc.motivo}</p>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
