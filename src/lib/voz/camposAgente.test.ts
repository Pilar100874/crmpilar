import { describe, expect, it } from "vitest";
import { camposPendentes, textoCampos, type CampoAgente } from "./camposAgente";

const campos: CampoAgente[] = [
  { id: "p", rotulo: "O que deseja ofertar", tipo: "produto", obrigatorio: true },
  { id: "h", rotulo: "Conhecer hábitos de compra", tipo: "opcoes", obrigatorio: false, opcoes: ["Sim", "Não"] },
];

describe("campos personalizados do agente", () => {
  it("obrigatório sem resposta bloqueia", () => {
    expect(camposPendentes(campos, {}).map((c) => c.id)).toEqual(["p"]);
  });
  it("produto escolhido vira instrução com o nome", () => {
    expect(textoCampos(campos, { p: { id: "1", nome: "Papel interfolhado" }, h: "Sim" }))
      .toBe("O que deseja ofertar: Papel interfolhado. Conhecer hábitos de compra: Sim.");
  });
});
