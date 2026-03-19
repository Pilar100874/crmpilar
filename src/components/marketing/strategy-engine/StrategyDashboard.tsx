import React from 'react';
import { StrategyProject, AgentExecution, StrategyArtifact, AGENT_INFO, AGENT_ORDER } from './types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { CheckCircle2, XCircle, Clock, Loader2, Brain, FileText, Zap, TrendingUp } from 'lucide-react';

interface Props {
  project: StrategyProject;
  executions: AgentExecution[];
  artifacts: StrategyArtifact[];
  agentOrder?: string[];
  agentInfo?: Record<string, { name: string; icon: string; color: string; description: string }>;
}

export function StrategyDashboard({ project, executions, artifacts, agentOrder, agentInfo }: Props) {
  const resolvedOrder = agentOrder || AGENT_ORDER;
  const resolvedInfo = agentInfo || AGENT_INFO;

  const completedAgents = executions.filter(e => e.status === 'completed').length;
  const failedAgents = executions.filter(e => e.status === 'failed').length;
  const totalAgents = resolvedOrder.length;
  const progress = Math.round((completedAgents / totalAgents) * 100);

  const totalDuration = executions.reduce((sum, e) => sum + (e.duration_ms || 0), 0);
  const avgDuration = completedAgents > 0 ? Math.round(totalDuration / completedAgents / 1000) : 0;

  const statusConfig: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
    draft: { label: 'Rascunho', color: 'text-muted-foreground', icon: <Clock className="h-4 w-4" /> },
    processing: { label: 'Processando', color: 'text-primary', icon: <Loader2 className="h-4 w-4 animate-spin" /> },
    completed: { label: 'Concluído', color: 'text-primary', icon: <CheckCircle2 className="h-4 w-4" /> },
    failed: { label: 'Falhou', color: 'text-destructive', icon: <XCircle className="h-4 w-4" /> },
  };

  const st = statusConfig[project.status] || statusConfig.draft;

  return (
    <div className="space-y-4">
      {/* Status Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
              <Brain className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold">{completedAgents}/{totalAgents}</p>
              <p className="text-xs text-muted-foreground">Agentes Concluídos</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
              <FileText className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold">{artifacts.length}</p>
              <p className="text-xs text-muted-foreground">Artefatos Gerados</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
              <Zap className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold">{avgDuration}s</p>
              <p className="text-xs text-muted-foreground">Tempo Médio/Agente</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className={`h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center ${st.color}`}>
              {st.icon}
            </div>
            <div>
              <p className="text-sm font-bold">{st.label}</p>
              <p className="text-xs text-muted-foreground">Status do Projeto</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Progress */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-medium">Progresso da Estratégia</p>
            <span className="text-sm font-bold text-primary">{progress}%</span>
          </div>
          <Progress value={progress} className="h-2" />
          {failedAgents > 0 && (
            <p className="text-xs text-destructive mt-2">{failedAgents} agente(s) falharam — reexecute na Timeline</p>
          )}
        </CardContent>
      </Card>

      {/* Agent Status Grid */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Status dos Agentes</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 md:grid-cols-5 gap-2">
            {resolvedOrder.map(agentKey => {
              const info = resolvedInfo[agentKey] || { name: agentKey, icon: '🤖', color: '#888', description: '' };
              const exec = executions.find(e => e.agent_type === agentKey);
              const isCompleted = exec?.status === 'completed';
              const isFailed = exec?.status === 'failed';
              const isRunning = exec?.status === 'running';

              return (
                <div
                  key={agentKey}
                  className={`rounded-lg p-2.5 text-center border transition-all ${
                    isCompleted ? 'border-primary/30 bg-primary/5' :
                    isFailed ? 'border-destructive/30 bg-destructive/5' :
                    isRunning ? 'border-primary/50 animate-pulse' :
                    'border-border'
                  }`}
                >
                  <span className="text-lg">{info.icon}</span>
                  <p className="text-[10px] font-medium mt-1 truncate">{info.name.split(' ')[0]}</p>
                  <div className="mt-1">
                    {isCompleted ? <CheckCircle2 className="h-3 w-3 text-primary mx-auto" /> :
                     isFailed ? <XCircle className="h-3 w-3 text-destructive mx-auto" /> :
                     isRunning ? <Loader2 className="h-3 w-3 text-primary mx-auto animate-spin" /> :
                     <Clock className="h-3 w-3 text-muted-foreground mx-auto" />}
                  </div>
                  {exec?.duration_ms && (
                    <p className="text-[9px] text-muted-foreground mt-0.5">{(exec.duration_ms / 1000).toFixed(1)}s</p>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Strategic Memory Summary */}
      {project.strategic_memory && Object.keys(project.strategic_memory).length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Memória Estratégica</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-1.5">
              {Object.keys(project.strategic_memory).map(key => (
                <Badge key={key} variant="secondary" className="text-xs">
                  {resolvedInfo[key]?.icon || '📄'} {resolvedInfo[key]?.name || key}
                </Badge>
              ))}
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              {Object.keys(project.strategic_memory).length} de {totalAgents} análises na memória compartilhada
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}