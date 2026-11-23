import { describe, it, expect } from "vitest";
import { novoRascunho, type RascunhoNfe } from "./documentoFiscal";
import { faltaDaEtapa, primeiraFaltaNfe } from "./camposObrigatoriosNfe";

const ETAPAS = ["dados", "produtos", "tributacao", "transporte", "pagamento", "adicionais", "revisao"];

const base = (): RascunhoNfe => ({
  ...novoRascunho(),
  unidade_id: "u1",
  empresa_id: "e1",
  tipo_operacao_id: "t1",
  natureza_operacao: "Venda de mercadoria",
  serie_id: "s1",
  itens: [{ produto_id: "p1", descricao: "Produto A", ncm: "12345678", unidade: "UN", quantidade: 1, valor_unitario: 100, desconto: 0, frete: 0, seguro: 0, outras: 0, tributacao: { cfop: "5102", icms: { csosn: "102" }, pis: { cst: "49" }, cofins: { cst: "49" } } }],
  pagamentos: [{ meio: "17", valor: 100 }],
});

describe("campo faltante da NF-e", () => {
  it("leva primeiro à unidade emissora quando nada foi preenchido", () => {
    expect(primeiraFaltaNfe(novoRascunho(), ETAPAS)).toEqual(["dados", "unidade_id", "Unidade emissora"]);
  });
  it("não aponta pendência quando o rascunho está completo", () => {
    expect(primeiraFaltaNfe(base(), ETAPAS)).toBeNull();
  });
  it("leva à série quando ela foi esvaziada", () => {
    expect(primeiraFaltaNfe({ ...base(), serie_id: "" }, ETAPAS)).toEqual(["dados", "serie_id", "Série"]);
  });
  it("leva ao seletor de produto quando não há itens", () => {
    expect(primeiraFaltaNfe({ ...base(), itens: [] }, ETAPAS)).toEqual(["produtos", "add_produto", "Adicione ao menos um produto"]);
  });
  it("leva à quantidade do item que está zero", () => {
    const d = base();
    d.itens[0].quantidade = 0;
    expect(primeiraFaltaNfe(d, ETAPAS)).toEqual(["produtos", "item_0_quantidade", "Quantidade do item 1"]);
  });
  it("leva à transportadora quando o tipo de frete a exige", () => {
    expect(primeiraFaltaNfe({ ...base(), modalidade_frete: 0 }, ETAPAS)).toEqual(["transporte", "transportadora_id", "Transportadora"]);
  });
  it("leva ao primeiro pagamento sem meio informado", () => {
    expect(primeiraFaltaNfe({ ...base(), pagamentos: [{ meio: "", valor: 100 }] }, ETAPAS)).toEqual(["pagamento", "pag_0_meio", "Meio de pagamento 1"]);
  });
  it("leva ao botão de pagamento quando os valores não fecham o total", () => {
    expect(primeiraFaltaNfe({ ...base(), pagamentos: [{ meio: "17", valor: 60 }] }, ETAPAS)).toEqual(["pagamento", "add_pagamento", "Os pagamentos devem corresponder ao total da nota."]);
  });
  it("leva às duplicatas quando elas não fecham o total", () => {
    expect(primeiraFaltaNfe({ ...base(), duplicatas: [{ numero: "001", vencimento: "2026-12-01", valor: 40 }] }, ETAPAS)).toEqual(["pagamento", "duplicatas", "As duplicatas devem corresponder ao total."]);
  });
  it("leva ao campo de referências quando uma chave está incompleta", () => {
    expect(primeiraFaltaNfe({ ...base(), referencias: ["123"] }, ETAPAS)).toEqual(["adicionais", "referencias", "Referências precisam de uma chave de 44 dígitos."]);
  });
  it("volta à data de saída quando ela é anterior à emissão", () => {
    expect(primeiraFaltaNfe({ ...base(), data_saida: "2020-01-01" }, ETAPAS)).toEqual(["dados", "data_saida", "A data de saída não pode ser anterior à emissão."]);
  });
  it("tributação e informações adicionais nunca travam o avanço", () => {
    const d = { ...base(), observacoes: "entregar até sexta" };
    delete (d.itens[0] as any).tributacao;
    expect(faltaDaEtapa("tributacao", d)).toBeNull();
    expect(faltaDaEtapa("adicionais", d)).toBeNull();
  });
});
