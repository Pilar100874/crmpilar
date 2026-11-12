import { describe, expect, it } from "vitest";
import { compilarRoteiro, marcadorVenda, type RoteiroSalvo } from "./roteirosLigacao";
import { novaPerguntaTipo } from "./fluxoRoteiro";

const base: RoteiroSalvo = { chave: "custom_x", departamento: "comercial", nome: "Balcão", descricao: "", campos: [], etapas: [], ativo: true };

describe("bloco Venda & Negociação de Estoque", () => {
  it("cria etapa com desconto padrão 5% e similares ligados", () => {
    const r = novaPerguntaTipo(base, "venda");
    expect(r.etapas[0].venda).toEqual({ descontoMax: 5, similares: true, filtro: "", modalidade: "venda", instrucoes: "" });
  });
  it("compila o marcador com desconto, similares e filtro", () => {
    const r = novaPerguntaTipo(base, "venda");
    r.etapas[0].venda = { descontoMax: 10, similares: false, filtro: "papel, toalha" };
    const txt = compilarRoteiro(r, {});
    expect(txt).toContain("[VENDA:d=10;s=0;f=papel, toalha]");
    expect(txt).not.toContain("Não ofereça desconto");
  });
  it("limita desconto a 50%", () => {
    expect(marcadorVenda({ descontoMax: 90, similares: true, filtro: "" })).toBe("[VENDA:d=50;s=1;f=]");
  });
  it("cobrança leva modalidade e parcelas no marcador", () => {
    expect(marcadorVenda({ descontoMax: 20, similares: false, filtro: "", modalidade: "cobranca", parcelasMax: 3 })).toBe("[VENDA:d=20;s=0;f=;m=cobranca;p=3]");
  });
  it("diretrizes escritas entram na etapa compilada", () => {
    const r = novaPerguntaTipo(base, "venda");
    r.etapas[0].venda!.instrucoes = "Frete grátis acima de 10 fardos";
    expect(compilarRoteiro(r, {})).toContain("DIRETRIZES DA EMPRESA PARA ESTA NEGOCIAÇÃO (siga à risca): Frete grátis acima de 10 fardos");
  });
});
