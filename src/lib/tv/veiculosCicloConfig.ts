import { supabase } from '@/integrations/supabase/client';
import { getEstabelecimentoId } from '@/lib/estabelecimentoUtils';

export interface TvVeiculosCicloConfig {
  autonomo_ativo: boolean;
  overview_segundos: number;
  foco_segundos: number;
  trilha_minutos: number;
  pausa_interacao_segundos: number;
  quiosque_ativo: boolean;
  pausa_falha_segundos: number;
}

export const TV_VEICULOS_CICLO_PADRAO: TvVeiculosCicloConfig = {
  autonomo_ativo: true,
  overview_segundos: 25,
  foco_segundos: 15,
  trilha_minutos: 15,
  pausa_interacao_segundos: 90,
  quiosque_ativo: true,
  pausa_falha_segundos: 60,
};

const CACHE_KEY = 'tv:veiculos:cicloConfig';

export function lerCicloConfigCache(): TvVeiculosCicloConfig {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (raw) return { ...TV_VEICULOS_CICLO_PADRAO, ...JSON.parse(raw) };
  } catch {}
  return TV_VEICULOS_CICLO_PADRAO;
}

export async function carregarCicloConfig(): Promise<TvVeiculosCicloConfig> {
  try {
    const estabId = await getEstabelecimentoId();
    if (!estabId) return lerCicloConfigCache();
    const { data } = await supabase
      .from('tv_veiculos_config')
      .select('autonomo_ativo, overview_segundos, foco_segundos, trilha_minutos, pausa_interacao_segundos, quiosque_ativo, pausa_falha_segundos')
      .eq('estabelecimento_id', estabId)
      .maybeSingle();
    const cfg = { ...TV_VEICULOS_CICLO_PADRAO, ...(data || {}) } as TvVeiculosCicloConfig;
    try { localStorage.setItem(CACHE_KEY, JSON.stringify(cfg)); } catch {}
    return cfg;
  } catch {
    return lerCicloConfigCache();
  }
}

export async function salvarCicloConfig(cfg: TvVeiculosCicloConfig): Promise<void> {
  const estabId = await getEstabelecimentoId();
  if (!estabId) throw new Error('Estabelecimento não identificado');
  const { error } = await supabase
    .from('tv_veiculos_config')
    .upsert({ estabelecimento_id: estabId, ...cfg }, { onConflict: 'estabelecimento_id' });
  if (error) throw error;
  try { localStorage.setItem(CACHE_KEY, JSON.stringify(cfg)); } catch {}
}
