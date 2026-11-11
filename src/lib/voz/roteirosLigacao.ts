/**
 * Roteiros prontos das ligações com IA. O usuário escolhe o objetivo e preenche
 * poucos dados; o roteiro monta as etapas curtas que a IA segue ao telefone.
 * Pura: testável.
 */
export type RoteiroBaseId = "reposicao" | "produto_foco" | "orcamento_aberto" | "reativacao" | "lembrete_financeiro";
/** Roteiro de fábrica ou criado pelo usuário (chave livre). */
export type RoteiroId = RoteiroBaseId | (string & {});
export type CampoRoteiro = "produto" | "condicao" | "desconto" | "aviso";

export interface Roteiro {
  id: RoteiroId; rotulo: string; desc: string;
  /** Campos que a tela pede para este roteiro. */
  campos: CampoRoteiro[];
  /** Campos sem os quais não dá para ligar. */
  obrigatorios: CampoRoteiro[];
  /** Produto vem do histórico de cada cliente (sem produto fixo). */
  produtoPorCliente: boolean;
  etapas: (d: DadosRoteiro) => string[];
}

export interface DadosRoteiro {
  produtoNome?: string; condicao?: string; descontoMax?: number; aviso?: string; observacoes?: string;
}

const habitual = "o produto que o cliente mais compra (veja os Dados do CRM)";

export const ROTEIROS: Roteiro[] = [
  {
    id: "reposicao", rotulo: "Reposição do produto habitual",
    desc: "Cada cliente ouve sobre o produto que ele mais compra. Não precisa escolher produto.",
    campos: ["condicao", "desconto"], obrigatorios: [], produtoPorCliente: true,
    etapas: (d) => [
      `Cite em uma frase ${habitual} e há quanto tempo foi o último pedido, se souber.`,
      "Pergunte se o estoque desse produto está acabando ou se precisa de mais alguma coisa.",
      d.condicao ? `Se ele quiser repor, informe a condição: ${d.condicao}.` : "Se ele quiser repor, diga que o atendente já monta o pedido.",
    ],
  },
  {
    id: "produto_foco", rotulo: "Promoção / produto em foco",
    desc: "Um produto específico com condição especial, para todos os contatos escolhidos.",
    campos: ["produto", "condicao", "desconto"], obrigatorios: ["produto"], produtoPorCliente: false,
    etapas: (d) => [
      `Apresente em uma frase a oferta de ${d.produtoNome ?? "produto"}${d.condicao ? `: ${d.condicao}` : ""}.`,
      "Se o cliente já compra esse produto (Dados do CRM), lembre isso de forma natural.",
      "Pergunte se ele quer aproveitar a condição.",
    ],
  },
  {
    id: "orcamento_aberto", rotulo: "Retorno de orçamento em aberto",
    desc: "Pergunta se o cliente analisou a proposta enviada e o que falta para fechar.",
    campos: ["desconto"], obrigatorios: [], produtoPorCliente: true,
    etapas: () => [
      "Diga só que está ligando sobre a proposta que a equipe enviou recentemente. NUNCA cite itens, produtos, quantidades nem valores (podem ser muitos e de vários orçamentos). Se perguntarem qual, diga que o atendente passa os detalhes e transfira.",
      "Pergunte só: \"O senhor conseguiu dar uma olhada no orçamento?\". Aguarde a resposta entre turnos. Ao ouvir sim, já olhei ou já analisei, esta etapa acabou: vá à etapa 3, SEM repetir a pergunta. Ao ouvir não ou ainda não, pergunte qual dia pode retornar.",
      "Se já analisou, pergunte só: \"O que falta para fecharmos?\". Se ainda não analisou, pergunte qual dia pode retornar; ao ouvir o dia, confirme (\"Combinado, retorno na sexta\") e encerre — a agenda é marcada sozinha. Nunca volte a perguntar se olhou o orçamento.",
      "Se o cliente falar em dúvida, fechar, valor, prazo ou pagamento: NÃO faça outra pergunta; diga \"Vou te passar agora para o atendente, um instante\" e transfira.",
    ],
  },
  {
    id: "reativacao", rotulo: "Reativar cliente sumido",
    desc: "Tom de relacionamento para quem parou de comprar; descobre o motivo.",
    campos: ["condicao"], obrigatorios: [], produtoPorCliente: true,
    etapas: (d) => [
      "Diga, com simpatia, que sentiram falta dos pedidos dele.",
      `Pergunte se mudou algo na necessidade de ${habitual} ou se teve algum problema.`,
      d.condicao ? `Ofereça a condição de retorno: ${d.condicao}.` : "Ofereça uma cotação rápida com o atendente.",
    ],
  },
  {
    id: "lembrete_financeiro", rotulo: "Lembrete financeiro",
    desc: "Aviso educado de vencimento ou pendência, com opção de reenviar o boleto.",
    campos: ["aviso"], obrigatorios: ["aviso"], produtoPorCliente: false,
    etapas: (d) => [
      "Confirme se está falando com o responsável pelo financeiro.",
      `Informe com discrição: ${d.aviso ?? "há uma pendência em aberto"}.`,
      "Pergunte se já recebeu o boleto ou se prefere que reenviem por WhatsApp ou e-mail. Nunca pressione nem ameace.",
    ],
  },
];

