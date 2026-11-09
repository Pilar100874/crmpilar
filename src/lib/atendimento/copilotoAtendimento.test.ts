import { describe, it, expect } from "vitest";
import { classificarUrgencia, proximoDaFila, planejarRegua, registrarVisita, vizinhoDoHistorico, HISTORICO_VAZIO, type OrcRegua } from "./copilotoAtendimento";

const DIA = 86_400_000;
const hoje = Date.parse("2026-11-09T12:00:00Z");
const orc = (id: string, dias: number, etapa = "orcamento"): OrcRegua => ({ id, clienteId: "c" + id, etapa, enviado: new Date(hoje - dias * DIA).toISOString(), valor: 1000 });

describe("copiloto do atendimento", () => {
  it("reclamação vence cotação na urgência", () => {
    expect(classificarUrgencia("Quero cotar, mas o último pedido chegou amassado")).toBe("reclamacao");
    expect(classificarUrgencia("Pode me mandar um orçamento?")).toBe("cotacao");
    expect(classificarUrgencia("Qual o prazo de entrega?")).toBe("duvida");
    expect(classificarUrgencia("ok obrigado")).toBeNull();
  });

  it("próximo cliente nunca devolve o atual", () => {
    const l = [{ id: "a" }, { id: "b" }];
    expect(proximoDaFila(l, "a")?.id).toBe("b");
    expect(proximoDaFila(l, "b")).toBeNull();
    expect(proximoDaFila(l, null)?.id).toBe("a");
  });

  it("histórico guarda a ordem e permite voltar um cliente", () => {
    const h = registrarVisita(registrarVisita(registrarVisita(HISTORICO_VAZIO, "a"), "b"), "c");
    expect(h.lista).toEqual(["a", "b", "c"]);
    expect(vizinhoDoHistorico(h, -1)).toBe("b");
    expect(vizinhoDoHistorico(h, 1)).toBeNull();
  });

  it("voltar atrás não duplica e a seta da direita retoma o cliente", () => {
    const aberto = registrarVisita(registrarVisita(registrarVisita(HISTORICO_VAZIO, "a"), "b"), "c");
    const voltou = registrarVisita(aberto, "a");
    expect(voltou.lista).toEqual(["a", "b", "c"]);
    expect(voltou.i).toBe(0);
    expect(vizinhoDoHistorico(voltou, 1)).toBe("b");
    expect(registrarVisita(voltou, "a")).toBe(voltou);
  });

  it("abrir cliente novo depois de voltar descarta o futuro", () => {
    const aberto = registrarVisita(registrarVisita(registrarVisita(HISTORICO_VAZIO, "a"), "b"), "c");
    const novo = registrarVisita(registrarVisita(aberto, "a"), "z");
    expect(novo.lista).toEqual(["a", "z"]);
    expect(vizinhoDoHistorico(novo, 1)).toBeNull();
    expect(vizinhoDoHistorico(novo, -1)).toBe("a");
  });

  it("sem cliente aberto antes, não há para onde voltar", () => {
    const primeiro = registrarVisita(HISTORICO_VAZIO, "a");
    expect(vizinhoDoHistorico(primeiro, -1)).toBeNull();
    expect(registrarVisita(primeiro, null)).toBe(primeiro);
  });

  it("régua: D+2 por WhatsApp, D+5 por e-mail, para se o cliente respondeu", () => {
    const r = planejarRegua([orc("1", 2), orc("2", 6), orc("3", 1), orc("4", 3, "perdido")], hoje, new Map(), new Set());
    expect(r.map((p) => [p.orcamentoId, p.passo, p.canal])).toEqual([["1", "D2", "whatsapp"], ["2", "D5", "email"]]);
    const respondeu = new Map([["c1", hoje - DIA]]);
    expect(planejarRegua([orc("1", 2)], hoje, respondeu, new Set())).toHaveLength(0);
    expect(planejarRegua([orc("1", 2)], hoje, new Map(), new Set(["1:D2"]))).toHaveLength(0);
  });
});
