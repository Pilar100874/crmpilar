import type { AcaoCondicao, RoteiroSalvo } from "./roteirosLigacao";
import { palavrasGatilho } from "./roteirosLigacao";

export type Fala = { papel: string; texto: string };
const norm = (s: string) => s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9 ]/g, " ").replace(/\s+/g, " ").trim();

/** A resposta já está em alguma regra da etapa? Pura. */
export function respostaReconhecida(r: RoteiroSalvo, etapa: number, resposta: string): boolean {
  const alvo = norm(resposta);
  if (!alvo) return true;
  return (r.etapas[etapa]?.condicoes ?? []).some((c) => palavrasGatilho(c.gatilho).some((p) => { const n = norm(p); return n.length > 1 && (alvo === n || alvo.includes(n)); }));
}

/**
 * Adiciona uma resposta do cliente a uma regra da etapa. Se já existir regra com a mesma ação,
 * a resposta entra na lista separada por vírgula; senão, cria nova regra. Não duplica. Pura.
 */
export function adicionarResposta(r: RoteiroSalvo, etapa: number, resposta: string, acao: AcaoCondicao, texto?: string): RoteiroSalvo {
  const palavra = resposta.trim().replace(/[.!?]+$/, "");
  const e = r.etapas[etapa];
  if (!e || !palavra) return r;
  const existe = e.condicoes.some((c) => palavrasGatilho(c.gatilho).some((p) => norm(p) === norm(palavra)));
  if (existe) return r;
  const i = e.condicoes.findIndex((c) => c.acao === acao && (acao !== "responder" || !texto || c.texto === texto));
  const condicoes = i >= 0
    ? e.condicoes.map((c, k) => (k === i ? { ...c, gatilho: [...palavrasGatilho(c.gatilho), palavra].join(", ") } : c))
    : [...e.condicoes, { gatilho: palavra, acao, ...(texto ? { texto } : {}) }];
  return { ...r, etapas: r.etapas.map((x, k) => (k === etapa ? { ...x, condicoes } : x)) };
}

const FALHA = /(desculpe.{0,20}n[aã]o (ouvi|entendi)|pode repetir|consegue me ouvir|n[aã]o entendi)/i;

/** Etapa em que a conversa estava quando o cliente falou no índice i: número de perguntas da IA antes dele, limitado ao roteiro. Pura. */
export function etapaDaFala(falas: Fala[], i: number, totalEtapas: number): number {
  const perguntas = falas.slice(0, i).filter((f) => f.papel === "agente" && !FALHA.test(f.texto)).length;
  return Math.max(0, Math.min(totalEtapas - 1, perguntas - 1));
}

/** A fala do cliente no índice i foi seguida de "não entendi"/repetição pela IA? Pura. */
export function falaNaoEntendida(falas: Fala[], i: number): boolean {
  if (falas[i]?.papel !== "cliente") return false;
  const prox = falas.slice(i + 1).find((f) => f.papel === "agente");
  if (!prox) return false;
  if (FALHA.test(prox.texto)) return true;
  const ant = [...falas.slice(0, i)].reverse().find((f) => f.papel === "agente");
  return !!ant && norm(ant.texto).length > 10 && norm(prox.texto).includes(norm(ant.texto).slice(-40));
}

export interface AjusteSugerido { resposta: string; vezes: number; chamadas: number }
/** Agrupa respostas reais não entendidas pela IA, mais frequentes primeiro. Pura. */
export function ajustesSugeridos(transcricoes: Fala[][]): AjusteSugerido[] {
  const m = new Map<string, { resposta: string; vezes: number; ch: Set<number> }>();
  transcricoes.forEach((falas, c) => falas.forEach((f, i) => {
    if (!falaNaoEntendida(falas, i) || f.texto.startsWith("(")) return;
    const k = norm(f.texto);
    if (!k || k.split(" ").length > 8) return;
    const g = m.get(k) ?? { resposta: f.texto.trim().replace(/[.!?]+$/, ""), vezes: 0, ch: new Set<number>() };
    g.vezes++; g.ch.add(c); m.set(k, g);
  }));
  return [...m.values()].map((g) => ({ resposta: g.resposta, vezes: g.vezes, chamadas: g.ch.size })).sort((a, b) => b.vezes - a.vezes);
}
