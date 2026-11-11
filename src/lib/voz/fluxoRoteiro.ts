/**
 * Roteiro de voz como workflow de blocos: cada etapa é um bloco "Pergunta" com saídas
 * (uma por regra "Se o cliente…") ligadas a outra pergunta ou a um bloco de ação
 * (transferir, encerrar, reagendar, disparar workflow…). O grafo é só uma visão do
 * roteiro salvo (etapas + condições), então a ligação e os aparelhos não mudam.
 * Puro: testável.
 */
import type { AcaoCondicao, CondicaoRoteiro, EtapaEditavel, RoteiroSalvo } from "./roteirosLigacao";

export type TipoSaida = "sim" | "nao" | "nao_reconheceu" | "silencio" | "atendente" | "objecao" | "outro_dia" | "quem" | "personalizada";

export const SAIDAS_PRONTAS: { tipo: Exclude<TipoSaida, "personalizada">; rotulo: string; condicao: CondicaoRoteiro }[] = [
  { tipo: "sim", rotulo: "Resposta \"sim\"", condicao: { gatilho: "sim, já olhei, vi, confirmo, pode ser, quero", acao: "avancar" } },
  { tipo: "nao", rotulo: "Resposta \"não\"", condicao: { gatilho: "não, ainda não, não deu tempo, não preciso", acao: "encerrar", texto: "Agradeça e diga que fica à disposição." } },
  { tipo: "nao_reconheceu", rotulo: "Não reconheceu o que foi dito", condicao: { gatilho: "respondeu outra coisa que não está nas regras", acao: "responder", texto: "Responda em uma frase e volte à pergunta desta etapa, sem repetir etapas já respondidas. Se não der para ajudar, transfira." } },
  { tipo: "silencio", rotulo: "Silêncio / ruído", condicao: { gatilho: "não respondeu ou ficou em silêncio", acao: "responder", texto: "Repita só a pergunta atual, mais curta. Se calar de novo, agradeça e inclua [DESLIGAR]." } },
  { tipo: "atendente", rotulo: "Pediu atendente / \"Humano\"", condicao: { gatilho: "humano, quero falar com uma pessoa, me passa para alguém, atendente", acao: "transferir" } },
  { tipo: "objecao", rotulo: "Dúvida / achou caro", condicao: { gatilho: "achou caro, qual o valor, tem desconto, qual o prazo", acao: "desconto" } },
  { tipo: "outro_dia", rotulo: "Pediu outro dia", condicao: { gatilho: "pediu para ligar outro dia, agora não posso, liga depois", acao: "reagendar" } },
  { tipo: "quem", rotulo: "Quem é? / do que se trata", condicao: { gatilho: "qual orçamento, quem é, do que se trata, não lembro", acao: "responder", texto: "Diga em uma frase quem é e o motivo, e repita a pergunta." } },
];

/** Classifica a saída pelo texto do gatilho (cor e ícone do conector). */
export function tipoSaida(c: CondicaoRoteiro): TipoSaida {
  const g = c.gatilho.toLowerCase();
  if (/sil[eê]ncio|n[aã]o respondeu/.test(g)) return "silencio";
  if (/outra coisa|n[aã]o est[aá] nas regras|n[aã]o entendeu/.test(g)) return "nao_reconheceu";
  if (/outro dia|liga depois|n[aã]o posso/.test(g)) return "outro_dia";
  if (/humano|pessoa|atendente|algu[eé]m/.test(g)) return "atendente";
  if (/caro|valor|desconto|pre[cç]o|prazo/.test(g)) return "objecao";
  if (/quem [eé]|do que se trata|qual or[cç]amento/.test(g)) return "quem";
  if (/^\s*n[aã]o\b/.test(g)) return "nao";
  if (/^\s*(sim|j[aá]|vi|confirmo|pode)/.test(g)) return "sim";
  return "personalizada";
}

/** Ações que viram bloco final próprio no desenho. */
export const ACOES_BLOCO: AcaoCondicao[] = ["transferir", "encerrar", "reagendar", "workflow", "desconto"];

export interface NoFluxo { id: string; tipo: "inicio" | "pergunta" | "acao"; etapa?: number; saida?: number; x: number; y: number }
export interface ArestaFluxo { id: string; origem: string; saida?: string; destino: string }

const COL = 380, LIN = 260;

/** Posição padrão de cada pergunta (cascata) quando ainda não foi arrastada. */
export const posicaoEtapa = (e: EtapaEditavel, i: number) => e.pos ?? { x: 80 + i * COL, y: 140 + (i % 2) * 60 };

