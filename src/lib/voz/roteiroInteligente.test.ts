import { describe, expect, it } from "vitest";
import { roteiroDoCliente, lerDepartamento, roteirosDoDepartamento } from "./roteirosLigacao";

const hoje = Date.parse("2026-11-10T12:00:00Z");
const d = (dias: number) => new Date(hoje - dias * 86_400_000).toISOString();

describe("roteiro inteligente por cliente", () => {
  it("orçamento aberto há mais de 3 dias usa retorno de orçamento", () => {
    expect(roteiroDoCliente([{ etapa: "negociacao", criado: d(5) }], hoje).roteiro).toBe("orcamento_aberto");
  });
  it("sem orçamento aberto nunca usa retorno de orçamento", () => {
    expect(roteiroDoCliente([{ etapa: "finalizado", criado: d(10) }], hoje).roteiro).not.toBe("orcamento_aberto");
  });
  it("orçamento aberto com 2 dias ainda não conta", () => {
    expect(roteiroDoCliente([{ etapa: "orcamento", criado: d(2) }], hoje).roteiro).toBe("apresentacao");
  });
  it("mais de 60 dias sem comprar usa reativação", () => {
    expect(roteiroDoCliente([{ etapa: "finalizado", criado: d(90) }], hoje).roteiro).toBe("reativacao");
  });
  it("cliente sem histórico recebe apresentação", () => {
    expect(roteiroDoCliente([], hoje).roteiro).toBe("apresentacao");
  });
  it("agente antigo sem departamento é comercial; financeiro só tem lembrete", () => {
    expect(lerDepartamento({})).toBe("comercial");
    expect(roteirosDoDepartamento("financeiro").map((r) => r.id)).toEqual(["lembrete_financeiro"]);
  });
});
