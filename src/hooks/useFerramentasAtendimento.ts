import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Image, Paperclip, Variable, Zap, FileCheck, Languages, FileText, Bot, Webhook, UserPlus, Wand2, Sparkles, BookOpen, CalendarPlus, Target, Package, type LucideIcon } from 'lucide-react';

// Mapa de ícones disponíveis
const ICON_MAP: Record<string, LucideIcon> = {
  Image, Paperclip, Variable, Zap, FileCheck, Languages, FileText, Bot, Webhook, UserPlus, Wand2, Sparkles, BookOpen, CalendarPlus, Target, Package
};

const STOCK_TOOL_ID = 'tool-stock';

export interface FerramentaConfig {
  id: string;
  ferramenta_id: string;
  nome: string;
  icone: string;
  IconComponent: LucideIcon;
  descricao: string | null;
  aba_chat: boolean;
  aba_agenda: boolean;
  aba_email: boolean;
  aba_orcamento: boolean;
  radial_chat: boolean;
  radial_agenda: boolean;
  radial_email: boolean;
  radial_orcamento: boolean;
  tipo: string;
  ativo: boolean;
}

export type TabType = 'chat' | 'agenda' | 'email' | 'orcamento';

export function useFerramentasAtendimento(estabelecimentoId: string | null) {
  const [ferramentas, setFerramentas] = useState<FerramentaConfig[]>([]);
  const [loading, setLoading] = useState(true);

  const normalizeFerramenta = useCallback((f: any) => ({
    ...f,
    tipo: f.ferramenta_id === STOCK_TOOL_ID ? 'ferramenta' : f.tipo,
    aba_chat: f.ferramenta_id === STOCK_TOOL_ID ? true : f.aba_chat,
    radial_chat: f.ferramenta_id === STOCK_TOOL_ID ? false : f.radial_chat,
    IconComponent: ICON_MAP[f.icone] || Wand2
  }) as FerramentaConfig, []);

  const loadFerramentas = useCallback(async () => {
    if (!estabelecimentoId) return;
    
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('ferramentas_atendimento')
        .select('*')
        .eq('estabelecimento_id', estabelecimentoId)
        .eq('ativo', true)
        .order('ordem');

      if (error) throw error;

      const mapped = (data || []).map(normalizeFerramenta);

      setFerramentas(mapped);
    } catch (error) {
      console.error('Erro ao carregar ferramentas:', error);
    } finally {
      setLoading(false);
    }
  }, [estabelecimentoId, normalizeFerramenta]);

  useEffect(() => {
    loadFerramentas();
  }, [loadFerramentas]);

  // Retorna ferramentas para uma aba específica (toolbar)
  const getToolbarFerramentas = useCallback((tab: TabType) => {
    const field = `aba_${tab}` as keyof FerramentaConfig;
    return ferramentas.filter(f => f[field] === true);
  }, [ferramentas]);

  // Retorna ferramentas para o RadialMenu de uma aba específica
  const getRadialFerramentas = useCallback((tab: TabType) => {
    const field = `radial_${tab}` as keyof FerramentaConfig;
    return ferramentas.filter(f => f[field] === true);
  }, [ferramentas]);

  // Retorna TODAS as ferramentas de uma aba (toolbar + radial, sem duplicatas)
  const getAllFerramentas = useCallback((tab: TabType) => {
    const abaField = `aba_${tab}` as keyof FerramentaConfig;
    const radialField = `radial_${tab}` as keyof FerramentaConfig;
    return ferramentas.filter(f => f[abaField] === true || f[radialField] === true);
  }, [ferramentas]);

  // Converte ferramentas para o formato do RadialMenu
  const getRadialMenuItems = useCallback((tab: TabType) => {
    const radialFerramentas = getRadialFerramentas(tab);
    return radialFerramentas.map(f => ({
      id: f.ferramenta_id,
      icon: f.IconComponent,
      label: f.nome
    }));
  }, [getRadialFerramentas]);

  return {
    ferramentas,
    loading,
    loadFerramentas,
    getToolbarFerramentas,
    getRadialFerramentas,
    getRadialMenuItems,
    getAllFerramentas
  };
}
