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
