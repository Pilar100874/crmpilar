/** Auditoria fiscal da NF-e de entrada: compara o que o fornecedor destacou no XML com a tributação calculada pelo Systax. */
import type { TributacaoItem } from "./motorFiscal";

export type NivelDivergencia = "ok" | "atencao" | "erro";
export interface ItemXmlAuditado { descricao: string; cfop?: string; cst?: string; aliqIcms?: number; valorIcms?: number; aliqIpi?: number; valorIpi?: number; aliqPis?: number; valorPis?: number; aliqCofins?: number; valorCofins?: number; valorIcmsSt?: number }
export interface Divergencia { campo: string; nivel: Exclude<NivelDivergencia, "ok">; xml: string; esperado: string; mensagem: string }
export interface ResultadoItem { item: number; descricao: string; nivel: NivelDivergencia; divergencias: Divergencia[]; cfopEntradaSugerido: string | null }

/** Diferença de valor tolerada (arredondamento) em R$ e de alíquota em pontos percentuais. */
export const TOLERANCIA_VALOR = 0.05;
export const TOLERANCIA_ALIQUOTA = 0.01;

/** CFOP de entrada equivalente ao de saída do fornecedor (5xxx→1xxx, 6xxx→2xxx, 7xxx→3xxx). */
export function cfopEntrada(cfopSaida?: string | null): string | null {
  const c = (cfopSaida ?? "").replace(/\D/g, "");
  if (c.length !== 4) return null;
  const mapa: Record<string, string> = { "5": "1", "6": "2", "7": "3" };
  return mapa[c[0]] ? mapa[c[0]] + c.slice(1) : c;
}

const fmt = (v: number) => v.toFixed(2).replace(".", ",");
const brl = (v: number) => `R$ ${fmt(v)}`;
const pct = (v: number) => `${fmt(v)}%`;

/** Compara um item do XML com a tributação esperada. Valores a maior geram risco de glosa de crédito (erro). */
export function auditarItem(idx: number, x: ItemXmlAuditado, t: TributacaoItem): ResultadoItem {
  const d: Divergencia[] = [];
  const tributo = (nome: string, aliqX = 0, valX = 0, aliqE: number, valE: number) => {
    if (Math.abs(aliqX - aliqE) > TOLERANCIA_ALIQUOTA)
      d.push({ campo: `Alíquota ${nome}`, nivel: aliqX > aliqE ? "erro" : "atencao", xml: pct(aliqX), esperado: pct(aliqE),
        mensagem: aliqX > aliqE ? `${nome} destacado acima do devido — o crédito excedente pode ser glosado` : `${nome} destacado abaixo do devido — crédito menor que o permitido` });
    else if (Math.abs(valX - valE) > TOLERANCIA_VALOR)
      d.push({ campo: `Valor ${nome}`, nivel: "atencao", xml: brl(valX), esperado: brl(valE), mensagem: `Base de cálculo do ${nome} diferente da esperada` });
  };
  tributo("ICMS", x.aliqIcms, x.valorIcms, t.aliq_icms, t.valor_icms);
  tributo("IPI", x.aliqIpi, x.valorIpi, t.aliq_ipi, t.valor_ipi);
  tributo("PIS", x.aliqPis, x.valorPis, t.aliq_pis, t.valor_pis);
  tributo("COFINS", x.aliqCofins, x.valorCofins, t.aliq_cofins, t.valor_cofins);
  const stX = x.valorIcmsSt ?? 0, stE = t.valor_icms_st;
  if (stE > TOLERANCIA_VALOR && stX <= TOLERANCIA_VALOR) d.push({ campo: "ICMS-ST", nivel: "erro", xml: brl(stX), esperado: brl(stE), mensagem: "Mercadoria sujeita a ST sem retenção pelo fornecedor — pode exigir recolhimento pela sua empresa" });
  else if (stX > TOLERANCIA_VALOR && stE <= TOLERANCIA_VALOR) d.push({ campo: "ICMS-ST", nivel: "erro", xml: brl(stX), esperado: brl(stE), mensagem: "ICMS-ST retido sem necessidade" });
  else if (Math.abs(stX - stE) > TOLERANCIA_VALOR) d.push({ campo: "ICMS-ST", nivel: "atencao", xml: brl(stX), esperado: brl(stE), mensagem: "Valor de ICMS-ST diferente do esperado (verifique MVA/base)" });
  if (t.cst && x.cst && t.cst !== x.cst) d.push({ campo: "CST/CSOSN", nivel: "atencao", xml: x.cst, esperado: t.cst, mensagem: "Situação tributária diferente da esperada" });
  if (t.valor_difal > TOLERANCIA_VALOR) d.push({ campo: "DIFAL", nivel: "atencao", xml: "—", esperado: brl(t.valor_difal), mensagem: "Entrada gera DIFAL a recolher pela sua empresa" });
  const nivel: NivelDivergencia = d.some((v) => v.nivel === "erro") ? "erro" : d.length ? "atencao" : "ok";
  return { item: idx + 1, descricao: x.descricao, nivel, divergencias: d, cfopEntradaSugerido: t.cfop || cfopEntrada(x.cfop) };
}

export function auditarNota(itens: ItemXmlAuditado[], trib: TributacaoItem[]) {
  const resultados = itens.map((x, k) => auditarItem(k, x, trib[k]));
  const nivel: NivelDivergencia = resultados.some((r) => r.nivel === "erro") ? "erro" : resultados.some((r) => r.nivel === "atencao") ? "atencao" : "ok";
  return { nivel, resultados, totalDivergencias: resultados.reduce((s, r) => s + r.divergencias.length, 0) };
}
