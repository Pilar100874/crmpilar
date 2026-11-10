/**
 * Roteiros prontos das ligações com IA. O usuário escolhe o objetivo e preenche
 * poucos dados; o roteiro monta as etapas curtas que a IA segue ao telefone.
 * Pura: testável.
 */
export type RoteiroId = "reposicao" | "produto_foco" | "orcamento_aberto" | "reativacao" | "lembrete_financeiro";
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
      "Diga que está ligando sobre o orçamento enviado (cite os itens principais dos Dados do CRM, sem ler valores).",
      "Pergunte se ele conseguiu analisar e se ficou alguma dúvida de preço, prazo ou pagamento.",
      "Se houver dúvida ou interesse em fechar, transfira para o atendente.",
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

export const roteiroPorId = (id: string) => ROTEIROS.find((r) => r.id === id) ?? ROTEIROS[0];

/** Campos obrigatórios do roteiro que ainda faltam. */
export function pendenciasRoteiro(id: RoteiroId, d: DadosRoteiro): CampoRoteiro[] {
  const r = roteiroPorId(id);
  return r.obrigatorios.filter((c) =>
    c === "produto" ? !d.produtoNome?.trim() : c === "aviso" ? !d.aviso?.trim() : c === "condicao" ? !d.condicao?.trim() : !d.descontoMax);
}

/** Objetivo enviado ao agente: etapas numeradas do roteiro + limites da negociação. */
export function montarObjetivoRoteiro(id: RoteiroId, d: DadosRoteiro): string {
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
    `Ao primeiro sinal de interesse, pedido de preço/prazo/orçamento ou pedido para falar com alguém, diga em uma frase que vai passar para o atendente e inclua [TRANSFERIR] (ramal ${ramal}).`,
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
  ROTEIROS.filter((r) => DEPARTAMENTOS.find((x) => x.id === d)!.roteiros.includes(r.id));

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
