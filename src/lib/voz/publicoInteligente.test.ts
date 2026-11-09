import { describe, expect, it } from "vitest";
import { aplicarProtecao, classificarPublico, montarObjetivo } from "./publicoInteligente";

const hoje = Date.parse("2026-11-09T12:00:00Z");
const d = (dias: number) => new Date(hoje - dias * 86_400_000).toISOString();

describe("públicos inteligentes", () => {
  it("recompra: ciclo de 30 dias e último pedido há 28 dias entra", () => {
    const r = classificarPublico("recompra", [
      { clienteId: "a", etapa: "finalizado", criado: d(88), produtos: [] },
      { clienteId: "a", etapa: "finalizado", criado: d(58), produtos: [] },
      { clienteId: "a", etapa: "finalizado", criado: d(28), produtos: [] },
    ], hoje);
    expect(r.has("a")).toBe(true);
  });
  it("inativo: mais de 60 dias sem pedido", () => {
    const r = classificarPublico("inativos", [
      { clienteId: "b", etapa: "finalizado", criado: d(120), produtos: [] },
      { clienteId: "b", etapa: "finalizado", criado: d(61), produtos: [] },
    ], hoje);
    expect(r.get("b")).toBe("Sem pedido há 61 dias");
  });
  it("orçamento aberto só após 3 dias", () => {
    const r = classificarPublico("orc_aberto", [
      { clienteId: "c", etapa: "orcamento", criado: d(2), produtos: [] },
    ], hoje);
    expect(r.has("c")).toBe(false);
  });
  it("proteção remove contato ligado nos últimos 7 dias", () => {
    const r = aplicarProtecao(new Map([["a", "x"]]), { contatadoRecente: new Set(["a"]), comTarefaFutura: new Set() }, { recente: true, agendado: true });
    expect(r.size).toBe(0);
  });
  it("objetivo inclui o desconto máximo autorizado", () => {
    expect(montarObjetivo({ descontoMax: 5, reposicao: false, similar: false, complementares: false, recepcao: false })).toContain("até 5%");
  });
});
