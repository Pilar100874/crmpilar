import React from 'react';
import { AgentExecution, AGENT_INFO, AGENT_ORDER } from './types';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Play, Loader2, CheckCircle2, XCircle, Clock, PlayCircle, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Props {
  executions: AgentExecution[];
  onExecuteAgent: (agentType: string) => void;
  onExecuteAll: () => void;
  runningAgents: Set<string>;
  isPipelineRunning: boolean;
}

export function StrategyTimeline({ executions, onExecuteAgent, onExecuteAll, runningAgents, isPipelineRunning }: Props) {
  const executionMap = new Map<string, AgentExecution>();
  executions.forEach(e => {
    const existing = executionMap.get(e.agent_type);
    if (!existing || new Date(e.created_at) > new Date(existing.created_at)) {
      executionMap.set(e.agent_type, e);
    }
  });

  const hasAnyRunning = runningAgents.size > 0;
  const allCompleted = AGENT_ORDER.every(k => executionMap.get(k)?.status === 'completed');

  return (
    <div className="space-y-3">
      {/* Execute All Button */}
      <div className="flex items-center gap-2">
        <Button
          onClick={onExecuteAll}
          disabled={isPipelineRunning}
          size="sm"
          className="w-full"
          variant={allCompleted ? 'outline' : 'default'}
        >
          {hasAnyRunning ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Zap className="h-4 w-4 mr-2" />
          )}
          {hasAnyRunning
            ? `Executando ${runningAgents.size} agente(s)...`
            : allCompleted
              ? 'Reexecutar Todos'
              : 'Executar Todos Simultaneamente'
          }
        </Button>
      </div>

      {/* Agent Cards */}
      <div className="space-y-2">
        {AGENT_ORDER.map((agentKey, index) => {
          const info = AGENT_INFO[agentKey];
          const execution = executionMap.get(agentKey);
          const isRunning = runningAgents.has(agentKey);
          const isCompleted = execution?.status === 'completed';
          const isFailed = execution?.status === 'failed';

          return (
            <Card
              key={agentKey}
              className={cn(
                'transition-all',
                isRunning && 'border-primary/50 shadow-sm shadow-primary/10',
                isCompleted && 'border-primary/30',
                isFailed && 'border-destructive/30'
              )}
            >
              <CardContent className="p-3 flex items-center gap-3">
                {/* Step number */}
                <div
                  className={cn(
                    'h-8 w-8 rounded-full flex items-center justify-center text-sm font-bold shrink-0',
                    isCompleted ? 'bg-primary/10 text-primary' :
                    isFailed ? 'bg-destructive/10 text-destructive' :
                    isRunning ? 'bg-primary/10 text-primary' :
                    'bg-muted text-muted-foreground'
                  )}
                >
                  {isCompleted ? <CheckCircle2 className="h-4 w-4" /> :
                   isFailed ? <XCircle className="h-4 w-4" /> :
                   isRunning ? <Loader2 className="h-4 w-4 animate-spin" /> :
                   index + 1}
                </div>

                {/* Agent info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-base">{info.icon}</span>
                    <span className="font-medium text-sm">{info.name}</span>
                    {execution?.duration_ms && (
                      <span className="text-xs text-muted-foreground">
                        {(execution.duration_ms / 1000).toFixed(1)}s
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">{info.description}</p>
                  {isFailed && execution?.error_message && (
                    <p className="text-xs text-destructive mt-1 truncate">{execution.error_message}</p>
                  )}
                </div>

                {/* Action */}
                <Button
                  variant={isCompleted ? 'outline' : 'default'}
                  size="sm"
                  onClick={() => onExecuteAgent(agentKey)}
                  disabled={isRunning || isPipelineRunning}
                  className="shrink-0"
                >
                  {isRunning ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Play className="h-3.5 w-3.5" />
                  )}
                  <span className="ml-1 text-xs">
                    {isRunning ? 'Rodando...' : isCompleted ? 'Reexecutar' : isFailed ? 'Tentar Novamente' : 'Executar'}
                  </span>
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
