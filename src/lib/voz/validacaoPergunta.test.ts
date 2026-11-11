import { describe, expect, it } from "vitest";
import { corrigirPergunta, corrigirTodas, opcoesEsperadas, validarPergunta } from "./validacaoPergunta";
import { SAIDAS_PRONTAS } from "./fluxoRoteiro";
import type { EtapaEditavel, RoteiroSalvo } from "./roteirosLigacao";

const s = (t: string) => ({ ...SAIDAS_PRONTAS.find((x) => x.tipo === t)!.condicao });
const etapa = (fala: string, condicoes = [s("sim"), s("nao"), s("nao_reconheceu"), s("silencio")]): EtapaEditavel => ({ titulo: "P", fala, condicoes });
const rot = (e: EtapaEditavel): RoteiroSalvo => ({ chave: "custom_x", departamento: "comercial", nome: "x", descricao: "", campos: [], ativo: true, etapas: [e] });
const codigos = (e: EtapaEditavel) => validarPergunta(e).map((a) => a.codigo);

describe("validação de perguntas do roteiro", () => {
  it("pergunta sim/não curta e completa não tem avisos", () => {
    expect(codigos(etapa("O senhor conseguiu ver o orçamento?"))).toEqual(["reconheceu_sem_orientar"]);
    const r = corrigirPergunta(rot(etapa("O senhor conseguiu ver o orçamento?")), 0, "reconheceu_sem_orientar");
    expect(codigos(r.etapas[0])).toEqual([]);
  });
  it("pergunta aberta com saídas sim/não é sinalizada", () => {
    expect(codigos(etapa("Quando o senhor pode receber?"))).toContain("aberta_sim_nao");
  });
  it("duas perguntas na mesma fala é erro", () => {
    expect(codigos(etapa("Viu o orçamento? Quer fechar?"))).toContain("varias_perguntas");
  });
  it("fala sem pergunta recebe a pergunta guiada", () => {
    const r = corrigirPergunta(rot(etapa("Enviamos o orçamento ontem.")), 0, "sem_pergunta");
    expect(r.etapas[0].fala.endsWith("sim ou não?")).toBe(true);
  });
  it("opções personalizadas precisam estar citadas na pergunta", () => {
    const e = etapa("Como prefere receber?", [{ gatilho: "whatsapp, zap", acao: "avancar" }, { gatilho: "email", acao: "avancar" }, s("nao_reconheceu"), s("silencio")]);
    expect(opcoesEsperadas(e)).toEqual(["whatsapp", "email"]);
    expect(codigos(e)).toContain("opcoes_nao_citadas");
    expect(corrigirPergunta(rot(e), 0, "opcoes_nao_citadas").etapas[0].fala).toBe("Como prefere receber: whatsapp ou email?");
  });
  it("corrigir tudo inclui saídas de silêncio e não reconheceu orientando as opções", () => {
    const r = corrigirTodas(rot(etapa("Viu o orçamento?", [s("sim"), s("nao")])));
    expect(codigos(r.etapas[0])).toEqual([]);
    expect(r.etapas[0].condicoes.find((c) => c.texto?.includes("sim ou não"))).toBeTruthy();
  });
});
