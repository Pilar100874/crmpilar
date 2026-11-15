import { describe, expect, it } from "vitest";
import { auditarItem, auditarNota, cfopEntrada } from "./auditoriaEntrada";
import { lerTributacao } from "./motorFiscal";

const t = (o: any) => lerTributacao({ cfop: "2102", cst: "00", aliquota_icms: 12, valor_icms: 12, ...o });
describe("auditoria de entrada", () => {
  it("converte CFOP de saída em entrada", () => { expect(cfopEntrada("6102")).toBe("2102"); expect(cfopEntrada("5101")).toBe("1101"); });
  it("nota conforme", () => expect(auditarItem(0, { descricao: "A", cst: "00", aliqIcms: 12, valorIcms: 12 }, t({})).nivel).toBe("ok"));
  it("ICMS acima do devido é erro (glosa)", () => expect(auditarItem(0, { descricao: "A", aliqIcms: 18, valorIcms: 18 }, t({})).nivel).toBe("erro"));
  it("ICMS abaixo do devido é atenção", () => expect(auditarItem(0, { descricao: "A", aliqIcms: 7, valorIcms: 7 }, t({})).nivel).toBe("atencao"));
  it("ST esperada e não retida é erro", () => { const r = auditarItem(0, { descricao: "A", aliqIcms: 12, valorIcms: 12 }, t({ valor_icms_st: 30 })); expect(r.divergencias.map((d) => d.campo)).toContain("ICMS-ST"); expect(r.nivel).toBe("erro"); });
  it("ST retida sem necessidade é erro", () => expect(auditarItem(0, { descricao: "A", aliqIcms: 12, valorIcms: 12, valorIcmsSt: 20 }, t({})).nivel).toBe("erro"));
  it("diferença de arredondamento é tolerada", () => expect(auditarItem(0, { descricao: "A", aliqIcms: 12, valorIcms: 12.03 }, t({})).nivel).toBe("ok"));
  it("nível da nota é o pior item", () => expect(auditarNota([{ descricao: "A", aliqIcms: 12, valorIcms: 12 }, { descricao: "B", aliqIcms: 18, valorIcms: 18 }], [t({}), t({})]).nivel).toBe("erro"));
});
