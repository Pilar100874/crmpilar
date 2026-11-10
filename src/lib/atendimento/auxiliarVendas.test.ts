import { describe, it, expect } from "vitest";
import { analisarHabitos, type PedidoHabito } from "./auxiliarVendas";
const ped = (id: string, data: string, itens: string[], extra: Partial<PedidoHabito> = {}): PedidoHabito => ({
  id, data, etapa: "finalizado", valor: 1000, percentualDesconto: 0, condicao: "30 dias",
  itens: itens.map((n) => ({ produtoId: n, nome: n, quantidade: 2, preco: 50 })), ...extra });
describe("auxiliar de vendas", () => {
  it("calcula ciclo de compra e marca atraso", () => {
    const a = analisarHabitos([ped("1", "2026-01-01", ["A"]), ped("2", "2026-01-31", ["A"])], new Date("2026-03-15"));
    expect(a.intervaloMedioDias).toBe(30);
    expect(a.compraAtrasada).toBe(true);
  });
  it("aponta produto recorrente ausente do último pedido", () => {
    const a = analisarHabitos([ped("1", "2026-01-01", ["A", "B"]), ped("2", "2026-02-01", ["A", "B"]), ped("3", "2026-03-01", ["A"])]);
    expect(a.produtosSumidos.map((p) => p.produtoId)).toEqual(["B"]);
  });
  it("conversão considera só pedidos finalizados", () => {
    const a = analisarHabitos([ped("1", "2026-01-01", ["A"]), ped("2", "2026-02-01", ["A"], { etapa: "orcamento" })]);
    expect(a.conversao).toBe(0.5);
    expect(a.condicaoPreferida).toBe("30 dias");
  });
});
import { contarComprasJuntas } from "./auxiliarVendas";
describe("venda cruzada", () => {
  it("sugere produto que outros compram junto pelo menos 2 vezes", () => {
    const r = contarComprasJuntas([
      { orcamentoId: "1", produtoId: "A", nome: "A" }, { orcamentoId: "1", produtoId: "C", nome: "C" },
      { orcamentoId: "2", produtoId: "A", nome: "A" }, { orcamentoId: "2", produtoId: "C", nome: "C" },
      { orcamentoId: "3", produtoId: "X", nome: "X" }, { orcamentoId: "3", produtoId: "D", nome: "D" },
    ], new Set(["A"]));
    expect(r.map((p) => p.produtoId)).toEqual(["C"]);
  });
  it("orçamento sem fechamento e sem perda conta como em aberto", () => {
    const a = analisarHabitos([{ id: "o", data: "2026-01-01", etapa: "orcamento", valor: 500, percentualDesconto: 0, condicao: null, itens: [] }]);
    expect(a.orcamentosAbertos.map((o) => o.id)).toEqual(["o"]);
  });
});
