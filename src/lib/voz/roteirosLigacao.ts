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
      "Pergunte só: \"O senhor conseguiu dar uma olhada no orçamento?\" (uma pergunta, espere a resposta).",
      "Se respondeu sim, pergunte só: \"Ficou alguma dúvida ou já podemos fechar?\". Se respondeu não, pergunte qual dia pode retornar; ao ouvir o dia, confirme (\"Combinado, retorno na sexta\") e encerre — a agenda é marcada sozinha.",
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

export type AcaoCondicao = "responder" | "desconto" | "transferir" | "encerrar" | "avancar";
export interface CondicaoRoteiro { gatilho: string; acao: AcaoCondicao; texto?: string }
export interface EtapaEditavel { titulo: string; fala: string; condicoes: CondicaoRoteiro[] }
/** Roteiro salvo pela empresa (voz_roteiros). Chave igual a um de fábrica = versão editada dele. */
export interface RoteiroSalvo {
  id?: string; chave: string; departamento: Departamento; nome: string; descricao: string;
  campos: CampoRoteiro[]; etapas: EtapaEditavel[]; ativo: boolean;
}

export const GATILHOS_PRONTOS = [
  "é recepção ou portaria", "não pode falar agora", "achou caro", "pediu prazo ou forma de pagamento",
  "já comprou de outro fornecedor", "demonstrou interesse", "pediu para falar com uma pessoa",
  "disse que não precisa agora", "pediu amostra ou catálogo",
];
export const ACOES: { id: AcaoCondicao; rotulo: string }[] = [
  { id: "responder", rotulo: "Responder com a fala" },
  { id: "desconto", rotulo: "Oferecer desconto (até o limite)" },
  { id: "transferir", rotulo: "Transferir para o atendente" },
  { id: "encerrar", rotulo: "Agradecer e encerrar" },
  { id: "avancar", rotulo: "Ir para a próxima etapa" },
];

let salvos: RoteiroSalvo[] = [];
/** Define os roteiros salvos da empresa usados em toda a montagem do objetivo. */
export function definirRoteirosSalvos(lista: RoteiroSalvo[]) { salvos = lista; }
export const roteirosSalvos = () => salvos;
const salvoAtivo = (id: string) => salvos.find((s) => s.chave === id && s.ativo);

const ROTULO_PH: DadosRoteiro = { produtoNome: "{produto}", condicao: "{condicao}", aviso: "{aviso}" };
const CONDICOES_PADRAO: Record<RoteiroBaseId, CondicaoRoteiro[]> = {
  reposicao: [{ gatilho: "achou caro", acao: "desconto" }, { gatilho: "demonstrou interesse", acao: "transferir" }],
  produto_foco: [{ gatilho: "achou caro", acao: "desconto" }, { gatilho: "demonstrou interesse", acao: "transferir" }],
  orcamento_aberto: [{ gatilho: "disse que tem dúvida, quer fechar ou perguntou valor/prazo", acao: "transferir" }, { gatilho: "já comprou de outro fornecedor", acao: "responder", texto: "Pergunte, sem insistir, o que fez ele escolher o outro." }, { gatilho: "achou caro", acao: "desconto" }],
  reativacao: [{ gatilho: "disse que não precisa agora", acao: "encerrar" }, { gatilho: "demonstrou interesse", acao: "transferir" }],
  lembrete_financeiro: [{ gatilho: "pediu prazo ou forma de pagamento", acao: "transferir" }],
};

/** Versão editável de um roteiro de fábrica (ponto de partida do editor e "restaurar original"). */
export function roteiroDeFabrica(id: RoteiroBaseId): RoteiroSalvo {
  const r = ROTEIROS.find((x) => x.id === id)!;
  const etapas = r.etapas(ROTULO_PH);
  const conds = CONDICOES_PADRAO[id];
  return {
    chave: id, nome: r.rotulo, descricao: r.desc, campos: r.campos, ativo: true,
    departamento: id === "lembrete_financeiro" ? "financeiro" : "comercial",
    etapas: etapas.map((fala, i) => ({ titulo: `Etapa ${i + 1}`, fala, condicoes: i === etapas.length - 1 ? conds : [] })),
  };
}
export const ehDeFabrica = (chave: string) => ROTEIROS.some((r) => r.id === chave);

