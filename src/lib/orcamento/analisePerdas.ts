import { MOTIVOS_PERDA, type TipoMotivoPerda } from "./motivoPerda";

export interface ItemPerdido { produtoId: string | null; produto: string; marca: string; quantidade: number; nossoPreco: number; precoCliente?: number; subtotal: number }
export interface PedidoPerdido {
  id: string; numero?: string | number | null; data: string; valor: number; cliente: string; empresa: string; vendedor: string;
  tipo: TipoMotivoPerda | "outro"; motivoTexto: string; concorrente?: string; prazoSolicitado?: string; prazoOfertado?: string; condicaoExigida?: string;
  itens: ItemPerdido[];
}
export interface FiltroPerdas { inicio?: string; fim?: string; tipo?: string; marca?: string; produto?: string; vendedor?: string; busca?: string }

/** Descobre o tipo quando só existe o texto (perdas antigas). */
export function tipoDoTexto(texto: string | null | undefined): TipoMotivoPerda | "outro" {
  const t = (texto ?? "").toLowerCase();
  const m = MOTIVOS_PERDA.find((x) => t.startsWith(x.rotulo.toLowerCase()));
  if (m) return m.id;
  if (/pre[cç]o|concorr|caro/.test(t)) return "preco";
  if (/estoque/.test(t)) return "estoque";
  if (/prazo de entrega|entrega/.test(t)) return "prazo_entrega";
  if (/pagamento|boleto|parcel/.test(t)) return "pagamento";
  if (/desist/.test(t)) return "desistencia";
  return "outro";
}

const norm = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

export function filtrarPerdas(lista: PedidoPerdido[], f: FiltroPerdas): PedidoPerdido[] {
  return lista.filter((p) => {
    const d = p.data.slice(0, 10);
    if (f.inicio && d < f.inicio) return false;
    if (f.fim && d > f.fim) return false;
    if (f.tipo && p.tipo !== f.tipo) return false;
    if (f.vendedor && p.vendedor !== f.vendedor) return false;
    if (f.marca && !p.itens.some((i) => i.marca === f.marca)) return false;
    if (f.produto && !p.itens.some((i) => i.produto === f.produto)) return false;
    if (f.busca) {
      const q = norm(f.busca);
      if (![p.cliente, p.empresa, p.motivoTexto, p.concorrente ?? "", String(p.numero ?? "")].some((x) => norm(x).includes(q))) return false;
    }
    return true;
  });
}

/** Valor perdido atribuído ao filtro: com marca/produto, soma só os itens correspondentes. */
export function valorAtribuido(p: PedidoPerdido, f: FiltroPerdas): number {
  if (!f.marca && !f.produto) return p.valor;
  return p.itens.filter((i) => (!f.marca || i.marca === f.marca) && (!f.produto || i.produto === f.produto)).reduce((s, i) => s + i.subtotal, 0);
}

export interface LinhaAgrupada { chave: string; pedidos: number; valor: number; quantidade: number; difPrecoMedia: number | null; amostrasPreco: number }

/** Agrupa por produto ou marca, com diferença média % entre nosso preço e o preço do cliente/concorrente. */
export function agruparItens(lista: PedidoPerdido[], por: "produto" | "marca", f: FiltroPerdas = {}): LinhaAgrupada[] {
  const m = new Map<string, { ped: Set<string>; valor: number; qtd: number; difs: number[] }>();
  for (const p of lista) for (const i of p.itens) {
    if (f.marca && i.marca !== f.marca) continue;
    if (f.produto && i.produto !== f.produto) continue;
    const k = por === "produto" ? i.produto : i.marca;
    const a = m.get(k) ?? { ped: new Set(), valor: 0, qtd: 0, difs: [] };
    a.ped.add(p.id); a.valor += i.subtotal; a.qtd += i.quantidade;
    if (i.precoCliente && i.nossoPreco > 0) a.difs.push(((i.nossoPreco - i.precoCliente) / i.nossoPreco) * 100);
    m.set(k, a);
  }
  return [...m.entries()].map(([chave, a]) => ({
    chave, pedidos: a.ped.size, valor: a.valor, quantidade: a.qtd, amostrasPreco: a.difs.length,
    difPrecoMedia: a.difs.length ? a.difs.reduce((s, x) => s + x, 0) / a.difs.length : null,
  })).sort((x, y) => y.valor - x.valor);
}

export function agruparMotivos(lista: PedidoPerdido[], f: FiltroPerdas = {}) {
  const m = new Map<string, { pedidos: number; valor: number }>();
  for (const p of lista) {
    const a = m.get(p.tipo) ?? { pedidos: 0, valor: 0 };
    a.pedidos++; a.valor += valorAtribuido(p, f); m.set(p.tipo, a);
  }
  return [...m.entries()].map(([tipo, a]) => ({ tipo, rotulo: MOTIVOS_PERDA.find((x) => x.id === tipo)?.rotulo ?? "Outro", ...a })).sort((x, y) => y.valor - x.valor);
}
