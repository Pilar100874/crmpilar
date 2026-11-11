/**
 * Validação das perguntas do roteiro de voz: confere se cada fala conduz o cliente
 * a responder algo que uma saída do bloco entende (sim/não, opções citadas, uma
 * pergunta por vez) e se, quando ele foge, a IA reapresenta as opções. Puro: testável.
 */
import type { EtapaEditavel, RoteiroSalvo } from "./roteirosLigacao";
import { SAIDAS_PRONTAS, tipoSaida } from "./fluxoRoteiro";

export type CodigoAviso =
  | "vazia" | "sem_pergunta" | "varias_perguntas" | "longa" | "aberta_sim_nao"
  | "opcoes_nao_citadas" | "sem_reconheceu" | "sem_silencio" | "reconheceu_sem_orientar";
export interface AvisoPergunta { nivel: "erro" | "aviso"; codigo: CodigoAviso; texto: string; corrigivel: boolean }

const semInstrucoes = (f: string) => f.replace(/\([^)]*\)/g, " ").replace(/\s+/g, " ").trim();
const ABERTA = /(^|[\s,.;:¿])(qual|quais|quando|como|onde|por ?que|quanto|quantos|quantas|o que)\b/i;
const IGNORAR = new Set(["nao_reconheceu", "silencio", "quem", "objecao", "atendente"]);

/** Respostas que o cliente deveria dar nesta pergunta (as que seguem o fluxo). */
export function opcoesEsperadas(e: EtapaEditavel): string[] {
  const ops: string[] = [];
  for (const c of e.condicoes) {
    const t = tipoSaida(c);
    if (IGNORAR.has(t)) continue;
    const o = t === "sim" ? "sim" : t === "nao" ? "não" : t === "outro_dia" ? "outro dia" : c.gatilho.split(",")[0].trim();
    if (o && !/qualquer resposta/i.test(o) && !ops.includes(o)) ops.push(o);
  }
  return ops;
}

/** Texto da saída "não reconheceu" que reconduz o cliente às opções do fluxo. */
export const textoOrientacao = (ops: string[]) =>
  `Diga com educação que não entendeu bem e repita a pergunta oferecendo as opções: ${ops.join(" ou ")}. Ex.: "Só para eu confirmar: ${ops.join(" ou ")}?" Não avance de etapa.`;

