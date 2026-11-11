import { describe, expect, it } from "vitest";
import { aplicarTecnica } from "./tecnicasComerciais";
import { MODELOS_ROTEIRO } from "./qualidadeRoteiro";
import { DEPARTAMENTOS, type RoteiroSalvo } from "./roteirosLigacao";

const r: RoteiroSalvo = { chave: "x", departamento: "comercial", nome: "T", descricao: "", campos: [], ativo: true, etapas: [{ titulo: "a", fala: "Quer?", condicoes: [] }] };

describe("técnicas comerciais", () => {
  it("BATNA acrescenta plano B na recusa, sem duplicar", () => {
    const um = aplicarTecnica(r, 0, "batna");
    const dois = aplicarTecnica(um, 0, "batna");
    expect(dois.etapas[0].condicoes).toHaveLength(1);
    expect(dois.etapas[0].condicoes[0].texto).toContain("plano B");
    expect(dois.etapas[0].tecnicas).toEqual(["batna"]);
  });
  it("todo departamento tem pelo menos um modelo pronto", () => {
    for (const d of DEPARTAMENTOS) expect(MODELOS_ROTEIRO.some((m) => m.departamento === d.id), d.id).toBe(true);
  });
});