function preencher(t: string, d: DadosRoteiro) {
  return t.replace(/\{produto\}/g, d.produtoNome?.trim() || "o produto que o cliente mais compra (veja os Dados do CRM)")
    .replace(/\{condicao\}/g, d.condicao?.trim() || "a condição que o atendente confirmar")
    .replace(/\{aviso\}/g, d.aviso?.trim() || "há uma pendência em aberto")
    .replace(/\{desconto\}/g, d.descontoMax ? `${d.descontoMax}%` : "nenhum desconto");
}
function textoAcao(c: CondicaoRoteiro, d: DadosRoteiro) {
  const extra = c.texto?.trim() ? ` ${preencher(c.texto.trim(), d)}` : "";
  switch (c.acao) {
    case "desconto": return d.descontoMax ? `ofereça até ${d.descontoMax}% de desconto, nunca mais.${extra}` : `diga que o atendente vê uma condição especial e inclua [TRANSFERIR].${extra}`;
    case "transferir": return `diga em uma frase que vai passar para o atendente e inclua [TRANSFERIR].${extra}`;
    case "encerrar": return `agradeça com simpatia e inclua [DESLIGAR].${extra}`;
    case "avancar": return `siga para a próxima etapa.${extra}`;
    default: return extra.trim() || "responda em uma frase curta.";
  }
}

/** Texto do roteiro editável para a IA: etapas numeradas + regras "Se X, faça Y". Pura: testável. */
export function compilarRoteiro(r: RoteiroSalvo, d: DadosRoteiro): string {
  const etapas = r.etapas.filter((e) => e.fala.trim()).map((e, i) => {
    const regras = e.condicoes.filter((c) => c.gatilho.trim()).map((c) => `Se o cliente ${c.gatilho.trim()}: ${textoAcao(c, d)}`);
    return `${i + 1}) ${e.titulo.trim() ? `${e.titulo.trim()}: ` : ""}${preencher(e.fala.trim(), d)}${regras.length ? ` (${regras.join(" ")})` : ""}`;
  });
  const p = [`ROTEIRO: ${r.nome}. Siga as etapas, uma por fala, esperando a resposta do cliente: ${etapas.join(" ")}`];
  if (!r.etapas.some((e) => e.condicoes.some((c) => c.acao === "desconto")) && r.departamento !== "financeiro")
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
    "VOCÊ ESTÁ FAZENDO UMA LIGAÇÃO. Fale como uma pessoa ao telefone, em português do Brasil.",
    "Cada fala tem no máximo 2 frases curtas e termina com UMA pergunta simples. Nunca faça monólogo nem liste itens.",
    "Primeira fala: cumprimente, diga seu nome e a empresa e confirme se está falando com o contato cadastrado. Não oferte nada antes da resposta.",
    "Se for recepção/portaria, peça educadamente para falar com o contato (ou com quem cuida das compras); se não estiver, pergunte o melhor horário e agradeça.",
    "Se ouvir caixa postal, mensagem de operadora ou ninguém responder, responda só [DESLIGAR].",
    "Fale valores como se fala (\"mil e quinhentos reais\"), sem ler códigos, CNPJ, números de pedido ou históricos antigos. Cite no máximo um produto por vez.",
    "Não invente preço, prazo, estoque ou condição que não esteja neste roteiro.",
    "O roteiro é um diálogo: faça uma etapa, PARE e espere o cliente responder antes da próxima. Nunca avance etapas sozinha nem responda pelo cliente.",
    `Só transfira quando a ÚLTIMA fala do CLIENTE pedir algo explícito (quero fechar, qual o valor, tenho uma dúvida, quero falar com alguém, sim quero): então diga em uma frase que vai passar para o atendente e inclua [TRANSFERIR] (ramal ${ramal}). Nunca use [TRANSFERIR] na mesma fala em que faz uma pergunta, nem antes de o cliente responder ao roteiro.`,
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
export type Departamento = "comercial" | "financeiro";
export const DEPARTAMENTOS: { id: Departamento; rotulo: string; desc: string; roteiros: RoteiroId[] }[] = [
  { id: "comercial", rotulo: "Comercial", desc: "Reposição, orçamentos, reativação e promoções.",
    roteiros: ["reposicao", "orcamento_aberto", "reativacao", "produto_foco"] },
  { id: "financeiro", rotulo: "Financeiro", desc: "Lembretes de vencimento e pendências, em tom discreto.",
    roteiros: ["lembrete_financeiro"] },
];
export function lerDepartamento(config: unknown): Departamento {
  const d = (config as { departamento?: string } | null)?.departamento;
  return d === "financeiro" ? "financeiro" : "comercial";
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
    id: x.id, chave: x.chave, departamento: x.departamento === "financeiro" ? "financeiro" : "comercial",
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