/** Avisos da pergunta `e` (vazio = pergunta conduz bem o cliente). */
export function validarPergunta(e: EtapaEditavel): AvisoPergunta[] {
  const fala = semInstrucoes(e.fala);
  if (!fala) return [{ nivel: "erro", codigo: "vazia", texto: "Escreva o que a IA fala neste bloco.", corrigivel: false }];
  const tipos = e.condicoes.map(tipoSaida);
  const decisao = e.condicoes.some((c) => !/qualquer resposta/i.test(c.gatilho) && !IGNORAR.has(tipoSaida(c)));
  if (!decisao) return []; // fala informativa ou pergunta aberta sem ramificação
  const ops = opcoesEsperadas(e);
  const av: AvisoPergunta[] = [];
  // Instruções como "Pergunte se…" valem como uma pergunta que a IA vai formular.
  const interrog = (fala.match(/\?/g) ?? []).length + (/^\s*(pergunte|confirme|verifique se)\b/i.test(fala) ? 1 : 0);
  if (!interrog) av.push({ nivel: "erro", codigo: "sem_pergunta", texto: "A fala não termina em pergunta: o cliente não sabe o que responder.", corrigivel: true });
  if (interrog > 1) av.push({ nivel: "erro", codigo: "varias_perguntas", texto: "Há mais de uma pergunta. Faça uma por vez para o cliente responder a certa.", corrigivel: false });
  if (fala.split(" ").length > 30) av.push({ nivel: "aviso", codigo: "longa", texto: "Fala longa (mais de 30 palavras): o cliente tende a interromper ou esquecer a pergunta.", corrigivel: false });
  const simNao = tipos.includes("sim") || tipos.includes("nao");
  const ultima = fala.split(/[.!]/).pop() ?? fala;
  if (simNao && ABERTA.test(ultima)) av.push({ nivel: "aviso", codigo: "aberta_sim_nao", texto: "Pergunta aberta (qual, quando, como…), mas as saídas esperam sim ou não. Reformule para sim/não.", corrigivel: false });
  if (!simNao && ops.length >= 2) {
    const norm = fala.toLowerCase();
    const faltando = ops.filter((o) => !norm.includes(o.toLowerCase().split(" ")[0]));
    if (faltando.length) av.push({ nivel: "aviso", codigo: "opcoes_nao_citadas", texto: `Cite as opções na pergunta para orientar o cliente (faltam: ${faltando.join(", ")}).`, corrigivel: true });
  }
  const rec = e.condicoes.find((c) => tipoSaida(c) === "nao_reconheceu");
  if (!rec) av.push({ nivel: "aviso", codigo: "sem_reconheceu", texto: "Sem saída \"não reconheceu\": se o cliente responder outra coisa, a IA fica sem rumo.", corrigivel: true });
  else if (ops.length && !ops.every((o) => (rec.texto ?? "").toLowerCase().includes(o.toLowerCase()))) av.push({ nivel: "aviso", codigo: "reconheceu_sem_orientar", texto: "Quando não entender, a IA deve repetir as opções esperadas para reconduzir o cliente.", corrigivel: true });
  if (!tipos.includes("silencio")) av.push({ nivel: "aviso", codigo: "sem_silencio", texto: "Sem saída de silêncio: se o cliente calar, a IA não sabe o que fazer.", corrigivel: true });
  return av;
}

/** Aplica a correção automática de um aviso na pergunta `i`. Puro. */
export function corrigirPergunta(r: RoteiroSalvo, i: number, codigo: CodigoAviso): RoteiroSalvo {
  const e = r.etapas[i];
  if (!e) return r;
  const ops = opcoesEsperadas(e);
  const pergunta = ops.length >= 2 ? `${ops.slice(0, -1).join(", ")} ou ${ops[ops.length - 1]}?` : "sim ou não?";
  let n: EtapaEditavel = e;
  if (codigo === "sem_pergunta") n = { ...e, fala: `${e.fala.trim().replace(/[.!]$/, "")}. Pode ser, ${pergunta}` };
  if (codigo === "opcoes_nao_citadas") n = { ...e, fala: `${e.fala.trim().replace(/\?$/, "")}: ${pergunta}` };
  if (codigo === "sem_reconheceu") n = { ...e, condicoes: [...e.condicoes, { gatilho: SAIDAS_PRONTAS.find((s) => s.tipo === "nao_reconheceu")!.condicao.gatilho, acao: "responder", texto: textoOrientacao(ops.length ? ops : ["sim", "não"]) }] };
  if (codigo === "reconheceu_sem_orientar") n = { ...e, condicoes: e.condicoes.map((c) => (tipoSaida(c) === "nao_reconheceu" ? { ...c, acao: "responder" as const, etapa: undefined, texto: textoOrientacao(ops) } : c)) };
  if (codigo === "sem_silencio") n = { ...e, condicoes: [...e.condicoes, { ...SAIDAS_PRONTAS.find((s) => s.tipo === "silencio")!.condicao }] };
  return n === e ? r : { ...r, etapas: r.etapas.map((x, k) => (k === i ? n : x)) };
}

/** Corrige tudo que dá para corrigir sozinho em todas as perguntas. Puro. */
export function corrigirTodas(r: RoteiroSalvo): RoteiroSalvo {
  let out = r;
  out.etapas.forEach((_, i) => {
    for (let n = 0; n < 6; n++) {
      const a = validarPergunta(out.etapas[i]).find((x) => x.corrigivel);
      if (!a) break;
      const prox = corrigirPergunta(out, i, a.codigo);
      if (prox === out) break;
      out = prox;
    }
  });
  return out;
}
