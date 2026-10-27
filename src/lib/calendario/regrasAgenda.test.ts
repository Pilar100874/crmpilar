import { describe, expect, it } from "vitest";
import { completarCatalogo, explicarRegra, fluxoMovimentacao, origemFluxo, ORIGEM_DATA, type EtapaFluxo, type RegraCatalogo } from "./regrasAgenda";

const regra = (chave: string, ativa = true): RegraCatalogo => ({ id: chave, chave, nome: chave, ativa, gatilho: "tarefa_arrastada", acao: "perguntar_conflito", descricao: null, tela: "Calendário", execucoes: 0, condicoes: {}, acao_config: {}, relacoes: {}, sistema: true, executor: "tela", prioridade: 10 });
const ids = (etapa: EtapaFluxo): string[] => [etapa.id, ...(etapa.filhos || []).flatMap(ids)];
describe("catálogo explicativo das regras do CRM", () => {
  it('documenta retorno de e-mail na tela que dispara sem criar configuração salva', () => {
    const item = completarCatalogo([]).find(r => r.chave === 'retorno_envio_massa_email');
    expect(item?.tela).toBe('Disparo em massa — E-mail');
    expect(item?.acao).toBe('criar_tarefa');
    if (!item) throw new Error('Regra ausente');
    expect(explicarRegra(item).modo).toBe('automatico');
  });
  it("separa mudança de dia e horário vencido dos disparos manuais do calendário", () => {
    expect(origemFluxo({ ...regra("atrasados_hoje"), gatilho: "agenda_aberta" })).toBe(ORIGEM_DATA);
    expect(origemFluxo({ ...regra("horario_vencido"), gatilho: "horario_vencido" })).toBe(ORIGEM_DATA);
    expect(origemFluxo(regra("arrastar_tarefa"))).toBe("Calendário");
  });
  it("completa comportamentos existentes sem duplicar uma regra salva", () => {
    const salva = regra("unir_mesmo_contato", false);
    const catalogo = completarCatalogo([salva]);
    expect(catalogo.filter(r => r.chave === "unir_mesmo_contato")).toEqual([salva]);
    expect(catalogo.some(r => r.chave === "atrasada_nao_move")).toBe(true);
  });
  it("não altera estado nem configuração das regras salvas", () => {
    const salva = regra("cal_pergunta_dia_todo", false);
    salva.acao_config = { dias: 7 };
    const antes = structuredClone(salva);
    completarCatalogo([salva]);
    expect(salva).toEqual(antes);
  });
  it("distingue sugestão automática de confirmação do usuário", () => {
    expect(explicarRegra(regra("analise_antecipada")).modo).toBe("automatico");
    expect(explicarRegra(regra("cal_pergunta_dia_todo")).modo).toBe("usuario");
  });
  it("mostra manter data, sugestão e mover outras quando a decisão de dia todo está em execução", () => {
    expect(ids(fluxoMovimentacao([regra("cal_pergunta_dia_todo")]))).toEqual(expect.arrayContaining(["direto", "manter", "sugerida", "mover-outras", "resumo"]));
  });
  it("não oferece mover outras pela regra de dia todo desativada", () => {
    expect(ids(fluxoMovimentacao([regra("cal_pergunta_dia_todo", false)]))).not.toContain("mover-outras");
  });
});