/** Nós e conexões desenhados a partir do roteiro salvo. Puro. */
export function grafoDoRoteiro(r: RoteiroSalvo): { nos: NoFluxo[]; arestas: ArestaFluxo[] } {
  const nos: NoFluxo[] = [{ id: "inicio", tipo: "inicio", x: posicaoEtapa(r.etapas[0] ?? { titulo: "", fala: "", condicoes: [] }, 0).x - 260, y: 160 }];
  const arestas: ArestaFluxo[] = [];
  if (r.etapas.length) arestas.push({ id: "inicio-e0", origem: "inicio", destino: "e0" });
  r.etapas.forEach((e, i) => {
    const p = posicaoEtapa(e, i);
    nos.push({ id: `e${i}`, tipo: "pergunta", etapa: i, x: p.x, y: p.y });
    let acoes = 0;
    e.condicoes.forEach((c, j) => {
      const saida = `c${j}`;
      const alvo = c.acao === "ir_etapa" && c.etapa != null && r.etapas[c.etapa] ? `e${c.etapa}`
        : c.acao === "avancar" && r.etapas[i + 1] ? `e${i + 1}` : null;
      if (alvo) { arestas.push({ id: `e${i}-${saida}-${alvo}`, origem: `e${i}`, saida, destino: alvo }); return; }
      if (!ACOES_BLOCO.includes(c.acao)) return;
      const id = `a${i}-${j}`;
      nos.push({ id, tipo: "acao", etapa: i, saida: j, x: p.x + 40, y: p.y + LIN + 30 + acoes++ * 96 });
      arestas.push({ id: `e${i}-${saida}-${id}`, origem: `e${i}`, saida, destino: id });
      if (c.acao === "workflow" && c.etapa != null && r.etapas[c.etapa]) arestas.push({ id: `${id}-e${c.etapa}`, origem: id, destino: `e${c.etapa}` });
    });
  });
  return { nos, arestas };
}

const mudarCond = (r: RoteiroSalvo, i: number, j: number, f: (c: CondicaoRoteiro) => CondicaoRoteiro): RoteiroSalvo => ({
  ...r, etapas: r.etapas.map((e, k) => (k !== i ? e : { ...e, condicoes: e.condicoes.map((c, m) => (m === j ? f(c) : c)) })),
});

/** Liga a saída `j` da pergunta `i` a outra pergunta (vira "próxima etapa" ou "ir para a etapa"). Puro. */
export function ligarSaida(r: RoteiroSalvo, i: number, j: number, destino: number): RoteiroSalvo {
  return mudarCond(r, i, j, (c) => {
    const { etapa: _e, workflow: _w, ...base } = c;
    return destino === i + 1 ? { ...base, acao: "avancar" } : { ...base, acao: "ir_etapa", etapa: destino };
  });
}

/** Depois de disparar o workflow da saída `j`, a conversa continua na pergunta `destino` (ou encerra se null). Puro. */
export function continuarAposWorkflow(r: RoteiroSalvo, i: number, j: number, destino: number | null): RoteiroSalvo {
  return mudarCond(r, i, j, (c) => {
    const { etapa: _e, ...base } = c;
    return destino == null ? base : { ...base, etapa: destino };
  });
}

/** Desfaz a ligação de uma saída: ela volta a "responder e continuar". Puro. */
export function soltarSaida(r: RoteiroSalvo, i: number, j: number): RoteiroSalvo {
  return mudarCond(r, i, j, (c) => {
    const { etapa: _e, workflow: _w, ...base } = c;
    return { ...base, acao: "responder" };
  });
}

/** Novo bloco Pergunta já com as saídas "sim", "não" e "não reconheceu". Puro. */
export function novaPergunta(r: RoteiroSalvo, pos?: { x: number; y: number }): RoteiroSalvo {
  const n = r.etapas.length;
  const saidas = (["sim", "nao", "nao_reconheceu"] as const).map((t) => ({ ...SAIDAS_PRONTAS.find((s) => s.tipo === t)!.condicao }));
  const etapa: EtapaEditavel = { titulo: `Pergunta ${n + 1}`, fala: "", condicoes: saidas, pos: pos ?? { x: 80 + n * COL, y: 140 } };
  return { ...r, etapas: [...r.etapas, etapa] };
}

/** Adiciona uma saída pronta (ou personalizada) à pergunta `i`. Puro. */
export function adicionarSaida(r: RoteiroSalvo, i: number, tipo: TipoSaida): RoteiroSalvo {
  const pronta = SAIDAS_PRONTAS.find((s) => s.tipo === tipo);
  const c: CondicaoRoteiro = pronta ? { ...pronta.condicao } : { gatilho: "", acao: "responder" };
  return { ...r, etapas: r.etapas.map((e, k) => (k === i ? { ...e, condicoes: [...e.condicoes, c] } : e)) };
}

/** Grava a posição arrastada da pergunta `i`. Puro. */
export const moverPergunta = (r: RoteiroSalvo, i: number, pos: { x: number; y: number }): RoteiroSalvo =>
  ({ ...r, etapas: r.etapas.map((e, k) => (k === i ? { ...e, pos: { x: Math.round(pos.x), y: Math.round(pos.y) } } : e)) });

