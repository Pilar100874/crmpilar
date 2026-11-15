/** Motor fiscal externo (Systax): operações, cadastros fiscais e montagem/leitura da consulta tributária. */
export type Destino = "interna" | "interestadual" | "exterior";
/** Operações fiscais (base enviada ao Systax). Catálogo amplo das naturezas usuais da NF-e. */
export const OPERACOES = [
  { valor: "venda", rotulo: "Venda de mercadoria (revenda)", natureza: "Venda de mercadoria adquirida de terceiros", finalidade: 1, estoque: true, financeiro: true, entrada: false },
  { valor: "venda_producao", rotulo: "Venda de produção própria", natureza: "Venda de produção do estabelecimento", finalidade: 1, estoque: true, financeiro: true, entrada: false },
  { valor: "venda_st_substituto", rotulo: "Venda com ST (substituto tributário)", natureza: "Venda de mercadoria com ICMS-ST retido", finalidade: 1, estoque: true, financeiro: true, entrada: false },
  { valor: "venda_st_substituido", rotulo: "Venda de mercadoria com ST já retida", natureza: "Venda de mercadoria sujeita a ST recebida anteriormente", finalidade: 1, estoque: true, financeiro: true, entrada: false },
  { valor: "venda_consumidor_final", rotulo: "Venda para consumidor final (não contribuinte)", natureza: "Venda a não contribuinte", finalidade: 1, estoque: true, financeiro: true, entrada: false },
  { valor: "venda_ativo", rotulo: "Venda de ativo imobilizado", natureza: "Venda de bem do ativo imobilizado", finalidade: 1, estoque: true, financeiro: true, entrada: false },
  { valor: "venda_uso_consumo", rotulo: "Venda de material de uso e consumo", natureza: "Venda de material de uso ou consumo", finalidade: 1, estoque: true, financeiro: true, entrada: false },
  { valor: "venda_entrega_futura", rotulo: "Venda para entrega futura (faturamento)", natureza: "Venda para entrega futura", finalidade: 1, estoque: false, financeiro: true, entrada: false },
  { valor: "remessa_entrega_futura", rotulo: "Remessa de venda para entrega futura", natureza: "Remessa de mercadoria vendida para entrega futura", finalidade: 1, estoque: true, financeiro: false, entrada: false },
  { valor: "venda_ordem", rotulo: "Venda à ordem (adquirente original)", natureza: "Venda de mercadoria à ordem", finalidade: 1, estoque: false, financeiro: true, entrada: false },
  { valor: "remessa_venda_ordem", rotulo: "Remessa por conta e ordem de terceiros", natureza: "Remessa por conta e ordem de terceiros em venda à ordem", finalidade: 1, estoque: true, financeiro: false, entrada: false },
  { valor: "venda_conta_ordem", rotulo: "Venda por conta e ordem de terceiros", natureza: "Venda por conta e ordem de terceiros", finalidade: 1, estoque: true, financeiro: true, entrada: false },
  { valor: "venda_zfm", rotulo: "Venda para Zona Franca de Manaus / ALC", natureza: "Venda para Zona Franca de Manaus", finalidade: 1, estoque: true, financeiro: true, entrada: false },
  { valor: "venda_trading", rotulo: "Venda com fim específico de exportação", natureza: "Venda com fim específico de exportação", finalidade: 1, estoque: true, financeiro: true, entrada: false },
  { valor: "exportacao", rotulo: "Exportação direta", natureza: "Venda para o exterior", finalidade: 1, estoque: true, financeiro: true, entrada: false },
  { valor: "venda_industrializacao", rotulo: "Venda de produção para industrialização", natureza: "Venda de produção para industrialização", finalidade: 1, estoque: true, financeiro: true, entrada: false },
  { valor: "venda_fora_estabelecimento", rotulo: "Venda fora do estabelecimento", natureza: "Venda fora do estabelecimento", finalidade: 1, estoque: true, financeiro: true, entrada: false },
  { valor: "remessa_fora_estabelecimento", rotulo: "Remessa para venda fora do estabelecimento", natureza: "Remessa para venda fora do estabelecimento", finalidade: 1, estoque: true, financeiro: false, entrada: false },
  { valor: "retorno_fora_estabelecimento", rotulo: "Retorno de remessa para venda fora", natureza: "Retorno de mercadoria remetida para venda fora do estabelecimento", finalidade: 1, estoque: true, financeiro: false, entrada: false },
  { valor: "transferencia_producao", rotulo: "Transferência de produção entre filiais", natureza: "Transferência de produção do estabelecimento", finalidade: 1, estoque: true, financeiro: false, entrada: false },
  { valor: "transferencia", rotulo: "Transferência de mercadoria entre filiais", natureza: "Transferência de mercadoria adquirida de terceiros", finalidade: 1, estoque: true, financeiro: false, entrada: false },
  { valor: "transferencia_ativo", rotulo: "Transferência de ativo imobilizado", natureza: "Transferência de bem do ativo imobilizado", finalidade: 1, estoque: true, financeiro: false, entrada: false },
  { valor: "transferencia_uso_consumo", rotulo: "Transferência de uso e consumo", natureza: "Transferência de material de uso e consumo", finalidade: 1, estoque: true, financeiro: false, entrada: false },
  { valor: "bonificacao", rotulo: "Bonificação / brinde", natureza: "Remessa em bonificação", finalidade: 1, estoque: true, financeiro: false, entrada: false },
  { valor: "amostra_gratis", rotulo: "Amostra grátis", natureza: "Remessa de amostra grátis", finalidade: 1, estoque: true, financeiro: false, entrada: false },
  { valor: "doacao", rotulo: "Doação", natureza: "Remessa em doação", finalidade: 1, estoque: true, financeiro: false, entrada: false },
  { valor: "brinde", rotulo: "Brinde", natureza: "Remessa de brinde", finalidade: 1, estoque: true, financeiro: false, entrada: false },
  { valor: "demonstracao", rotulo: "Remessa para demonstração", natureza: "Remessa de mercadoria para demonstração", finalidade: 1, estoque: true, financeiro: false, entrada: false },
  { valor: "retorno_demonstracao", rotulo: "Retorno de demonstração", natureza: "Retorno de mercadoria remetida para demonstração", finalidade: 1, estoque: true, financeiro: false, entrada: false },
  { valor: "consignacao", rotulo: "Remessa em consignação", natureza: "Remessa em consignação mercantil", finalidade: 1, estoque: true, financeiro: false, entrada: false },
  { valor: "venda_consignacao", rotulo: "Venda de consignação", natureza: "Venda de mercadoria recebida em consignação", finalidade: 1, estoque: true, financeiro: true, entrada: false },
  { valor: "devolucao_consignacao", rotulo: "Devolução de consignação", natureza: "Devolução de mercadoria recebida em consignação", finalidade: 4, estoque: true, financeiro: false, entrada: false },
  { valor: "industrializacao_remessa", rotulo: "Remessa para industrialização", natureza: "Remessa para industrialização por encomenda", finalidade: 1, estoque: true, financeiro: false, entrada: false },
  { valor: "industrializacao_retorno", rotulo: "Retorno de industrialização (insumos)", natureza: "Retorno de insumo remetido para industrialização", finalidade: 1, estoque: true, financeiro: false, entrada: false },
  { valor: "industrializacao_cobranca", rotulo: "Cobrança de industrialização", natureza: "Industrialização efetuada para outra empresa", finalidade: 1, estoque: true, financeiro: true, entrada: false },
  { valor: "remessa_conserto", rotulo: "Remessa para conserto / reparo", natureza: "Remessa para conserto ou reparo", finalidade: 1, estoque: false, financeiro: false, entrada: false },
  { valor: "retorno_conserto", rotulo: "Retorno de conserto", natureza: "Retorno de mercadoria recebida para conserto", finalidade: 1, estoque: false, financeiro: false, entrada: false },
  { valor: "comodato", rotulo: "Remessa em comodato", natureza: "Remessa de bem por conta de contrato de comodato", finalidade: 1, estoque: false, financeiro: false, entrada: false },
  { valor: "retorno_comodato", rotulo: "Retorno de comodato", natureza: "Retorno de bem recebido em comodato", finalidade: 1, estoque: false, financeiro: false, entrada: false },
  { valor: "locacao", rotulo: "Remessa em locação", natureza: "Remessa de bem para locação", finalidade: 1, estoque: false, financeiro: false, entrada: false },
  { valor: "retorno_locacao", rotulo: "Retorno de locação", natureza: "Retorno de bem recebido em locação", finalidade: 1, estoque: false, financeiro: false, entrada: false },
  { valor: "armazem_remessa", rotulo: "Remessa para armazém geral / depósito", natureza: "Remessa para depósito fechado ou armazém geral", finalidade: 1, estoque: true, financeiro: false, entrada: false },
  { valor: "armazem_retorno", rotulo: "Retorno de armazém geral / depósito", natureza: "Retorno de mercadoria depositada", finalidade: 1, estoque: true, financeiro: false, entrada: false },
  { valor: "vasilhame", rotulo: "Remessa de vasilhame / sacaria", natureza: "Remessa de vasilhame ou sacaria", finalidade: 1, estoque: false, financeiro: false, entrada: false },
  { valor: "retorno_vasilhame", rotulo: "Retorno de vasilhame / sacaria", natureza: "Retorno de vasilhame ou sacaria", finalidade: 1, estoque: false, financeiro: false, entrada: false },
  { valor: "embalagem_remessa", rotulo: "Remessa de embalagem retornável", natureza: "Remessa de embalagem", finalidade: 1, estoque: false, financeiro: false, entrada: false },
  { valor: "feira", rotulo: "Remessa para feira / exposição", natureza: "Remessa para exposição ou feira", finalidade: 1, estoque: false, financeiro: false, entrada: false },
  { valor: "retorno_feira", rotulo: "Retorno de feira / exposição", natureza: "Retorno de mercadoria remetida para exposição ou feira", finalidade: 1, estoque: false, financeiro: false, entrada: false },
  { valor: "garantia", rotulo: "Remessa em garantia (troca)", natureza: "Remessa de mercadoria em substituição por garantia", finalidade: 1, estoque: true, financeiro: false, entrada: false },
  { valor: "troca", rotulo: "Remessa em troca", natureza: "Remessa de mercadoria em troca", finalidade: 1, estoque: true, financeiro: false, entrada: false },
  { valor: "perda", rotulo: "Baixa por perda / roubo / deterioração", natureza: "Baixa de estoque por perda, roubo ou deterioração", finalidade: 1, estoque: true, financeiro: false, entrada: false },
  { valor: "devolucao_compra", rotulo: "Devolução de compra (revenda)", natureza: "Devolução de compra para comercialização", finalidade: 4, estoque: true, financeiro: false, entrada: false },
  { valor: "devolucao_compra_industrializacao", rotulo: "Devolução de compra para industrialização", natureza: "Devolução de compra para industrialização", finalidade: 4, estoque: true, financeiro: false, entrada: false },
  { valor: "devolucao_compra_st", rotulo: "Devolução de compra com ST", natureza: "Devolução de compra com substituição tributária", finalidade: 4, estoque: true, financeiro: false, entrada: false },
  { valor: "devolucao_compra_ativo", rotulo: "Devolução de compra de ativo / uso e consumo", natureza: "Devolução de compra de bem para ativo ou uso e consumo", finalidade: 4, estoque: true, financeiro: false, entrada: false },
  { valor: "devolucao_venda", rotulo: "Devolução de venda (entrada)", natureza: "Devolução de venda", finalidade: 4, estoque: true, financeiro: false, entrada: true },
  { valor: "complementar_valor", rotulo: "Nota complementar de valor", natureza: "Complemento de valor", finalidade: 2, estoque: false, financeiro: true, entrada: false },
  { valor: "complementar_icms", rotulo: "Nota complementar de ICMS / IPI", natureza: "Complemento de ICMS", finalidade: 2, estoque: false, financeiro: false, entrada: false },
  { valor: "ajuste", rotulo: "Nota de ajuste", natureza: "Lançamento efetuado a título de ajuste", finalidade: 3, estoque: false, financeiro: false, entrada: false },
  { valor: "estorno", rotulo: "Estorno de NF-e não cancelada", natureza: "Estorno de nota fiscal", finalidade: 3, estoque: false, financeiro: false, entrada: false },
  { valor: "compra", rotulo: "Compra para revenda (entrada)", natureza: "Compra para comercialização", finalidade: 1, estoque: true, financeiro: true, entrada: true },
  { valor: "compra_industrializacao", rotulo: "Compra para industrialização (entrada)", natureza: "Compra para industrialização", finalidade: 1, estoque: true, financeiro: true, entrada: true },
  { valor: "compra_st", rotulo: "Compra com ST (entrada)", natureza: "Compra para comercialização com ST", finalidade: 1, estoque: true, financeiro: true, entrada: true },
  { valor: "compra_uso_consumo", rotulo: "Compra de uso e consumo (entrada)", natureza: "Compra de material para uso ou consumo", finalidade: 1, estoque: true, financeiro: true, entrada: true },
  { valor: "compra_ativo", rotulo: "Compra de ativo imobilizado (entrada)", natureza: "Compra de bem para o ativo imobilizado", finalidade: 1, estoque: true, financeiro: true, entrada: true },
  { valor: "importacao", rotulo: "Importação (entrada)", natureza: "Compra do exterior", finalidade: 1, estoque: true, financeiro: true, entrada: true },
  { valor: "compra_produtor_rural", rotulo: "Compra de produtor rural (entrada)", natureza: "Compra de produtor rural", finalidade: 1, estoque: true, financeiro: true, entrada: true },
  { valor: "outra_saida", rotulo: "Outra saída não especificada", natureza: "Outra saída de mercadoria não especificada", finalidade: 1, estoque: true, financeiro: false, entrada: false },
  { valor: "outra_entrada", rotulo: "Outra entrada não especificada", natureza: "Outra entrada de mercadoria não especificada", finalidade: 1, estoque: true, financeiro: false, entrada: true },
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

/** Meio de pagamento da NF-e (tPag). */
export const MEIOS_PAGAMENTO_NFE = [
  { valor: "01", rotulo: "Dinheiro" }, { valor: "02", rotulo: "Cheque" }, { valor: "03", rotulo: "Cartão de crédito" },
  { valor: "04", rotulo: "Cartão de débito" }, { valor: "05", rotulo: "Crédito loja" }, { valor: "15", rotulo: "Boleto bancário" },
  { valor: "16", rotulo: "Depósito bancário" }, { valor: "17", rotulo: "PIX" }, { valor: "18", rotulo: "Transferência / carteira digital" },
  { valor: "90", rotulo: "Sem pagamento" }, { valor: "99", rotulo: "Outros" },
] as const;

/** Modalidade do frete da NF-e (modFrete). */
export const MODALIDADES_FRETE = [
  { valor: 0, rotulo: "Por conta do emitente (CIF)" }, { valor: 1, rotulo: "Por conta do destinatário (FOB)" },
  { valor: 2, rotulo: "Por conta de terceiros" }, { valor: 3, rotulo: "Transporte próprio do emitente" },
  { valor: 4, rotulo: "Transporte próprio do destinatário" }, { valor: 9, rotulo: "Sem frete" },
] as const;

/** Parcelas da cobrança a partir da condição de pagamento (vencimentos a partir da emissão). */
export function parcelasCobranca(total: number, parcelas: number, intervaloDias: number, emissao: Date = new Date()) {
  const n = Math.max(1, Math.floor(parcelas) || 1);
  const base = Math.floor((total / n) * 100) / 100;
  return Array.from({ length: n }, (_, k) => {
    const d = new Date(emissao); d.setDate(d.getDate() + intervaloDias * (k + 1));
    const valor = k === n - 1 ? Math.round((total - base * (n - 1)) * 100) / 100 : base;
    return { numero: String(k + 1).padStart(3, "0"), vencimento: d.toISOString().slice(0, 10), valor };
  });
}
