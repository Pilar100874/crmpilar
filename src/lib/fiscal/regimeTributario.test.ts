import { describe, it, expect } from "vitest";
import { normalizarRegime, situacaoCertificado } from "./regimeTributario";

describe("regime tributário", () => {
  it("reconhece os textos da consulta de CNPJ", () => {
    expect(normalizarRegime("SIMEI")).toBe("mei");
    expect(normalizarRegime("Simples Nacional")).toBe("simples_nacional");
    expect(normalizarRegime("LUCRO PRESUMIDO")).toBe("lucro_presumido");
    expect(normalizarRegime("Lucro Real")).toBe("lucro_real");
    expect(normalizarRegime("Lucro Presumido/Real")).toBe("lucro_presumido");
  });
  it("certificado com 30 dias ou menos está vencendo", () => {
    const hoje = new Date("2026-01-01T00:00:00Z");
    expect(situacaoCertificado("2026-01-20T00:00:00Z", hoje)).toBe("vencendo");
    expect(situacaoCertificado("2025-12-31T00:00:00Z", hoje)).toBe("vencido");
    expect(situacaoCertificado("2026-06-01T00:00:00Z", hoje)).toBe("valido");
  });
});
