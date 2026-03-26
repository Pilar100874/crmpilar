import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface ChatAgent {
  id: string;
  estabelecimento_id: string;
  nome: string;
  descricao: string | null;
  icone: string;
  cor: string;
  modo_operacao: 'sugerir' | 'automatico';
  permite_cliente: boolean;
  system_prompt: string;
  modelo_ia: string;
  knowledge_base_type: 'nenhuma' | 'interna' | 'externa' | 'terceiros';
  knowledge_base_internal_data: any[];
  api_endpoint_ids: string[];
  usar_produtos_importados: boolean;
  usar_estoque_sistema: boolean;
  resposta_formato_tabela: boolean;
  acumular_filtros: boolean;
  regras_busca_personalizada: string | null;
  ativo: boolean;
  ordem: number;
  created_at: string;
  updated_at: string;
}

export interface ChatAgentKbFile {
  id: string;
  agent_id: string;
  nome_arquivo: string;
  storage_path: string;
  mime_type: string | null;
  tamanho_bytes: number | null;
  created_at: string;
}

export function useChatAgents(estabelecimentoId: string | undefined | null) {
  const [agents, setAgents] = useState<ChatAgent[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAgents = useCallback(async () => {
    if (!estabelecimentoId) return;
    setLoading(true);
    const { data, error } = await supabase
      .from('chat_agents')
      .select('*')
      .eq('estabelecimento_id', estabelecimentoId)
      .order('ordem');

    if (!error && data) {
      setAgents(data as unknown as ChatAgent[]);
    } else if (error) {
      console.error('Erro ao carregar agentes:', error);
    }
    setLoading(false);
  }, [estabelecimentoId]);

  useEffect(() => { fetchAgents(); }, [fetchAgents]);

  const createAgent = async (agent: Partial<ChatAgent>) => {
    if (!estabelecimentoId) return null;
    const payload = {
      estabelecimento_id: estabelecimentoId,
      nome: agent.nome || 'Novo Agente',
      descricao: agent.descricao || null,
      icone: agent.icone || '🤖',
      cor: agent.cor || '#8B5CF6',
      modo_operacao: agent.modo_operacao || 'sugerir',
      permite_cliente: agent.permite_cliente !== undefined ? agent.permite_cliente : true,
      system_prompt: agent.system_prompt || '',
      modelo_ia: agent.modelo_ia || 'google/gemini-3-flash-preview',
      knowledge_base_type: agent.knowledge_base_type || 'nenhuma',
      knowledge_base_internal_data: agent.knowledge_base_internal_data || [],
      api_endpoint_ids: agent.api_endpoint_ids || [],
      usar_produtos_importados: agent.usar_produtos_importados || false,
      usar_estoque_sistema: agent.usar_estoque_sistema || false,
      ativo: agent.ativo !== undefined ? agent.ativo : true,
      ordem: agent.ordem || 0,
    };

    const { data, error } = await supabase
      .from('chat_agents')
      .insert(payload as any)
      .select()
      .single();

    if (error) {
      toast.error(`Erro ao criar agente: ${error.message}`);
      return null;
    }
    toast.success(`Agente "${agent.nome}" criado!`);
    await fetchAgents();
    return data as unknown as ChatAgent;
  };

  const updateAgent = async (id: string, updates: Partial<ChatAgent>) => {
    const { error } = await supabase
      .from('chat_agents')
      .update(updates as any)
      .eq('id', id);

    if (error) {
      toast.error(`Erro ao atualizar: ${error.message}`);
      return false;
    }
    await fetchAgents();
    return true;
  };

  const deleteAgent = async (id: string) => {
    const { error } = await supabase
      .from('chat_agents')
      .delete()
      .eq('id', id);

    if (error) {
      toast.error(`Erro ao excluir: ${error.message}`);
      return false;
    }
    toast.success('Agente excluído');
    await fetchAgents();
    return true;
  };

  return { agents, loading, createAgent, updateAgent, deleteAgent, refetch: fetchAgents };
}
