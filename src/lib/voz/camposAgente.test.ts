import { describe, expect, it } from "vitest";
import { camposPendentes, lerCampos, textoCampos, type CampoAgente } from "./camposAgente";

const campos: CampoAgente[] = [
  { id: "p", rotulo: "O que deseja ofertar", tipo: "produto" },
  { id: "f", rotulo: "Forma de abordagem", tipo: "texto", fixo: true, valor: "Consultiva" },
];

describe("campos personalizados do agente", () => {
  it("campo do usuário sem resposta bloqueia o disparo", () => {
    expect(camposPendentes(campos, {}).map((c) => c.id)).toEqual(["p"]);
  });
  it("campo fixo não exige resposta do usuário", () => {
    expect(camposPendentes(campos, { p: { id: "1", nome: "X" } })).toHaveLength(0);
  });
  it("fixo e resposta viram instruções", () => {
    expect(textoCampos(campos, { p: { id: "1", nome: "Papel interfolhado" } }))
      .toBe("O que deseja ofertar: Papel interfolhado. Forma de abordagem: Consultiva.");
  });
  it("campo novo sem rótulo continua visível na edição", () => {
    expect(lerCampos({ campos: [{ id: "n", rotulo: "", tipo: "texto" }] })).toHaveLength(1);
  });
});
