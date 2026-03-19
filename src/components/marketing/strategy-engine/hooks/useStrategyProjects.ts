import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { StrategyProject, AgentExecution, StrategyArtifact, ChatMessage } from '../types';
import { toast } from 'sonner';

export function useStrategyProjects(estabelecimentoId: string | undefined) {
  const [projects, setProjects] = useState<StrategyProject[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchProjects = useCallback(async () => {
    if (!estabelecimentoId) return;
    const { data, error } = await supabase
      .from('strategy_projects')
      .select('*')
      .eq('estabelecimento_id', estabelecimentoId)
      .order('created_at', { ascending: false });
    if (error) {
      console.error('Error fetching projects:', error);
    } else {
      setProjects((data || []) as unknown as StrategyProject[]);
    }
    setLoading(false);
  }, [estabelecimentoId]);

  useEffect(() => { fetchProjects(); }, [fetchProjects]);

  const createProject = async (nome: string, descricao: string, userId: string) => {
    const { data, error } = await supabase
      .from('strategy_projects')
      .insert({ nome, descricao_negocio: descricao, estabelecimento_id: estabelecimentoId!, user_id: userId })
      .select()
      .single();
    if (error) { toast.error('Erro ao criar projeto'); return null; }
    await fetchProjects();
    return data as unknown as StrategyProject;
  };

  const deleteProject = async (id: string) => {
    await supabase.from('strategy_projects').delete().eq('id', id);
    await fetchProjects();
  };

  return { projects, loading, createProject, deleteProject, refetch: fetchProjects };
}

export function useProjectDetail(projectId: string | null) {
  const [project, setProject] = useState<StrategyProject | null>(null);
  const [executions, setExecutions] = useState<AgentExecution[]>([]);
  const [artifacts, setArtifacts] = useState<StrategyArtifact[]>([]);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAll = useCallback(async () => {
    if (!projectId) { setLoading(false); return; }
    setLoading(true);

    const [projRes, execRes, artRes, chatRes] = await Promise.all([
      supabase.from('strategy_projects').select('*').eq('id', projectId).single(),
      supabase.from('strategy_agent_executions').select('*').eq('project_id', projectId).order('created_at'),
      supabase.from('strategy_artifacts').select('*').eq('project_id', projectId).order('created_at'),
      supabase.from('strategy_chat_messages').select('*').eq('project_id', projectId).order('created_at'),
    ]);

    if (projRes.data) setProject(projRes.data as unknown as StrategyProject);
    setExecutions((execRes.data || []) as unknown as AgentExecution[]);
    setArtifacts((artRes.data || []) as unknown as StrategyArtifact[]);
    setChatMessages((chatRes.data || []) as unknown as ChatMessage[]);
    setLoading(false);
  }, [projectId]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  return { project, executions, artifacts, chatMessages, loading, refetch: fetchAll };
}
