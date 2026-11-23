import { lerTributacao } from "./motorFiscal";

export type ItemRascunho = { produto_id: string; descricao: string; codigo?: string; ncm: string; unidade: string; quantidade: number; valor_unitario: number; desconto: number; frete: number; seguro: number; outras: number; tributacao?: any };
export type RascunhoNfe = {
  unidade_id: string; empresa_id: string; tipo_operacao_id: string; natureza_operacao: string;
  serie_id: string; ambiente: string; finalidade_emissao: number; data_emissao: string; data_saida: string;
  consumidor_final: boolean; presenca_comprador: string; destinacao_mercadoria: string;
  modalidade_frete: number; transportadora_id: string; placa_veiculo: string; uf_veiculo: string;
  volumes: number; peso_bruto: number; peso_liquido: number; especie_volumes: string;
  pagamentos: { meio: string; valor: number }[]; duplicatas: { numero: string; vencimento: string; valor: number }[];
  observacoes: string; informacoes_fisco: string; referencias: string[]; itens: ItemRascunho[];
};
export function novoRascunho(): RascunhoNfe {
  return { unidade_id: "", empresa_id: "", tipo_operacao_id: "", natureza_operacao: "", serie_id: "", ambiente: "homologacao", finalidade_emissao: 1, data_emissao: new Date().toISOString().slice(0,10), data_saida: "", consumidor_final: false, presenca_comprador: "9", destinacao_mercadoria: "revenda", modalidade_frete: 9, transportadora_id: "", placa_veiculo: "", uf_veiculo: "", volumes: 0, peso_bruto: 0, peso_liquido: 0, especie_volumes: "", pagamentos: [], duplicatas: [], observacoes: "", informacoes_fisco: "", referencias: [], itens: [] };
}
export const arredondar = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;
export function totaisDocumento(itens: ItemRascunho[]) {
  const soma = (fn: (i: ItemRascunho) => number) => arredondar(itens.reduce((s,i) => s+fn(i),0));
  const produtos = soma(i => i.quantidade*i.valor_unitario);
  const desconto = soma(i => i.desconto || 0), frete = soma(i => i.frete || 0), seguro = soma(i => i.seguro || 0), outras = soma(i => i.outras || 0);
  const tributo = (k: string) => soma(i => Number((lerTributacao(i.tributacao) as any)[`valor_${k}`]) || 0);
  return { produtos, desconto, frete, seguro, outras, icms: tributo("icms"), ipi: tributo("ipi"), pis: tributo("pis"), cofins: tributo("cofins"), icms_st: tributo("icms_st"), total: arredondar(produtos-desconto+frete+seguro+outras+tributo("ipi")+tributo("icms_st")) };
}
/** Ausência não significa alíquota zero: exige informação expressa para os grupos essenciais. */
export function faltasTributacao(r: any): string[] {
  if (!r || typeof r !== "object") return ["tributação não calculada"];
  const f: string[] = [];
  if (!/^\d{4}$/.test(String(r.cfop ?? ""))) f.push("CFOP");
  for (const k of ["icms", "pis", "cofins"]) {
    const grupo = r[k];
    if (!grupo || typeof grupo !== "object" || !String(grupo.cst ?? grupo.csosn ?? (k === "icms" ? r.csosn ?? r.cst : ""))) f.push(`classificação ${k.toUpperCase()}`);
    if (grupo?.aliquota != null && (!Number.isFinite(Number(grupo.aliquota)) || Number(grupo.aliquota)<0)) f.push(`alíquota ${k.toUpperCase()}`);
  }
  return f;
}
export function validarRascunho(d: RascunhoNfe): string[] {
  const f: string[]=[];
  if (!d.unidade_id) f.push("Escolha a unidade emissora.");
  if (!d.empresa_id) f.push("Escolha o destinatário.");
  if (!d.natureza_operacao.trim()) f.push("Informe a natureza da operação.");
  if (!d.serie_id) f.push("Escolha uma série ativa.");
  if (!d.tipo_operacao_id) f.push("Escolha o tipo de operação.");
  if (!d.data_emissao) f.push("Informe a data de emissão.");
  if (d.data_saida && d.data_emissao && d.data_saida < d.data_emissao) f.push("A data de saída não pode ser anterior à emissão.");
  if (!d.presenca_comprador) f.push("Informe a presença do comprador.");
  if (!d.destinacao_mercadoria) f.push("Informe a destinação da mercadoria.");
  if (!d.itens.length) f.push("Inclua ao menos um produto.");
  d.itens.forEach((i,k) => {
    if (!(i.quantidade>0) || !Number.isFinite(i.quantidade)) f.push(`Item ${k+1}: quantidade inválida.`);
    if (!(i.valor_unitario>=0) || !Number.isFinite(i.valor_unitario)) f.push(`Item ${k+1}: preço inválido.`);
    if (!i.unidade || !/^\d{8}$/.test(i.ncm.replace(/\D/g,""))) f.push(`Item ${k+1}: complete unidade e NCM no cadastro.`);
    if ([i.desconto,i.frete,i.seguro,i.outras].some(n=> !Number.isFinite(n)||n<0) || i.desconto>i.quantidade*i.valor_unitario) f.push(`Item ${k+1}: despesas ou desconto inválidos.`);
    const faltas=faltasTributacao(i.tributacao); if(faltas.length) f.push(`Item ${k+1}: Systax sem ${faltas.join(", ")}.`);
  });
  if ([0,1,2].includes(d.modalidade_frete)&&!d.transportadora_id) f.push("Escolha a transportadora.");
  if(d.referencias.some(r=>!/^\d{44}$/.test(r))) f.push("Referências precisam de uma chave de 44 dígitos.");
  if(d.finalidade_emissao===4&&!d.referencias.length) f.push("Devolução exige referência à nota original.");
  const total=totaisDocumento(d.itens).total;
  if(!d.pagamentos.length || Math.abs(d.pagamentos.filter(p=>p.meio!=="90").reduce((s,p)=>s+p.valor,0)-total)>0.01 && !d.pagamentos.every(p=>p.meio==="90")) f.push("Os pagamentos devem corresponder ao total da nota.");
  if(d.duplicatas.length && Math.abs(d.duplicatas.reduce((s,p)=>s+p.valor,0)-total)>0.01) f.push("As duplicatas devem corresponder ao total.");
  return f;
}
export function validarInutilizacao(inicio: number,fim: number,justificativa: string) {
  if(!Number.isInteger(inicio)||!Number.isInteger(fim)||inicio<1||fim<inicio||fim>999999999) return "Informe um intervalo válido de numeração.";
  if(justificativa.trim().length<15||justificativa.trim().length>255) return "A justificativa deve ter entre 15 e 255 caracteres.";
  return null;
}