/** Sugestão de estoque mínimo a partir do volume vendido e da sazonalidade. */
export interface VendaItem { data: string | Date; quantidade: number }

export interface SugestaoEstoque {
  sugerido: number;
  mediaDiaria: number;
  fatorSazonal: number;
  meses: number;
}

const STATUS_NAO_VENDA = ['em_aberto', 'rascunho', 'cancelado', 'perdido', 'recusado', 'expirado'];
export const contaComoVenda = (status?: string | null) => !!status && !STATUS_NAO_VENDA.includes(status);

/**
 * Média diária dos últimos 90 dias × fator sazonal (vendas do mesmo período do ano
 * anterior ÷ média mensal dos últimos 12 meses) × prazo de reposição, + 20% de segurança.
 */
export function sugerirEstoqueMinimo(vendas: VendaItem[], prazoDias: number, hoje = new Date()): SugestaoEstoque {
  const dia = 86400000;
  const t = hoje.getTime();
  const idade = (v: VendaItem) => (t - new Date(v.data).getTime()) / dia;
  const validas = vendas.filter(v => v.quantidade > 0 && idade(v) >= 0 && idade(v) <= 365);
  const soma = (f: (d: number) => boolean) => validas.filter(v => f(idade(v))).reduce((s, v) => s + v.quantidade, 0);
  const ultimos90 = soma(d => d <= 90);
  const ano = soma(() => true);
  const mediaDiaria = ultimos90 / 90;
  const mediaMensal = ano / 12;
  // Mesmo período do ano passado que corresponde aos próximos 30 dias.
  const proximoPeriodo = soma(d => d >= 335 && d <= 365);
  const fatorSazonal = mediaMensal > 0 && proximoPeriodo > 0
    ? Math.min(3, Math.max(0.5, proximoPeriodo / mediaMensal)) : 1;
  const meses = new Set(validas.map(v => { const d = new Date(v.data); return `${d.getFullYear()}-${d.getMonth()}`; })).size;
  const prazo = Math.max(1, prazoDias || 15);
  const sugerido = Math.ceil(mediaDiaria * fatorSazonal * prazo * 1.2);
  return { sugerido, mediaDiaria, fatorSazonal, meses };
}
