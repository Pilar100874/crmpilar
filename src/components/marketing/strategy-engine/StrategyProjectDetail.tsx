import React, { useState, useMemo } from 'react';
import { useProjectDetail } from './hooks/useStrategyProjects';
import { useStrategyEngine } from './hooks/useStrategyEngine';
import { useCustomAgents } from './hooks/useCustomAgents';
import { AGENT_INFO, AGENT_ORDER, getMergedAgentInfo, getMergedAgentOrder } from './types';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { ArrowLeft, Loader2, MessageSquare, FileText, Clock, Rocket, LayoutDashboard, Download, ChevronDown } from 'lucide-react';
import { StrategyChat } from './StrategyChat';
import { StrategyTimeline } from './StrategyTimeline';
import { StrategyArtifactViewer } from './StrategyArtifactViewer';
import { StrategyDashboard } from './StrategyDashboard';

interface Props {
  projectId: string;
  onBack: () => void;
}

export function StrategyProjectDetail({ projectId, onBack }: Props) {
  const { project, executions, artifacts, chatMessages, loading, refetch } = useProjectDetail(projectId);

  // Get estabelecimento_id from project for custom agents
  const estabId = project?.estabelecimento_id;
  const { customAgents } = useCustomAgents(estabId);

  // Merge hardcoded + custom agents
  const mergedInfo = useMemo(() => getMergedAgentInfo(customAgents), [customAgents]);
  const mergedOrder = useMemo(() => getMergedAgentOrder(customAgents), [customAgents]);

  const {
    executeAgent, executeAllAgents, runPipeline, sendChatMessage,
    exportPDF, exportMarkdown, exportJSON,
    approveArtifact, rejectArtifact, reviseArtifact, updateArtifactContent,
    runningAgents, isPipelineRunning, chatLoading
  } = useStrategyEngine(projectId, refetch, mergedOrder);

  const [activeTab, setActiveTab] = useState('dashboard');

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  if (!project) return null;

  const completedAgents = executions.filter(e => e.status === 'completed').length;
  const totalAgents = mergedOrder.length;
  const hasAnyRunning = runningAgents.size > 0;

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
          {hasAnyRunning && (
            <Badge className="text-xs animate-pulse">
              {runningAgents.size} rodando
            </Badge>
          )}
          {artifacts.length > 0 && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  <Download className="h-4 w-4 mr-1" />
                  Exportar
                  <ChevronDown className="h-3 w-3 ml-1" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem onClick={() => exportPDF(projectId)}>
                  📄 Exportar PDF
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => exportMarkdown(projectId)}>
                  📝 Exportar Markdown
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => exportJSON(projectId)}>
                  🔧 Exportar JSON
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
          <Button
            onClick={runPipeline}
            disabled={isPipelineRunning || hasAnyRunning}
            size="sm"
          >
            {isPipelineRunning ? (
              <Loader2 className="h-4 w-4 mr-1 animate-spin" />
            ) : (
              <Rocket className="h-4 w-4 mr-1" />
            )}
            {isPipelineRunning ? 'Executando...' : 'Pipeline Sequencial'}
          </Button>
        </div>
      </div>

      {/* Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="dashboard" className="flex items-center gap-1">
            <LayoutDashboard className="h-3.5 w-3.5" />
            Dashboard
          </TabsTrigger>
          <TabsTrigger value="chat" className="flex items-center gap-1">
            <MessageSquare className="h-3.5 w-3.5" />
            Chat
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

        <TabsContent value="dashboard" className="mt-3">
          <StrategyDashboard
            project={project}
            executions={executions}
            artifacts={artifacts}
          />
        </TabsContent>

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
            onExecuteAll={executeAllAgents}
            runningAgents={runningAgents}
            isPipelineRunning={isPipelineRunning}
            agentOrder={mergedOrder}
            agentInfo={mergedInfo}
          />
        </TabsContent>

        <TabsContent value="artifacts" className="mt-3">
          <StrategyArtifactViewer
            artifacts={artifacts}
            projectId={projectId}
            onApprove={approveArtifact}
            onReject={rejectArtifact}
            onRevise={reviseArtifact}
            onUpdateContent={updateArtifactContent}
            runningAgents={runningAgents}
            agentInfo={mergedInfo}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
