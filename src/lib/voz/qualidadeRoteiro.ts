import { departamentoValido } from "./roteirosLigacao";
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
      else if (c.acao === "workflow" && !c.workflow?.id) a.push({ nivel: "erro", etapa: i, texto: "Bloco \"Disparar workflow\" sem workflow escolhido." });
      else if (c.acao === "ir_etapa" && c.etapa === i) a.push({ nivel: "aviso", etapa: i, texto: "Regra manda ir para a própria etapa (pode repetir a pergunta)." });
    });
    if (e.condicoes.some((c) => c.acao === "avancar") && i === r.etapas.length - 1)
      a.push({ nivel: "aviso", etapa: i, texto: "Última etapa manda avançar, mas não há próxima etapa." });
  });
  if (r.etapas.length && !r.etapas.some((e) => e.condicoes.some((c) => c.acao === "transferir")))
    a.push({ nivel: "aviso", etapa: null, texto: "Nenhuma regra transfere para um atendente quando o cliente tiver dúvida." });
  if (r.etapas.length && !r.etapas.some((e) => e.condicoes.some((c) => c.acao === "encerrar" || c.acao === "reagendar" || (c.acao === "workflow" && c.etapa == null) || /\[DESLIGAR\]/.test(c.texto ?? ""))))
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

export interface ModeloRoteiro { id: string; nome: string; descricao: string; departamento: Departamento; tecnicas: string[]; etapas: EtapaEditavel[] }
const ESPELHO: CondicaoRoteiro = { gatilho: "achei caro, está caro, frete alto, prazo longo, não sei", acao: "responder", texto: "Espelhe: repita em tom de pergunta as 2 ou 3 palavras-chave que o cliente usou e espere ele explicar." };
const ROTULO: CondicaoRoteiro = { gatilho: "tenho receio, preocupado, já tive problema", acao: "responder", texto: "Rotule: diga \"parece que [a preocupação] te preocupa\", confirme e só então ofereça a solução." };
const BATNA = (alt: string): CondicaoRoteiro => ({ gatilho: "não, não quero, não tenho interesse, agora não", acao: "responder", texto: `Ofereça o plano B: ${alt}. Se recusar de novo, agradeça e inclua [DESLIGAR].` });
const SEM_TEMPO: CondicaoRoteiro = { gatilho: "agora não, estou ocupado, sem tempo, não posso", acao: "reagendar", texto: "Pergunte o melhor dia e horário para retornar." };
const NAO_E: CondicaoRoteiro = { gatilho: "não sou eu, não está, não é comigo", acao: "responder", texto: "Pergunte quem cuida disso e o melhor horário; ao ouvir, agradeça e inclua [DESLIGAR]." };
const t = (e: EtapaEditavel, ...tecnicas: string[]): EtapaEditavel => ({ ...e, tecnicas });

