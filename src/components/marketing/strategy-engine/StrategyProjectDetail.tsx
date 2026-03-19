import React, { useState } from 'react';
import { useProjectDetail } from './hooks/useStrategyProjects';
import { useStrategyEngine } from './hooks/useStrategyEngine';
import { AGENT_INFO, AGENT_ORDER } from './types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ArrowLeft, Play, Loader2, MessageSquare, FileText, Clock, CheckCircle2, XCircle, Rocket } from 'lucide-react';
import { StrategyChat } from './StrategyChat';
import { StrategyTimeline } from './StrategyTimeline';
import { StrategyArtifactViewer } from './StrategyArtifactViewer';

interface Props {
  projectId: string;
  onBack: () => void;
}

export function StrategyProjectDetail({ projectId, onBack }: Props) {
  const { project, executions, artifacts, chatMessages, loading, refetch } = useProjectDetail(projectId);
  const { executeAgent, runPipeline, sendChatMessage, runningAgent, isPipelineRunning, chatLoading } = useStrategyEngine(projectId, refetch);
  const [activeTab, setActiveTab] = useState('chat');

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  if (!project) return null;

  const completedAgents = executions.filter(e => e.status === 'completed').length;
  const totalAgents = AGENT_ORDER.length;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={onBack}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1 min-w-0">
          <h2 className="text-lg font-bold truncate">{project.nome}</h2>
          <p className="text-xs text-muted-foreground truncate">{project.descricao_negocio}</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-xs">
            {completedAgents}/{totalAgents} agentes
          </Badge>
          <Button
            onClick={runPipeline}
            disabled={isPipelineRunning || !!runningAgent}
            size="sm"
          >
            {isPipelineRunning ? (
              <Loader2 className="h-4 w-4 mr-1 animate-spin" />
            ) : (
              <Rocket className="h-4 w-4 mr-1" />
            )}
            {isPipelineRunning ? 'Executando...' : 'Executar Pipeline Completo'}
          </Button>
        </div>
      </div>

      {/* Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="chat" className="flex items-center gap-1">
            <MessageSquare className="h-3.5 w-3.5" />
            Chat Estratégico
          </TabsTrigger>
          <TabsTrigger value="timeline" className="flex items-center gap-1">
            <Clock className="h-3.5 w-3.5" />
            Timeline
          </TabsTrigger>
          <TabsTrigger value="artifacts" className="flex items-center gap-1">
            <FileText className="h-3.5 w-3.5" />
            Artefatos ({artifacts.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="chat" className="mt-3">
          <StrategyChat
            messages={chatMessages}
            onSend={sendChatMessage}
            loading={chatLoading}
            project={project}
          />
        </TabsContent>

        <TabsContent value="timeline" className="mt-3">
          <StrategyTimeline
            executions={executions}
            onExecuteAgent={executeAgent}
            runningAgent={runningAgent}
            isPipelineRunning={isPipelineRunning}
          />
        </TabsContent>

        <TabsContent value="artifacts" className="mt-3">
          <StrategyArtifactViewer artifacts={artifacts} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
