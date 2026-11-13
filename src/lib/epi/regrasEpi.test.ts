import { describe, it, expect } from "vitest";
import { trocaPrevista, situacaoEntrega, validarEntrega, estoqueBaixo } from "./regrasEpi";

describe("regras de EPI", () => {
  it("troca prevista soma a vida útil", () => {
    expect(trocaPrevista("2026-01-01", 90)).toBe("2026-04-01");
    expect(trocaPrevista("2026-01-01", null)).toBeNull();
  });
  it("situação da entrega", () => {
    expect(situacaoEntrega({ troca_prevista: "2026-01-10", data_devolucao: null }, "2026-01-11")).toBe("vencida");
    expect(situacaoEntrega({ troca_prevista: "2026-01-20", data_devolucao: null }, "2026-01-11")).toBe("vence_em_breve");
    expect(situacaoEntrega({ troca_prevista: "2026-01-10", data_devolucao: "2026-01-05" }, "2026-01-11")).toBe("devolvido");
  });
  it("bloqueia CA vencido, sem CA e sem estoque", () => {
    expect(validarEntrega({ ca_numero: null, ca_validade: null, estoque: 5 }, 1, "2026-01-01")).toMatch(/CA/);
    expect(validarEntrega({ ca_numero: "123", ca_validade: "2025-12-31", estoque: 5 }, 1, "2026-01-01")).toMatch(/vencido/);
    expect(validarEntrega({ ca_numero: "123", ca_validade: "2027-01-01", estoque: 0 }, 1, "2026-01-01")).toMatch(/Estoque/);
    expect(validarEntrega({ ca_numero: "123", ca_validade: "2027-01-01", estoque: 2 }, 1, "2026-01-01")).toBeNull();
  });
  it("estoque baixo", () => {
    expect(estoqueBaixo({ estoque: 2, estoque_minimo: 2 })).toBe(true);
    expect(estoqueBaixo({ estoque: 3, estoque_minimo: 2 })).toBe(false);
  });
});

import { agruparPorUnidade } from "./relatorioEpi";
describe("relatório por unidade", () => {
  it("agrupa por unidade e ordena pelo vencimento", () => {
    const l = (unidade: string, vencimento: string) => ({ unidade, funcionario: "x", epi: "y", ca: "1", entrega: "", vencimento, situacao: "" });
    const g = agruparPorUnidade([l("Sul", "2026-02-01"), l("Norte", "2026-03-01"), l("Sul", "2026-01-01")]);
    expect(g.map(([u]) => u)).toEqual(["Norte", "Sul"]);
    expect(g[1][1].map((x) => x.vencimento)).toEqual(["2026-01-01", "2026-02-01"]);
  });
});
