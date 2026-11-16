import { describe, it, expect } from "vitest";
import { lerFicha } from "./fichaProducao";

describe("lerFicha preserva check list", () => {
  it("mantém os itens salvos ao reabrir o produto", () => {
    const salvo = { quantidade_base: 1, unidade_produto: "un", materiais: [], etapas: [], checklist: [{ id: "a", texto: "Pesar bobina a cada 10" }] };
    expect(lerFicha(salvo).checklist).toEqual([{ id: "a", texto: "Pesar bobina a cada 10" }]);
  });
});
