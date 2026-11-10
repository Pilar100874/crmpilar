import type { AcaoCondicao, CondicaoRoteiro, Departamento, EtapaEditavel, RoteiroSalvo } from "./roteirosLigacao";

/** Diagnóstico, modelos extras e mapa visual dos roteiros de voz (funções puras, sem efeito no que está salvo). */

export const LIMITE_PALAVRAS = 25;
export interface AlertaRoteiro { nivel: "erro" | "aviso"; etapa: number | null; texto: string }
export interface DiagnosticoRoteiro { nota: number; alertas: AlertaRoteiro[] }

const palavras = (t: string) => t.trim().split(/\s+/).filter(Boolean).length;
const tem = (cs: CondicaoRoteiro[], re: RegExp) => cs.some((c) => re.test(c.gatilho.toLowerCase()));
const SIL = /silêncio|silencio|não respondeu|nao respondeu/;
const NEG = /\bnão\b|\bnao\b|depois|agora não|não preciso|não quero/;

export function diagnosticarRoteiro(r: RoteiroSalvo): DiagnosticoRoteiro {
  const a: AlertaRoteiro[] = [];
  if (!r.etapas.length) a.push({ nivel: "erro", etapa: null, texto: "O roteiro não tem etapas." });
  r.etapas.forEach((e, i) => {
    const n = palavras(e.fala);
    if (!n) a.push({ nivel: "erro", etapa: i, texto: "Etapa sem fala: a IA não sabe o que dizer." });
    else if (n > LIMITE_PALAVRAS) a.push({ nivel: "aviso", etapa: i, texto: `Fala com ${n} palavras. Ao telefone, prefira até ${LIMITE_PALAVRAS}.` });
    if ((e.fala.replace(/tudo bem\?/gi, "").match(/\?/g) ?? []).length > 1) a.push({ nivel: "aviso", etapa: i, texto: "Mais de uma pergunta na mesma fala. Faça uma por vez." });
    if (e.fala.includes("?")) {
      if (!tem(e.condicoes, NEG)) a.push({ nivel: "aviso", etapa: i, texto: "Pergunta sem regra para resposta negativa (\"não\")." });
      if (!tem(e.condicoes, SIL)) a.push({ nivel: "aviso", etapa: i, texto: "Sem regra para silêncio do cliente." });
    }
    e.condicoes.forEach((c) => { if (!c.gatilho.trim()) a.push({ nivel: "erro", etapa: i, texto: "Regra com o campo SE vazio." }); });
    e.condicoes.forEach((c) => {
      if (c.acao === "ir_etapa" && (c.etapa == null || !r.etapas[c.etapa])) a.push({ nivel: "erro", etapa: i, texto: "Regra \"Ir para a etapa\" sem etapa de destino." });
      else if (c.acao === "ir_etapa" && c.etapa === i) a.push({ nivel: "aviso", etapa: i, texto: "Regra manda ir para a própria etapa (pode repetir a pergunta)." });
    });
    if (e.condicoes.some((c) => c.acao === "avancar") && i === r.etapas.length - 1)
      a.push({ nivel: "aviso", etapa: i, texto: "Última etapa manda avançar, mas não há próxima etapa." });
  });
  if (r.etapas.length && !r.etapas.some((e) => e.condicoes.some((c) => c.acao === "transferir")))
    a.push({ nivel: "aviso", etapa: null, texto: "Nenhuma regra transfere para um atendente quando o cliente tiver dúvida." });
  if (r.etapas.length && !r.etapas.some((e) => e.condicoes.some((c) => c.acao === "encerrar" || /\[DESLIGAR\]/.test(c.texto ?? ""))))
    a.push({ nivel: "aviso", etapa: null, texto: "Nenhuma regra encerra a ligação educadamente." });
  const nota = Math.max(0, 10 - a.reduce((s, x) => s + (x.nivel === "erro" ? 3 : 1), 0));
  return { nota, alertas: a };
}

/** Acrescenta as regras de escape que faltam (não, silêncio, transferência), sem duplicar. */
export function corrigirAutomatico(r: RoteiroSalvo): RoteiroSalvo {
  const etapas = r.etapas.map((e) => {
    if (!e.fala.includes("?")) return e;
    const cs = [...e.condicoes];
    if (!tem(cs, NEG)) cs.push({ gatilho: "não, agora não, não preciso", acao: "encerrar", texto: "Agradeça e diga que fica à disposição." });
    if (!tem(cs, SIL)) cs.push({ gatilho: "não respondeu ou ficou em silêncio", acao: "responder", texto: "Repita só a pergunta atual, mais curta. Se calar de novo, agradeça e inclua [DESLIGAR]." });
    return { ...e, condicoes: cs };
  });
  if (etapas.length && !etapas.some((e) => e.condicoes.some((c) => c.acao === "transferir")))
    etapas[etapas.length - 1] = { ...etapas[etapas.length - 1], condicoes: [...etapas[etapas.length - 1].condicoes, { gatilho: "dúvida, quero falar com alguém, valor, prazo", acao: "transferir" }] };
  return { ...r, etapas };
}

