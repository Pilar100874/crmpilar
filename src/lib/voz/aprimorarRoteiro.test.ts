import { describe, expect, it } from "vitest";
import { adicionarResposta, ajustesSugeridos, falaNaoEntendida, respostaReconhecida } from "./aprimorarRoteiro";
import type { RoteiroSalvo } from "./roteirosLigacao";

const r: RoteiroSalvo = { chave: "x", departamento: "comercial", nome: "T", descricao: "", campos: [], ativo: true,
  etapas: [{ titulo: "A", fala: "Abertura", condicoes: [] }, { titulo: "B", fala: "Olhou?", condicoes: [{ gatilho: "sim, vi", acao: "avancar" }] }] };

describe("aprimorar roteiro por respostas", () => {
  it("adiciona a resposta à regra existente com a mesma ação", () => {
    expect(adicionarResposta(r, 1, "conseguiu.", "avancar").etapas[1].condicoes).toEqual([{ gatilho: "sim, vi, conseguiu", acao: "avancar" }]);
  });
  it("cria nova regra quando a ação ainda não existe", () => {
    expect(adicionarResposta(r, 1, "manda no whats", "transferir").etapas[1].condicoes).toHaveLength(2);
  });
  it("não duplica resposta já cadastrada", () => {
    expect(adicionarResposta(r, 1, "Vi", "avancar")).toBe(r);
  });
  it("reconhece resposta coberta por regra", () => {
    expect(respostaReconhecida(r, 1, "Sim, vi sim")).toBe(true);
    expect(respostaReconhecida(r, 1, "conseguiu")).toBe(false);
  });
  it("detecta resposta não entendida e agrupa sugestões", () => {
    const f = [{ papel: "agente", texto: "Olhou o orçamento?" }, { papel: "cliente", texto: "Conseguiu." }, { papel: "agente", texto: "Desculpe, não ouvi. Olhou?" }];
    expect(falaNaoEntendida(f, 1)).toBe(true);
    expect(ajustesSugeridos([f, f])).toEqual([{ resposta: "Conseguiu", vezes: 2, chamadas: 2 }]);
  });
});
