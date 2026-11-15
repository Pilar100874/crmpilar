/** Motor fiscal externo (Systax): operações, cadastros fiscais e montagem/leitura da consulta tributária. */
export type Destino = "interna" | "interestadual" | "exterior";
export const OPERACOES = [
  { valor: "venda", rotulo: "Venda de mercadoria" },
  { valor: "venda_producao", rotulo: "Venda de produção própria" },
  { valor: "devolucao_compra", rotulo: "Devolução de compra" },
  { valor: "remessa_conserto", rotulo: "Remessa para conserto" },
  { valor: "bonificacao", rotulo: "Bonificação / brinde" },
] as const;
export const TIPOS_ITEM_FISCAL = [
  { valor: "revenda", rotulo: "Mercadoria para revenda" },
  { valor: "producao_propria", rotulo: "Produto de fabricação própria" },
  { valor: "materia_prima", rotulo: "Matéria-prima" },
  { valor: "embalagem", rotulo: "Embalagem" },
  { valor: "uso_consumo", rotulo: "Uso e consumo" },
  { valor: "ativo_imobilizado", rotulo: "Ativo imobilizado" },
] as const;
export const CONTRIBUINTE_ICMS = [
  { valor: "1", rotulo: "Contribuinte de ICMS" },
  { valor: "2", rotulo: "Contribuinte isento de inscrição" },
  { valor: "9", rotulo: "Não contribuinte" },
] as const;
export const CRT = [
  { valor: "1", rotulo: "1 - Simples Nacional" },
  { valor: "2", rotulo: "2 - Simples Nacional, excesso de sublimite" },
  { valor: "3", rotulo: "3 - Regime Normal (Presumido/Real)" },
  { valor: "4", rotulo: "4 - MEI" },
] as const;

export const FINALIDADES_NFE = [
  { valor: 1, rotulo: "1 - Normal" },
  { valor: 2, rotulo: "2 - Complementar" },
  { valor: 3, rotulo: "3 - Ajuste" },
  { valor: 4, rotulo: "4 - Devolução / retorno" },
] as const;
export const DESTINACOES = [
  { valor: "revenda", rotulo: "Revenda" },
  { valor: "industrializacao", rotulo: "Industrialização" },
  { valor: "uso_consumo", rotulo: "Uso e consumo" },
  { valor: "ativo", rotulo: "Ativo imobilizado" },
] as const;
export const PRESENCAS = [
  { valor: "1", rotulo: "Presencial" },
  { valor: "2", rotulo: "Internet" },
  { valor: "3", rotulo: "Telefone / teleatendimento" },
  { valor: "4", rotulo: "Entrega a domicílio (NFC-e)" },
  { valor: "5", rotulo: "Presencial fora do estabelecimento" },
  { valor: "9", rotulo: "Outros (representante)" },
] as const;
/** Consumidor final da venda: escolha do pedido > uso/consumo ou ativo > cadastro do cliente > não contribuinte. */
export function consumidorFinalVenda(escolha: boolean | null | undefined, destinacao: string | null | undefined, cadastro: boolean | null | undefined, indicadorIe: string): boolean {
  if (escolha === true || escolha === false) return escolha;
  if (destinacao === "uso_consumo" || destinacao === "ativo") return true;
  if (destinacao === "revenda" || destinacao === "industrializacao") return false;
  return !!cadastro || indicadorIe === "9";
}

const dig = (s?: string | null) => (s ?? "").replace(/\D/g, "");
export const destinoOperacao = (ufOrigem?: string | null, ufDestino?: string | null): Destino =>
  ufDestino === "EX" ? "exterior" : !ufOrigem || !ufDestino || ufOrigem.toUpperCase() === ufDestino.toUpperCase() ? "interna" : "interestadual";
/** Origem da mercadoria no padrão NF-e (0–8); aceita os valores antigos "nacional"/"importado". */
export const origemNfe = (o?: string | null) => (/^[0-8]$/.test(o ?? "") ? o! : o === "importado" ? "2" : "0");
/** Contribuinte: usa o indicador do cadastro; sem ele, tem IE = contribuinte, senão não contribuinte. */
export const indicadorContribuinte = (e: { contribuinte_icms?: string | null; inscricao_estadual?: string | null }) =>
  e.contribuinte_icms || (dig(e.inscricao_estadual) ? "1" : "9");

