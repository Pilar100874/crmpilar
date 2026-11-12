import { describe, expect, it } from "vitest";
import { taticasParaCliente } from "./taticasVenda";

const base: any = { produtosFrequentes: [{ nome: "Argamassa", ultimoPreco: 30 }], motivosPerda: ["Achou caro"], condicaoPreferida: "28 dias", compraAtrasada: true };

describe("táticas de venda", () => {
  it("acolhe a objeção de preço quando o cliente já perdeu por preço", () => {
    expect(taticasParaCliente("Rui Silva", base).find((t) => t.id === "rotulagem")!.frase).toContain("o preço");
  });
  it("lembra reposição só quando a compra está atrasada", () => {
    expect(taticasParaCliente("Rui", { ...base, compraAtrasada: false }).some((t) => t.id === "perda")).toBe(false);
  });
  it("fechamento usa a condição preferida do cliente", () => {
    expect(taticasParaCliente("Rui", base).find((t) => t.id === "dupla_alternativa")!.frase).toContain("28 dias");
  });
});
