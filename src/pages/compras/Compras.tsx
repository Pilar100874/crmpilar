import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DeleteConfirmDialog } from "@/components/ui/delete-confirm-dialog";
import { ShoppingCart, ChevronDown, ChevronUp, FileDown, Send, Trash2, RefreshCw, MessageCircle } from "lucide-react";
import { toast } from "sonner";
import { ETAPAS_ABERTAS } from "@/lib/orcamento/pedidosAbertos";
import { agruparCotacoes, calcularNecessidades, type EstrategiaCotacao, type Necessidade, type Urgencia } from "@/lib/compras/necessidadeCompra";
import { baixarCsv, brl, dataBr, nomeEmpresa, qtd, useContextoInterno } from "@/lib/estoque/contexto";

const sb = supabase as any;
type Forn = { produto_id: string; empresa_id: string; principal: boolean; sku_fornecedor: string | null; nome_comercial: string | null; unidade_compra: string | null; fator_conversao: number | null; empresas: any };
type Ultima = { preco: number; data: string };
const corUrg: Record<Urgencia, string> = { critico: "bg-destructive text-destructive-foreground", atencao: "bg-accent text-accent-foreground", planejado: "bg-secondary text-secondary-foreground" };
const rotUrg: Record<Urgencia, string> = { critico: "Comprar hoje", atencao: "Atenção", planejado: "Planejado" };
type Filtro = "todos" | Urgencia | "venda" | "producao" | "minimo";

export default function Compras() {
  const loc = useLocation(); const nav = useNavigate();
  const aba = loc.pathname.includes("cotacoes") ? "cotacoes" : "necessidade";
  return (
    <div className="space-y-4 p-3 sm:p-6">
      <div className="flex items-center gap-2"><ShoppingCart className="h-6 w-6 text-primary" /><h1 className="text-xl font-semibold sm:text-2xl">Compras</h1></div>
      <Tabs value={aba} onValueChange={(v) => nav(v === "cotacoes" ? "/compras/cotacoes" : "/compras/necessidade")}>
        <TabsList><TabsTrigger value="necessidade">Necessidade de compra</TabsTrigger><TabsTrigger value="cotacoes">Cotações</TabsTrigger></TabsList>
        <TabsContent value="necessidade"><NecessidadeCompra onGerou={() => nav("/compras/cotacoes")} /></TabsContent>
        <TabsContent value="cotacoes"><Cotacoes /></TabsContent>
      </Tabs>
    </div>
  );
}

