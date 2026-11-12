// Bloco "Venda & Negociação de Estoque" dos roteiros de voz: o roteiro compilado traz o marcador
// [VENDA:d=<desconto>;s=<0|1>;f=<filtro>] e aqui ele vira catálogo real + regras de vendedor.
// Mesmo formato de src/lib/voz/roteirosLigacao.ts (marcadorVenda).
// deno-lint-ignore no-explicit-any
type SB = any;

export interface ConfigVenda { desconto: number; similares: boolean; filtro: string; modalidade: "venda" | "cobranca" | "orcamento" | "livre"; parcelas: number }

export function lerMarcadorVenda(texto: string): ConfigVenda | null {
  const m = /\[VENDA:([^\]]*)\]/.exec(texto ?? "");
  if (!m) return null;
  const kv = Object.fromEntries(m[1].split(";").map((p) => { const i = p.indexOf("="); return [p.slice(0, i), p.slice(i + 1)]; }));
  return { desconto: Math.max(0, Math.min(50, Number(kv.d) || 0)), similares: kv.s !== "0", filtro: String(kv.f ?? "").trim(),
    modalidade: (["cobranca", "orcamento", "livre"].includes(kv.m) ? kv.m : "venda") as ConfigVenda["modalidade"], parcelas: Math.max(1, Math.min(24, Number(kv.p) || 1)) };
}

export const removerMarcadorVenda = (t: string) => String(t ?? "").replace(/\[VENDA:[^\]]*\]/g, "").trim();

const cache = new Map<string, { t: number; v: string }>();
const brl = (n: number) => `R$ ${n.toFixed(2).replace(".", ",")}`;

/** Catálogo enxuto (até 150 itens ativos, com estoque primeiro) para a IA consultar ao telefone. */
export async function catalogoVenda(sb: SB, empresa: string, cfg: ConfigVenda): Promise<string> {
  const chave = `${empresa}:${cfg.filtro}`;
  const c = cache.get(chave);
  if (c && Date.now() - c.t < 5 * 60_000) return c.v;
  const { data } = await sb.from("produtos").select("nome, marca, estoque, preco_tabela, preco_minimo, tipo_preco")
    .eq("estabelecimento_id", empresa).neq("ativo", false).order("estoque", { ascending: false, nullsFirst: false }).limit(2000);
  const termos = cfg.filtro.toLowerCase().split(",").map((x) => x.trim()).filter(Boolean);
  const lista = (data ?? []).filter((p: SB) => !termos.length || termos.some((t) => `${p.nome} ${p.marca ?? ""}`.toLowerCase().includes(t))).slice(0, 150);
  const linhas = lista.map((p: SB) => {
    const preco = Number(p.preco_tabela) || 0;
    const piso = Math.max(Number(p.preco_minimo) || 0, preco * (1 - cfg.desconto / 100));
    const un = String(p.tipo_preco ?? "").trim() || "unidade";
    return `${p.nome}${p.marca ? ` (${p.marca})` : ""} | estoque: ${Number(p.estoque) || 0} ${un} | preço: ${preco ? brl(preco) : "consultar"}${preco && piso < preco ? ` | mínimo: ${brl(piso)}` : ""}`;
  });
  const v = linhas.length ? linhas.join("\n") : "(nenhum produto cadastrado)";
  cache.set(chave, { t: Date.now(), v });
  return v;
}

/** Regras do vendedor consultivo + catálogo. */
export function regrasVenda(cfg: ConfigVenda, catalogo: string): string {
  const comum = "Siga as DIRETRIZES DA EMPRESA escritas na etapa, quando houver; elas valem acima destas regras gerais. Nunca invente valores, prazos ou condições que não estejam nas diretrizes ou nos dados da ligação. Se o cliente pedir uma pessoa, inclua [TRANSFERIR]. Se recusar, agradeça e inclua [DESLIGAR].";
  if (cfg.modalidade === "cobranca") return [
    "\n\nMODO NEGOCIAÇÃO DE COBRANÇA / ACORDO (vale nesta etapa): tom respeitoso e discreto, sem constranger o cliente; entenda a situação antes de propor.",
    `Pode oferecer parcelamento em até ${cfg.parcelas}x e desconto de até ${cfg.desconto}% sobre juros e multa, nunca acima disso; comece pela condição mais próxima do valor integral.`,
    "Quando o cliente aceitar, repita em uma frase o valor, parcelas e datas combinados, diga que o atendente envia o boleto/Pix e inclua [TRANSFERIR].", comum,
  ].join(" ");
  if (cfg.modalidade === "orcamento") return [
    "\n\nMODO NEGOCIAÇÃO DE ORÇAMENTO EM ABERTO (vale nesta etapa): o objetivo é fechar a proposta já enviada; descubra o que trava (preço, prazo, pagamento) e negocie esse ponto.",
    `Pode conceder até ${cfg.desconto}% de desconto sobre o total da proposta, nunca acima; prefira ceder em prazo ou condição antes de preço.`,
    "Quando o cliente aceitar, repita em uma frase o que foi combinado, diga que o atendente emite o pedido e inclua [TRANSFERIR].", comum,
  ].join(" ");
  if (cfg.modalidade === "livre") return [
    "\n\nMODO NEGOCIAÇÃO LIVRE (vale nesta etapa): converse de forma natural seguindo as DIRETRIZES DA EMPRESA da etapa.",
    cfg.desconto ? `Limite de concessão: até ${cfg.desconto}%.` : "Não ofereça desconto.",
    "Quando o cliente aceitar, repita em uma frase o combinado e inclua [TRANSFERIR].", comum,
  ].join(" ");
  return [
    "\n\nMODO VENDA & NEGOCIAÇÃO DE ESTOQUE (vale nesta etapa): converse como um vendedor de balcão ao telefone, de forma livre e natural, sempre sobre as mercadorias do catálogo abaixo.",
    "Responda primeiro o que o cliente perguntou e termine com UMA pergunta curta que leve à compra. Pode usar pontes naturais como \"um segundo, vou conferir... sim, tenho\".",
    "Sempre diga a unidade junto da quantidade (caixas, fardos, pacotes, unidades), conforme o catálogo. Nunca invente produto, estoque ou preço que não esteja no catálogo.",
    "Pergunta genérica com muitos produtos: não leia a lista; faça uma pergunta de afunilamento (tipo, tamanho, cor, marca) e cite no máximo 2 ou 3 opções por fala.",
    cfg.similares ? "Se o produto pedido estiver sem estoque ou com pouco, ofereça logo um similar com estoque do catálogo e pergunte se serve." : "Não ofereça similares; se faltar, diga que o atendente confirma a reposição.",
    `Preço: informe o preço de tabela. Se o cliente pedir desconto ou achar caro, você pode descer até o \"mínimo\" de cada item (desconto máximo ${cfg.desconto}%), nunca abaixo. Se pedir menos que o mínimo, faça contraproposta por volume (ex.: \"para essa quantidade não consigo, mas fechando o dobro chego no meu melhor valor\").`,
    "Perguntas de preço, quantidade ou estoque NÃO são pedido de transferência: responda você mesmo.",
    "Quando o cliente fechar (\"pode mandar\", \"fecha\", \"quero\"), repita em uma frase os itens, quantidades com unidade e preço combinados, diga que o atendente vai emitir o pedido e inclua [TRANSFERIR]. Se pedir uma pessoa, inclua [TRANSFERIR]. Se não tiver interesse, agradeça e inclua [DESLIGAR].",
    comum,
    `CATÁLOGO (nome | estoque | preço | mínimo):\n${catalogo}`,
  ].join(" ");
}
