import { describe, it, expect } from "vitest";
import { compilarRoteiro, removerEtapa, type RoteiroSalvo } from "./roteirosLigacao";
import { mapaRoteiro, diagnosticarRoteiro } from "./qualidadeRoteiro";

const r: RoteiroSalvo = { chave: "custom_x", departamento: "comercial", nome: "T", descricao: "", campos: [], ativo: true, etapas: [
  { titulo: "Abertura", fala: "Viu o orçamento?", condicoes: [{ gatilho: "não", acao: "ir_etapa", etapa: 2 }, { gatilho: "sim", acao: "avancar" }] },
  { titulo: "Fechar", fala: "Vamos fechar?", condicoes: [] },
  { titulo: "Reenviar", fala: "Posso reenviar?", condicoes: [] },
] };

describe("ir para etapa", () => {
  it("compila o desvio para a etapa escolhida", () => {
    expect(compilarRoteiro(r, {})).toContain("vá direto para a etapa 3 (Reenviar)");
  });
  it("mapa mostra o destino", () => {
    expect(mapaRoteiro(r)[0].ramos[0].destino).toBe("Etapa 3 · Reenviar");
  });
  it("sem destino é erro", () => {
    const x = { ...r, etapas: [{ ...r.etapas[0], condicoes: [{ gatilho: "não", acao: "ir_etapa" as const }] }] };
    expect(diagnosticarRoteiro(x).alertas.some((a) => a.nivel === "erro")).toBe(true);
  });
  it("remover etapa corrige destinos", () => {
    expect(removerEtapa(r.etapas, 1)[0].condicoes[0]).toEqual({ gatilho: "não", acao: "ir_etapa", etapa: 1 });
    expect(removerEtapa(r.etapas, 2)[0].condicoes[0].acao).toBe("avancar");
  });
});
