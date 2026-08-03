/**
 * Limite de velocidade por veículo.
 * Hierarquia: limite cadastrado no veículo > limite do tipo (configurável) > padrão global.
 */

import { supabase } from '@/integrations/supabase/client';

export const LIMITE_PADRAO_GLOBAL = 80;

/** Padrões de fábrica por tipo de veículo (km/h). */
export const LIMITES_POR_TIPO: Record<string, number> = {
  'Carro': 110,
  'Van': 90,
  'VUC': 90,
  'Caminhão Médio': 90,
  'Caminhão Pesado': 80,
  'Carreta': 80,
  'Moto': 110,
  'Celular': 110,
  'Pessoa': 110,
};

export const TIPOS_VEICULO_LIMITE = Object.keys(LIMITES_POR_TIPO);

/** Overrides carregados da configuração de logística. */
let limitesConfigurados: Record<string, number> = {};
let limiteGlobalConfigurado: number = LIMITE_PADRAO_GLOBAL;

export function setLimitesVelocidadeConfig(
  porTipo: Record<string, number> | null | undefined,
  global?: number | null
) {
  limitesConfigurados = { ...(porTipo || {}) };
  const g = Number(global);
  limiteGlobalConfigurado = Number.isFinite(g) && g > 0 ? g : LIMITE_PADRAO_GLOBAL;
}

export function getLimitesVelocidadeConfig() {
  return { porTipo: { ...limitesConfigurados }, global: limiteGlobalConfigurado };
}

/** Carrega os limites salvos em logistica_config (cacheado em memória). */
export async function carregarLimitesVelocidade(estabelecimentoId?: string | null) {
  try {
    let q = supabase
      .from('logistica_config')
      .select('limites_velocidade_tipo, limite_velocidade_global');
    if (estabelecimentoId) q = q.eq('estabelecimento_id', estabelecimentoId);
    const { data } = await q.limit(1).maybeSingle();
    if (data) {
      setLimitesVelocidadeConfig(
        (data as any).limites_velocidade_tipo as Record<string, number>,
        (data as any).limite_velocidade_global as number
      );
    }
  } catch {
    // mantém padrões
  }
  return getLimitesVelocidadeConfig();
}

function limiteDoTipo(tipo?: string | null): number | undefined {
  if (!tipo) return undefined;
  const key = tipo.trim();
  const cfg = Number(limitesConfigurados[key]);
  if (Number.isFinite(cfg) && cfg > 0) return cfg;
  return LIMITES_POR_TIPO[key];
}

export function limitePadraoPorTipo(tipo?: string | null): number {
  return limiteDoTipo(tipo) ?? limiteGlobalConfigurado;
}

/** Resolve o limite efetivo de um veículo. */
export function limiteDoVeiculo(
  veiculo: { limite_velocidade?: number | null; tipo_veiculo?: string | null } | null | undefined,
  fallbackGlobal?: number
): number {
  const proprio = Number(veiculo?.limite_velocidade);
  if (Number.isFinite(proprio) && proprio > 0) return proprio;
  const porTipo = limiteDoTipo(veiculo?.tipo_veiculo);
  if (porTipo) return porTipo;
  const global = Number(fallbackGlobal);
  return Number.isFinite(global) && global > 0 ? global : limiteGlobalConfigurado;
}
