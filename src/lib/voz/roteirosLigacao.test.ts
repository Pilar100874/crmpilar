import { describe, expect, it } from "vitest";
import { montarObjetivoRoteiro, pendenciasRoteiro, regrasConversa } from "./roteirosLigacao";

describe("roteiros de ligação", () => {
  it("promoção exige produto", () => {
    expect(pendenciasRoteiro("produto_foco", {})).toEqual(["produto"]);
    expect(pendenciasRoteiro("produto_foco", { produtoNome: "Papel" })).toEqual([]);
  });
  it("reposição não exige produto (vem do histórico)", () => {
    expect(pendenciasRoteiro("reposicao", {})).toEqual([]);
    expect(montarObjetivoRoteiro("reposicao", {})).toContain("mais compra");
  });
  it("desconto respeita o limite informado", () => {
    expect(montarObjetivoRoteiro("produto_foco", { produtoNome: "Papel", descontoMax: 5 })).toContain("até 5%");
    expect(montarObjetivoRoteiro("produto_foco", { produtoNome: "Papel" })).toContain("Não ofereça desconto");
  });
  it("regras forçam falas curtas e transferência para o ramal", () => {
    const r = regrasConversa("2222");
    expect(r).toContain("máximo 2 frases");
    expect(r).toContain("ramal 2222");
  });
});
