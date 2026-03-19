import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { AgentExecution } from '../types';
import { toast } from 'sonner';
import { AGENT_ORDER, AGENT_INFO } from '../types';
import jsPDF from 'jspdf';

export function useStrategyEngine(projectId: string | null, onRefetch: () => void) {
  const [runningAgent, setRunningAgent] = useState<string | null>(null);
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

  const approveArtifact = async (artifactId: string) => {
    const { error } = await supabase
      .from('strategy_artifacts')
      .update({ status: 'approved' } as any)
      .eq('id', artifactId);
    if (error) {
      toast.error('Erro ao aprovar artefato');
    } else {
      toast.success('Artefato aprovado ✅');
      onRefetch();
    }
  };

  const rejectArtifact = async (artifactId: string) => {
    const { error } = await supabase
      .from('strategy_artifacts')
      .update({ status: 'rejected' } as any)
      .eq('id', artifactId);
    if (error) {
      toast.error('Erro ao rejeitar artefato');
    } else {
      toast.warning('Artefato rejeitado');
      onRefetch();
    }
  };

  const reviseArtifact = async (artifactId: string, agentType: string) => {
    if (!projectId) return;
    setRunningAgent(agentType);
    toast.info(`Revisando ${AGENT_INFO[agentType]?.name}...`);
    try {
      const { data, error } = await supabase.functions.invoke('strategy-engine', {
        body: { action: 'revise_agent', projectId, agentType, artifactId }
      });
      if (error) throw error;
      if (!data.success) throw new Error(data.error);
      toast.success(`${AGENT_INFO[agentType]?.name} revisado (v${data.new_version})!`);
      onRefetch();
    } catch (err: any) {
      toast.error(`Erro na revisão: ${err.message}`);
    } finally {
      setRunningAgent(null);
    }
  };

  const updateArtifactContent = async (artifactId: string, newContent: any) => {
    // Create new version by incrementing
    const { data: current } = await supabase
      .from('strategy_artifacts')
      .select('version, tipo, titulo, project_id, execution_id')
      .eq('id', artifactId)
      .single();

    if (!current) { toast.error('Artefato não encontrado'); return; }

    const { error } = await supabase
      .from('strategy_artifacts')
      .update({ conteudo: newContent, version: ((current as any).version || 1) + 1 } as any)
      .eq('id', artifactId);

    if (error) {
      toast.error('Erro ao salvar edição');
    } else {
      toast.success('Artefato atualizado!');
      onRefetch();
    }
  };

  const exportPDF = async (pid: string) => {
    const { data: artifacts } = await supabase
      .from('strategy_artifacts')
      .select('*')
      .eq('project_id', pid)
      .order('created_at');

    const { data: project } = await supabase
      .from('strategy_projects')
      .select('*')
      .eq('id', pid)
      .single();

    if (!artifacts || !project) {
      toast.error('Nenhum dado para exportar');
      return;
    }

    const proj = project as any;
    const doc = new jsPDF();
    let y = 20;
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 15;
    const maxWidth = pageWidth - margin * 2;

    const addPage = () => { doc.addPage(); y = 20; };
    const checkPage = (needed: number) => { if (y + needed > 275) addPage(); };

    // Title page
    doc.setFontSize(24);
    doc.setFont('helvetica', 'bold');
    doc.text('Estratégia de Marketing', pageWidth / 2, 60, { align: 'center' });
    doc.setFontSize(16);
    doc.setFont('helvetica', 'normal');
    doc.text(proj.nome, pageWidth / 2, 75, { align: 'center' });
    doc.setFontSize(10);
    doc.setTextColor(100);
    const descLines = doc.splitTextToSize(proj.descricao_negocio || '', maxWidth);
    doc.text(descLines, pageWidth / 2, 90, { align: 'center' });
    doc.setTextColor(0);
    doc.setFontSize(9);
    doc.text(`Gerado em: ${new Date().toLocaleDateString('pt-BR')}`, pageWidth / 2, 110, { align: 'center' });

    // Content pages
    for (const artifact of artifacts as any[]) {
      addPage();
      const info = AGENT_INFO[artifact.tipo];

      // Section header
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.text(`${info?.icon || '📄'} ${artifact.titulo}`, margin, y);
      y += 10;

      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(100);
      doc.text(`Versão ${artifact.version} • Status: ${artifact.status}`, margin, y);
      doc.setTextColor(0);
      y += 8;

      // Render content
      doc.setFontSize(10);
      const content = artifact.conteudo;
      const contentStr = typeof content === 'string' ? content : flattenJSON(content);
      const lines = doc.splitTextToSize(contentStr, maxWidth);

      for (const line of lines) {
        checkPage(6);
        doc.text(line, margin, y);
        y += 5;
      }
    }

    doc.save(`estrategia_${proj.nome.replace(/\s+/g, '_')}.pdf`);
    toast.success('PDF exportado com sucesso!');
  };

  const exportMarkdown = async (pid: string) => {
    const { data: artifacts } = await supabase
      .from('strategy_artifacts')
      .select('*')
      .eq('project_id', pid)
      .order('created_at');

    const { data: project } = await supabase
      .from('strategy_projects')
      .select('*')
      .eq('id', pid)
      .single();

    if (!artifacts || !project) {
      toast.error('Nenhum dado para exportar');
      return;
    }

    const proj = project as any;
    let md = `# Estratégia de Marketing — ${proj.nome}\n\n`;
    md += `**Descrição:** ${proj.descricao_negocio}\n\n`;
    md += `**Status:** ${proj.status}\n\n---\n\n`;

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
    a.download = `estrategia_${proj.nome.replace(/\s+/g, '_')}.md`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Markdown exportado!');
  };

  const exportJSON = async (pid: string) => {
    const { data: artifacts } = await supabase
      .from('strategy_artifacts')
      .select('*')
      .eq('project_id', pid)
      .order('created_at');

    const { data: project } = await supabase
      .from('strategy_projects')
      .select('*')
      .eq('id', pid)
      .single();

    if (!artifacts || !project) {
      toast.error('Nenhum dado para exportar');
      return;
    }

    const proj = project as any;
    const exportData = {
      projeto: proj.nome,
      descricao: proj.descricao_negocio,
      status: proj.status,
      gerado_em: new Date().toISOString(),
      artefatos: (artifacts as any[]).map(a => ({
        tipo: a.tipo,
        titulo: a.titulo,
        versao: a.version,
        status: a.status,
        conteudo: a.conteudo
      }))
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `estrategia_${proj.nome.replace(/\s+/g, '_')}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('JSON exportado!');
  };

  return {
    executeAgent,
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
    runningAgent,
    isPipelineRunning,
    chatLoading
  };
}

function flattenJSON(data: any, prefix = ''): string {
  let result = '';
  if (typeof data === 'string') return data;
  if (Array.isArray(data)) {
    data.forEach((item, i) => {
      if (typeof item === 'object') {
        result += flattenJSON(item, `${prefix}  `);
      } else {
        result += `${prefix}• ${item}\n`;
      }
    });
  } else if (typeof data === 'object' && data !== null) {
    Object.entries(data).forEach(([key, value]) => {
      if (typeof value === 'object') {
        result += `\n${prefix}${key.toUpperCase()}:\n`;
        result += flattenJSON(value, `${prefix}  `);
      } else {
        result += `${prefix}${key}: ${value}\n`;
      }
    });
  }
  return result;
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
