import { describe, expect, it } from "vitest";
import { porMes, resumoFaturamento, situacaoPendente } from "./situacaoNfe";
describe("situação NF-e", () => {
  it("só autorizadas somam no faturado", () => {
    const r = resumoFaturamento([{ situacao: "autorizada", valor_total: 100 }, { situacao: "rejeitada", valor_total: 50 }, { situacao: "autorizada", valor_total: 300 }]);
    expect(r.total).toBe(400); expect(r.emitidas).toBe(2); expect(r.ticketMedio).toBe(200); expect(r.rejeitadas).toBe(1);
  });
  it("erro de comunicação fica pendente, não rejeitado", () => { expect(situacaoPendente("erro_comunicacao")).toBe(true); expect(situacaoPendente("rejeitada")).toBe(false); });
  it("agrupa por mês", () => { expect(porMes([{ situacao: "autorizada", valor_total: 10, data_emissao: "2026-10-02" }, { situacao: "autorizada", valor_total: 5, data_emissao: "2026-10-20" }])).toEqual([{ mes: "2026-10", valor: 15 }]); });
});
