import { describe, expect, it } from "vitest";
import { montarObjetivoRoteiro, pendenciasRoteiro, regrasConversa } from "./roteirosLigacao";
import { ROTEIROS } from "./roteirosLigacao";

describe("roteiros de ligação", () => {
  it("promoção exige produto", () => {
    expect(pendenciasRoteiro("produto_foco", {})).toEqual(["produto"]);
    expect(pendenciasRoteiro("produto_foco", { produtoNome: "Papel" })).toEqual([]);
  });
  it("reposição não exige produto (vem do histórico)", () => {
    expect(pendenciasRoteiro("reposicao", {})).toEqual([]);
    expect(montarObjetivoRoteiro("reposicao", {})).toContain("mais compra");
  });
  it("desconto respeita o limite informado", () => {
    expect(montarObjetivoRoteiro("produto_foco", { produtoNome: "Papel", descontoMax: 5 })).toContain("até 5%");
    expect(montarObjetivoRoteiro("produto_foco", { produtoNome: "Papel" })).toContain("Não ofereça desconto");
  });
  it("regras forçam falas curtas e transferência para o ramal", () => {
    const r = regrasConversa("2222");
    expect(r).toContain("máximo 2 frases");
    expect(r).toContain("ramal 2222");
  });
});

import { regrasConduta as rc, lerConduta as lc } from "./roteirosLigacao";
describe("conduta do agente", () => {
  it("encerra na primeira recusa quando configurado", () => {
    expect(rc({ recusasParaEncerrar: 1 })).toContain("primeira recusa");
    expect(rc({})).not.toContain("primeira recusa");
  });
  it("lê conduta vazia sem quebrar", () => { expect(lc(null)).toEqual({}); });
});

import { compilarRoteiro, definirRoteirosSalvos, montarObjetivoRoteiro as mo, roteiroDeFabrica, roteirosDoDepartamento as rdd } from "./roteirosLigacao";
describe("roteiros editáveis", () => {
  it("compila regra Se X, faça Y com transferência", () => {
    const r = { ...roteiroDeFabrica("reposicao"), etapas: [{ titulo: "Abertura", fala: "Fale de {produto}", condicoes: [{ gatilho: "achou caro", acao: "transferir" as const }] }] };
    const t = compilarRoteiro(r, { produtoNome: "Papel" });
    expect(t).toContain("Fale de Papel");
    expect(t).toContain("Se o cliente achou caro");
    expect(t).toContain("[TRANSFERIR]");
  });
  it("versão editada substitui a de fábrica e roteiro novo aparece no departamento", () => {
    definirRoteirosSalvos([
      { ...roteiroDeFabrica("reposicao"), nome: "Reposição Editada" },
      { chave: "custom_x", departamento: "comercial", nome: "Feira", descricao: "", campos: [], ativo: true, etapas: [{ titulo: "", fala: "Convide", condicoes: [] }] },
    ]);
    expect(mo("reposicao", {})).toContain("Reposição Editada");
    expect(rdd("comercial").map((r) => r.id)).toContain("custom_x");
    expect(rdd("financeiro").map((r) => r.id)).not.toContain("custom_x");
    definirRoteirosSalvos([]);
  });
});

import { gatilhoParaIA as gi, palavrasGatilho as pg } from "./roteirosLigacao";
describe("gatilho com várias respostas separadas por vírgula", () => {
  it("cada pedaço vira uma resposta possível", () => {
    expect(pg("sim, tenho dúvida, quero fechar")).toEqual(["sim", "tenho dúvida", "quero fechar"]);
    expect(pg("sim")).toEqual(["sim"]);
    expect(pg("  ,  ")).toEqual([]);
  });
  it("regra com vírgula passa cada resposta para a IA", () => {
    const r = { ...roteiroDeFabrica("reposicao"), etapas: [{ titulo: "Pergunta", fala: "Pergunte se quer fechar", condicoes: [{ gatilho: "sim, tenho dúvida, quero fechar", acao: "transferir" as const }] }] };
    const t = compilarRoteiro(r, {});
    expect(t).toContain('contiver "sim", "tenho dúvida" ou "quero fechar"');
    expect(t).toContain("[TRANSFERIR]");
  });
  it("gatilho de uma frase continua igual", () => {
    expect(gi("achou caro")).toBe("Se o cliente achou caro");
  });
});

describe("bifurcações de fábrica", () => {
  it("toda etapa de todo roteiro de fábrica tem regra de silêncio e de outra resposta", () => {
    for (const r of ROTEIROS) for (const e of roteiroDeFabrica(r.id as never).etapas) {
      const g = e.condicoes.map((c) => c.gatilho);
      expect(g).toContain("não respondeu ou ficou em silêncio");
      expect(g).toContain("respondeu outra coisa que não está nas regras");
    }
  });
  it("orçamento: sim avança e não pergunta dia de retorno", () => {
    const t = montarObjetivoRoteiro("orcamento_aberto", {});
    expect(t).toContain('"já olhei"');
    expect(t).toContain("siga para a próxima etapa");
    expect(t).toContain("qual dia pode retornar");
  });
});
