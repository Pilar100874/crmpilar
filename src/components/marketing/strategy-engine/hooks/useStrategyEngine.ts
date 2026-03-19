import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { AgentExecution } from '../types';
import { toast } from 'sonner';
import { AGENT_ORDER, AGENT_INFO } from '../types';

export function useStrategyEngine(projectId: string | null, onRefetch: () => void) {
  const [runningAgent, setRunningAgent] = useState<string | null>(null);
  const [isPipelineRunning, setIsPipelineRunning] = useState(false);
  const [chatLoading, setChatLoading] = useState(false);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Poll for execution updates during pipeline
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

  const executeAgent = async (agentType: string) => {
    if (!projectId) return;
    setRunningAgent(agentType);
    try {
      const { data, error } = await supabase.functions.invoke('strategy-engine', {
        body: { action: 'execute_agent', projectId, agentType }
      });
      if (error) throw error;
      if (!data.success) throw new Error(data.error);
      toast.success(`${AGENT_INFO[agentType]?.name || agentType} concluído!`);
      onRefetch();
    } catch (err: any) {
      toast.error(`Erro: ${err.message}`);
    } finally {
      setRunningAgent(null);
    }
  };

  const runPipeline = async () => {
    if (!projectId) return;
    setIsPipelineRunning(true);
    startPolling();
    toast.info('Pipeline iniciado! Executando 9 agentes especializados...');
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
      stopPolling();
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

  const exportPDF = async (projectId: string) => {
    // Get all artifacts for PDF generation
    const { data: artifacts } = await supabase
      .from('strategy_artifacts')
      .select('*')
      .eq('project_id', projectId)
      .order('created_at');

    const { data: project } = await supabase
      .from('strategy_projects')
      .select('*')
      .eq('id', projectId)
      .single();

    if (!artifacts || !project) {
      toast.error('Nenhum dado para exportar');
      return;
    }

    // Generate markdown
    let md = `# Estratégia de Marketing — ${(project as any).nome}\n\n`;
    md += `**Descrição:** ${(project as any).descricao_negocio}\n\n`;
    md += `**Status:** ${(project as any).status}\n\n`;
    md += `---\n\n`;

    for (const artifact of artifacts as any[]) {
      const info = AGENT_INFO[artifact.tipo];
      md += `## ${info?.icon || '📄'} ${artifact.titulo}\n\n`;
      md += jsonToMarkdown(artifact.conteudo);
      md += `\n---\n\n`;
    }

    const blob = new Blob([md], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `estrategia_${(project as any).nome.replace(/\s+/g, '_')}.md`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Estratégia exportada!');
  };

  return {
    executeAgent,
    runPipeline,
    sendChatMessage,
    validateArtifact,
    exportPDF,
    runningAgent,
    isPipelineRunning,
    chatLoading
  };
}

function jsonToMarkdown(data: any, indent = ''): string {
  let md = '';
  if (typeof data === 'string') return data + '\n\n';
  if (Array.isArray(data)) {
    data.forEach((item) => {
      if (typeof item === 'object') {
        md += jsonToMarkdown(item, indent);
      } else {
        md += `${indent}- ${item}\n`;
      }
    });
    md += '\n';
  } else if (typeof data === 'object' && data !== null) {
    Object.entries(data).forEach(([key, value]) => {
      if (typeof value === 'object') {
        md += `${indent}### ${key}\n\n`;
        md += jsonToMarkdown(value, indent);
      } else {
        md += `${indent}**${key}:** ${value}\n\n`;
      }
    });
  }
  return md;
}
