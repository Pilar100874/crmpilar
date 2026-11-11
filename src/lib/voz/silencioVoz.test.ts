import { describe, expect, it } from "vitest";
import { silencioPrematuro } from "../../../supabase/functions/_shared/silencioVoz";

const pergunta = "Ótimo! Você teria 30 segundos agora para falar sobre a proposta que enviamos?"; // 79 caracteres ≈ 5,6 s
const t0 = Date.parse("2026-11-11T21:35:00.000Z");
const hist = [{ papel: "agente", texto: pergunta, em: new Date(t0).toISOString() }];

describe("silêncio prematuro do aparelho", () => {
  it("ignora 'não ouvi' 8 s depois da pergunta (a IA mal terminou de falar)", () => {
    expect(silencioPrematuro(hist, t0 + 8_000)).toBe(true);
  });
  it("aceita silêncio 15 s depois da pergunta", () => {
    expect(silencioPrematuro(hist, t0 + 15_000)).toBe(false);
  });
  it("sem fala da IA registrada, não bloqueia", () => {
    expect(silencioPrematuro([], t0)).toBe(false);
  });
});