export const MODELOS_ROTEIRO: ModeloRoteiro[] = [
  // ---------- Comercial ----------
  { id: "com_followup_orcamento", nome: "Follow-up de orçamento", departamento: "comercial", tecnicas: ["upfront", "mirroring", "labeling", "perda", "dupla_alternativa", "batna"],
    descricao: "Retoma a proposta enviada, trata objeções e conduz ao fechamento com plano B.", etapas: [
    t(et("Contrato prévio", "Oi, tudo bem? Preciso de só 30 segundos sobre a proposta que nossa equipe enviou. Pode ser agora?",
      { gatilho: "sim, pode, pode falar, fala", acao: "avancar" }, SEM_TEMPO), "upfront"),
    t(et("Checagem", "O senhor conseguiu dar uma olhada na proposta?",
      { gatilho: "sim, vi, olhei, recebi", acao: "avancar" }, { gatilho: "não, não vi, não recebi", acao: "responder", texto: "Diga que a equipe reenvia agora e pergunte se pode ligar amanhã; ao ouvir, inclua [DESLIGAR]." }, ESPELHO, ROTULO), "mirroring", "labeling"),
    t(et("Urgência", "As condições dessa proposta valem só até o fim da semana, depois entra o reajuste. Faz sentido garantir agora?",
      { gatilho: "sim, faz sentido, quero, pode fechar", acao: "avancar" }, ESPELHO, BATNA("mandar a proposta pelo WhatsApp para avaliar com calma"), TRANSF), "perda", "batna"),
    t(et("Fechamento", "Ótimo! Prefere que o atendente confirme agora por telefone ou por WhatsApp?",
      { gatilho: "telefone, agora, liga, pode passar", acao: "transferir" }, { gatilho: "whatsapp, mensagem, zap", acao: "encerrar", texto: "Confirme que o atendente chama no WhatsApp ainda hoje." }, { gatilho: "não, depois", acao: "reagendar", texto: "Pergunte o melhor dia para retomar." }), "dupla_alternativa"),
  ] },
  { id: "com_venda_ativa", nome: "Venda ativa / prospecção", departamento: "comercial", tecnicas: ["upfront", "yes_ladder", "ancoragem", "dupla_alternativa", "batna"],
    descricao: "Apresenta {produto} com escada de sins, ancoragem de preço e fechamento em duas opções.", etapas: [
    t(et("Contrato prévio", "Oi, tudo bem? Tenho uma novidade de {produto} que leva 30 segundos. Posso contar?",
      { gatilho: "sim, pode, fala, conta", acao: "avancar" }, SEM_TEMPO), "upfront"),
    t(et("Escada de sins", "O senhor ainda trabalha com {produto} por aí, certo?",
      { gatilho: "sim, trabalho, uso, certo", acao: "avancar" }, { gatilho: "não, não uso, parei", acao: "encerrar", texto: "Agradeça e diga que fica à disposição." }), "yes_ladder"),
    t(et("Ancoragem", "A tabela costuma ser mais alta, mas nesta semana conseguimos {condicao}. Vale a pena para o senhor?",
      { gatilho: "sim, vale, interessa, gostei", acao: "avancar" }, { gatilho: "achou caro", acao: "desconto" }, ESPELHO, BATNA("um lote menor para testar ou mandar o catálogo pelo WhatsApp"), TRANSF), "ancoragem", "batna"),
    t(et("Fechamento", "Perfeito! Fica melhor entregar ainda esta semana ou na próxima?",
      { gatilho: "esta semana, essa semana, próxima, semana que vem", acao: "transferir", texto: "Diga que o atendente confirma o pedido agora." }, { gatilho: "não, vou pensar", acao: "reagendar", texto: "Pergunte quando pode retornar." }), "dupla_alternativa"),
  ] },
  { id: "com_reativacao", nome: "Reativação de inativos", departamento: "comercial", tecnicas: ["upfront", "mirroring", "labeling", "batna"],
    descricao: "Descobre por que o cliente parou de comprar e oferece {condicao} na volta.", etapas: [
    t(et("Contrato prévio", "Oi, tudo bem? Sentimos sua falta por aqui. Tem 30 segundos para me ajudar com uma coisa?",
      { gatilho: "sim, pode, fala", acao: "avancar" }, SEM_TEMPO), "upfront"),
    t(et("Investigação", "O que fez o senhor deixar de comprar com a gente?",
      { gatilho: "qualquer resposta", acao: "avancar", texto: "Antes de avançar, espelhe as palavras-chave e rotule a preocupação." }, ESPELHO, ROTULO, { gatilho: "não sei, nada não, sem motivo", acao: "avancar" }), "mirroring", "labeling"),
    t(et("Oferta", "Entendi. Para resolver isso, na próxima compra o senhor tem {condicao}. Quer aproveitar?",
      { gatilho: "sim, quero, pode ser", acao: "transferir" }, { gatilho: "achou caro", acao: "desconto" }, BATNA("mandar o catálogo atualizado pelo WhatsApp")), "batna"),
  ] },
  // ---------- Compras ----------
  { id: "cmp_cotacao", nome: "Cotação com fornecedor", departamento: "compras", tecnicas: ["upfront", "ancoragem", "mirroring", "dupla_alternativa", "batna"],
    descricao: "Pede preço e prazo de {produto}, ancora no valor de mercado e negocia pagamento.", etapas: [
    t(et("Contrato prévio", "Oi, tudo bem? Falo do setor de compras e preciso de 1 minuto para uma cotação. Pode ser agora?",
      { gatilho: "sim, pode, fala", acao: "avancar" }, SEM_TEMPO, NAO_E), "upfront"),
    t(et("Disponibilidade", "Vocês têm {produto} disponível para entrega este mês?",
      { gatilho: "sim, tenho, temos, disponível", acao: "avancar" }, { gatilho: "não, não tenho, em falta", acao: "responder", texto: "Pergunte a previsão de chegada; ao ouvir, agradeça e inclua [DESLIGAR]." }), "upfront"),
    t(et("Ancoragem", "Recebemos propostas de mercado bem competitivas. Qual o melhor preço que o senhor consegue para esse volume?",
      { gatilho: "qualquer resposta, valor, preço, reais", acao: "avancar" }, ESPELHO, { gatilho: "não sei, preciso ver, não tenho agora", acao: "responder", texto: "Peça para mandar a proposta por e-mail hoje; agradeça e inclua [DESLIGAR]." }), "ancoragem", "mirroring"),
    t(et("Pagamento", "Para fechar, fica melhor faturar em 28 dias ou com desconto à vista?",
      { gatilho: "28 dias, prazo, à vista, a vista, desconto", acao: "transferir", texto: "Diga que o comprador confirma o pedido agora." }, BATNA("receber a proposta por e-mail para comparar"), TRANSF), "dupla_alternativa", "batna"),
  ] },
  { id: "cmp_atraso", nome: "Cobrança de entrega do fornecedor", departamento: "compras", tecnicas: ["labeling", "dupla_alternativa"],
    descricao: "Confirma pedido de compra atrasado e combina nova data.", etapas: [
    et("Abertura", "Oi, tudo bem? Falo do setor de compras sobre um pedido em atraso. É com o senhor?",
      { gatilho: "sim, sou eu, pode falar", acao: "avancar" }, NAO_E),
    t(et("Nova data", "Conseguem entregar ainda esta semana ou só na próxima?",
      { gatilho: "esta semana, essa semana, próxima, semana que vem, amanhã", acao: "encerrar", texto: "Confirme a data dita e agradeça." }, ROTULO, { gatilho: "não sei, não tenho previsão", acao: "transferir", texto: "Diga que o comprador vai alinhar agora." }), "dupla_alternativa", "labeling"),
  ] },
  // ---------- Financeiro ----------
  { id: "fin_lembrete", nome: "Lembrete de vencimento", departamento: "financeiro", tecnicas: ["upfront"],
    descricao: "Aviso cordial antes do vencimento, sem cobrança.", etapas: [
    t(et("Abertura", "Oi, tudo bem? Falo do financeiro, é rapidinho. Falo com o responsável pelos pagamentos?",
      { gatilho: "sim, sou eu, pode falar", acao: "avancar" }, NAO_E), "upfront"),
    et("Aviso", "É só um lembrete: {aviso}. O senhor já recebeu o boleto?",
      { gatilho: "sim, recebi, já paguei", acao: "encerrar", texto: "Agradeça e deseje um bom dia." }, { gatilho: "não, não recebi, manda de novo", acao: "encerrar", texto: "Confirme que vão reenviar hoje." }, { gatilho: "prazo, parcelar, negociar", acao: "transferir" }),
  ] },
  { id: "fin_cobranca_acordo", nome: "Cobrança amigável e acordo", departamento: "financeiro", tecnicas: ["labeling", "dupla_alternativa", "batna"],
    descricao: "Lembra a pendência com respeito e propõe duas formas de acerto, com plano B.", etapas: [
    et("Abertura", "Oi, tudo bem? Falo do financeiro. Posso confirmar se falo com o responsável pelos pagamentos?",
      { gatilho: "sim, sou eu, pode falar", acao: "avancar" }, NAO_E),
    t(et("Pendência", "Consta em aberto {aviso}. O senhor estava sabendo?",
      { gatilho: "sim, sabia, estou sabendo", acao: "avancar" }, { gatilho: "já paguei, paguei, está pago", acao: "encerrar", texto: "Peça desculpas, diga que vão conferir a baixa e agradeça." }, ROTULO, { gatilho: "não sabia, não chegou", acao: "avancar", texto: "Diga que o boleto será reenviado." }), "labeling"),
    t(et("Acordo", "Para facilitar, fica melhor pagar à vista no Pix ou parcelar em duas vezes?",
      { gatilho: "pix, à vista, a vista, parcelar, duas vezes", acao: "transferir", texto: "Diga que o atendente envia o acordo agora." }, BATNA("combinar uma data para pagamento ainda este mês"), TRANSF), "dupla_alternativa", "batna"),
  ] },
  // ---------- Pós-venda ----------
  { id: "pv_satisfacao", nome: "Satisfação e recompra", departamento: "pos_venda", tecnicas: ["yes_ladder", "labeling", "dupla_alternativa"],
    descricao: "Confirma a entrega, mede satisfação, trata problemas e abre recompra.", etapas: [
    t(et("Entrega", "Oi, tudo bem? Estou ligando para saber se o seu último pedido chegou certinho. Chegou tudo bem?",
      { gatilho: "sim, chegou, tudo certo", acao: "avancar" }, { gatilho: "não chegou, faltou, veio errado, problema, não", acao: "transferir", texto: "Peça desculpas e diga que o atendente resolve agora." }, ROTULO), "yes_ladder", "labeling"),
    et("Satisfação", "Que bom! De zero a dez, que nota o senhor dá para o nosso atendimento?",
      { gatilho: "nota baixa, ruim, reclamação", acao: "transferir", texto: "Agradeça a sinceridade e diga que um atendente vai ouvir." }, { gatilho: "nota alta, ótimo, bom, dez", acao: "avancar" }, { gatilho: "não sei, não quero dar nota", acao: "avancar" }),
    t(et("Recompra", "Obrigado! Quer que eu deixe a próxima reposição agendada para este mês ou para o próximo?",
      { gatilho: "este mês, esse mês, próximo, mês que vem", acao: "transferir", texto: "Diga que o atendente confirma a reposição." }, { gatilho: "não, agora não", acao: "encerrar", texto: "Agradeça e diga que fica à disposição." }), "dupla_alternativa"),
  ] },
  { id: "pv_reclamacao", nome: "Retorno de reclamação", departamento: "pos_venda", tecnicas: ["labeling", "mirroring"],
    descricao: "Liga após uma reclamação para confirmar se o problema foi resolvido.", etapas: [
    t(et("Abertura", "Oi, tudo bem? Estou ligando para saber se o problema que o senhor relatou foi resolvido. Ficou tudo certo?",
      { gatilho: "sim, resolveu, tudo certo", acao: "encerrar", texto: "Agradeça a paciência e diga que fica à disposição." }, { gatilho: "não, ainda não, continua", acao: "transferir", texto: "Rotule a frustração, peça desculpas e diga que o atendente resolve agora." }, ESPELHO, ROTULO), "labeling", "mirroring"),
  ] },
  // ---------- Logística ----------
  { id: "log_entrega", nome: "Confirmação de entrega", departamento: "logistica", tecnicas: ["dupla_alternativa"],
    descricao: "Confirma quem recebe, o turno e as condições de descarga.", etapas: [
    et("Abertura", "Oi, tudo bem? Falo da logística sobre a entrega do seu pedido. Vai ter alguém para receber?",
      { gatilho: "sim, vai, tem, eu recebo", acao: "avancar" }, { gatilho: "não, ninguém, não vai ter", acao: "reagendar", texto: "Pergunte o melhor dia para a entrega." }),
    t(et("Turno", "Fica melhor receber de manhã ou à tarde?",
      { gatilho: "manhã, cedo, tarde, depois do almoço", acao: "avancar" }, { gatilho: "não sei, tanto faz", acao: "avancar" }), "dupla_alternativa"),
    et("Descarga", "O caminhão consegue parar perto do local de descarga?",
      { gatilho: "sim, consegue, tem espaço", acao: "encerrar", texto: "Confirme o turno escolhido e agradeça." }, { gatilho: "não, rua estreita, difícil", acao: "transferir", texto: "Diga que o atendente da logística combina os detalhes." }),
  ] },
  { id: "log_visita", nome: "Confirmação de visita técnica", departamento: "logistica", tecnicas: ["dupla_alternativa"],
    descricao: "Confirma ou remarca visita técnica ou de medição.", etapas: [
    et("Abertura", "Oi, tudo bem? Estou confirmando a visita técnica marcada. O horário combinado continua bom?",
      { gatilho: "sim, pode ser, confirmado", acao: "encerrar", texto: "Confirme e agradeça." }, { gatilho: "não, mudar, outro dia, não vou estar", acao: "avancar" }, TRANSF),
    t(et("Remarcar", "Sem problema. Fica melhor amanhã ou depois de amanhã?",
      { gatilho: "amanhã, depois de amanhã, outro dia", acao: "reagendar", texto: "Confirme o dia escolhido." }, { gatilho: "não sei, não posso", acao: "transferir" }), "dupla_alternativa"),
  ] },
];

