import { calcularProducao, lerFicha } from "@/lib/producao/fichaProducao";

export interface ProdutoCompra {
  id: string; nome: string; codigo?: string | null; unidade?: string | null;
  estoque: number; estoque_minimo: number; prazo_reposicao_dias: number;
  produzido?: boolean | null; ficha_producao?: unknown;
}
export interface DemandaVenda { produto_id: string; quantidade: number; orcamento_id: string; cliente?: string; data?: string }
export interface OrigemProducao { produto_acabado_id: string; produto_acabado: string; quantidade: number }
export type Urgencia = "critico" | "atencao" | "planejado";
export interface Necessidade {
  produto: ProdutoCompra;
  porMinimo: number; porVenda: number; porProducao: number;
  vendas: DemandaVenda[]; producao: OrigemProducao[];
  saldoProjetado: number; quantidadeSugerida: number;
  consumoDiario: number; dataIdeal: string; urgencia: Urgencia;
}

const iso = (d: Date) => d.toISOString().slice(0, 10);
const somarDias = (d: Date, n: number) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };

/**
 * Necessidade de compra = demanda de vendas + demanda de produção + estoque mínimo − estoque atual.
 * Produtos produzidos não são comprados: a falta deles vira demanda das matérias-primas da ficha.
 * Data ideal = dia em que o saldo atinge o mínimo (pelo consumo médio) menos o prazo de reposição.
 */
export function calcularNecessidades(
  produtos: ProdutoCompra[], vendas: DemandaVenda[], consumoDiario: Record<string, number> = {},
  hoje = new Date(), horizonteDias = 15,
): Necessidade[] {
  const mapa = new Map(produtos.map((p) => [p.id, p]));
  const vendasPor = new Map<string, DemandaVenda[]>();
  for (const v of vendas) { if (v.quantidade > 0) vendasPor.set(v.produto_id, [...(vendasPor.get(v.produto_id) ?? []), v]); }
  const prodPor = new Map<string, OrigemProducao[]>();
  for (const p of produtos) {
    if (!p.produzido) continue;
    const venda = (vendasPor.get(p.id) ?? []).reduce((s, v) => s + v.quantidade, 0);
    const falta = venda + Math.max(0, p.estoque_minimo) - Math.max(0, p.estoque);
    if (falta <= 0) continue;
    const calc = calcularProducao(lerFicha(p.ficha_producao), falta);
    for (const m of calc?.materiais ?? []) {
      if (!mapa.has(m.produto_id)) continue;
      prodPor.set(m.produto_id, [...(prodPor.get(m.produto_id) ?? []), { produto_acabado_id: p.id, produto_acabado: p.nome, quantidade: m.quantidade_com_perda }]);
    }
  }
  const out: Necessidade[] = [];
  for (const p of produtos) {
    if (p.produzido) continue;
    const vs = vendasPor.get(p.id) ?? []; const ps = prodPor.get(p.id) ?? [];
    const porVenda = vs.reduce((s, v) => s + v.quantidade, 0);
    const porProducao = ps.reduce((s, v) => s + v.quantidade, 0);
    const minimo = Math.max(0, p.estoque_minimo || 0);
    const saldoProjetado = (p.estoque || 0) - porVenda - porProducao;
    const consumo = Math.max(0, consumoDiario[p.id] ?? 0);
    const prazo = Math.max(0, p.prazo_reposicao_dias || 0);
    // Dias até o saldo projetado chegar ao mínimo, pelo consumo médio.
    const diasAteMinimo = saldoProjetado <= minimo ? 0 : consumo > 0 ? Math.floor((saldoProjetado - minimo) / consumo) : Infinity;
    const diasCompra = diasAteMinimo - prazo;
    if (!(diasCompra <= horizonteDias) && saldoProjetado >= minimo) continue;
    // Cobre a demanda, recompõe o mínimo e o consumo durante o prazo de reposição.
    const sugerida = Math.max(0, minimo - saldoProjetado) + consumo * prazo;
    if (sugerida <= 0) continue;
    const urgencia: Urgencia = saldoProjetado < 0 || diasCompra < 0 ? "critico" : diasCompra <= 3 || saldoProjetado <= minimo ? "atencao" : "planejado";
    out.push({
      produto: p, porMinimo: Math.max(0, Math.min(minimo, minimo - saldoProjetado)), porVenda, porProducao, vendas: vs, producao: ps,
      saldoProjetado, quantidadeSugerida: Math.ceil(sugerida * 1000) / 1000, consumoDiario: consumo,
      dataIdeal: iso(somarDias(hoje, Math.max(0, Number.isFinite(diasCompra) ? diasCompra : 0))), urgencia,
    });
  }
  const ordem = { critico: 0, atencao: 1, planejado: 2 };
  return out.sort((a, b) => ordem[a.urgencia] - ordem[b.urgencia] || a.dataIdeal.localeCompare(b.dataIdeal));
}

export interface FornecedorItem { empresa_id: string; principal: boolean }
export type EstrategiaCotacao = "todos" | "principal" | "escolhidos";

/** Agrupa itens selecionados por fornecedor: cada fornecedor recebe uma cotação com os itens que fornece. */
export function agruparCotacoes(
  itens: { produto_id: string; fornecedores: FornecedorItem[]; escolhidos?: string[] }[], estrategia: EstrategiaCotacao,
): Map<string, string[]> {
  const grupos = new Map<string, string[]>();
  for (const it of itens) {
    let alvo = it.fornecedores.map((f) => f.empresa_id);
    if (estrategia === "principal") { const p = it.fornecedores.find((f) => f.principal) ?? it.fornecedores[0]; alvo = p ? [p.empresa_id] : []; }
    if (estrategia === "escolhidos") alvo = alvo.filter((id) => it.escolhidos?.includes(id));
    for (const f of alvo) grupos.set(f, [...(grupos.get(f) ?? []), it.produto_id]);
  }
  return grupos;
}
