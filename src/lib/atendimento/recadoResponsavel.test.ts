import { describe, expect, it, vi } from "vitest";
vi.mock("@/integrations/supabase/client", () => ({ supabase: {} }));
vi.mock("@/lib/estabelecimentoUtils", () => ({ getEstabelecimentoId: vi.fn(), getUserIdFromAuth: vi.fn() }));
vi.mock("@/lib/calendario/eventos", () => ({ notificarTarefasAlteradas: vi.fn() }));
import { montarTarefaRecado } from "./recadoResponsavel";

const base = { contatoId: "c1", contatoNome: "Ana", responsavelId: "u2", autorId: "u1", autorNome: "Bia", recado: "Quer cotação", estabelecimentoId: "e1", agora: new Date(2026, 10, 9, 10, 0) };

describe("recado para o responsável", () => {
  it("cria a tarefa na agenda do responsável, não de quem anotou", () => {
    expect(montarTarefaRecado({ ...base, urgencia: "normal" }).user_id).toBe("u2");
  });
  it("normal vence em 2 horas", () => {
    expect(montarTarefaRecado({ ...base, urgencia: "normal" }).time).toBe("12:00");
  });
  it("urgente vence em 30 minutos e marca o título", () => {
    const t = montarTarefaRecado({ ...base, urgencia: "urgente" });
    expect(t.time).toBe("10:30");
    expect(t.title.startsWith("URGENTE")).toBe(true);
  });
  it("exige texto do recado", () => {
    expect(() => montarTarefaRecado({ ...base, recado: "  ", urgencia: "normal" })).toThrow();
  });
});