export interface ItemConsulta { produto_id?: string | null; ncm?: string | null; cest?: string | null; ex_tipi?: string | null; origem?: string | null; tipo_item_fiscal?: string | null; codigo_beneficio_fiscal?: string | null; valor: number; quantidade: number }
export interface ConsultaFiscal {
  operacao: string;
  emitente: { cnpj?: string | null; uf?: string | null; regime_tributario?: string | null; crt?: string | null; cnae_fiscal?: string | null };
  destinatario: { cnpj?: string | null; uf?: string | null; regime_tributario?: string | null; contribuinte_icms?: string | null; inscricao_estadual?: string | null; consumidor_final?: boolean | null; inscricao_suframa?: string | null; cnae_fiscal?: string | null };
  itens: ItemConsulta[];
  /** Dados do pedido (opcionais). */
  pedido?: { finalidade_nfe?: number | null; consumidor_final?: boolean | null; destinacao?: string | null; presenca?: string | null };
}
/** Lista o que falta nos cadastros para o motor fiscal calcular. */
export function faltasConsulta(c: ConsultaFiscal): string[] {
  const f: string[] = [];
  if (dig(c.emitente.cnpj).length !== 14) f.push("CNPJ da unidade emissora");
  if (!c.emitente.uf) f.push("UF da unidade emissora");
  if (!c.emitente.regime_tributario) f.push("regime tributário da unidade");
  if (!c.destinatario.uf) f.push("UF do cliente");
  c.itens.forEach((i, k) => { if (dig(i.ncm).length !== 8) f.push(`NCM do item ${k + 1}`); });
  return f;
}
/** Corpo normalizado enviado ao motor fiscal. */
export function montarConsulta(c: ConsultaFiscal) {
  return {
    operacao: c.operacao,
    finalidade_nfe: c.pedido?.finalidade_nfe ?? 1,
    destinacao: c.pedido?.destinacao || null,
    presenca_comprador: c.pedido?.presenca || null,
    destino: destinoOperacao(c.emitente.uf, c.destinatario.uf),
    emitente: { cnpj: dig(c.emitente.cnpj), uf: c.emitente.uf?.toUpperCase(), regime: c.emitente.regime_tributario, crt: c.emitente.crt || null, cnae: dig(c.emitente.cnae_fiscal) || null },
    destinatario: { documento: dig(c.destinatario.cnpj), uf: c.destinatario.uf?.toUpperCase(), regime: c.destinatario.regime_tributario || null,
      indicador_ie: indicadorContribuinte(c.destinatario), consumidor_final: consumidorFinalVenda(c.pedido?.consumidor_final, c.pedido?.destinacao, c.destinatario.consumidor_final, indicadorContribuinte(c.destinatario)),
      suframa: c.destinatario.inscricao_suframa || null, cnae: dig(c.destinatario.cnae_fiscal) || null },
    itens: c.itens.map((i, k) => ({ item: k + 1, ncm: dig(i.ncm), cest: dig(i.cest) || null, ex_tipi: i.ex_tipi || null, origem: origemNfe(i.origem),
      finalidade: i.tipo_item_fiscal || "revenda", beneficio_fiscal: i.codigo_beneficio_fiscal || null, valor: i.valor, quantidade: i.quantidade })),
  };
}

export interface TributacaoItem { cfop: string; cst: string | null; aliq_icms: number; valor_icms: number; aliq_ipi: number; valor_ipi: number; aliq_pis: number; valor_pis: number; aliq_cofins: number; valor_cofins: number; valor_icms_st: number; valor_fcp: number; valor_difal: number; bruto: unknown }
const n = (...v: unknown[]) => { for (const x of v) if (x !== undefined && x !== null && x !== "") return Number(x) || 0; return 0; };
/** Lê o retorno do motor aceitando nomes de campos usuais (cfop, cst/csosn, aliquota_icms, valor_icms…). */
export function lerTributacao(r: any): TributacaoItem {
  const ic = r?.icms ?? {}, ip = r?.ipi ?? {}, pi = r?.pis ?? {}, co = r?.cofins ?? {}, st = r?.icms_st ?? r?.st ?? {};
  return {
    cfop: String(r?.cfop ?? ""), cst: (r?.csosn ?? r?.cst ?? ic.csosn ?? ic.cst ?? null) as string | null,
    aliq_icms: n(r?.aliquota_icms, ic.aliquota), valor_icms: n(r?.valor_icms, ic.valor),
    aliq_ipi: n(r?.aliquota_ipi, ip.aliquota), valor_ipi: n(r?.valor_ipi, ip.valor),
    aliq_pis: n(r?.aliquota_pis, pi.aliquota), valor_pis: n(r?.valor_pis, pi.valor),
    aliq_cofins: n(r?.aliquota_cofins, co.aliquota), valor_cofins: n(r?.valor_cofins, co.valor),
    valor_icms_st: n(r?.valor_icms_st, st.valor), valor_fcp: n(r?.valor_fcp, ic.valor_fcp), valor_difal: n(r?.valor_difal, r?.difal?.valor), bruto: r,
  };
}
