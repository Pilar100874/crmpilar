import { describe, it, expect } from "vitest";
import { calcularNecessidades, agruparCotacoes } from "./necessidadeCompra";

const hoje = new Date("2026-11-15T12:00:00Z");
const base = { estoque_minimo: 0, prazo_reposicao_dias: 0 };

describe("necessidade de compra", () => {
  it("mantém saldo fracionado ao calcular necessidade de kg", () => {
    const [n] = calcularNecessidades([{ id: "a", nome: "A", estoque: 12.4, ...base, estoque_minimo: 15 }], [], {}, hoje);
    expect(n.produto.estoque).toBe(12.4);
    expect(n.porMinimo).toBeCloseTo(2.6);
  });
  it("abaixo do mínimo sugere recompor o mínimo", () => {
    const [n] = calcularNecessidades([{ id: "a", nome: "A", estoque: 2, ...base, estoque_minimo: 10 }], [], {}, hoje);
    expect(n.quantidadeSugerida).toBe(8);
    expect(n.porMinimo).toBe(8);
  });
  it("venda acima do estoque é crítica e entra como motivo venda", () => {
    const [n] = calcularNecessidades([{ id: "a", nome: "A", estoque: 5, ...base }], [{ produto_id: "a", quantidade: 12, orcamento_id: "o" }], {}, hoje);
    expect(n.porVenda).toBe(12);
    expect(n.quantidadeSugerida).toBe(7);
    expect(n.urgencia).toBe("critico");
  });
  it("falta de produto produzido vira necessidade da matéria-prima", () => {
    const ficha = { quantidade_base: 1, unidade_produto: "un", etapas: [], materiais: [{ id: "g", nome: "MP", opcoes: [{ id: "o", produto_id: "mp", quantidade: 2, unidade: "kg" }] }] };
    const r = calcularNecessidades([
      { id: "pa", nome: "Acabado", estoque: 0, ...base, produzido: true, ficha_producao: ficha },
      { id: "mp", nome: "MP", estoque: 1, ...base },
    ], [{ produto_id: "pa", quantidade: 3, orcamento_id: "o" }], {}, hoje);
    expect(r).toHaveLength(1);
    expect(r[0].produto.id).toBe("mp");
    expect(r[0].porProducao).toBe(6);
    expect(r[0].quantidadeSugerida).toBe(5);
  });
  it("não antecipa compra: data ideal = dia de atingir o mínimo menos o prazo", () => {
    const [n] = calcularNecessidades([{ id: "a", nome: "A", estoque: 30, estoque_minimo: 10, prazo_reposicao_dias: 5 }], [], { a: 2 }, hoje);
    expect(n.dataIdeal).toBe("2026-11-20");
    expect(n.quantidadeSugerida).toBe(10);
    expect(n.urgencia).toBe("planejado");
  });
  it("fora do horizonte não aparece", () => {
    expect(calcularNecessidades([{ id: "a", nome: "A", estoque: 100, estoque_minimo: 10, prazo_reposicao_dias: 5 }], [], { a: 1 }, hoje)).toHaveLength(0);
  });
  it("agrupa cotações por fornecedor conforme estratégia", () => {
    const itens = [
      { produto_id: "1", fornecedores: [{ empresa_id: "A", principal: true }, { empresa_id: "B", principal: false }], escolhidos: ["B"] },
      { produto_id: "2", fornecedores: [{ empresa_id: "A", principal: false }] },
    ];
    expect(Object.fromEntries(agruparCotacoes(itens, "todos"))).toEqual({ A: ["1", "2"], B: ["1"] });
    expect(Object.fromEntries(agruparCotacoes(itens, "principal"))).toEqual({ A: ["1", "2"] });
    expect(Object.fromEntries(agruparCotacoes(itens, "escolhidos"))).toEqual({ B: ["1"] });
  });
});