export function roteiroDoModelo(m: ModeloRoteiro, agora = Date.now()): RoteiroSalvo {
  const texto = m.etapas.map((e) => e.fala).join(" ");
  const campos = (["produto", "condicao", "desconto", "aviso"] as const).filter((c) => texto.includes(`{${c}}`) || (c === "desconto" && m.etapas.some((e) => e.condicoes.some((x) => x.acao === "desconto"))));
  return { chave: `custom_${agora.toString(36)}`, departamento: m.departamento, nome: m.nome, descricao: m.descricao, campos: [...campos], ativo: true, etapas: structuredClone(m.etapas) };
}

/** Converte a resposta da IA ("Criar com IA") em roteiro válido, descartando ações desconhecidas. */
const ACOES_OK: AcaoCondicao[] = ["responder", "desconto", "transferir", "encerrar", "avancar", "ir_etapa", "reagendar"];
export function roteiroGerado(g: { nome?: string; descricao?: string; departamento?: string; etapas?: { titulo?: string; fala?: string; condicoes?: { gatilho?: string; acao?: string; texto?: string | null; etapa?: number | null }[] }[] }, agora = Date.now()): RoteiroSalvo {
  const etapas = (g.etapas ?? []).filter((e) => e.fala?.trim()).slice(0, 8).map((e, i) => ({
    titulo: e.titulo?.trim() || `Etapa ${i + 1}`, fala: e.fala!.trim().slice(0, 400),
    condicoes: (e.condicoes ?? []).filter((c) => c.gatilho?.trim() && ACOES_OK.includes(c.acao as AcaoCondicao))
      .map((c) => ({ gatilho: c.gatilho!.trim(), acao: c.acao as AcaoCondicao, ...(c.texto?.trim() ? { texto: c.texto.trim() } : {}), ...(c.acao === "ir_etapa" && typeof c.etapa === "number" ? { etapa: c.etapa } : {}) })),
  }));
  const texto = etapas.map((e) => e.fala).join(" ");
  const campos = (["produto", "condicao", "desconto", "aviso"] as const).filter((c) => texto.includes(`{${c}}`) || (c === "desconto" && etapas.some((e) => e.condicoes.some((x) => x.acao === "desconto"))));
  return { chave: `custom_${agora.toString(36)}`, departamento: departamentoValido(g.departamento),
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
      const semSaida = (c.acao === "avancar" && ultima) || (c.acao === "ir_etapa" && !alvo) || (c.acao === "workflow" && !c.workflow?.id);
      const destino = c.acao === "ir_etapa" ? (alvo ? `Etapa ${c.etapa! + 1}${alvo.titulo.trim() ? ` · ${alvo.titulo.trim()}` : ""}` : "Etapa não definida")
        : c.acao === "avancar" ? (ultima ? "Sem próxima etapa" : `Etapa ${i + 2}`)
        : c.acao === "transferir" ? "Transferir para atendente" : c.acao === "encerrar" ? "Encerrar ligação"
        : c.acao === "desconto" ? "Oferecer desconto" : c.acao === "reagendar" ? "Reagendar retorno"
        : c.acao === "workflow" ? (c.workflow?.id ? `Disparar workflow · ${c.workflow.nome}` : "Workflow não escolhido") : /\[DESLIGAR\]/.test(c.texto ?? "") ? "Responder e encerrar" : "Responder e continuar";
      return { gatilho: c.gatilho, acao: c.acao, destino, semSaida };
    });
    const temSaida = ramos.some((x) => !x.semSaida && x.acao !== "responder") || (!ultima && !e.fala.includes("?"));
    return { indice: i, titulo: e.titulo, fala: e.fala, ramos, semSaida: !temSaida };
  });
}