/* ---------------- Roteiros editáveis (Se X, faça Y) ---------------- */

export type AcaoCondicao = "responder" | "desconto" | "transferir" | "encerrar" | "avancar" | "ir_etapa" | "reagendar" | "workflow";
/** Workflow de outro módulo disparado quando a ligação termina (bloco "Disparar workflow"). */
export interface WorkflowAlvo { modulo: string; id: string; nome: string }
/**
 * `etapa` = índice (0-based) da etapa de destino quando acao = "ir_etapa"; em "workflow",
 * etapa opcional para continuar a conversa depois do disparo (sem ela, encerra).
 */
export interface CondicaoRoteiro { gatilho: string; acao: AcaoCondicao; texto?: string; etapa?: number; workflow?: WorkflowAlvo }
/** `pos` = posição do bloco no workflow visual (só tela). */
export interface EtapaEditavel { titulo: string; fala: string; condicoes: CondicaoRoteiro[]; pos?: { x: number; y: number }; tecnicas?: string[]; venda?: ConfigVendaEtapa }
/** Bloco "Venda & Negociação de Estoque": conversa livre com catálogo, estoque e preço mínimo. */
export interface ConfigVendaEtapa { descontoMax: number; similares: boolean; filtro: string }
/** Marcador lido pelas funções de voz (_shared/catalogoVenda.ts) para carregar o catálogo. Pura. */
export function marcadorVenda(v: ConfigVendaEtapa): string {
  const f = v.filtro.replace(/[;\]\[=]/g, " ").trim();
  return `[VENDA:d=${Math.max(0, Math.min(50, Math.round(v.descontoMax || 0)))};s=${v.similares ? 1 : 0};f=${f}]`;
}
/** Roteiro salvo pela empresa (voz_roteiros). Chave igual a um de fábrica = versão editada dele. */
export interface RoteiroSalvo {
  id?: string; chave: string; departamento: Departamento; nome: string; descricao: string;
  campos: CampoRoteiro[]; etapas: EtapaEditavel[]; ativo: boolean;
}

export const GATILHOS_PRONTOS = [
  "é recepção ou portaria", "não pode falar agora", "achou caro", "pediu prazo ou forma de pagamento",
  "já comprou de outro fornecedor", "demonstrou interesse", "pediu para falar com uma pessoa",
  "disse que não precisa agora", "pediu amostra ou catálogo",
  "respondeu sim", "respondeu não", "não entendeu o que foi dito", "pediu para repetir",
  "sim, já olhei, vi, confirmo, pode ser", "não, ainda não, não deu tempo, não vi",
  "qual orçamento, quem é, do que se trata, não lembro",
  "não respondeu ou ficou em silêncio", "respondeu outra coisa que não está nas regras",
];
export const ACOES: { id: AcaoCondicao; rotulo: string }[] = [
  { id: "responder", rotulo: "Responder com a fala" },
  { id: "desconto", rotulo: "Oferecer desconto (até o limite)" },
  { id: "transferir", rotulo: "Transferir para o atendente" },
  { id: "encerrar", rotulo: "Agradecer e encerrar" },
  { id: "avancar", rotulo: "Ir para a próxima etapa" },
  { id: "ir_etapa", rotulo: "Ir para a etapa…" },
  { id: "reagendar", rotulo: "Reagendar retorno" },
  { id: "workflow", rotulo: "Disparar workflow" },
];

/** Marcador que a IA inclui na fala para o CRM disparar o workflow ao fim da ligação. Puro. */
export const marcadorWorkflow = (w: WorkflowAlvo) => `[FLUXO:${w.modulo}:${w.id}]`;
/** Workflows pedidos pela IA numa fala/transcrição (sem repetir). Puro: testável. */
export function workflowsNaFala(texto: string): { modulo: string; id: string }[] {
  const vistos = new Set<string>();
  return [...texto.matchAll(/\[FLUXO:([a-z_]+):([^\]\s]+)\]/g)].flatMap(([, modulo, id]) => {
    const k = `${modulo}:${id}`;
    if (vistos.has(k)) return [];
    vistos.add(k);
    return [{ modulo, id }];
  });
}

