import { describe, expect, it } from "vitest";
import { CATALOGO_ATENDIMENTO, simularRecurso } from "./catalogoAtendimento";

describe("catálogo do atendimento", () => {
  it("todo recurso tem regra de negócio, passo a passo e simulação", () => {
    for (const r of CATALOGO_ATENDIMENTO) {
      expect(r.regraNegocio.length).toBeGreaterThan(10);
      expect(r.comoUsar.length).toBeGreaterThan(0);
    }
  });
  it.each(CATALOGO_ATENDIMENTO.map((r) => [r.titulo, r] as const))("simulação passa: %s", (_t, r) => {
    const res = simularRecurso(r);
    expect(res.passos.filter((p) => !p.ok)).toEqual([]);
  });
});
