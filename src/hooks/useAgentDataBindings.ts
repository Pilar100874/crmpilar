import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface DataBinding {
  id?: string;
  estabelecimento_id: string;
  agent_template_key: string;
  campo: string;
  label: string;
  descricao?: string;
  fonte_tipo: 'manual' | 'sistema' | 'api';
  valor_manual?: string;
  tabela_sistema?: string;
  coluna_sistema?: string;
  api_endpoint_id?: string;
  campo_api?: string;
  configurado: boolean;
}

export function useAgentDataBindings(estabelecimentoId: string) {
  const [bindings, setBindings] = useState<DataBinding[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchBindings = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('agent_data_bindings')
      .select('*')
      .eq('estabelecimento_id', estabelecimentoId);
    if (error) {
      console.error('Error fetching bindings:', error);
    } else {
      setBindings((data || []) as unknown as DataBinding[]);
    }
    setLoading(false);
  }, [estabelecimentoId]);

  useEffect(() => { fetchBindings(); }, [fetchBindings]);

  const upsertBinding = async (binding: Omit<DataBinding, 'id'>) => {
    const { error } = await supabase
      .from('agent_data_bindings')
      .upsert({
        estabelecimento_id: binding.estabelecimento_id,
        agent_template_key: binding.agent_template_key,
        campo: binding.campo,
        label: binding.label,
        descricao: binding.descricao || null,
        fonte_tipo: binding.fonte_tipo,
        valor_manual: binding.valor_manual || null,
        tabela_sistema: binding.tabela_sistema || null,
        coluna_sistema: binding.coluna_sistema || null,
        api_endpoint_id: binding.api_endpoint_id || null,
        campo_api: binding.campo_api || null,
        configurado: binding.configurado,
      } as any, { onConflict: 'estabelecimento_id,agent_template_key,campo' });
    if (error) {
      toast.error('Erro ao salvar binding: ' + error.message);
      return false;
    }
    await fetchBindings();
    return true;
  };

  const getBindingsForAgent = (templateKey: string) => {
    return bindings.filter(b => b.agent_template_key === templateKey);
  };

  const getProgressForAgent = (templateKey: string, totalCampos: number) => {
    const configured = bindings.filter(b => b.agent_template_key === templateKey && b.configurado).length;
    return totalCampos > 0 ? Math.round((configured / totalCampos) * 100) : 0;
  };

  return { bindings, loading, upsertBinding, getBindingsForAgent, getProgressForAgent, refetch: fetchBindings };
}
