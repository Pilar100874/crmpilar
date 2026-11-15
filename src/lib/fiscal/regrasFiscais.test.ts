import { describe, it, expect } from "vitest";
import { calcularImpostos, cfopPadrao, destinoOperacao, escolherRegra, type RegraFiscal } from "./regrasFiscais";

const r = (x: Partial<RegraFiscal>): RegraFiscal => ({ nome: "r", operacao: "venda", destino: "interna", cfop: "5102", cst: "00", aliq_icms: 18, aliq_ipi: 0, aliq_pis: 0.65, aliq_cofins: 3, ...x });

describe("regras fiscais", () => {
  it("mesma UF é interna, UF diferente é interestadual", () => {
    expect(destinoOperacao("SP", "sp")).toBe("interna");
    expect(destinoOperacao("SP", "MG")).toBe("interestadual");
    expect(cfopPadrao("venda", "interestadual")).toBe("6102");
    expect(cfopPadrao("venda_producao", "interna")).toBe("5101");
  });
  it("prefere a regra com maior prefixo de NCM", () => {
    const regra = escolherRegra([r({ nome: "geral" }), r({ nome: "papel", ncm_prefixo: "4818", cfop: "5101" })], { operacao: "venda", destino: "interna", ncm: "4818.10.00" });
    expect(regra.nome).toBe("papel");
  });
  it("sem regra usa CFOP padrão e CSOSN 102 no Simples", () => {
    const regra = escolherRegra([], { operacao: "venda", destino: "interestadual", regime: "simples_nacional" });
    expect(regra.cfop).toBe("6102");
    expect(regra.cst).toBe("102");
  });
  it("Simples não destaca ICMS/PIS/COFINS; regime normal destaca", () => {
    expect(calcularImpostos(100, r({ cst: "102" }), "simples_nacional")).toMatchObject({ icms: 0, pis: 0, cofins: 0 });
    expect(calcularImpostos(100, r({}), "lucro_presumido")).toMatchObject({ icms: 18, pis: 0.65, cofins: 3, total: 100 });
    expect(calcularImpostos(100, r({ aliq_ipi: 10 }), "lucro_real").total).toBe(110);
  });
});
