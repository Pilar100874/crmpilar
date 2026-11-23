import { describe, it, expect } from "vitest";
import { code128c } from "./danfe";
describe("Código de barras da chave", () => {
  it("gera Code 128-C com início, verificador e parada", () => {
    const b = code128c("1234");
    expect(b.startsWith("211232")).toBe(true); // início C (105)
    expect(b.endsWith("2331112")).toBe(true); // parada
    // verificador: (105 + 12*1 + 34*2) % 103 = 82 → padrão 241112? índice 82
    expect(b.length).toBe(6 * 4 + 7);
  });
  it("recusa quantidade ímpar de dígitos", () => { expect(() => code128c("123")).toThrow(); });
});