// ---------- Modelos prontos ----------
const SIL_C: CondicaoRoteiro = { gatilho: "não respondeu ou ficou em silêncio", acao: "responder", texto: "Repita só a pergunta atual, mais curta. Se calar de novo, agradeça e inclua [DESLIGAR]." };
const TRANSF: CondicaoRoteiro = { gatilho: "dúvida, quero falar com alguém, valor, prazo", acao: "transferir" };
const et = (titulo: string, fala: string, ...condicoes: CondicaoRoteiro[]): EtapaEditavel => ({ titulo, fala, condicoes: [...condicoes, SIL_C] });

export interface ModeloRoteiro { id: string; nome: string; descricao: string; departamento: Departamento; etapas: EtapaEditavel[] }
export const MODELOS_ROTEIRO: ModeloRoteiro[] = [
  { id: "pos_venda", nome: "Pós-venda", departamento: "comercial", descricao: "Confirma a entrega e a satisfação com a última compra.", etapas: [
    et("Abertura", "Oi, tudo bem? Estou ligando para saber se o seu último pedido chegou certinho. Chegou tudo bem?",
      { gatilho: "sim, chegou, tudo certo", acao: "avancar" }, { gatilho: "não chegou, faltou, veio errado, problema", acao: "transferir", texto: "Peça desculpas e diga que o atendente resolve agora." }),
    et("Satisfação", "Que bom! De zero a dez, que nota você dá para o nosso atendimento?",
      { gatilho: "nota baixa, ruim, reclamação", acao: "transferir", texto: "Agradeça a sinceridade e diga que um atendente vai ouvir." }, { gatilho: "nota alta, ótimo, bom, não, tudo certo", acao: "encerrar", texto: "Agradeça e diga que fica à disposição." }),
  ] },
  { id: "lembrete_preventivo", nome: "Lembrete de boleto a vencer", departamento: "financeiro", descricao: "Aviso cordial antes do vencimento, sem cobrança.", etapas: [
    et("Abertura", "Oi, tudo bem? Falo com o responsável pelo financeiro?", { gatilho: "sim, sou eu, pode falar", acao: "avancar" }, { gatilho: "não, não está, não sou", acao: "responder", texto: "Pergunte o melhor horário; ao ouvir, agradeça e inclua [DESLIGAR]." }),
    et("Aviso", "É só um lembrete: {aviso}. Você já recebeu o boleto?",
      { gatilho: "sim, recebi, já paguei", acao: "encerrar", texto: "Agradeça e deseje um bom dia." }, { gatilho: "não, não recebi, manda de novo", acao: "encerrar", texto: "Confirme que vão reenviar." }, { gatilho: "prazo, parcelar, negociar", acao: "transferir" }),
  ] },
  { id: "confirmacao_entrega", nome: "Confirmação de entrega ou visita", departamento: "comercial", descricao: "Alinha dia e horário de entrega ou visita.", etapas: [
    et("Abertura", "Oi, tudo bem? Estou ligando para confirmar a entrega ou visita marcada. O horário combinado continua bom?",
      { gatilho: "sim, pode ser, confirmado", acao: "encerrar", texto: "Confirme e agradeça." }, { gatilho: "não, mudar, outro dia, não vou estar", acao: "responder", texto: "Pergunte o melhor dia; ao ouvir, confirme e inclua [DESLIGAR]." }, TRANSF),
  ] },
  { id: "convite_evento", nome: "Convite para evento", departamento: "comercial", descricao: "Convida para lançamento, feira ou café na loja.", etapas: [
    et("Abertura", "Oi, tudo bem? Vamos ter um evento especial na loja com {condicao}. Posso te contar rapidinho?",
      { gatilho: "sim, pode, fala", acao: "avancar" }, { gatilho: "não, agora não, sem tempo", acao: "encerrar", texto: "Agradeça e diga que manda o convite por mensagem." }),
    et("Convite", "Seria ótimo ter você lá. Você consegue ir?",
      { gatilho: "sim, vou, pode contar", acao: "encerrar", texto: "Agradeça e diga que vai mandar os detalhes." }, { gatilho: "não, não consigo", acao: "encerrar", texto: "Agradeça e diga que fica para a próxima." }, TRANSF),
  ] },
  { id: "reativacao_90", nome: "Reativação 90 dias com benefício", departamento: "comercial", descricao: "Cliente sem comprar há 90 dias recebe um benefício na volta.", etapas: [
    et("Abertura", "Oi, tudo bem? Sentimos sua falta por aqui. Posso te contar uma condição especial para você voltar?",
      { gatilho: "sim, pode, fala", acao: "avancar" }, { gatilho: "não, não preciso, mudei de fornecedor", acao: "responder", texto: "Pergunte, sem insistir, o que fez ele mudar; depois agradeça e inclua [DESLIGAR]." }),
    et("Oferta", "Na próxima compra você tem {condicao}. Quer aproveitar?",
      { gatilho: "sim, quero, pode ser", acao: "transferir" }, { gatilho: "achou caro", acao: "desconto" }, { gatilho: "não, agora não", acao: "encerrar", texto: "Agradeça e diga que a condição vale por alguns dias." }),
  ] },
];

