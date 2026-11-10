import { describe, expect, it } from "vitest";
import { corrigirAutomatico, diagnosticarRoteiro, mapaRoteiro, MODELOS_ROTEIRO, roteiroDoModelo, roteiroGerado } from "./qualidadeRoteiro";
import type { RoteiroSalvo } from "./roteirosLigacao";

const base = (etapas: RoteiroSalvo["etapas"]): RoteiroSalvo => ({ chave: "x", departamento: "comercial", nome: "T", descricao: "", campos: [], ativo: true, etapas });

describe("qualidadeRoteiro", () => {
  it("alerta fala com mais de 25 palavras", () => {
    const d = diagnosticarRoteiro(base([{ titulo: "a", fala: Array(30).fill("palavra").join(" "), condicoes: [] }]));
    expect(d.alertas.some((a) => a.texto.includes("30 palavras"))).toBe(true);
  });
  it("pergunta sem regra de não e silêncio gera alertas e a correção resolve", () => {
    const r = base([{ titulo: "a", fala: "Quer?", condicoes: [{ gatilho: "sim", acao: "transferir" }] }]);
    expect(diagnosticarRoteiro(r).alertas.length).toBeGreaterThanOrEqual(2);
    expect(diagnosticarRoteiro(corrigirAutomatico(r)).nota).toBe(10);
  });
  it("modelos prontos tiram nota 10", () => {
    for (const m of MODELOS_ROTEIRO) expect(diagnosticarRoteiro(roteiroDoModelo(m)).nota, m.id).toBe(10);
  });
  it("mapa marca avançar na última etapa como sem saída", () => {
    const m = mapaRoteiro(base([{ titulo: "a", fala: "Oi", condicoes: [{ gatilho: "sim", acao: "avancar" }] }]));
    expect(m[0].ramos[0].semSaida).toBe(true);
  });
  it("roteiro gerado descarta ação inválida", () => {
    const r = roteiroGerado({ etapas: [{ fala: "Oi?", condicoes: [{ gatilho: "sim", acao: "voar" }, { gatilho: "não", acao: "encerrar" }] }] });
    expect(r.etapas[0].condicoes).toEqual([{ gatilho: "não", acao: "encerrar" }]);
  });
});