/** Blocos do menu lateral do editor. "pergunta" cria bloco; "saida"/"acao" se soltam sobre uma pergunta. */
export type BlocoMenu =
  | { tipo: "pergunta"; id: "simnao" | "opcoes" | "aberta" | "aviso"; rotulo: string; descricao: string }
  | { tipo: "saida"; id: TipoSaida; rotulo: string; descricao: string }
  | { tipo: "acao"; id: "transferir" | "encerrar" | "reagendar" | "desconto" | "workflow"; rotulo: string; descricao: string };

export const MENU_BLOCOS: { grupo: string; blocos: BlocoMenu[] }[] = [
  { grupo: "Perguntas", blocos: [
    { tipo: "pergunta", id: "simnao", rotulo: "Pergunta sim/não", descricao: "Saídas sim, não e não reconheceu" },
    { tipo: "pergunta", id: "opcoes", rotulo: "Pergunta com opções", descricao: "Cliente escolhe entre opções citadas" },
    { tipo: "pergunta", id: "aberta", rotulo: "Pergunta aberta", descricao: "Qualquer resposta segue adiante" },
    { tipo: "pergunta", id: "aviso", rotulo: "Fala / aviso", descricao: "Informa e segue para o próximo bloco" },
  ] },
  { grupo: "Respostas do cliente", blocos: [
    ...SAIDAS_PRONTAS.map((s) => ({ tipo: "saida" as const, id: s.tipo, rotulo: s.rotulo, descricao: "Solte sobre uma pergunta" })),
    { tipo: "saida", id: "personalizada", rotulo: "Resposta personalizada", descricao: "Defina as palavras" },
  ] },
  { grupo: "Ações", blocos: [
    { tipo: "acao", id: "transferir", rotulo: "Transferir para atendente", descricao: "Passa a ligação com resumo" },
    { tipo: "acao", id: "encerrar", rotulo: "Agradecer e encerrar", descricao: "Finaliza a ligação" },
    { tipo: "acao", id: "reagendar", rotulo: "Reagendar retorno", descricao: "Cria tarefa na agenda" },
    { tipo: "acao", id: "desconto", rotulo: "Oferecer desconto", descricao: "Usa o desconto máximo" },
    { tipo: "acao", id: "workflow", rotulo: "Disparar workflow", descricao: "Omnichannel, Bot, Vendas…" },
  ] },
];

/** Cria o bloco de pergunta do tipo escolhido na posição indicada. Puro. */
export function novaPerguntaTipo(r: RoteiroSalvo, id: "simnao" | "opcoes" | "aberta" | "aviso", pos?: { x: number; y: number }): RoteiroSalvo {
  if (id === "simnao") return novaPergunta(r, pos);
  const n = r.etapas.length;
  const pronta = (t: TipoSaida) => ({ ...SAIDAS_PRONTAS.find((s) => s.tipo === t)!.condicao });
  const base = { pos: pos ?? { x: 80 + n * COL, y: 140 } };
  const etapa: EtapaEditavel =
    id === "opcoes" ? { ...base, titulo: `Pergunta ${n + 1}`, fala: "O senhor prefere opção 1 ou opção 2?", condicoes: [{ gatilho: "opção 1", acao: "avancar" }, { gatilho: "opção 2", acao: "avancar" }, pronta("nao_reconheceu"), pronta("silencio")] }
    : id === "aberta" ? { ...base, titulo: `Pergunta ${n + 1}`, fala: "", condicoes: [{ gatilho: "qualquer resposta", acao: "avancar" }, pronta("silencio")] }
    : { ...base, titulo: `Aviso ${n + 1}`, fala: "", condicoes: [{ gatilho: "qualquer resposta", acao: "avancar" }] };
  return { ...r, etapas: [...r.etapas, etapa] };
}

const GATILHO_ACAO: Record<string, string> = {
  transferir: SAIDAS_PRONTAS.find((s) => s.tipo === "atendente")!.condicao.gatilho,
  encerrar: SAIDAS_PRONTAS.find((s) => s.tipo === "nao")!.condicao.gatilho,
  reagendar: SAIDAS_PRONTAS.find((s) => s.tipo === "outro_dia")!.condicao.gatilho,
  desconto: SAIDAS_PRONTAS.find((s) => s.tipo === "objecao")!.condicao.gatilho,
  workflow: "me manda pelo whatsapp, manda mensagem, manda o catálogo",
};

/** Solta um bloco de ação sobre a pergunta `i`: vira uma saída nova com essa ação. Puro. */
export function adicionarAcao(r: RoteiroSalvo, i: number, acao: "transferir" | "encerrar" | "reagendar" | "desconto" | "workflow"): RoteiroSalvo {
  const c: CondicaoRoteiro = { gatilho: GATILHO_ACAO[acao], acao };
  return { ...r, etapas: r.etapas.map((e, k) => (k === i ? { ...e, condicoes: [...e.condicoes, c] } : e)) };
}
