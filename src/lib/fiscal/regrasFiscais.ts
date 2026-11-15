export type Destino = "interna" | "interestadual" | "exterior";
export interface RegraFiscal {
  id?: string; nome: string; operacao: string; destino: Destino; regime?: string | null; ncm_prefixo?: string | null;
  cfop: string; cst?: string | null; aliq_icms: number; aliq_ipi: number; aliq_pis: number; aliq_cofins: number; ativo?: boolean;
}
export const OPERACOES = [
  { valor: "venda", rotulo: "Venda de mercadoria" },
  { valor: "venda_producao", rotulo: "Venda de produção própria" },
  { valor: "devolucao_compra", rotulo: "Devolução de compra" },
  { valor: "remessa_conserto", rotulo: "Remessa para conserto" },
  { valor: "bonificacao", rotulo: "Bonificação / brinde" },
  { valor: "compra", rotulo: "Compra para comercialização" },
  { valor: "compra_industrializacao", rotulo: "Compra para industrialização" },
] as const;

/** CFOP padrão por operação (dentro do estado / fora do estado). Saídas 5/6, entradas 1/2, exterior 7/3. */
const CFOPS: Record<string, [string, string, string]> = {
  venda: ["5102", "6102", "7102"], venda_producao: ["5101", "6101", "7101"], devolucao_compra: ["5202", "6202", "7202"],
  remessa_conserto: ["5915", "6915", "7949"], bonificacao: ["5910", "6910", "7949"],
  compra: ["1102", "2102", "3102"], compra_industrializacao: ["1101", "2101", "3101"],
};
export const ehSimples = (regime?: string | null) => regime === "simples_nacional" || regime === "mei";
export const destinoOperacao = (ufOrigem?: string | null, ufDestino?: string | null): Destino =>
  ufDestino === "EX" ? "exterior" : !ufOrigem || !ufDestino || ufOrigem.toUpperCase() === ufDestino.toUpperCase() ? "interna" : "interestadual";
export const cfopPadrao = (operacao: string, destino: Destino) => (CFOPS[operacao] ?? CFOPS.venda)[destino === "interna" ? 0 : destino === "interestadual" ? 1 : 2];

/** Escolhe a regra ativa mais específica: mesma operação e destino, regime igual (ou vazio) e maior prefixo de NCM. */
export function escolherRegra(regras: RegraFiscal[], q: { operacao: string; destino: Destino; regime?: string | null; ncm?: string | null }): RegraFiscal {
  const ncm = (q.ncm ?? "").replace(/\D/g, "");
  const cand = regras.filter((r) => r.ativo !== false && r.operacao === q.operacao && r.destino === q.destino
    && (!r.regime || r.regime === q.regime) && (!r.ncm_prefixo || ncm.startsWith(r.ncm_prefixo.replace(/\D/g, ""))));
  cand.sort((a, b) => (b.ncm_prefixo?.length ?? 0) - (a.ncm_prefixo?.length ?? 0) || Number(!!b.regime) - Number(!!a.regime));
  if (cand[0]) return cand[0];
  const simples = ehSimples(q.regime);
  return { nome: "Padrão do sistema", operacao: q.operacao, destino: q.destino, cfop: cfopPadrao(q.operacao, q.destino),
    cst: simples ? "102" : "00", aliq_icms: 0, aliq_ipi: 0, aliq_pis: 0, aliq_cofins: 0 };
}

const r2 = (n: number) => Math.round(n * 100) / 100;
/** Impostos destacados no item. No Simples (CSOSN 102/103/300/400/500) não há destaque de ICMS, PIS e COFINS. */
export function calcularImpostos(valor: number, regra: RegraFiscal, regime?: string | null) {
  const simples = ehSimples(regime);
  const destacaIcms = !simples || ["101", "201", "900"].includes(regra.cst ?? "");
  const ipi = r2(valor * regra.aliq_ipi / 100);
  const icms = destacaIcms ? r2(valor * regra.aliq_icms / 100) : 0;
  const pis = simples ? 0 : r2(valor * regra.aliq_pis / 100);
  const cofins = simples ? 0 : r2(valor * regra.aliq_cofins / 100);
  return { icms, ipi, pis, cofins, total: r2(valor + ipi) };
}

/** Regras sugeridas para começar: operações comuns dentro e fora do estado. */
export function regrasSugeridas(regime: string): RegraFiscal[] {
  const simples = ehSimples(regime);
  const out: RegraFiscal[] = [];
  for (const op of ["venda", "venda_producao", "devolucao_compra", "bonificacao"]) for (const destino of ["interna", "interestadual"] as Destino[]) {
    out.push({ nome: `${OPERACOES.find((o) => o.valor === op)!.rotulo} - ${destino === "interna" ? "dentro do estado" : "fora do estado"}`,
      operacao: op, destino, regime, cfop: cfopPadrao(op, destino), cst: simples ? "102" : "00",
      aliq_icms: simples ? 0 : destino === "interna" ? 18 : 12, aliq_ipi: 0,
      aliq_pis: simples ? 0 : regime === "lucro_real" ? 1.65 : 0.65, aliq_cofins: simples ? 0 : regime === "lucro_real" ? 7.6 : 3 });
  }
  return out;
}