function NecessidadeCompra({ onGerou }: { onGerou: () => void }) {
  const { estabelecimentoId, usuarioId } = useContextoInterno();
  const [lista, setLista] = useState<Necessidade[]>([]);
  const [forn, setForn] = useState<Map<string, Forn[]>>(new Map());
  const [ultimas, setUltimas] = useState<Map<string, Ultima>>(new Map());
  const [sel, setSel] = useState<Record<string, number>>({});
  const [escolhidos, setEscolhidos] = useState<Record<string, string[]>>({});
  const [aberto, setAberto] = useState<string | null>(null);
  const [filtro, setFiltro] = useState<Filtro>("todos");
  const [busca, setBusca] = useState("");
  const [estrategia, setEstrategia] = useState<EstrategiaCotacao>("todos");
  const [carregando, setCarregando] = useState(false);

  const carregar = async () => {
    if (!estabelecimentoId) return;
    setCarregando(true);
    const desde = new Date(Date.now() - 90 * 864e5).toISOString();
    const [p, f, o, m, u, nf] = await Promise.all([
      sb.from("produtos").select("id, nome, codigo, unidade, estoque:estoque_saldo, estoque_minimo, prazo_reposicao_dias, produzido, ficha_producao").eq("estabelecimento_id", estabelecimentoId).eq("ativo", true),
      sb.from("produto_fornecedores").select("produto_id, empresa_id, principal, sku_fornecedor, nome_comercial, unidade_compra, fator_conversao, empresas(nome_fantasia, nome, whatsapp, telefone, email)").eq("estabelecimento_id", estabelecimentoId),
      sb.from("orcamentos").select("id, etapa, created_at, empresas(nome_fantasia, nome), orcamento_itens(produto_id, quantidade)").eq("estabelecimento_id", estabelecimentoId).in("etapa", [...ETAPAS_ABERTAS, "finalizado"]),
      sb.from("estoque_movimentos").select("produto_id, quantidade").eq("estabelecimento_id", estabelecimentoId).eq("tipo", "saida").gte("created_at", desde),
      sb.from("notas_fiscais_itens").select("produto_id, valor_unitario, fator_conversao, notas_fiscais!inner(empresa_id, data_emissao, tipo, status)").eq("estabelecimento_id", estabelecimentoId).eq("notas_fiscais.tipo", "entrada").eq("notas_fiscais.status", "lancada"),
      sb.from("notas_fiscais").select("orcamento_id").eq("estabelecimento_id", estabelecimentoId).eq("tipo", "saida").in("status", ["pronta", "emitida"]),
    ]);
    const faturados = new Set((nf.data ?? []).map((x: any) => x.orcamento_id));
    const vendas = (o.data ?? []).filter((x: any) => !faturados.has(x.id)).flatMap((x: any) => (x.orcamento_itens ?? []).map((i: any) => ({
      produto_id: i.produto_id, quantidade: Number(i.quantidade) || 0, orcamento_id: x.id, cliente: nomeEmpresa(x.empresas), data: x.created_at,
    })));
    const consumo: Record<string, number> = {};
    for (const x of m.data ?? []) consumo[x.produto_id] = (consumo[x.produto_id] ?? 0) + Number(x.quantidade) / 90;
    const fm = new Map<string, Forn[]>();
    for (const x of f.data ?? []) fm.set(x.produto_id, [...(fm.get(x.produto_id) ?? []), x]);
    const um = new Map<string, Ultima>();
    for (const x of u.data ?? []) {
      const k = `${x.produto_id}|${x.notas_fiscais.empresa_id}`; const d = x.notas_fiscais.data_emissao ?? "";
      if (!um.has(k) || um.get(k)!.data < d) um.set(k, { preco: Number(x.valor_unitario) / (Number(x.fator_conversao) || 1), data: d });
    }
    const produtos = (p.data ?? []).map((x: any) => ({ ...x, estoque: Number(x.estoque) || 0, estoque_minimo: Number(x.estoque_minimo) || 0, prazo_reposicao_dias: Number(x.prazo_reposicao_dias) || 0 }));
    setLista(calcularNecessidades(produtos, vendas, consumo)); setForn(fm); setUltimas(um); setCarregando(false);
  };
  useEffect(() => { carregar(); }, [estabelecimentoId]);

  const visiveis = useMemo(() => lista.filter((n) => {
    if (busca && !`${n.produto.nome} ${n.produto.codigo ?? ""}`.toLowerCase().includes(busca.toLowerCase())) return false;
    if (filtro === "todos") return true;
    if (filtro === "venda") return n.porVenda > 0;
    if (filtro === "producao") return n.porProducao > 0;
    if (filtro === "minimo") return n.porMinimo > 0;
    return n.urgencia === filtro;
  }), [lista, filtro, busca]);

  const precoRef = (n: Necessidade) => {
    const fs = forn.get(n.produto.id) ?? [];
    const precos = fs.map((f) => ultimas.get(`${n.produto.id}|${f.empresa_id}`)?.preco).filter((x): x is number => x != null);
    return precos.length ? Math.min(...precos) : 0;
  };
  const kpis = {
    criticos: lista.filter((n) => n.urgencia === "critico").length,
    atencao: lista.filter((n) => n.urgencia === "atencao").length,
    valor: Object.entries(sel).reduce((s, [id, q]) => { const n = lista.find((x) => x.produto.id === id); return s + (n ? precoRef(n) * q : 0); }, 0),
    fornecedores: new Set(Object.keys(sel).flatMap((id) => (forn.get(id) ?? []).map((f) => f.empresa_id))).size,
  };

  const alternar = (n: Necessidade) => setSel((s) => { const c = { ...s }; if (c[n.produto.id] != null) delete c[n.produto.id]; else c[n.produto.id] = n.quantidadeSugerida; return c; });

  const gerar = async () => {
    const ids = Object.keys(sel);
    if (!ids.length) return toast.error("Selecione ao menos um item");
    const grupos = agruparCotacoes(ids.map((id) => ({ produto_id: id, fornecedores: forn.get(id) ?? [], escolhidos: escolhidos[id] })), estrategia);
    const semForn = ids.filter((id) => ![...grupos.values()].some((g) => g.includes(id)));
    if (!grupos.size) return toast.error("Nenhum fornecedor vinculado aos itens selecionados (cadastre na aba Fornecedores do produto)");
    for (const [fid, prods] of grupos) {
      const { data: cot, error } = await sb.from("compras_cotacoes").insert({ estabelecimento_id: estabelecimentoId, fornecedor_id: fid, usuario_id: usuarioId }).select("id").single();
      if (error) return toast.error("Erro ao gerar cotação: " + error.message);
      const itens = prods.map((pid) => {
        const n = lista.find((x) => x.produto.id === pid)!; const f = (forn.get(pid) ?? []).find((x) => x.empresa_id === fid);
        const fator = Number(f?.fator_conversao) || 1;
        const motivo = [n.porVenda && "venda", n.porProducao && "produção", n.porMinimo && "estoque mínimo"].filter(Boolean).join(", ");
        return { cotacao_id: cot.id, estabelecimento_id: estabelecimentoId, produto_id: pid, quantidade: Math.ceil((sel[pid] / fator) * 1000) / 1000, unidade: f?.unidade_compra || n.produto.unidade, sku_fornecedor: f?.sku_fornecedor, motivo };
      });
      const r = await sb.from("compras_cotacao_itens").insert(itens);
      if (r.error) return toast.error("Erro nos itens: " + r.error.message);
    }
    toast.success(`${grupos.size} cotação(ões) gerada(s)${semForn.length ? ` — ${semForn.length} item(ns) sem fornecedor ficaram de fora` : ""}`);
    setSel({}); onGerou();
  };

  const exportar = () => baixarCsv("necessidade-compra.csv", [["Produto", "Código", "Urgência", "Estoque", "Mínimo", "Venda", "Produção", "Sugerido", "Data ideal"],
    ...visiveis.map((n) => [n.produto.nome, n.produto.codigo ?? "", rotUrg[n.urgencia], n.produto.estoque, n.produto.estoque_minimo, n.porVenda, n.porProducao, n.quantidadeSugerida, dataBr(n.dataIdeal)])]);

  const filtros: [Filtro, string][] = [["todos", "Todos"], ["critico", "Comprar hoje"], ["atencao", "Atenção"], ["planejado", "Planejados"], ["venda", "Para vendas"], ["producao", "Para produção"], ["minimo", "Abaixo do mínimo"]];

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
        {[["Comprar hoje", kpis.criticos], ["Atenção", kpis.atencao], ["Valor selecionado", brl(kpis.valor)], ["Fornecedores envolvidos", kpis.fornecedores]].map(([t, v]) => (
          <Card key={t as string}><CardContent className="p-3"><p className="text-xs text-muted-foreground">{t}</p><p className="text-lg font-semibold">{v}</p></CardContent></Card>
        ))}
      </div>
      <div className="flex flex-wrap gap-1.5">{filtros.map(([v, t]) => <Button key={v} size="sm" variant={filtro === v ? "default" : "outline"} onClick={() => setFiltro(v)}>{t}</Button>)}</div>
      <div className="flex flex-wrap items-center gap-2">
        <Input className="min-w-0 flex-1 basis-48" placeholder="Buscar produto ou código" value={busca} onChange={(e) => setBusca(e.target.value)} />
        <Button size="sm" variant="outline" onClick={carregar} disabled={carregando}><RefreshCw className="mr-1 h-4 w-4" />Atualizar</Button>
        <Button size="sm" variant="outline" onClick={exportar}><FileDown className="mr-1 h-4 w-4" />Exportar</Button>
      </div>
      <Card><CardContent className="flex flex-wrap items-center gap-2 p-3">
        <span className="text-sm">{Object.keys(sel).length} selecionado(s) — orçar com</span>
        <Select value={estrategia} onValueChange={(v) => setEstrategia(v as EstrategiaCotacao)}>
          <SelectTrigger className="w-full sm:w-64"><SelectValue /></SelectTrigger>
          <SelectContent><SelectItem value="todos">Todos os fornecedores do item</SelectItem><SelectItem value="principal">Somente o fornecedor principal</SelectItem><SelectItem value="escolhidos">Somente os que eu marcar no item</SelectItem></SelectContent>
        </Select>
        <Button size="sm" onClick={gerar}><Send className="mr-1 h-4 w-4" />Gerar cotações por fornecedor</Button>
      </CardContent></Card>

      {!visiveis.length && <p className="py-8 text-center text-sm text-muted-foreground">{carregando ? "Calculando…" : "Nenhum produto precisa de compra agora."}</p>}
      <div className="space-y-2">
        {visiveis.map((n) => {
          const fs = forn.get(n.produto.id) ?? []; const exp = aberto === n.produto.id; const marcado = sel[n.produto.id] != null;
          return (
            <Card key={n.produto.id} className={marcado ? "border-primary" : ""}><CardContent className="space-y-2 p-3">
              <div className="flex items-start gap-2">
                <Checkbox className="mt-1" checked={marcado} onCheckedChange={() => alternar(n)} />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-1.5"><span className="font-medium">{n.produto.nome}</span>{n.produto.codigo && <span className="text-xs text-muted-foreground">{n.produto.codigo}</span>}<Badge className={corUrg[n.urgencia]}>{rotUrg[n.urgencia]}</Badge></div>
                  <div className="mt-1 flex flex-wrap gap-x-3 text-xs text-muted-foreground">
                    <span>Estoque {qtd(n.produto.estoque)} {n.produto.unidade}</span><span>Mínimo {qtd(n.produto.estoque_minimo)}</span>
                    <span>Projetado {qtd(n.saldoProjetado)}</span><span>Comprar até {dataBr(n.dataIdeal)}</span>
                    {n.porVenda > 0 && <span>Venda {qtd(n.porVenda)}</span>}{n.porProducao > 0 && <span>Produção {qtd(n.porProducao)}</span>}
                  </div>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1">
                  <Input type="number" className="h-8 w-24" value={sel[n.produto.id] ?? n.quantidadeSugerida} onChange={(e) => setSel((s) => ({ ...s, [n.produto.id]: Number(e.target.value) }))} />
                  <Button size="sm" variant="ghost" className="h-7 px-2" onClick={() => setAberto(exp ? null : n.produto.id)}>{exp ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}Detalhes</Button>
                </div>
              </div>
              {exp && (
                <div className="grid gap-3 border-t pt-2 text-sm md:grid-cols-2">
                  <div className="space-y-1">
                    <p className="font-medium">Motivos da compra</p>
                    {n.porMinimo > 0 && <p>• Estoque mínimo: faltam {qtd(n.porMinimo)} para o mínimo de {qtd(n.produto.estoque_minimo)}</p>}
                    {n.vendas.map((v, i) => <p key={i}>• Venda: {qtd(v.quantidade)} para {v.cliente} ({dataBr(v.data)})</p>)}
                    {n.producao.map((p, i) => <p key={i}>• Produção: {qtd(p.quantidade)} para produzir {p.produto_acabado}</p>)}
                    <p className="text-muted-foreground">Prazo de reposição {n.produto.prazo_reposicao_dias} dia(s) • consumo médio {qtd(n.consumoDiario)}/dia</p>
                  </div>
                  <div className="space-y-1">
                    <p className="font-medium">Fornecedores</p>
                    {!fs.length && <p className="text-muted-foreground">Nenhum fornecedor vinculado ao produto.</p>}
                    {fs.map((f) => { const u = ultimas.get(`${n.produto.id}|${f.empresa_id}`); const ok = escolhidos[n.produto.id]?.includes(f.empresa_id); return (
                      <label key={f.empresa_id} className="flex items-start gap-2 rounded border p-2">
                        <Checkbox checked={!!ok} onCheckedChange={() => setEscolhidos((s) => ({ ...s, [n.produto.id]: ok ? (s[n.produto.id] ?? []).filter((x) => x !== f.empresa_id) : [...(s[n.produto.id] ?? []), f.empresa_id] }))} />
                        <span className="min-w-0 flex-1"><span className="font-medium">{nomeEmpresa(f.empresas)}</span>{f.principal && <Badge variant="outline" className="ml-1">Principal</Badge>}
                          <span className="block text-xs text-muted-foreground">{f.sku_fornecedor ? `SKU ${f.sku_fornecedor} • ` : ""}{f.unidade_compra ? `compra em ${f.unidade_compra} (x${f.fator_conversao ?? 1}) • ` : ""}{u ? `último ${brl(u.preco)} em ${dataBr(u.data)}` : "sem compra registrada"}</span></span>
                      </label>); })}
                  </div>
                </div>
              )}
            </CardContent></Card>
          );
        })}
      </div>
    </div>
  );
}

