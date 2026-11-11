import type { CondicaoRoteiro, EtapaEditavel, RoteiroSalvo } from "./roteirosLigacao";

/** Técnicas comerciais e de negociação aplicáveis às etapas dos roteiros de voz (funções puras). */
export type FaseTecnica = "abertura" | "investigacao" | "oferta" | "fechamento";
export interface TecnicaComercial {
  id: string; nome: string; fase: FaseTecnica; resumo: string; exemplo: string;
  /** Instrução usada pela IA ao gerar roteiros com esta técnica. */
  instrucaoIa: string;
  /** Saída acrescentada à etapa ao aplicar a técnica. */
  condicao?: CondicaoRoteiro;
}

export const FASES_TECNICA: { id: FaseTecnica; rotulo: string }[] = [
  { id: "abertura", rotulo: "Abertura" }, { id: "investigacao", rotulo: "Investigação e objeções" },
  { id: "oferta", rotulo: "Oferta" }, { id: "fechamento", rotulo: "Fechamento" },
];

export const TECNICAS: TecnicaComercial[] = [
  { id: "upfront", nome: "Contrato prévio", fase: "abertura", resumo: "Combina o tempo da ligação e pede permissão para seguir.",
    exemplo: "Preciso de só 30 segundos para falar do seu orçamento. Pode ser agora?",
    instrucaoIa: "Contrato prévio: na abertura diga que leva só 30 segundos e peça permissão para continuar.",
    condicao: { gatilho: "agora não, estou ocupado, sem tempo, não posso", acao: "reagendar", texto: "Pergunte o melhor dia e horário para retornar." } },
  { id: "yes_ladder", nome: "Escada de sins", fase: "abertura", resumo: "Perguntas fáceis de responder com sim antes do pedido principal.",
    exemplo: "O senhor ainda está com aquela obra em andamento, certo?",
    instrucaoIa: "Escada de sins: antes da oferta faça uma ou duas perguntas óbvias de confirmação (resposta sim)." },
  { id: "mirroring", nome: "Espelhamento", fase: "investigacao", resumo: "Repete as 2 ou 3 palavras-chave do cliente em tom de pergunta.",
    exemplo: "Cliente: \"o frete está pesado\". IA: \"O frete está pesado?\"",
    instrucaoIa: "Espelhamento: diante de objeção, repita em tom de pergunta as 2 ou 3 palavras-chave do cliente e espere.",
    condicao: { gatilho: "achei caro, está caro, frete alto, prazo longo, não sei", acao: "responder", texto: "Peça, com naturalidade, que ele conte um pouco mais (ex.: \"Como assim?\"), sem repetir a frase dele." } },
  { id: "labeling", nome: "Rotulagem", fase: "investigacao", resumo: "Dá nome à preocupação do cliente para baixar a defesa.",
    exemplo: "Parece que o prazo de entrega é o que mais preocupa o senhor, certo?",
    instrucaoIa: "Rotulagem: nomeie a preocupação do cliente (\"parece que o prazo te preocupa\") antes de propor solução.",
    condicao: { gatilho: "tenho receio, preocupado, já tive problema, não confio", acao: "responder", texto: "Mostre que entendeu a preocupação com palavras suas (ex.: \"Entendo, isso atrapalha mesmo\") e ofereça a solução." } },
  { id: "ancoragem", nome: "Ancoragem", fase: "oferta", resumo: "Mostra primeiro o valor de referência e depois a condição especial.",
    exemplo: "A tabela desse item é mais alta, mas nesta semana conseguimos {condicao}. Faz sentido?",
    instrucaoIa: "Ancoragem: cite primeiro o valor ou condição de referência (tabela) e só depois a condição especial." },
  { id: "perda", nome: "Aversão à perda", fase: "oferta", resumo: "Mostra o que o cliente perde se não decidir agora, com motivo real.",
    exemplo: "Essa condição vale só até sexta, depois entra o reajuste. Quer garantir?",
    instrucaoIa: "Aversão à perda: diga com motivo real o prazo da condição e o que muda depois dele, sem inventar urgência." },
  { id: "dupla_alternativa", nome: "Dupla alternativa", fase: "fechamento", resumo: "Oferece duas opções positivas em vez de sim ou não.",
    exemplo: "Fica melhor entregar na quinta de manhã ou na sexta à tarde?",
    instrucaoIa: "Dupla alternativa: no fechamento ofereça duas opções positivas (A ou B), nunca \"quer fechar?\"." },
  { id: "batna", nome: "Plano B (BATNA)", fase: "fechamento", resumo: "Quando o cliente recusa, oferece uma alternativa menor antes de encerrar.",
    exemplo: "Entendo. Posso mandar a proposta pelo WhatsApp para o senhor avaliar com calma?",
    instrucaoIa: "Plano B (BATNA): na recusa, ofereça uma alternativa menor (lote menor, envio por WhatsApp ou retorno) antes de encerrar.",
    condicao: { gatilho: "não, não quero, não tenho interesse, agora não", acao: "responder", texto: "Ofereça o plano B: lote menor ou mandar a proposta pelo WhatsApp. Se recusar de novo, agradeça e inclua [DESLIGAR]." } },
];

export const tecnica = (id: string) => TECNICAS.find((t) => t.id === id);

/** Aplica a técnica na etapa: acrescenta a saída da técnica (sem duplicar) e usa o exemplo como fala se estiver vazia. */
export function aplicarTecnica(r: RoteiroSalvo, i: number, id: string): RoteiroSalvo {
  const t = tecnica(id);
  if (!t || !r.etapas[i]) return r;
  const etapas = r.etapas.map((e, k): EtapaEditavel => {
    if (k !== i) return e;
    const tecnicas = Array.from(new Set([...(e.tecnicas ?? []), id]));
    const jaTem = t.condicao && e.condicoes.some((c) => c.gatilho === t.condicao!.gatilho);
    return { ...e, tecnicas, fala: e.fala.trim() ? e.fala : t.exemplo.includes("Cliente:") ? e.fala : t.exemplo,
      condicoes: t.condicao && !jaTem ? [...e.condicoes, { ...t.condicao }] : e.condicoes };
  });
  return { ...r, etapas };
}

/** Texto enviado à IA de geração com as técnicas escolhidas. */
export const instrucaoTecnicas = (ids: string[]) =>
  ids.map((id) => tecnica(id)?.instrucaoIa).filter(Boolean).join(" ");
