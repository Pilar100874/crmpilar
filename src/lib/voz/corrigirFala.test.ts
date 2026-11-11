import { describe, expect, it } from "vitest";
import { corrigirFala } from "./aprimorarRoteiro";
import type { RoteiroSalvo } from "./roteirosLigacao";

const r: RoteiroSalvo = { chave: "t", departamento: "comercial", nome: "T", descricao: "", campos: [], ativo: true,
  etapas: [{ titulo: "A", fala: "Olá", condicoes: [] }, { titulo: "B", fala: "Viu o orçamento?", condicoes: [] }] };

describe("Corrigir fala da IA no teste", () => {
  it("trocar substitui só a fala da etapa escolhida", () => {
    const n = corrigirFala(r, 1, "trocar", "O senhor conseguiu ver a proposta?");
    expect(n.etapas[1].fala).toBe("O senhor conseguiu ver a proposta?");
    expect(n.etapas[0].fala).toBe("Olá");
  });
  it("regra cria resposta para a fala anterior do cliente", () => {
    const n = corrigirFala(r, 1, "regra", "Sem problema, te mando de novo.", "não recebi");
    expect(n.etapas[1].condicoes).toEqual([{ gatilho: "não recebi", acao: "responder", texto: "Sem problema, te mando de novo." }]);
  });
  it("regra sem resposta anterior não muda nada", () => {
    expect(corrigirFala(r, 1, "regra", "x")).toBe(r);
  });
});
