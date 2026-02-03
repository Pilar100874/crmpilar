import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface EnvioMassaTemplate {
  id: string;
  nome: string;
  conteudo: string;
  descricao?: string | null;
  ativo: boolean;
  ordem: number;
}

export function useEnvioMassaTemplates(estabelecimentoId: string) {
  const [templates, setTemplates] = useState<EnvioMassaTemplate[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTemplates = async () => {
    if (!estabelecimentoId) return;
    
    try {
      const { data, error } = await supabase
        .from('envio_massa_templates')
        .select('*')
        .eq('estabelecimento_id', estabelecimentoId)
        .eq('ativo', true)
        .order('ordem');

      if (error) throw error;
      setTemplates(data || []);
    } catch (error: any) {
      console.error('Error fetching templates:', error);
      toast.error('Erro ao carregar templates');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTemplates();
  }, [estabelecimentoId]);

  return {
    templates,
    loading,
    refetch: fetchTemplates
  };
}
