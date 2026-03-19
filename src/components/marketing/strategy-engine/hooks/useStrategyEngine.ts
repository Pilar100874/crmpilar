import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { AgentExecution } from '../types';
import { toast } from 'sonner';
import { AGENT_ORDER, AGENT_INFO } from '../types';
import jsPDF from 'jspdf';

export function useStrategyEngine(projectId: string | null, onRefetch: () => void, agentOrder: string[] = AGENT_ORDER, agentInfo: Record<string, { name: string; icon: string; color: string; description: string }> = AGENT_INFO) {
  const [runningAgents, setRunningAgents] = useState<Set<string>>(new Set());
  const [isPipelineRunning, setIsPipelineRunning] = useState(false);
  const [chatLoading, setChatLoading] = useState(false);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const startPolling = useCallback(() => {
    if (pollingRef.current) return;
    pollingRef.current = setInterval(async () => {
      onRefetch();
    }, 3000);
  }, [onRefetch]);

  const stopPolling = useCallback(() => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => stopPolling();
  }, [stopPolling]);

  // Start/stop polling based on running agents
  useEffect(() => {
    if (runningAgents.size > 0 || isPipelineRunning) {
      startPolling();
    } else {
      stopPolling();
    }
  }, [runningAgents.size, isPipelineRunning, startPolling, stopPolling]);

  const addRunning = (agent: string) => {
    setRunningAgents(prev => new Set([...prev, agent]));
  };

  const removeRunning = (agent: string) => {
    setRunningAgents(prev => {
      const next = new Set(prev);
      next.delete(agent);
      return next;
    });
  };

  const executeAgent = async (agentType: string) => {
    if (!projectId) return;
    if (runningAgents.has(agentType)) return; // Already running
    addRunning(agentType);
    try {
      const { data, error } = await supabase.functions.invoke('strategy-engine', {
        body: { action: 'execute_agent', projectId, agentType }
      });
      if (error) throw error;
      if (!data.success) throw new Error(data.error);
      toast.success(`${agentInfo[agentType]?.name || agentType} concluído!`);
      onRefetch();
    } catch (err: any) {
      toast.error(`Erro em ${agentInfo[agentType]?.name || agentType}: ${err.message}`);
    } finally {
      removeRunning(agentType);
    }
  };

  const executeAllAgents = async () => {
    if (!projectId) return;
    toast.info('Executando todos os agentes simultaneamente...');
    
    // Launch all agents in parallel
    const promises = agentOrder.map(agentType => executeAgent(agentType));
    await Promise.allSettled(promises);
    
    toast.success('🎉 Todos os agentes finalizados!');
    onRefetch();
  };

  const runPipeline = async () => {
    if (!projectId) return;
    setIsPipelineRunning(true);
    toast.info(`Pipeline iniciado! Executando ${agentOrder.length} agentes especializados...`);
    try {
      const { data, error } = await supabase.functions.invoke('strategy-engine', {
        body: { action: 'run_pipeline', projectId }
      });
      if (error) throw error;
      if (!data.success) throw new Error(data.error);
      toast.success('🎉 Pipeline concluído com sucesso!');
      onRefetch();
    } catch (err: any) {
      toast.error(`Erro no pipeline: ${err.message}`);
    } finally {
      setIsPipelineRunning(false);
      onRefetch();
    }
  };

  const sendChatMessage = async (message: string): Promise<string | null> => {
    if (!projectId) return null;
    setChatLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('strategy-engine', {
        body: { action: 'chat', projectId, message }
      });
      if (error) throw error;
      if (!data.success) throw new Error(data.error);
      onRefetch();
      return data.message;
    } catch (err: any) {
      toast.error(`Erro no chat: ${err.message}`);
      return null;
    } finally {
      setChatLoading(false);
    }
  };

  const validateArtifact = async (artifactId: string, content: any) => {
    try {
      const validators = ['clareza', 'especificidade', 'voc', 'diferenciacao', 'consistencia'];
      const results: Record<string, any> = {};

      for (const v of validators) {
        const { data } = await supabase.functions.invoke('strategy-engine', {
          body: { action: 'validate', validatorType: v, artifactContent: content }
        });
        if (data?.success) results[v] = data.validation;
      }

      return results;
    } catch (err: any) {
      toast.error(`Erro na validação: ${err.message}`);
      return null;
    }
  };

  const approveArtifact = async (artifactId: string) => {
    try {
      await supabase
        .from('strategy_artifacts')
        .update({ status: 'approved' } as any)
        .eq('id', artifactId);
      toast.success('Artefato aprovado!');
      onRefetch();
    } catch (err: any) {
      toast.error(`Erro: ${err.message}`);
    }
  };

  const rejectArtifact = async (artifactId: string) => {
    try {
      await supabase
        .from('strategy_artifacts')
        .update({ status: 'rejected' } as any)
        .eq('id', artifactId);
      toast.warning('Artefato rejeitado');
      onRefetch();
    } catch (err: any) {
      toast.error(`Erro: ${err.message}`);
    }
  };

  const reviseArtifact = async (artifactId: string, agentType: string) => {
    if (!projectId) return;
    addRunning(agentType);
    toast.info(`Revisando ${AGENT_INFO[agentType]?.name}...`);
    try {
      const { data, error } = await supabase.functions.invoke('strategy-engine', {
        body: { action: 'revise', projectId, agentType, artifactId }
      });
      if (error) throw error;
      if (!data.success) throw new Error(data.error);
      toast.success(`${AGENT_INFO[agentType]?.name} revisado!`);
      onRefetch();
    } catch (err: any) {
      toast.error(`Erro na revisão: ${err.message}`);
    } finally {
      removeRunning(agentType);
    }
  };

  const updateArtifactContent = async (artifactId: string, content: any) => {
    try {
      await supabase
        .from('strategy_artifacts')
        .update({ conteudo: content } as any)
        .eq('id', artifactId);

      // Also update strategic memory
      const { data: artifact } = await supabase
        .from('strategy_artifacts')
        .select('tipo, project_id')
        .eq('id', artifactId)
        .single();

      if (artifact) {
        const { data: project } = await supabase
          .from('strategy_projects')
          .select('strategic_memory')
          .eq('id', artifact.project_id)
          .single();

        if (project) {
          const memory = (project.strategic_memory as Record<string, any>) || {};
          memory[artifact.tipo] = content;
          await supabase
            .from('strategy_projects')
            .update({ strategic_memory: memory } as any)
            .eq('id', artifact.project_id);
        }
      }

      toast.success('Conteúdo atualizado');
      onRefetch();
    } catch (err: any) {
      toast.error(`Erro ao atualizar: ${err.message}`);
    }
  };

  const exportPDF = async (pid: string) => {
    try {
      const { data: arts } = await supabase
        .from('strategy_artifacts')
        .select('*')
        .eq('project_id', pid)
        .order('created_at');

      if (!arts?.length) { toast.error('Nenhum artefato'); return; }

      const doc = new jsPDF();
      let y = 20;
      doc.setFontSize(18);
      doc.text('Estratégia de Marketing', 20, y);
      y += 15;

      for (const art of arts) {
        if (y > 260) { doc.addPage(); y = 20; }
        doc.setFontSize(14);
        doc.text(art.titulo, 20, y);
        y += 8;
        doc.setFontSize(9);
        const content = JSON.stringify(art.conteudo, null, 2);
        const lines = doc.splitTextToSize(content, 170);
        for (const line of lines) {
          if (y > 280) { doc.addPage(); y = 20; }
          doc.text(line, 20, y);
          y += 4;
        }
        y += 10;
      }

      doc.save('estrategia-marketing.pdf');
      toast.success('PDF exportado!');
    } catch (err: any) {
      toast.error(`Erro: ${err.message}`);
    }
  };

  const exportMarkdown = async (pid: string) => {
    try {
      const { data: arts } = await supabase
        .from('strategy_artifacts')
        .select('*')
        .eq('project_id', pid)
        .order('created_at');

      if (!arts?.length) { toast.error('Nenhum artefato'); return; }

      let md = '# Estratégia de Marketing\n\n';
      for (const art of arts) {
        md += `## ${art.titulo}\n\n`;
        md += '```json\n' + JSON.stringify(art.conteudo, null, 2) + '\n```\n\n';
      }

      const blob = new Blob([md], { type: 'text/markdown' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'estrategia-marketing.md';
      a.click();
      URL.revokeObjectURL(url);
      toast.success('Markdown exportado!');
    } catch (err: any) {
      toast.error(`Erro: ${err.message}`);
    }
  };

  const exportJSON = async (pid: string) => {
    try {
      const { data: arts } = await supabase
        .from('strategy_artifacts')
        .select('*')
        .eq('project_id', pid)
        .order('created_at');

      if (!arts?.length) { toast.error('Nenhum artefato'); return; }

      const exportData = arts.reduce((acc: any, art: any) => {
        acc[art.tipo] = art.conteudo;
        return acc;
      }, {});

      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'estrategia-marketing.json';
      a.click();
      URL.revokeObjectURL(url);
      toast.success('JSON exportado!');
    } catch (err: any) {
      toast.error(`Erro: ${err.message}`);
    }
  };

  return {
    executeAgent,
    executeAllAgents,
    runPipeline,
    sendChatMessage,
    validateArtifact,
    approveArtifact,
    rejectArtifact,
    reviseArtifact,
    updateArtifactContent,
    exportPDF,
    exportMarkdown,
    exportJSON,
    runningAgents,
    isPipelineRunning,
    chatLoading
  };
}
