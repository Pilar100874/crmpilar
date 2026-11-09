import { describe, it, expect } from "vitest";
import { calcularPotenciais, mesclarConfig, type OrcPotencial } from "./potenciais";

const DIA = 86_400_000;
const hoje = Date.parse("2026-11-09T12:00:00Z");
const d = (n: number) => new Date(hoje - n * DIA).toISOString();
const compra = (cli: string, n: number, valor = 1000, itens: string[] = []): OrcPotencial =>
  ({ clienteId: cli, etapa: "finalizado", criado: d(n), valor, itens: itens.map((produtoId) => ({ produtoId })) });

describe("potenciais", () => {
  it("orçamento aberto há 3 dias entra com o valor no motivo", () => {
    const r = calcularPotenciais([{ clienteId: "a", etapa: "orcamento", criado: d(4), valor: 2400, itens: [] }], mesclarConfig({}), hoje);
    expect(r[0].tipo).toBe("orcamento");
    expect(r[0].motivo).toContain("4 dias");
  });

  it("inativo exige 60 dias sem compra e 2 pedidos", () => {
    expect(calcularPotenciais([compra("a", 90), compra("a", 61)], mesclarConfig({ recompra: { ativo: false } }), hoje)[0]?.tipo).toBe("inativo");
    expect(calcularPotenciais([compra("a", 59), compra("a", 120)], mesclarConfig({ recompra: { ativo: false }, quedaVolume: { ativo: false } }), hoje)).toHaveLength(0);
  });

  it("ação comercial lista quem comprou o produto em foco", () => {
    const cfg = mesclarConfig({ acaoComercial: { ativo: true, produtos: [{ id: "p1", nome: "Copo 200ml" }], semCompraDias: 15 } });
    const r = calcularPotenciais([compra("a", 40, 500, ["p1"])], cfg, hoje);
    expect(r[0].tipo).toBe("acao_comercial");
    expect(r[0].motivo).toContain("Copo 200ml há 40 dias");
  });

  it("cliente dispensado ou com tarefa não aparece", () => {
    const r = calcularPotenciais([{ clienteId: "a", etapa: "orcamento", criado: d(5), valor: 100, itens: [] }], mesclarConfig({}), hoje, new Set(["a"]));
    expect(r).toHaveLength(0);
  });

  it("respeita o limite diário", () => {
    const orcs = Array.from({ length: 30 }, (_, i) => ({ clienteId: `c${i}`, etapa: "orcamento", criado: d(5), valor: 100, itens: [] }));
    expect(calcularPotenciais(orcs, mesclarConfig({ protecao: { limite: 20 } }), hoje)).toHaveLength(20);
  });

  it("complemento de linha: compra a base e nunca o complemento", () => {
    const cfg = mesclarConfig({ inativo: { ativo: false }, crossSell: { ativo: true, pares: [{ base: { id: "b", nome: "Papel" }, complemento: { id: "c", nome: "Saco de lixo" } }] } });
    expect(calcularPotenciais([compra("a", 10, 100, ["b"])], cfg, hoje)[0]?.tipo).toBe("cross_sell");
    expect(calcularPotenciais([compra("a", 10, 100, ["b", "c"])], cfg, hoje)).toHaveLength(0);
  });
});
