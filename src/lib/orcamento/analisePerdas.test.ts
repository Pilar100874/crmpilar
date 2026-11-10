import { describe, it, expect } from "vitest";
import { agruparItens, filtrarPerdas, valorAtribuido, type PedidoPerdido } from "./analisePerdas";

const p: PedidoPerdido = {
  id: "1", data: "2026-11-01T10:00:00Z", valor: 300, cliente: "A", empresa: "", vendedor: "V", tipo: "preco", motivoTexto: "Preço",
  itens: [
    { produtoId: "a", produto: "Papel", marca: "Chamex", quantidade: 10, nossoPreco: 20, precoCliente: 18, subtotal: 200 },
    { produtoId: "b", produto: "Caneta", marca: "Bic", quantidade: 10, nossoPreco: 10, subtotal: 100 },
  ],
};

describe("análise de pedidos perdidos", () => {
  it("filtro de marca soma só os itens da marca", () => {
    expect(filtrarPerdas([p], { marca: "Bic" })).toHaveLength(1);
    expect(valorAtribuido(p, { marca: "Chamex" })).toBe(200);
  });
  it("calcula diferença % entre nosso preço e o do cliente", () => {
    const l = agruparItens([p], "marca").find((x) => x.chave === "Chamex")!;
    expect(l.difPrecoMedia).toBeCloseTo(10);
  });
});
