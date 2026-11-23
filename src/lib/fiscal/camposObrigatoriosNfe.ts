import { validarRascunho, type RascunhoNfe } from "./documentoFiscal";

/** [aba, id do campo, rótulo] do primeiro item que impede o avanço ou a emissão. */
export type FaltaNfe = [string, string, string];

const FALTAS_CAMPO: [RegExp, string, string][] = [
  [/unidade emissora/i, "dados", "unidade_id"],
  [/destinatário/i, "dados", "empresa_id"],
  [/natureza da operação/i, "dados", "natureza_operacao"],
  [/série ativa/i, "dados", "serie_id"],
  [/tipo de operação/i, "dados", "tipo_operacao_id"],
  [/data de saída/i, "dados", "data_saida"],
  [/data de emissão/i, "dados", "data_emissao"],
  [/presença do comprador/i, "dados", "presenca_comprador"],
  [/destinação da mercadoria/i, "dados", "destinacao_mercadoria"],
  [/ao menos um produto/i, "produtos", "add_produto"],
  [/transportadora/i, "transporte", "transportadora_id"],
  [/pagamentos devem corresponder/i, "pagamento", "add_pagamento"],
  [/duplicatas devem corresponder/i, "pagamento", "duplicatas"],
  [/referências precisam|devolução exige/i, "adicionais", "referencias"],
];

/** Falta que trava a etapa informada; tributação e informações adicionais nunca bloqueiam. */
export function faltaDaEtapa(etapa: string, d: RascunhoNfe): FaltaNfe | null {
  if (etapa === "dados") {
    const obrigatorios: [string, unknown, string][] = [
      ["unidade_id", d.unidade_id, "Unidade emissora"],
      ["tipo_operacao_id", d.tipo_operacao_id, "Tipo de operação"],
      ["natureza_operacao", d.natureza_operacao, "Natureza da operação"],
      ["serie_id", d.serie_id, "Série"],
      ["data_emissao", d.data_emissao, "Data de emissão"],
      ["empresa_id", d.empresa_id, "Destinatário"],
    ];
    for (const [campo, valor, rotulo] of obrigatorios) if (!String(valor ?? "").trim()) return [etapa, campo, rotulo];
  }
  if (etapa === "produtos") {
    if (!d.itens.length) return [etapa, "add_produto", "Adicione ao menos um produto"];
    for (let k = 0; k < d.itens.length; k++) {
      if (!(d.itens[k].quantidade > 0)) return [etapa, `item_${k}_quantidade`, `Quantidade do item ${k + 1}`];
      if (!(d.itens[k].valor_unitario > 0)) return [etapa, `item_${k}_valor_unitario`, `Preço unitário do item ${k + 1}`];
    }
  }
  if (etapa === "transporte" && [0, 1, 2].includes(d.modalidade_frete) && !d.transportadora_id) return [etapa, "transportadora_id", "Transportadora"];
  if (etapa === "pagamento") {
    if (!d.pagamentos.length) return [etapa, "add_pagamento", "Informe ao menos um pagamento"];
    for (let k = 0; k < d.pagamentos.length; k++) if (!d.pagamentos[k].meio) return [etapa, `pag_${k}_meio`, `Meio de pagamento ${k + 1}`];
  }
  return null;
}

/** Campo correspondente a uma mensagem de validarRascunho; null quando não há campo na tela. */
export function faltaDeMensagem(mensagem: string): FaltaNfe | null {
  const item = /^Item (\d+):/.exec(mensagem);
  if (item) {
    const k = Number(item[1]) - 1;
    const campo = /quantidade/i.test(mensagem) ? `item_${k}_quantidade` : /preço/i.test(mensagem) ? `item_${k}_valor_unitario` : `item_${k}`;
    return ["produtos", campo, mensagem];
  }
  const correspondencia = FALTAS_CAMPO.find(([re]) => re.test(mensagem));
  return correspondencia ? [correspondencia[1], correspondencia[2], mensagem] : null;
}

/** Primeira pendência do rascunho, na ordem das etapas, sem montar nenhuma mensagem em tela. */
export function primeiraFaltaNfe(d: RascunhoNfe, etapas: string[]): FaltaNfe | null {
  for (const etapa of etapas) {
    const f = faltaDaEtapa(etapa, d);
    if (f) return f;
  }
  for (const mensagem of validarRascunho(d)) {
    const f = faltaDeMensagem(mensagem);
    if (f) return f;
  }
  return null;
}
