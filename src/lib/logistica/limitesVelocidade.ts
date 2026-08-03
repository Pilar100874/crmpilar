/**
 * Limite de velocidade por veículo.
 * Hierarquia: limite cadastrado no veículo > padrão do tipo de veículo > padrão global.
 */

export const LIMITE_PADRAO_GLOBAL = 80;

/** Padrões sugeridos por tipo de veículo (km/h). */
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

export function limitePadraoPorTipo(tipo?: string | null): number {
  if (!tipo) return LIMITE_PADRAO_GLOBAL;
  return LIMITES_POR_TIPO[tipo.trim()] ?? LIMITE_PADRAO_GLOBAL;
}

/** Resolve o limite efetivo de um veículo. */
export function limiteDoVeiculo(
  veiculo: { limite_velocidade?: number | null; tipo_veiculo?: string | null } | null | undefined,
  fallbackGlobal?: number
): number {
  const proprio = Number(veiculo?.limite_velocidade);
  if (Number.isFinite(proprio) && proprio > 0) return proprio;
  const porTipo = veiculo?.tipo_veiculo ? LIMITES_POR_TIPO[veiculo.tipo_veiculo.trim()] : undefined;
  if (porTipo) return porTipo;
  const global = Number(fallbackGlobal);
  return Number.isFinite(global) && global > 0 ? global : LIMITE_PADRAO_GLOBAL;
}
