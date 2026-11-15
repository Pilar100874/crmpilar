import { describe, expect, it } from "vitest";
import { errosDesmembramento, expandirPartes, percentuaisIguais } from "./entradaNfe";

describe("desmembramento da entrada", () => {
  it("rateio igual soma 100", () => { expect(percentuaisIguais(3)).toEqual([33.33, 33.33, 33.34]); });
  it("exige 100% e produtos distintos", () => {
    expect(errosDesmembramento([{ produto_id: "a", quantidade: 1, percentual: 50 }, { produto_id: "a", quantidade: 1, percentual: 40 }]).length).toBe(2);
    expect(errosDesmembramento([{ produto_id: "a", quantidade: 10, percentual: 60 }, { produto_id: "b", quantidade: 5, percentual: 40 }])).toEqual([]);
  });
  it("1 caixa de R$100 vira 10 A (60%) e 5 B (40%)", () => {
    const r = expandirPartes({ quantidade: 1, valorUnitario: 100, valorTotal: 100, produto_id: "", fator: 1 }, [{ produto_id: "a", quantidade: 10, percentual: 60 }, { produto_id: "b", quantidade: 5, percentual: 40 }]);
    expect(r.map((x) => [x.produto_id, x.quantidade, x.valorTotal, x.valorUnitario, x.fator])).toEqual([["a", 10, 60, 6, 1], ["b", 5, 40, 8, 1]]);
  });
});
