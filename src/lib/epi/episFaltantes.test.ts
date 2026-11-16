import { describe, it, expect } from "vitest";
import { episFaltantes } from "./regrasEpi";

describe("episFaltantes", () => {
  const hoje = "2026-11-16";
  it("aponta EPI exigido pelo setor sem entrega", () => {
    expect(episFaltantes([{ epi_id: "luva", quantidade: 1 }], [], hoje)).toEqual([{ epi_id: "luva", falta: 1 }]);
  });
  it("não conta EPI devolvido ou com troca vencida", () => {
    const ent = [
      { epi_id: "luva", quantidade: 1, data_devolucao: "2026-10-01", troca_prevista: null },
      { epi_id: "luva", quantidade: 1, data_devolucao: null, troca_prevista: "2026-11-01" },
    ];
    expect(episFaltantes([{ epi_id: "luva", quantidade: 1 }], ent, hoje)).toEqual([{ epi_id: "luva", falta: 1 }]);
  });
  it("não aponta nada quando o funcionário tem o EPI em uso", () => {
    const ent = [{ epi_id: "luva", quantidade: 2, data_devolucao: null, troca_prevista: "2026-12-01" }];
    expect(episFaltantes([{ epi_id: "luva", quantidade: 2 }], ent, hoje)).toEqual([]);
  });
});