let salvos: RoteiroSalvo[] = [];
/** Define os roteiros salvos da empresa usados em toda a montagem do objetivo. */
export function definirRoteirosSalvos(lista: RoteiroSalvo[]) { salvos = lista; }
export const roteirosSalvos = () => salvos;
const salvoAtivo = (id: string) => salvos.find((s) => s.chave === id && s.ativo);

const ROTULO_PH: DadosRoteiro = { produtoNome: "{produto}", condicao: "{condicao}", aviso: "{aviso}" };
type C = CondicaoRoteiro;
const SIM = "sim, já olhei, vi, confirmo, pode ser";
const NAO = "não, ainda não, não deu tempo, não vi";
const QUEM = "qual orçamento, quem é, do que se trata, não lembro";
const SILENCIO: C = { gatilho: "não respondeu ou ficou em silêncio", acao: "responder", texto: "Repita só a pergunta atual, mais curta. Se calar de novo, agradeça e inclua [DESLIGAR]." };
const OUTRA: C = { gatilho: "respondeu outra coisa que não está nas regras", acao: "responder", texto: "Responda em uma frase e volte à pergunta desta etapa, sem repetir etapas já respondidas. Se não der para ajudar, transfira." };
const OUTRO_DIA: C = { gatilho: "pediu para ligar outro dia, agora não posso, liga depois", acao: "responder", texto: "Pergunte o melhor dia; ao ouvir, confirme (\"Combinado, retorno na sexta\") e inclua [DESLIGAR]." };
const TRANSF_FECHAR: C = { gatilho: "dúvida, quero fechar, valor, preço, prazo, pagamento", acao: "transferir" };
const CARO: C = { gatilho: "achou caro", acao: "desconto" };
/** Regras de fábrica por etapa (índice = etapa). Toda etapa tem caminho para sim, não, silêncio e outra resposta. */
const CONDICOES_PADRAO: Record<RoteiroBaseId, C[][]> = {
  reposicao: [
    [{ gatilho: QUEM, acao: "responder", texto: "Diga que é da empresa, sobre a reposição do produto que ele costuma comprar, e siga." }, OUTRO_DIA, SILENCIO, OUTRA],
    [{ gatilho: "sim, está acabando, preciso, quero repor", acao: "avancar" }, { gatilho: "não, tenho estoque, não preciso agora", acao: "encerrar", texto: "Diga que fica à disposição." }, SILENCIO, OUTRA],
    [{ gatilho: "sim, quero, pode mandar, fechado", acao: "transferir" }, CARO, { gatilho: "não, depois vejo", acao: "encerrar" }, SILENCIO, OUTRA],
  ],
  produto_foco: [
    [{ gatilho: QUEM, acao: "responder", texto: "Diga que é da empresa, com uma oferta especial, e siga." }, OUTRO_DIA, SILENCIO, OUTRA],
    [SILENCIO, OUTRA],
    [{ gatilho: "sim, quero, tenho interesse, pode mandar", acao: "transferir" }, CARO, { gatilho: "não, não preciso, não quero", acao: "encerrar" }, SILENCIO, OUTRA],
  ],
  orcamento_aberto: [
    [{ gatilho: QUEM, acao: "transferir", texto: "Diga que o atendente passa os detalhes da proposta." }, OUTRO_DIA, SILENCIO, OUTRA],
    [{ gatilho: SIM, acao: "avancar", texto: "Não repita a pergunta." }, { gatilho: NAO, acao: "responder", texto: "Diga \"Sem problema\" e pergunte qual dia pode retornar; ao ouvir o dia, confirme e inclua [DESLIGAR]." }, TRANSF_FECHAR, SILENCIO, OUTRA],
    [TRANSF_FECHAR, CARO, { gatilho: "já comprou de outro fornecedor", acao: "responder", texto: "Pergunte, sem insistir, o que fez ele escolher o outro." }, OUTRO_DIA, SILENCIO, OUTRA],
    [TRANSF_FECHAR, SILENCIO, OUTRA],
  ],
  reativacao: [
    [{ gatilho: QUEM, acao: "responder", texto: "Diga que é da empresa e que sentiram falta dele como cliente." }, OUTRO_DIA, SILENCIO, OUTRA],
    [{ gatilho: "problema, reclamação, atendimento ruim, atraso", acao: "transferir", texto: "Peça desculpas e diga que o atendente resolve." }, { gatilho: "não preciso mais, fechou, mudou de ramo", acao: "encerrar" }, SILENCIO, OUTRA],
    [{ gatilho: "sim, quero, tenho interesse, pode ser", acao: "transferir" }, { gatilho: "não, agora não", acao: "encerrar" }, SILENCIO, OUTRA],
  ],
  lembrete_financeiro: [
    [{ gatilho: "sim, sou eu, pode falar", acao: "avancar" }, { gatilho: "não, não sou, não está", acao: "responder", texto: "Pergunte com quem pode falar ou o melhor horário; ao ouvir, agradeça e inclua [DESLIGAR]." }, SILENCIO, OUTRA],
    [{ gatilho: "já paguei, já está pago, paguei ontem", acao: "encerrar", texto: "Agradeça e diga que vão conferir a baixa." }, { gatilho: "prazo, parcelar, negociar, forma de pagamento", acao: "transferir" }, SILENCIO, OUTRA],
    [{ gatilho: "reenvia, manda de novo, WhatsApp, e-mail", acao: "encerrar", texto: "Confirme que vão reenviar pelo canal pedido." }, { gatilho: "já recebi, recebi sim", acao: "encerrar" }, { gatilho: "prazo, parcelar, negociar", acao: "transferir" }, SILENCIO, OUTRA],
  ],
};

