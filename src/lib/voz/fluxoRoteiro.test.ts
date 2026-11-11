import { describe, expect, it } from "vitest";
import { compilarRoteiro, workflowsNaFala, type RoteiroSalvo } from "./roteirosLigacao";
import { continuarAposWorkflow, grafoDoRoteiro, ligarSaida, novaPergunta, soltarSaida } from "./fluxoRoteiro";

const vazio: RoteiroSalvo = { chave: "custom_t", departamento: "comercial", nome: "T", descricao: "", campos: [], etapas: [], ativo: true };

describe("roteiro como workflow", () => {
  it("nova pergunta nasce com as saídas sim, não e não reconheceu", () => {
    const r = novaPergunta(vazio);
    expect(r.etapas[0].condicoes.map((c) => c.acao)).toEqual(["avancar", "encerrar", "responder"]);
  });
  it("ligar saída à pergunta seguinte vira avançar; a outra vira ir para a etapa", () => {
    const r = novaPergunta(novaPergunta(novaPergunta(vazio)));
    expect(ligarSaida(r, 0, 1, 1).etapas[0].condicoes[1].acao).toBe("avancar");
    const c = ligarSaida(r, 0, 1, 2).etapas[0].condicoes[1];
    expect([c.acao, c.etapa]).toEqual(["ir_etapa", 2]);
  });
  it("soltar a ligação volta a responder e continuar", () => {
    const r = ligarSaida(novaPergunta(novaPergunta(vazio)), 0, 1, 1);
    expect(soltarSaida(r, 0, 1).etapas[0].condicoes[1].acao).toBe("responder");
  });
  it("bloco de workflow compila o marcador e encerra, ou continua na pergunta escolhida", () => {
    let r = novaPergunta(novaPergunta(vazio));
    r = { ...r, etapas: r.etapas.map((e, i) => (i ? { ...e, fala: "Mais algo?" } : { ...e, fala: "Quer o catálogo?", condicoes: [{ gatilho: "manda no zap", acao: "workflow", workflow: { modulo: "omnichannel", id: "abc", nome: "Catálogo" } }] })) };
    expect(compilarRoteiro(r, {})).toContain("[FLUXO:omnichannel:abc]");
    expect(compilarRoteiro(r, {})).toContain("[DESLIGAR]");
    const cont = continuarAposWorkflow(r, 0, 0, 1);
    expect(compilarRoteiro(cont, {})).toContain("vá para a etapa 2");
    expect(grafoDoRoteiro(cont).arestas.some((a) => a.origem === "a0-0" && a.destino === "e1")).toBe(true);
  });
  it("lê os workflows pedidos na conversa sem repetir", () => {
    expect(workflowsNaFala("Ok [FLUXO:omnichannel:abc] e [FLUXO:omnichannel:abc] [FLUXO:marketing_automation:9]"))
      .toEqual([{ modulo: "omnichannel", id: "abc" }, { modulo: "marketing_automation", id: "9" }]);
  });
});

import { SAIDAS_PRONTAS as SP, tipoSaida as ts } from "./fluxoRoteiro";
describe("saída Humano", () => {
  it("\"humano\" sempre transfere para atendente", () => {
    const s = SP.find((x) => x.tipo === "atendente")!;
    expect(s.condicao.gatilho).toContain("humano");
    expect(s.condicao.acao).toBe("transferir");
    expect(ts({ gatilho: "humano", acao: "transferir" })).toBe("atendente");
  });
});