export function roteiroDoModelo(m: ModeloRoteiro, agora = Date.now()): RoteiroSalvo {
  const texto = m.etapas.map((e) => e.fala).join(" ");
  const campos = (["produto", "condicao", "desconto", "aviso"] as const).filter((c) => texto.includes(`{${c}}`) || (c === "desconto" && m.etapas.some((e) => e.condicoes.some((x) => x.acao === "desconto"))));
  return { chave: `custom_${agora.toString(36)}`, departamento: m.departamento, nome: m.nome, descricao: m.descricao, campos: [...campos], ativo: true, etapas: structuredClone(m.etapas) };
}

/** Converte a resposta da IA ("Criar com IA") em roteiro válido, descartando ações desconhecidas. */
const ACOES_OK: AcaoCondicao[] = ["responder", "desconto", "transferir", "encerrar", "avancar", "ir_etapa"];
export function roteiroGerado(g: { nome?: string; descricao?: string; departamento?: string; etapas?: { titulo?: string; fala?: string; condicoes?: { gatilho?: string; acao?: string; texto?: string | null; etapa?: number | null }[] }[] }, agora = Date.now()): RoteiroSalvo {
  const etapas = (g.etapas ?? []).filter((e) => e.fala?.trim()).slice(0, 8).map((e, i) => ({
    titulo: e.titulo?.trim() || `Etapa ${i + 1}`, fala: e.fala!.trim().slice(0, 400),
    condicoes: (e.condicoes ?? []).filter((c) => c.gatilho?.trim() && ACOES_OK.includes(c.acao as AcaoCondicao))
      .map((c) => ({ gatilho: c.gatilho!.trim(), acao: c.acao as AcaoCondicao, ...(c.texto?.trim() ? { texto: c.texto.trim() } : {}), ...(c.acao === "ir_etapa" && typeof c.etapa === "number" ? { etapa: c.etapa } : {}) })),
  }));
  const texto = etapas.map((e) => e.fala).join(" ");
  const campos = (["produto", "condicao", "desconto", "aviso"] as const).filter((c) => texto.includes(`{${c}}`) || (c === "desconto" && etapas.some((e) => e.condicoes.some((x) => x.acao === "desconto"))));
  return { chave: `custom_${agora.toString(36)}`, departamento: g.departamento === "financeiro" ? "financeiro" : "comercial",
    nome: g.nome?.trim() || "Roteiro criado com IA", descricao: g.descricao?.trim() ?? "", campos: [...campos], ativo: true, etapas };
}

// ---------- Mapa da conversa ----------
export interface RamoMapa { gatilho: string; acao: AcaoCondicao; destino: string; semSaida: boolean }
export interface NoMapa { indice: number; titulo: string; fala: string; ramos: RamoMapa[]; semSaida: boolean }
export function mapaRoteiro(r: RoteiroSalvo): NoMapa[] {
  return r.etapas.map((e, i) => {
    const ultima = i === r.etapas.length - 1;
    const ramos = e.condicoes.map((c) => {
      const alvo = c.acao === "ir_etapa" && c.etapa != null ? r.etapas[c.etapa] : undefined;
      const semSaida = (c.acao === "avancar" && ultima) || (c.acao === "ir_etapa" && !alvo);
      const destino = c.acao === "ir_etapa" ? (alvo ? `Etapa ${c.etapa! + 1}${alvo.titulo.trim() ? ` · ${alvo.titulo.trim()}` : ""}` : "Etapa não definida")
        : c.acao === "avancar" ? (ultima ? "Sem próxima etapa" : `Etapa ${i + 2}`)
        : c.acao === "transferir" ? "Transferir para atendente" : c.acao === "encerrar" ? "Encerrar ligação"
        : c.acao === "desconto" ? "Oferecer desconto" : /\[DESLIGAR\]/.test(c.texto ?? "") ? "Responder e encerrar" : "Responder e continuar";
      return { gatilho: c.gatilho, acao: c.acao, destino, semSaida };
    });
    const temSaida = ramos.some((x) => !x.semSaida && x.acao !== "responder") || (!ultima && !e.fala.includes("?"));
    return { indice: i, titulo: e.titulo, fala: e.fala, ramos, semSaida: !temSaida };
  });
}