/** Versão editável de um roteiro de fábrica (ponto de partida do editor e "restaurar original"). */
export function roteiroDeFabrica(id: RoteiroBaseId): RoteiroSalvo {
  const r = ROTEIROS.find((x) => x.id === id)!;
  const etapas = r.etapas(ROTULO_PH);
  const conds = CONDICOES_PADRAO[id];
  return {
    chave: id, nome: r.rotulo, descricao: r.desc, campos: r.campos, ativo: true,
    departamento: id === "lembrete_financeiro" ? "financeiro" : "comercial",
    etapas: etapas.map((fala, i) => ({ titulo: `Etapa ${i + 1}`, fala, condicoes: conds[i] ?? [SILENCIO, OUTRA] })),
  };
}
export const ehDeFabrica = (chave: string) => ROTEIROS.some((r) => r.id === chave);

function preencher(t: string, d: DadosRoteiro) {
  return t.replace(/\{produto\}/g, d.produtoNome?.trim() || "o produto que o cliente mais compra (veja os Dados do CRM)")
    .replace(/\{condicao\}/g, d.condicao?.trim() || "a condição que o atendente confirmar")
    .replace(/\{aviso\}/g, d.aviso?.trim() || "há uma pendência em aberto")
    .replace(/\{desconto\}/g, d.descontoMax ? `${d.descontoMax}%` : "nenhum desconto");
}
function textoAcao(c: CondicaoRoteiro, d: DadosRoteiro, destino?: string) {
  const extra = c.texto?.trim() ? ` ${preencher(c.texto.trim(), d)}` : "";
  switch (c.acao) {
    case "desconto": return d.descontoMax ? `ofereça até ${d.descontoMax}% de desconto, nunca mais.${extra}` : `diga que o atendente vê uma condição especial e inclua [TRANSFERIR].${extra}`;
    case "transferir": return `diga em uma frase que vai passar para o atendente e inclua [TRANSFERIR].${extra}`;
    case "encerrar": return `agradeça com simpatia e inclua [DESLIGAR].${extra}`;
    case "avancar": return `siga para a próxima etapa.${extra}`;
    case "ir_etapa": return destino ? `vá direto para a etapa ${destino} e faça a fala dela (pule as etapas no meio).${extra}` : `siga para a próxima etapa.${extra}`;
    case "reagendar": return `pergunte o melhor dia e horário para retornar; ao ouvir, confirme (\"Combinado, retorno na sexta\") e inclua [DESLIGAR] — a agenda é marcada sozinha.${extra}`;
    case "workflow": {
      if (!c.workflow?.id) return `responda em uma frase curta.${extra}`;
      const depois = destino ? `vá para a etapa ${destino}` : "agradeça e inclua [DESLIGAR]";
      return `diga em uma frase que vai providenciar, inclua ${marcadorWorkflow(c.workflow)} na fala e ${depois}.${extra}`;
    }
    default: return extra.trim() || "responda em uma frase curta.";
  }
}

