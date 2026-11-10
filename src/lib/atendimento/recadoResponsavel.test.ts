import { describe, expect, it, vi } from "vitest";
vi.mock("@/integrations/supabase/client", () => ({ supabase: {} }));
vi.mock("@/lib/estabelecimentoUtils", () => ({ getEstabelecimentoId: vi.fn(), getUserIdFromAuth: vi.fn() }));
vi.mock("@/lib/calendario/eventos", () => ({ notificarTarefasAlteradas: vi.fn() }));
import { montarTarefaRecado, recadoUrgentePendente, tarefaVisivelNaFila, recadoDoEscopo } from "./recadoResponsavel";

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
  it("encaminhamento urgente fica pendente e elegível ao alerta", () => {
    const tarefa = montarTarefaRecado({ ...base, urgencia: "urgente" });
    expect(tarefa.origem_sub_item).toBe("recado_urgente");
    expect(recadoUrgentePendente(tarefa)).toBe(true);
  });
  it("recado concluído deixa de alertar", () => {
    expect(recadoUrgentePendente({ origem_sub_item: "recado_urgente", status: "completed" })).toBe(false);
  });
  it("recado normal não pisca", () => {
    expect(recadoUrgentePendente(montarTarefaRecado({ ...base, urgencia: "normal" }))).toBe(false);
  });
  it("destinatário vê recado sem vínculo de carteira", () => {
    expect(tarefaVisivelNaFila({ contact_id: "c1", user_id: "u2", origem_sub_item: "recado_urgente", status: "pending" }, new Set(), "u2")).toBe(true);
  });
  it("outro usuário não ganha cartão sem vínculo", () => {
    expect(tarefaVisivelNaFila({ contact_id: "c1", user_id: "u2", origem_sub_item: "recado_urgente", status: "pending" }, new Set(), "u3")).toBe(false);
  });
  it("exige selecionar ou cadastrar cliente", () => {
    expect(() => montarTarefaRecado({ ...base, contatoId: "", urgencia: "urgente" })).toThrow();
  });
  it("quem assume o responsável vê seu recado urgente sem vínculo de carteira", () => {
    const tarefa = montarTarefaRecado({ ...base, urgencia: "urgente" });
    expect(tarefaVisivelNaFila(tarefa, new Set(), ["u1", "u2"])).toBe(true);
    expect(recadoDoEscopo(tarefa, ["u1", "u2"]) && recadoUrgentePendente(tarefa)).toBe(true);
    expect(tarefa.user_id).toBe("u2");
  });
  it("deixar de assumir remove visibilidade e alerta do recado", () => {
    const tarefa = montarTarefaRecado({ ...base, urgencia: "urgente" });
    expect(tarefaVisivelNaFila(tarefa, new Set(), ["u1"])).toBe(false);
    expect(recadoDoEscopo(tarefa, ["u1"])).toBe(false);
  });
});
