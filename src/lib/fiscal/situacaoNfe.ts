/** Situações reais de uma NF-e. Falha de rede nunca é tratada como rejeição fiscal. */
export const SITUACOES_NFE = [
  { valor: "rascunho", rotulo: "Rascunho" },
  { valor: "aguardando_calculo", rotulo: "Aguardando cálculo" },
  { valor: "validada", rotulo: "Validada" },
  { valor: "na_fila", rotulo: "Na fila" },
  { valor: "processando", rotulo: "Em processamento" },
  { valor: "autorizada", rotulo: "Autorizada" },
  { valor: "rejeitada", rotulo: "Rejeitada" },
  { valor: "cancelada", rotulo: "Cancelada" },
  { valor: "erro_comunicacao", rotulo: "Erro de comunicação" },
  { valor: "desconhecida", rotulo: "Situação desconhecida" },
  { valor: "contingencia", rotulo: "Contingência" },
] as const;
export type SituacaoNfe = (typeof SITUACOES_NFE)[number]["valor"];
export const rotuloSituacao = (s?: string | null) => SITUACOES_NFE.find((x) => x.valor === s)?.rotulo ?? "Rascunho";
/** Pendente = ainda não tem resultado final da SEFAZ. */
export const situacaoPendente = (s?: string | null) => !["autorizada", "rejeitada", "cancelada"].includes(s ?? "rascunho");

type NotaResumo = { situacao?: string | null; valor_total?: number | null; data_emissao?: string | null; created_at?: string };
/** Indicadores do painel: só notas autorizadas somam no faturado. */
export function resumoFaturamento(notas: NotaResumo[]) {
  const aut = notas.filter((n) => n.situacao === "autorizada");
  const total = aut.reduce((s, n) => s + Number(n.valor_total ?? 0), 0);
  return {
    total, emitidas: aut.length,
    rejeitadas: notas.filter((n) => n.situacao === "rejeitada").length,
    canceladas: notas.filter((n) => n.situacao === "cancelada").length,
    pendentes: notas.filter((n) => situacaoPendente(n.situacao)).length,
    ticketMedio: aut.length ? total / aut.length : 0,
  };
}
/** Faturado (autorizadas) por mês AAAA-MM. */
export function porMes(notas: NotaResumo[]) {
  const m = new Map<string, number>();
  for (const n of notas) if (n.situacao === "autorizada") {
    const k = (n.data_emissao ?? n.created_at ?? "").slice(0, 7); if (k) m.set(k, (m.get(k) ?? 0) + Number(n.valor_total ?? 0));
  }
  return [...m.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([mes, valor]) => ({ mes, valor }));
}