/**
 * Respostas aceitas por um gatilho. O campo aceita várias, separadas por vírgula
 * (ex.: "sim, tenho dúvida, quero fechar"); cada pedaço vira uma resposta possível.
 * Pura: testável.
 */
export function palavrasGatilho(g: string): string[] {
  return g.split(",").map((p) => p.trim().replace(/^["'«»]+|["'»]+$/g, "")).filter(Boolean);
}

/** Regra "Se o cliente ..." para a IA: uma frase só, ou lista de respostas possíveis. Pura. */
export function gatilhoParaIA(g: string): string {
  const p = palavrasGatilho(g);
  if (p.length < 2) return `Se o cliente ${p[0] ?? g.trim()}`;
  const lista = p.map((x) => `"${x}"`);
  return `Se a última fala do cliente contiver ${lista.slice(0, -1).join(", ")} ou ${lista[lista.length - 1]}`;
}

/** Remove a etapa `i` e corrige os destinos "Ir para a etapa" (destino removido vira "próxima etapa"). Pura. */
export function removerEtapa(etapas: EtapaEditavel[], i: number): EtapaEditavel[] {
  return etapas.filter((_, j) => j !== i).map((e) => ({ ...e, condicoes: e.condicoes.map((c) => {
    if ((c.acao !== "ir_etapa" && c.acao !== "workflow") || c.etapa == null) return c;
    if (c.etapa === i) { const { etapa: _x, ...r } = c; return c.acao === "workflow" ? r : { ...r, acao: "avancar" as const }; }
    return c.etapa > i ? { ...c, etapa: c.etapa - 1 } : c;
  }) }));
}

/** Texto do roteiro editável para a IA: etapas numeradas + regras "Se X, faça Y". Pura: testável. */
export function compilarRoteiro(r: RoteiroSalvo, d: DadosRoteiro): string {
  const validas = r.etapas.map((e, i) => ({ e, i })).filter((x) => x.e.fala.trim());
  const numero = (orig?: number) => { const k = validas.findIndex((x) => x.i === orig); return k < 0 ? undefined : `${k + 1}${validas[k].e.titulo.trim() ? ` (${validas[k].e.titulo.trim()})` : ""}`; };
  const etapas = validas.map(({ e }, i) => {
    const regras = e.condicoes.filter((c) => c.gatilho.trim()).map((c) => `${gatilhoParaIA(c.gatilho)}: ${textoAcao(c, d, c.acao === "ir_etapa" || c.acao === "workflow" ? numero(c.etapa) : undefined)}`);
    const livre = e.venda ? " [Etapa de VENDA LIVRE: converse sobre produtos, estoque e preços do CATÁLOGO até o cliente fechar, pedir uma pessoa ou recusar.]" : "";
    return `${i + 1}) ${e.titulo.trim() ? `${e.titulo.trim()}: ` : ""}${preencher(e.fala.trim(), d)}${livre}${regras.length ? ` (${regras.join(" ")})` : ""}`;
  });
  const p = [`ROTEIRO: ${r.nome}. Siga as etapas, uma por fala, esperando a resposta do cliente: ${etapas.join(" ")}`];
  const venda = r.etapas.find((e) => e.venda && e.fala.trim())?.venda;
  if (venda) p.push(marcadorVenda(venda));
  else if (r.departamento !== "financeiro" && (!d.descontoMax || !r.etapas.some((e) => e.condicoes.some((c) => c.acao === "desconto"))))
    p.push(d.descontoMax ? `Se acharem caro, pode oferecer até ${d.descontoMax}% de desconto, nunca mais que isso.` : "Não ofereça desconto nem invente preço; o atendente confirma valores.");
  if (d.observacoes?.trim()) p.push(`Observação do usuário: ${d.observacoes.trim()}.`);
  return p.join(" ");
}

function comoRoteiro(s: RoteiroSalvo): Roteiro {
  const base = ROTEIROS.find((r) => r.id === s.chave);
  return {
    id: s.chave, rotulo: s.nome, desc: s.descricao || base?.desc || "", campos: s.campos,
    obrigatorios: base ? base.obrigatorios.filter((c) => s.campos.includes(c)) : s.campos.filter((c) => c === "produto" || c === "aviso"),
    produtoPorCliente: !s.campos.includes("produto"),
    etapas: (d) => s.etapas.map((e) => preencher(e.fala, d)),
  };
}

/** Fábrica (ou versão editada) + roteiros novos ativos. */
export function todosRoteiros(): Roteiro[] {
  const fab = ROTEIROS.map((r) => { const s = salvoAtivo(r.id); return s ? comoRoteiro(s) : r; })
    .filter((r) => !salvos.some((s) => s.chave === r.id && !s.ativo));
  return [...fab, ...salvos.filter((s) => s.ativo && !ehDeFabrica(s.chave)).map(comoRoteiro)];
}

export const roteiroPorId = (id: string) => todosRoteiros().find((r) => r.id === id) ?? ROTEIROS.find((r) => r.id === id) ?? ROTEIROS[0];

/** Campos obrigatórios do roteiro que ainda faltam. */
export function pendenciasRoteiro(id: RoteiroId, d: DadosRoteiro): CampoRoteiro[] {
  const r = roteiroPorId(id);
  return r.obrigatorios.filter((c) =>
    c === "produto" ? !d.produtoNome?.trim() : c === "aviso" ? !d.aviso?.trim() : c === "condicao" ? !d.condicao?.trim() : !d.descontoMax);
}

/** Objetivo enviado ao agente: etapas numeradas do roteiro + limites da negociação. */
export function montarObjetivoRoteiro(id: RoteiroId, d: DadosRoteiro): string {
  const s = salvoAtivo(id);
  if (s) return compilarRoteiro(s, d);
  if (ehDeFabrica(id)) return compilarRoteiro(roteiroDeFabrica(id as RoteiroBaseId), d);
  const r = roteiroPorId(id);
  const etapas = r.etapas(d).map((e, i) => `${i + 1}) ${e}`).join(" ");
  const p = [`ROTEIRO: ${r.rotulo}. Siga as etapas, uma por fala, esperando a resposta do cliente: ${etapas}`];
  if (r.campos.includes("desconto") && d.descontoMax && d.descontoMax > 0)
    p.push(`Se acharem caro, pode oferecer até ${d.descontoMax}% de desconto, nunca mais que isso.`);
  else if (id !== "lembrete_financeiro") p.push("Não ofereça desconto nem invente preço; o atendente confirma valores.");
  if (d.observacoes?.trim()) p.push(`Observação do usuário: ${d.observacoes.trim()}.`);
  return p.join(" ");
}

/** Regras fixas de conversa ao telefone, iguais para todo roteiro. */
export function regrasConversa(ramal: string): string {
  return [
    "VOCÊ ESTÁ FAZENDO UMA LIGAÇÃO. Fale como uma pessoa ao telefone, em português do Brasil, de preferência 1 frase curta por fala (no máximo 2), sem monólogo nem listas.",
    "DÚVIDA PRÁTICA: se o cliente perguntar algo simples (forma de pagamento, boleto, Pix, cartão, entrega, frete, horário, quem está falando), responda direto em uma frase com o que estiver no roteiro, no CATÁLOGO ou nos Dados do CRM; se não souber, diga que o atendente confirma. Nunca responda uma pergunta com outra pergunta de confirmação (\"Você se refere a...?\"). Depois retome a etapa atual.",
    "NATURALIDADE: nunca repita a frase do cliente como espelho nem comece com \"Parece que\"; mostre que entendeu com palavras suas (\"Entendi\", \"Faz sentido\", \"Poxa, entendo\"). Interjeições soltas (eita, hum, ah, nossa) não são resposta: espere ele completar ou repita a pergunta de forma leve.",
    "O ROTEIRO abaixo é a ÚNICA fonte de perguntas e decisões: só faça as perguntas das etapas e, quando o cliente responder, aplique a regra \"Se...\" da etapa da sua última pergunta. Nunca crie perguntas, etapas ou ofertas fora dele. Regras gerais só valem quando a etapa não tem regra para a resposta.",
    "ETAPA 0 (confirmação do contato, já feita na saudação): se o cliente confirmar (sim, sou eu, pode falar, é ele), diga a fala da etapa 1 do ROTEIRO com as mesmas palavras, sem acrescentar frases antes. Se disser que não é o responsável ou que é recepção, peça para falar com quem cuida das compras e espere. Se a pessoa não estiver, pergunte o melhor horário para retornar; ao ouvir, agradeça e inclua [DESLIGAR].",
    "Quando o cliente responder, a etapa foi cumprida: avance sem repetir a pergunta nem voltar a etapas já respondidas. Sim e não são respostas completas à última pergunta.",
    "Se ouvir caixa postal, mensagem de operadora ou ninguém responder, responda só [DESLIGAR].",
    "INTERRUPÇÃO: se o cliente falou por cima de você, não repita o que já disse; responda ao que ele falou agora.",
    "SEGURANÇA DA INFORMAÇÃO: antes de encerrar com algo combinado (dia de retorno, quantidade, canal de envio), confirme em uma frase curta (\"Então fica para sexta, certo?\").",
    "Se perguntarem se você é robô ou IA, diga com naturalidade que é a assistente virtual da empresa e que pode passar para uma pessoa se ele preferir; nunca finja ser humano.",
    "Use um conector curto e natural no início da fala quando couber (\"Certo\", \"Perfeito\", \"Ah, entendi\"), variando, sem repetir o mesmo toda vez. Nunca leia instruções, colchetes ou nomes de etapa em voz alta.",
    "Fale valores como se fala (\"mil e quinhentos reais\"), sem ler códigos, CNPJ ou números de pedido. Não invente preço, prazo, estoque ou condição que não esteja no roteiro.",
    `Transferência: siga as regras do roteiro. Fora delas, transfira só se o cliente pedir uma pessoa: diga em uma frase que vai passar para o atendente e inclua [TRANSFERIR] (ramal ${ramal}). Nunca use [TRANSFERIR] na mesma fala em que faz uma pergunta.`,
    "Se o cliente pedir para ligar outro dia, confirme o dia e agradeça com [DESLIGAR]. Se recusar de forma clara duas vezes, agradeça e inclua [DESLIGAR].",
  ].join(" ");
}

/** Conduta telefônica salva no cadastro do agente (voz_agentes.config.conduta). */
export interface CondutaAgente {
  roteiroPadrao?: RoteiroId;
  tom?: "cordial" | "descontraido" | "formal";
  nomeApresentacao?: string;
  tratarRecepcao?: boolean;
  recusasParaEncerrar?: 1 | 2;
}

export function lerConduta(config: unknown): CondutaAgente {
  const c = (config as { conduta?: CondutaAgente } | null)?.conduta;
  return c && typeof c === "object" ? c : {};
}

const TONS: Record<NonNullable<CondutaAgente["tom"]>, string> = {
  cordial: "Tom cordial e próximo, sem gírias.",
  descontraido: "Tom leve e descontraído, como um vendedor conhecido do cliente.",
  formal: "Tom formal e objetivo, tratando o cliente por senhor/senhora.",
};

/** Ajustes de conduta do agente que complementam as regras fixas de conversa. */
export function regrasConduta(c: CondutaAgente): string {
  const p: string[] = [];
  if (c.nomeApresentacao?.trim()) p.push(`Apresente-se como ${c.nomeApresentacao.trim()}.`);
  p.push(TONS[c.tom ?? "cordial"]);
  if (c.tratarRecepcao === false) p.push("Se atender recepção/portaria, apenas pergunte o melhor horário para falar com o contato e encerre com [DESLIGAR].");
  if (c.recusasParaEncerrar === 1) p.push("Na primeira recusa clara, agradeça e inclua [DESLIGAR].");
  return `CONDUTA: ${p.join(" ")}`;
}

/* ---------------- Departamentos e roteiro inteligente por cliente ---------------- */

/** Departamento do agente de ligações (voz_agentes.config.departamento). */
export type Departamento = "comercial" | "compras" | "financeiro" | "pos_venda" | "logistica";
export const DEPARTAMENTOS: { id: Departamento; rotulo: string; desc: string; roteiros: RoteiroId[] }[] = [
  { id: "comercial", rotulo: "Comercial", desc: "Reposição, orçamentos, reativação e promoções.",
    roteiros: ["reposicao", "orcamento_aberto", "reativacao", "produto_foco"] },
  { id: "financeiro", rotulo: "Financeiro", desc: "Lembretes de vencimento e pendências, em tom discreto.",
    roteiros: ["lembrete_financeiro"] },
  { id: "compras", rotulo: "Compras", desc: "Cotações, negociação e prazos com fornecedores.", roteiros: [] },
  { id: "pos_venda", rotulo: "Pós-venda", desc: "Satisfação, problemas na entrega e recompra.", roteiros: [] },
  { id: "logistica", rotulo: "Logística", desc: "Confirmação de entregas, recebedor e horários.", roteiros: [] },
];
const IDS_DEP = ["comercial", "compras", "financeiro", "pos_venda", "logistica"];
export const departamentoValido = (d: unknown): Departamento => (IDS_DEP.includes(String(d)) ? d as Departamento : "comercial");
export function lerDepartamento(config: unknown): Departamento {
  const d = (config as { departamento?: string } | null)?.departamento;
  return departamentoValido(d);
}
export const roteirosDoDepartamento = (d: Departamento) =>
  todosRoteiros().filter((r) => {
    const s = salvos.find((x) => x.chave === r.id);
    return s ? s.departamento === d : DEPARTAMENTOS.find((x) => x.id === d)!.roteiros.includes(r.id);
  });

/** Carrega os roteiros salvos da empresa e os aplica à montagem das ligações. */
export async function carregarRoteirosSalvos(db: any, estabelecimentoId: string | null): Promise<RoteiroSalvo[]> {
  if (!estabelecimentoId) return salvos;
  const { data } = await db.from("voz_roteiros").select("*").eq("estabelecimento_id", estabelecimentoId).order("created_at");
  definirRoteirosSalvos((data ?? []).map((x: any) => ({
    id: x.id, chave: x.chave, departamento: departamentoValido(x.departamento),
    nome: x.nome, descricao: x.descricao ?? "", campos: x.campos ?? [], etapas: Array.isArray(x.etapas) ? x.etapas : [], ativo: x.ativo !== false,
  })));
  return salvos;
}

const DIA_MS = 86_400_000;
const ETAPAS_ABERTAS_VOZ = ["orcamento", "negociacao", "aprovacao_gerencia"];

/** Orçamento resumido usado para decidir o roteiro de cada cliente. */
export interface OrcCliente { etapa: string; criado: string }
/** Resultado da escolha: roteiro aplicado ou null quando o cliente não deve receber a ligação. */
export interface EscolhaRoteiro { roteiro: RoteiroId | "apresentacao"; motivo: string }

/**
 * Decide o roteiro do cliente pelo CRM, antes de discar (modo inteligente, Comercial).
 * Ordem: orçamento aberto há mais de 3 dias → reposição (ciclo vencido) →
 * reativação (mais de 60 dias sem comprar) → apresentação (sem histórico).
 * Nunca escolhe "orçamento aberto" para quem não tem orçamento aberto. Pura: testável.
 */
export function roteiroDoCliente(orcs: OrcCliente[], hoje: number): EscolhaRoteiro {
  const abertos = orcs.filter((o) => ETAPAS_ABERTAS_VOZ.includes(o.etapa) && hoje - Date.parse(o.criado) > 3 * DIA_MS);
  if (abertos.length) {
    const dias = Math.floor((hoje - Math.max(...abertos.map((o) => Date.parse(o.criado)))) / DIA_MS);
    return { roteiro: "orcamento_aberto", motivo: `Orçamento aberto há ${dias} dias` };
  }
  const compras = orcs.filter((o) => o.etapa === "finalizado").map((o) => Date.parse(o.criado)).filter(Number.isFinite).sort((a, b) => a - b);
  if (!compras.length) return { roteiro: "apresentacao", motivo: "Sem compras registradas" };
  const dias = Math.floor((hoje - compras[compras.length - 1]) / DIA_MS);
  if (dias > 60) return { roteiro: "reativacao", motivo: `Sem comprar há ${dias} dias` };
  const ciclo = compras.length > 1 ? (compras[compras.length - 1] - compras[0]) / (compras.length - 1) / DIA_MS : null;
  if (ciclo && dias >= ciclo - 5) return { roteiro: "reposicao", motivo: `Último pedido há ${dias} dias (ciclo ~${Math.round(ciclo)})` };
  return { roteiro: "reposicao", motivo: `Cliente ativo, último pedido há ${dias} dias` };
}

const ETAPAS_APRESENTACAO = [
  "Apresente a empresa em uma frase.",
  "Pergunte quem cuida das compras e se pode enviar uma cotação.",
  "Com interesse, transfira para o atendente.",
];

/** Roteiro individual do cliente, anexado ao comando da ligação (modo inteligente). */
export function objetivoDoCliente(e: EscolhaRoteiro, d: DadosRoteiro): string {
  const base = e.roteiro === "apresentacao"
    ? `ROTEIRO: Apresentação. Siga as etapas, uma por fala: ${ETAPAS_APRESENTACAO.map((x, i) => `${i + 1}) ${x}`).join(" ")}`
    : montarObjetivoRoteiro(e.roteiro, d);
  return `ROTEIRO DESTE CLIENTE (escolhido pelo CRM: ${e.motivo}). ${base}`;
}

export const rotuloEscolha = (e: EscolhaRoteiro) => e.roteiro === "apresentacao" ? "Apresentação" : roteiroPorId(e.roteiro).rotulo;

/** Configuração da campanha no modo inteligente, lida ao iniciar as ligações. */
export const campanhaInteligente: { ativo: boolean; dados: DadosRoteiro } = { ativo: false, dados: {} };
