import React, { useState, useMemo } from 'react';
import { useProjectDetail } from './hooks/useStrategyProjects';
import { useStrategyEngine } from './hooks/useStrategyEngine';
import { useCustomAgents } from './hooks/useCustomAgents';
import { AGENT_INFO, AGENT_ORDER, getMergedAgentInfo, getMergedAgentOrder, getMergedDependencies } from './types';
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

  // Only include active custom agents
  const activeCustomAgents = useMemo(() => customAgents.filter(a => a.ativo), [customAgents]);

  // Merge hardcoded + active custom agents
  const mergedInfo = useMemo(() => getMergedAgentInfo(activeCustomAgents), [activeCustomAgents]);
  const mergedOrder = useMemo(() => getMergedAgentOrder(activeCustomAgents), [activeCustomAgents]);
  const mergedDeps = useMemo(() => getMergedDependencies(activeCustomAgents), [activeCustomAgents]);

  const {
    executeAgent, executeAllAgents, runPipeline, sendChatMessage,
    exportPDF, exportSinglePDF, exportMarkdown, exportJSON,
    approveArtifact, rejectArtifact, reviseArtifact, updateArtifactContent,
    feedbackArtifact, deleteArtifact,
    runningAgents, isPipelineRunning, chatLoading
  } = useStrategyEngine(projectId, refetch, mergedOrder, mergedInfo);

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

  const progressPct = totalAgents > 0 ? Math.round((completedAgents / totalAgents) * 100) : 0;

  return (
    <div className="space-y-4">
      {/* Hero header */}
      <div className="relative overflow-hidden rounded-2xl border border-border/60 bg-gradient-to-br from-primary/15 via-primary/5 to-background p-4 sm:p-5">
        <div className="absolute -top-16 -right-16 h-48 w-48 rounded-full bg-primary/20 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-20 -left-12 h-44 w-44 rounded-full bg-primary-glow/15 blur-3xl pointer-events-none" />

        <div className="relative flex items-start gap-3">
          <Button variant="ghost" size="icon" onClick={onBack} className="shrink-0 -ml-1 hover:bg-card/60">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex-1 min-w-0">
            <h2 className="text-lg sm:text-xl font-bold truncate bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">{project.nome}</h2>
            <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">{project.descricao_negocio}</p>
          </div>
        </div>

        <div className="relative flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 mt-4">
          {/* Progress */}
          <div className="flex-1 max-w-md">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground">Progresso</span>
              <span className="text-[11px] font-semibold text-foreground">
                {completedAgents}/{totalAgents} agentes · {progressPct}%
              </span>
            </div>
            <div className="h-2 rounded-full bg-muted/50 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-primary to-primary-glow rounded-full transition-all duration-500"
                style={{ width: `${progressPct}%` }}
              />
            </div>
            {hasAnyRunning && (
              <div className="flex items-center gap-1.5 mt-1.5 text-[10px] text-primary font-semibold">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
                  <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-primary" />
                </span>
                {runningAgents.size} agente(s) executando agora
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 flex-wrap">
            {artifacts.length > 0 && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="bg-card/60 backdrop-blur">
                    <Download className="h-4 w-4 mr-1" />
                    Exportar
                    <ChevronDown className="h-3 w-3 ml-1" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuItem onClick={() => exportPDF(projectId, 'resumida')}>
                    📋 PDF Resumido (Executivo)
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => exportPDF(projectId, 'completa')}>
                    📄 PDF Completo (Detalhado)
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
              onClick={() => executeAllAgents(mergedDeps)}
              disabled={isPipelineRunning || hasAnyRunning}
              size="sm"
              className="bg-gradient-to-br from-primary to-primary/80 shadow-md shadow-primary/25 hover:shadow-lg hover:shadow-primary/40"
            >
              {hasAnyRunning ? (
                <Loader2 className="h-4 w-4 mr-1 animate-spin" />
              ) : (
                <Rocket className="h-4 w-4 mr-1" />
              )}
              {hasAnyRunning ? 'Executando...' : 'Rodar Todos'}
            </Button>
          </div>
        </div>
      </div>

      {/* Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4 h-11 p-1 bg-muted/40 border border-border/50 rounded-xl">
          <TabsTrigger value="dashboard" className="flex items-center gap-1.5 text-xs font-semibold rounded-lg data-[state=active]:bg-gradient-to-br data-[state=active]:from-primary data-[state=active]:to-primary/85 data-[state=active]:text-primary-foreground data-[state=active]:shadow-md data-[state=active]:shadow-primary/25">
            <LayoutDashboard className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Dashboard</span>
          </TabsTrigger>
          <TabsTrigger value="chat" className="flex items-center gap-1.5 text-xs font-semibold rounded-lg data-[state=active]:bg-gradient-to-br data-[state=active]:from-primary data-[state=active]:to-primary/85 data-[state=active]:text-primary-foreground data-[state=active]:shadow-md data-[state=active]:shadow-primary/25">
            <MessageSquare className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Chat</span>
          </TabsTrigger>
          <TabsTrigger value="timeline" className="flex items-center gap-1.5 text-xs font-semibold rounded-lg data-[state=active]:bg-gradient-to-br data-[state=active]:from-primary data-[state=active]:to-primary/85 data-[state=active]:text-primary-foreground data-[state=active]:shadow-md data-[state=active]:shadow-primary/25">
            <Clock className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Timeline</span>
          </TabsTrigger>
          <TabsTrigger value="artifacts" className="flex items-center gap-1.5 text-xs font-semibold rounded-lg data-[state=active]:bg-gradient-to-br data-[state=active]:from-primary data-[state=active]:to-primary/85 data-[state=active]:text-primary-foreground data-[state=active]:shadow-md data-[state=active]:shadow-primary/25">
            <FileText className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Artefatos</span> ({artifacts.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard" className="mt-3">
          <StrategyDashboard
            project={project}
            executions={executions}
            artifacts={artifacts}
            agentOrder={mergedOrder}
            agentInfo={mergedInfo}
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
            dependencyMap={mergedDeps}
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
            onExportSinglePDF={(type) => exportSinglePDF(projectId, type)}
            onFeedback={feedbackArtifact}
            onDeleteArtifact={deleteArtifact}
            onRegenerateAgent={executeAgent}
            runningAgents={runningAgents}
            agentInfo={mergedInfo}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