const STATUS = [["rascunho", "Rascunho"], ["enviada", "Enviada"], ["respondida", "Respondida"], ["aprovada", "Aprovada"], ["cancelada", "Cancelada"]];
function Cotacoes() {
  const { estabelecimentoId } = useContextoInterno();
  const [lista, setLista] = useState<any[]>([]);
  const [excluir, setExcluir] = useState<any | null>(null);
  const carregar = async () => {
    if (!estabelecimentoId) return;
    const { data } = await sb.from("compras_cotacoes").select("*, empresas(nome_fantasia, nome, whatsapp, telefone, email), compras_cotacao_itens(*, produtos(nome, codigo))").eq("estabelecimento_id", estabelecimentoId).order("created_at", { ascending: false }).limit(200);
    setLista(data ?? []);
  };
  useEffect(() => { carregar(); }, [estabelecimentoId]);
  const atualizar = async (id: string, campos: any) => { const { error } = await sb.from("compras_cotacoes").update({ ...campos, updated_at: new Date().toISOString() }).eq("id", id); if (error) toast.error(error.message); carregar(); };
  const salvarPreco = async (itemId: string, preco: number) => { await sb.from("compras_cotacao_itens").update({ preco_unitario: preco }).eq("id", itemId); carregar(); };
  const texto = (c: any) => `Olá! Solicito cotação dos itens abaixo:\n${c.compras_cotacao_itens.map((i: any) => `- ${i.produtos?.nome}${i.sku_fornecedor ? ` (SKU ${i.sku_fornecedor})` : ""}: ${qtd(i.quantidade)} ${i.unidade ?? ""}`).join("\n")}\nPor favor informe preço, prazo de entrega e condição de pagamento.`;
  const whats = (c: any) => {
    const fone = String(c.empresas?.whatsapp || c.empresas?.telefone || "").replace(/\D/g, "");
    window.open(`https://wa.me/${fone.length <= 11 ? "55" + fone : fone}?text=${encodeURIComponent(texto(c))}`, "_blank");
    if (c.status === "rascunho") atualizar(c.id, { status: "enviada" });
  };
  return (
    <div className="space-y-2">
      {!lista.length && <p className="py-8 text-center text-sm text-muted-foreground">Nenhuma cotação gerada ainda.</p>}
      {lista.map((c) => {
        const total = c.compras_cotacao_itens.reduce((s: number, i: any) => s + (Number(i.preco_unitario) || 0) * Number(i.quantidade), 0);
        return (
          <Card key={c.id}><CardContent className="space-y-2 p-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="min-w-0 flex-1 font-medium">{nomeEmpresa(c.empresas)} <span className="text-xs font-normal text-muted-foreground">{dataBr(c.created_at)}</span></span>
              <Select value={c.status} onValueChange={(v) => atualizar(c.id, { status: v })}><SelectTrigger className="h-8 w-36"><SelectValue /></SelectTrigger><SelectContent>{STATUS.map(([v, t]) => <SelectItem key={v} value={v}>{t}</SelectItem>)}</SelectContent></Select>
              <Button size="sm" variant="outline" onClick={() => whats(c)}><MessageCircle className="mr-1 h-4 w-4" />WhatsApp</Button>
              {c.empresas?.email && <Button size="sm" variant="outline" asChild><a href={`mailto:${c.empresas.email}?subject=Cotação&body=${encodeURIComponent(texto(c))}`}>E-mail</a></Button>}
              <Button size="icon" variant="ghost" onClick={() => setExcluir(c)}><Trash2 className="h-4 w-4" /></Button>
            </div>
            <div className="space-y-1">
              {c.compras_cotacao_itens.map((i: any) => (
                <div key={i.id} className="flex flex-wrap items-center gap-2 text-sm">
                  <span className="min-w-0 flex-1">{i.produtos?.nome} — {qtd(i.quantidade)} {i.unidade}{i.motivo ? <span className="text-xs text-muted-foreground"> ({i.motivo})</span> : null}</span>
                  <Input type="number" step="0.01" placeholder="Preço" className="h-8 w-28" defaultValue={i.preco_unitario ?? ""} onBlur={(e) => e.target.value !== String(i.preco_unitario ?? "") && salvarPreco(i.id, Number(e.target.value))} />
                </div>
              ))}
            </div>
            <p className="text-right text-sm">Total cotado: <b>{brl(total)}</b></p>
          </CardContent></Card>
        );
      })}
      <DeleteConfirmDialog open={!!excluir} onOpenChange={(o) => !o && setExcluir(null)} onConfirm={async () => { await sb.from("compras_cotacoes").delete().eq("id", excluir.id); setExcluir(null); carregar(); }} title="Excluir cotação" description="A cotação e seus itens serão excluídos." />
    </div>
  );
}
