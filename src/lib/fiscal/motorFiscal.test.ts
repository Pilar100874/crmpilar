import { describe, expect, it } from "vitest";
import { faltasConsulta, indicadorContribuinte, lerTributacao, montarConsulta, origemNfe } from "./motorFiscal";

const base = { operacao: "venda", emitente: { cnpj: "12.345.678/0001-90", uf: "SP", regime_tributario: "lucro_real" }, destinatario: { cnpj: "98765432000110", uf: "MG", inscricao_estadual: "123" }, itens: [{ ncm: "3923.21.90", valor: 100, quantidade: 2 }] };
describe("motor fiscal", () => {
  it("cliente com IE é contribuinte, sem IE é não contribuinte", () => {
    expect(indicadorContribuinte({ inscricao_estadual: "123" })).toBe("1");
    expect(indicadorContribuinte({ inscricao_estadual: "" })).toBe("9");
  });
  it("origem antiga vira código NF-e", () => { expect(origemNfe("importado")).toBe("2"); expect(origemNfe("nacional")).toBe("0"); expect(origemNfe("5")).toBe("5"); });
  it("venda SP→MG é interestadual com NCM só dígitos", () => {
    const c = montarConsulta(base);
    expect(c.destino).toBe("interestadual"); expect(c.itens[0].ncm).toBe("39232190"); expect(c.emitente.cnpj).toBe("12345678000190");
  });
  it("aponta NCM faltando", () => { expect(faltasConsulta({ ...base, itens: [{ ncm: "", valor: 1, quantidade: 1 }] })).toContain("NCM do item 1"); });
  it("lê retorno aninhado", () => { const t = lerTributacao({ cfop: "6101", icms: { cst: "00", aliquota: 12, valor: 24 } }); expect(t.cfop).toBe("6101"); expect(t.cst).toBe("00"); expect(t.valor_icms).toBe(24); });
});

import { consumidorFinalVenda } from "./motorFiscal";
describe("consumidor final da venda", () => {
  it("escolha do pedido vence o cadastro", () => { expect(consumidorFinalVenda(false, "uso_consumo", true, "9")).toBe(false); });
  it("uso e consumo é consumidor final", () => { expect(consumidorFinalVenda(null, "uso_consumo", false, "1")).toBe(true); });
  it("revenda não é consumidor final", () => { expect(consumidorFinalVenda(null, "revenda", true, "1")).toBe(false); });
  it("sem dados do pedido usa não contribuinte", () => { expect(consumidorFinalVenda(null, null, false, "9")).toBe(true); });
});
