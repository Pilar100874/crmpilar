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

  // Structured line types for professional PDF rendering
  type PdfLine = { type: 'heading'; text: string } | { type: 'subheading'; text: string } | { type: 'body'; text: string } | { type: 'bullet'; text: string; level: number } | { type: 'keyvalue'; label: string; value: string } | { type: 'spacer' };

  const extractStructured = (value: any, depth = 0): PdfLine[] => {
    if (value === null || value === undefined) return [];
    if (typeof value === 'string') {
      const t = value.trim();
      return t ? [{ type: 'body', text: t }] : [];
    }
    if (typeof value === 'number' || typeof value === 'boolean') return [{ type: 'body', text: String(value) }];

    if (Array.isArray(value)) {
      const lines: PdfLine[] = [];
      for (const item of value) {
        if (typeof item === 'string' && item.trim()) {
          lines.push({ type: 'bullet', text: item.trim(), level: depth });
        } else if (typeof item === 'object' && item !== null) {
          lines.push(...extractStructured(item, depth + 1));
        }
      }
      return lines;
    }

    if (typeof value === 'object') {
      const lines: PdfLine[] = [];
      for (const [key, val] of Object.entries(value)) {
        const label = key.replace(/[_-]/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

        if (typeof val === 'string' && val.trim()) {
          // Short values as key-value, long values as heading + body
          if (val.length > 120) {
            lines.push({ type: depth === 0 ? 'heading' : 'subheading', text: label });
            lines.push({ type: 'body', text: val.trim() });
            lines.push({ type: 'spacer' });
          } else {
            lines.push({ type: 'keyvalue', label, value: val.trim() });
          }
        } else if (typeof val === 'number' || typeof val === 'boolean') {
          lines.push({ type: 'keyvalue', label, value: String(val) });
        } else if (Array.isArray(val)) {
          lines.push({ type: depth === 0 ? 'heading' : 'subheading', text: label });
          for (const item of val) {
            if (typeof item === 'string' && item.trim()) {
              lines.push({ type: 'bullet', text: item.trim(), level: depth });
            } else if (typeof item === 'object' && item !== null) {
              lines.push(...extractStructured(item, depth + 1));
            }
          }
          lines.push({ type: 'spacer' });
        } else if (typeof val === 'object' && val !== null) {
          lines.push({ type: depth === 0 ? 'heading' : 'subheading', text: label });
          lines.push(...extractStructured(val, depth + 1));
          lines.push({ type: 'spacer' });
        }
      }
      return lines;
    }
    return [];
  };

  // Legacy helper for summary extraction
  const extractText = (value: any): string[] => {
    return extractStructured(value).filter(l => l.type !== 'spacer').map(l => {
      if (l.type === 'keyvalue') return `${l.label}: ${l.value}`;
      if (l.type === 'bullet') return `- ${l.text}`;
      return l.text;
    });
  };

  // Helper: extract a one-paragraph summary from content
  const extractSummary = (conteudo: any): string => {
    if (typeof conteudo === 'string') return conteudo.substring(0, 300);
    if (typeof conteudo === 'object' && conteudo !== null) {
      // Try common summary fields
      for (const key of ['resumo', 'summary', 'descricao', 'description', 'overview', 'objetivo', 'conclusao', 'headline', 'proposta_valor', 'posicionamento']) {
        if (conteudo[key] && typeof conteudo[key] === 'string') {
          return conteudo[key].substring(0, 400);
        }
      }
      // Fallback: take first few string values
      const texts = extractText(conteudo).filter(l => l.length > 10 && !l.startsWith('  '));
      return texts.slice(0, 3).join(' | ').substring(0, 400);
    }
    return '';
  };

  // Strip emojis and normalize for PDF (jsPDF default font has limited Unicode support)
  const sanitizeForPDF = (str: string): string => {
    // Remove emojis
    let clean = str.replace(/[\u{1F000}-\u{1FFFF}]|[\u{2600}-\u{27BF}]|[\u{FE00}-\u{FE0F}]|[\u{1F900}-\u{1F9FF}]|[\u{200D}]|[\u{20E3}]|[\u{E0020}-\u{E007F}]|[\u{2700}-\u{27BF}]|[\u{2300}-\u{23FF}]|[\u{2B50}]|[\u{1FA00}-\u{1FA6F}]|[\u{1FA70}-\u{1FAFF}]/gu, '');
    // Replace common unicode chars that jsPDF can't render
    clean = clean.replace(/[""]/g, '"').replace(/['']/g, "'").replace(/—/g, '-').replace(/–/g, '-').replace(/…/g, '...').replace(/•/g, '-');
    return clean.trim();
  };
  const stripEmoji = sanitizeForPDF;

  const buildPDF = (arts: any[], mode: 'resumida' | 'completa', projectName: string) => {
    const doc = new jsPDF();
    const pageW = doc.internal.pageSize.getWidth();
    const pageH = doc.internal.pageSize.getHeight();
    const marginL = 20;
    const marginR = 20;
    const contentW = pageW - marginL - marginR;
    let y = 0;

    const addPageHeader = () => {
      doc.setFillColor(30, 41, 59);
      doc.rect(0, 0, pageW, 35, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(7);
      doc.setFont('helvetica', 'normal');
      doc.text(mode === 'resumida' ? 'RESUMO EXECUTIVO' : 'ESTRATEGIA COMPLETA', pageW - marginR, 12, { align: 'right' });
      doc.text(sanitizeForPDF(projectName).substring(0, 50), marginL, 12);
      // Page number footer
      doc.setTextColor(160, 160, 170);
      doc.setFontSize(7);
      const pageNum = doc.getNumberOfPages();
      doc.text(`${pageNum}`, pageW / 2, pageH - 10, { align: 'center' });
      doc.setTextColor(0, 0, 0);
      y = 45;
    };

    const checkPage = (needed: number) => {
      if (y + needed > pageH - 25) {
        doc.addPage();
        addPageHeader();
      }
    };

    // === COVER PAGE ===
    doc.setFillColor(30, 41, 59);
    doc.rect(0, 0, pageW, pageH, 'F');

    doc.setFillColor(99, 102, 241);
    doc.rect(marginL, 80, 60, 4, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(28);
    doc.text('Estrategia de', marginL, 105);
    doc.setFontSize(32);
    doc.text('Marketing Digital', marginL, 120);

    doc.setFontSize(12);
    doc.setTextColor(200, 200, 220);
    const projLines = doc.splitTextToSize(stripEmoji(projectName), contentW);
    doc.text(projLines, marginL, 140);

    doc.setFontSize(10);
    doc.setTextColor(160, 160, 180);
    doc.text(mode === 'resumida' ? 'Versao Resumida' : 'Versao Completa', marginL, 165);
    const dateStr = new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
    doc.text(dateStr, marginL, 175);

    doc.setFontSize(9);
    doc.text(`${arts.length} secoes - Gerado automaticamente`, marginL, pageH - 30);

    // === TABLE OF CONTENTS ===
    doc.addPage();
    addPageHeader();
    doc.setFontSize(20);
    doc.setTextColor(30, 41, 59);
    doc.text('Sumário', marginL, y);
    y += 12;

    doc.setDrawColor(200, 200, 200);
    doc.line(marginL, y, pageW - marginR, y);
    y += 10;

    for (let i = 0; i < arts.length; i++) {
      const info = agentInfo[arts[i].tipo];
      const title = stripEmoji(arts[i].titulo || info?.name || arts[i].tipo);
      doc.setFontSize(11);
      doc.setTextColor(60, 60, 60);
      doc.text(`${i + 1}. ${title}`, marginL + 5, y);
      y += 8;
    }

    // === CONTENT PAGES ===
    for (let i = 0; i < arts.length; i++) {
      doc.addPage();
      addPageHeader();

      const art = arts[i];
      const info = agentInfo[art.tipo];
      const title = stripEmoji(art.titulo || info?.name || art.tipo);

      // Section header with colored accent
      const color = info?.color || '#6366F1';
      const r = parseInt(color.slice(1, 3), 16);
      const g = parseInt(color.slice(3, 5), 16);
      const b = parseInt(color.slice(5, 7), 16);
      doc.setFillColor(r, g, b);
      doc.rect(marginL, y - 5, 4, 14, 'F');

      doc.setFontSize(16);
      doc.setTextColor(30, 41, 59);
      doc.text(title, marginL + 10, y + 5);
      y += 20;

      // Separator
      doc.setDrawColor(230, 230, 230);
      doc.line(marginL, y, pageW - marginR, y);
      y += 10;

      // Agent description subtitle
      if (info?.description) {
        doc.setFontSize(9);
        doc.setTextColor(120, 120, 140);
        doc.setFont('helvetica', 'italic');
        doc.text(sanitizeForPDF(info.description), marginL + 10, y);
        doc.setFont('helvetica', 'normal');
        y += 10;
      }

      if (mode === 'resumida') {
        const summary = sanitizeForPDF(extractSummary(art.conteudo));
        if (summary) {
          // Summary box with light background
          doc.setFillColor(248, 249, 250);
          const sLines = doc.splitTextToSize(summary, contentW - 16);
          const boxH = sLines.length * 5 + 12;
          checkPage(boxH);
          doc.roundedRect(marginL, y - 2, contentW, boxH, 2, 2, 'F');
          doc.setFontSize(10);
          doc.setTextColor(50, 50, 60);
          y += 6;
          for (const line of sLines) {
            doc.text(line, marginL + 8, y);
            y += 5;
          }
          y += 4;
        } else {
          doc.setFontSize(10);
          doc.setTextColor(150, 150, 150);
          doc.setFont('helvetica', 'italic');
          doc.text('Conteudo pendente', marginL, y);
          doc.setFont('helvetica', 'normal');
          y += 6;
        }
      } else {
        // Complete mode: structured professional rendering
        const structuredLines = extractStructured(art.conteudo).map(l => {
          if (l.type === 'keyvalue') return { ...l, label: sanitizeForPDF(l.label), value: sanitizeForPDF(l.value) };
          if (l.type === 'spacer') return l;
          return { ...l, text: sanitizeForPDF((l as any).text) };
        });

        if (structuredLines.length === 0) {
          doc.setFontSize(10);
          doc.setTextColor(150, 150, 150);
          doc.setFont('helvetica', 'italic');
          doc.text('Conteudo pendente', marginL, y);
          doc.setFont('helvetica', 'normal');
          y += 6;
        } else {
          for (const line of structuredLines) {
            switch (line.type) {
              case 'heading': {
                checkPage(14);
                y += 6;
                // Heading with subtle underline
                doc.setFontSize(11);
                doc.setFont('helvetica', 'bold');
                doc.setTextColor(30, 41, 59);
                doc.text(line.text, marginL, y);
                y += 2;
                doc.setDrawColor(r, g, b);
                doc.setLineWidth(0.5);
                doc.line(marginL, y, marginL + Math.min(doc.getTextWidth(line.text), contentW), y);
                doc.setLineWidth(0.2);
                y += 5;
                doc.setFont('helvetica', 'normal');
                break;
              }
              case 'subheading': {
                checkPage(12);
                y += 4;
                doc.setFontSize(10);
                doc.setFont('helvetica', 'bold');
                doc.setTextColor(60, 70, 90);
                doc.text(line.text, marginL + 4, y);
                y += 5;
                doc.setFont('helvetica', 'normal');
                break;
              }
              case 'keyvalue': {
                checkPage(7);
                doc.setFontSize(9.5);
                doc.setFont('helvetica', 'bold');
                doc.setTextColor(50, 55, 70);
                const labelW = doc.getTextWidth(line.label + ':  ');
                doc.text(line.label + ':', marginL + 4, y);
                doc.setFont('helvetica', 'normal');
                doc.setTextColor(70, 70, 80);
                const valMaxW = contentW - labelW - 8;
                if (valMaxW > 30) {
                  const wrapped = doc.splitTextToSize(line.value, valMaxW);
                  doc.text(wrapped[0], marginL + 4 + labelW, y);
                  for (let wi = 1; wi < wrapped.length; wi++) {
                    y += 4.5;
                    checkPage(5);
                    doc.text(wrapped[wi], marginL + 4 + labelW, y);
                  }
                } else {
                  y += 4.5;
                  const wrapped = doc.splitTextToSize(line.value, contentW - 8);
                  for (const wl of wrapped) {
                    checkPage(5);
                    doc.text(wl, marginL + 8, y);
                    y += 4.5;
                  }
                }
                y += 4;
                break;
              }
              case 'bullet': {
                checkPage(6);
                const bulletIndent = 4 + (line.level * 8);
                doc.setFontSize(9.5);
                doc.setTextColor(70, 70, 80);
                // Draw a small filled circle as bullet
                doc.setFillColor(r, g, b);
                doc.circle(marginL + bulletIndent + 1.5, y - 1.2, 1, 'F');
                doc.setFont('helvetica', 'normal');
                const bulletW = contentW - bulletIndent - 8;
                const wrapped = doc.splitTextToSize(line.text, bulletW);
                for (const wl of wrapped) {
                  checkPage(5);
                  doc.text(wl, marginL + bulletIndent + 5, y);
                  y += 4.5;
                }
                break;
              }
              case 'body': {
                checkPage(6);
                doc.setFontSize(9.5);
                doc.setTextColor(60, 60, 70);
                doc.setFont('helvetica', 'normal');
                const wrapped = doc.splitTextToSize(line.text, contentW - 4);
                for (const wl of wrapped) {
                  checkPage(5);
                  doc.text(wl, marginL + 2, y);
                  y += 4.5;
                }
                y += 2;
                break;
              }
              case 'spacer': {
                y += 3;
                break;
              }
            }
          }
        }
      }

      // Footer separator
      y += 5;
      checkPage(6);
      doc.setDrawColor(230, 230, 230);
      doc.line(marginL, y, pageW - marginR, y);
    }

    return doc;
  };

  const exportPDF = async (pid: string, mode: 'resumida' | 'completa' = 'completa') => {
    try {
      const { data: arts } = await supabase
        .from('strategy_artifacts')
        .select('*')
        .eq('project_id', pid)
        .order('created_at');

      if (!arts?.length) { toast.error('Nenhum artefato para exportar'); return; }

      // Get project name
      const { data: proj } = await supabase
        .from('strategy_projects')
        .select('nome, descricao_negocio')
        .eq('id', pid)
        .single();

      const projectName = proj?.nome || 'Projeto de Marketing';
      const doc = buildPDF(arts, mode, projectName);
      const suffix = mode === 'resumida' ? '-resumo' : '-completa';
      doc.save(`estrategia-marketing${suffix}.pdf`);
      toast.success(`PDF ${mode === 'resumida' ? 'resumido' : 'completo'} exportado!`);
    } catch (err: any) {
      toast.error(`Erro ao exportar PDF: ${err.message}`);
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
