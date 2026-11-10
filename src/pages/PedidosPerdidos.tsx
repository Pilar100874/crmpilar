import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getEstabelecimentoId } from "@/lib/estabelecimentoUtils";
import { MOTIVOS_PERDA } from "@/lib/orcamento/motivoPerda";
import { agruparItens, agruparMotivos, filtrarPerdas, tipoDoTexto, valorAtribuido, type FiltroPerdas, type PedidoPerdido } from "@/lib/orcamento/analisePerdas";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Download, Loader2, TrendingDown, X } from "lucide-react";

const brl = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const TODOS = "__todos";

export default function PedidosPerdidos() {
  const [lista, setLista] = useState<PedidoPerdido[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [f, setF] = useState<FiltroPerdas>({});

  useEffect(() => {
    void (async () => {
      const estab = await getEstabelecimentoId();
      if (!estab) { setCarregando(false); return; }
      const db = supabase as any;
      const { data } = await db.from("orcamentos")
        .select("id, created_at, updated_at, valor_total, motivo_perda, cliente:customers!left(nome), empresa:empresas!left(nome_fantasia), vendedor:usuarios!left(nome), orcamento_itens(id, produto_id, quantidade, preco_unitario, subtotal, produtos(nome, marca))")
        .eq("estabelecimento_id", estab).eq("etapa", "perdido").order("updated_at", { ascending: false }).limit(2000);
      const ids = (data ?? []).map((o: any) => o.id);
      const det = new Map<string, any>();
      for (let i = 0; i < ids.length; i += 200) {
        const { data: h } = await db.from("orcamento_historico").select("orcamento_id, dados_novos, created_at")
          .eq("acao", "perdido_motivo").in("orcamento_id", ids.slice(i, i + 200)).order("created_at", { ascending: true });
        (h ?? []).forEach((x: any) => det.set(x.orcamento_id, x.dados_novos?.detalhes));
      }
      setLista((data ?? []).map((o: any): PedidoPerdido => {
        const d = det.get(o.id) ?? {};
        const precoCli = new Map<string, number>((d.itens ?? []).map((i: any) => [i.itemId, Number(i.precoCliente) || 0]));
        return {
          id: o.id, data: o.updated_at ?? o.created_at, valor: Number(o.valor_total) || 0,
          cliente: o.cliente?.nome ?? "—", empresa: o.empresa?.nome_fantasia ?? "", vendedor: o.vendedor?.nome ?? "Sem vendedor",
          tipo: d.tipo || tipoDoTexto(o.motivo_perda), motivoTexto: o.motivo_perda ?? "Sem motivo informado",
          concorrente: d.concorrente, prazoSolicitado: d.prazoSolicitado, prazoOfertado: d.prazoOfertado, condicaoExigida: d.condicaoExigida,
          itens: (o.orcamento_itens ?? []).map((i: any) => ({
            produtoId: i.produto_id, produto: i.produtos?.nome ?? "Produto", marca: i.produtos?.marca?.trim() || "Sem marca",
            quantidade: Number(i.quantidade) || 0, nossoPreco: Number(i.preco_unitario) || 0,
            precoCliente: precoCli.get(i.id) || undefined, subtotal: Number(i.subtotal) || (Number(i.quantidade) || 0) * (Number(i.preco_unitario) || 0),
          })),
        };
      }));
      setCarregando(false);
    })();
  }, []);

  const opcoes = useMemo(() => ({
    marcas: [...new Set(lista.flatMap((p) => p.itens.map((i) => i.marca)))].sort(),
    produtos: [...new Set(lista.flatMap((p) => p.itens.filter((i) => !f.marca || i.marca === f.marca).map((i) => i.produto)))].sort(),
    vendedores: [...new Set(lista.map((p) => p.vendedor))].sort(),
  }), [lista, f.marca]);

  const filtrados = useMemo(() => filtrarPerdas(lista, f), [lista, f]);
  const total = filtrados.reduce((s, p) => s + valorAtribuido(p, f), 0);
  const motivos = agruparMotivos(filtrados, f);
  const porMarca = agruparItens(filtrados, "marca", f);
  const porProduto = agruparItens(filtrados, "produto", f);
  const concorrentes = useMemo(() => {
    const m = new Map<string, number>();
    filtrados.forEach((p) => p.concorrente && m.set(p.concorrente, (m.get(p.concorrente) ?? 0) + valorAtribuido(p, f)));
    return [...m.entries()].sort((a, b) => b[1] - a[1]);
  }, [filtrados, f]);

  const set = (k: keyof FiltroPerdas, v?: string) => setF((x) => ({ ...x, [k]: v && v !== TODOS ? v : undefined, ...(k === "marca" ? { produto: undefined } : {}) }));
  const sel = (k: keyof FiltroPerdas, rotulo: string, itens: { v: string; l: string }[]) => (
    <div className="min-w-0 space-y-1"><Label className="text-xs">{rotulo}</Label>
      <Select value={(f[k] as string) ?? TODOS} onValueChange={(v) => set(k, v)}>
        <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
        <SelectContent><SelectItem value={TODOS}>Todos</SelectItem>{itens.map((i) => <SelectItem key={i.v} value={i.v}>{i.l}</SelectItem>)}</SelectContent>
      </Select></div>
  );

  const exportar = () => {
    const linhas = [["Data", "Cliente", "Empresa", "Vendedor", "Motivo", "Produto", "Marca", "Qtd", "Nosso preço", "Preço cliente", "Subtotal", "Concorrente", "Detalhe"]];
    filtrados.forEach((p) => p.itens.filter((i) => (!f.marca || i.marca === f.marca) && (!f.produto || i.produto === f.produto)).forEach((i) =>
      linhas.push([p.data.slice(0, 10), p.cliente, p.empresa, p.vendedor, MOTIVOS_PERDA.find((m) => m.id === p.tipo)?.rotulo ?? "Outro", i.produto, i.marca,
        String(i.quantidade), i.nossoPreco.toFixed(2), i.precoCliente?.toFixed(2) ?? "", i.subtotal.toFixed(2), p.concorrente ?? "", p.motivoTexto])));
    const csv = linhas.map((l) => l.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(";")).join("\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob(["\ufeff" + csv], { type: "text/csv" }));
    a.download = `pedidos-perdidos${f.marca ? "-" + f.marca : ""}.csv`; a.click();
  };

  const tabela = (linhas: ReturnType<typeof agruparItens>, titulo: string) => (
    <div className="overflow-hidden rounded-md border">
      <table className="w-full table-fixed text-sm">
        <thead className="bg-muted/50 text-xs text-muted-foreground"><tr>
          <th className="w-2/5 p-2 text-left">{titulo}</th><th className="p-2 text-right">Pedidos</th><th className="p-2 text-right">Qtd</th>
          <th className="p-2 text-right">Valor perdido</th><th className="p-2 text-right">Nosso preço x cliente</th></tr></thead>
        <tbody>{linhas.map((l) => (
          <tr key={l.chave} className="border-t">
            <td className="truncate p-2 font-medium" title={l.chave}>{l.chave}</td><td className="p-2 text-right">{l.pedidos}</td>
            <td className="p-2 text-right">{l.quantidade.toLocaleString("pt-BR")}</td><td className="p-2 text-right font-semibold">{brl(l.valor)}</td>
            <td className="p-2 text-right">{l.difPrecoMedia == null ? "—" : <span className={l.difPrecoMedia > 0 ? "text-destructive" : ""}>{l.difPrecoMedia > 0 ? "+" : ""}{l.difPrecoMedia.toFixed(1)}% <span className="text-xs text-muted-foreground">({l.amostrasPreco})</span></span>}</td>
          </tr>))}
          {!linhas.length && <tr><td colSpan={5} className="p-6 text-center text-muted-foreground">Nada no filtro</td></tr>}</tbody>
      </table>
    </div>
  );

  return (
    <div className="mx-auto max-w-7xl space-y-4 p-4 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary"><TrendingDown className="h-5 w-5" /></div>
          <div><h1 className="text-xl font-semibold">Pedidos perdidos</h1>
            <p className="text-xs text-muted-foreground">Motivos, volume e diferença de preço para negociar com fornecedores</p></div>
        </div>
        <Button variant="outline" size="sm" onClick={exportar} disabled={!filtrados.length}><Download className="mr-1 h-4 w-4" />Exportar CSV</Button>
      </div>

      <Card><CardContent className="grid grid-cols-2 gap-3 pt-4 md:grid-cols-4 lg:grid-cols-7">
        <div className="space-y-1"><Label className="text-xs">De</Label><Input type="date" className="h-9" value={f.inicio ?? ""} onChange={(e) => set("inicio", e.target.value)} /></div>
        <div className="space-y-1"><Label className="text-xs">Até</Label><Input type="date" className="h-9" value={f.fim ?? ""} onChange={(e) => set("fim", e.target.value)} /></div>
        {sel("tipo", "Motivo", MOTIVOS_PERDA.map((m) => ({ v: m.id, l: m.rotulo })))}
        {sel("marca", "Marca", opcoes.marcas.map((v) => ({ v, l: v })))}
        {sel("produto", "Produto", opcoes.produtos.map((v) => ({ v, l: v })))}
        {sel("vendedor", "Vendedor", opcoes.vendedores.map((v) => ({ v, l: v })))}
        <div className="space-y-1"><Label className="text-xs">Buscar</Label>
          <div className="flex gap-1"><Input className="h-9" placeholder="Cliente, concorrente…" value={f.busca ?? ""} onChange={(e) => set("busca", e.target.value)} />
            {Object.values(f).some(Boolean) && <Button size="icon" variant="ghost" className="h-9 w-9 shrink-0" aria-label="Limpar filtros" onClick={() => setF({})}><X className="h-4 w-4" /></Button>}</div></div>
      </CardContent></Card>

      {carregando ? <div className="flex justify-center p-10"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div> : <>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {[["Volume perdido", brl(total)], ["Pedidos perdidos", String(filtrados.length)], ["Ticket médio perdido", brl(filtrados.length ? total / filtrados.length : 0)],
            ["Principal motivo", motivos[0] ? `${motivos[0].rotulo}` : "—"]].map(([t, v]) => (
            <Card key={t}><CardContent className="pt-4"><p className="text-xs text-muted-foreground">{t}</p><p className="truncate text-lg font-semibold">{v}</p></CardContent></Card>))}
        </div>

        <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Por motivo</CardTitle></CardHeader><CardContent className="space-y-2">
          {motivos.map((m) => (
            <button key={m.tipo} type="button" onClick={() => set("tipo", f.tipo === m.tipo ? undefined : m.tipo)} className="block w-full text-left">
              <div className="flex justify-between text-sm"><span>{m.rotulo} <span className="text-xs text-muted-foreground">({m.pedidos})</span></span><span className="font-medium">{brl(m.valor)}</span></div>
              <div className="mt-1 h-2 rounded bg-muted"><div className="h-2 rounded bg-primary" style={{ width: `${total ? (m.valor / total) * 100 : 0}%` }} /></div>
            </button>))}
          {!motivos.length && <p className="text-sm text-muted-foreground">Nenhum pedido perdido no filtro.</p>}
        </CardContent></Card>

        <Tabs defaultValue="marca">
          <TabsList className="flex-wrap"><TabsTrigger value="marca">Por marca</TabsTrigger><TabsTrigger value="produto">Por produto</TabsTrigger>
            <TabsTrigger value="concorrentes">Concorrentes</TabsTrigger><TabsTrigger value="pedidos">Pedidos</TabsTrigger></TabsList>
          <TabsContent value="marca">{tabela(porMarca, "Marca")}</TabsContent>
          <TabsContent value="produto">{tabela(porProduto, "Produto")}</TabsContent>
          <TabsContent value="concorrentes"><Card><CardContent className="space-y-1 pt-4 text-sm">
            {concorrentes.map(([n, v]) => <div key={n} className="flex justify-between border-b py-1"><span>{n}</span><span className="font-medium">{brl(v)}</span></div>)}
            {!concorrentes.length && <p className="text-muted-foreground">Nenhum concorrente informado.</p>}</CardContent></Card></TabsContent>
          <TabsContent value="pedidos" className="space-y-2">
            {filtrados.slice(0, 200).map((p) => (
              <Card key={p.id}><CardContent className="space-y-1 pt-4 text-sm">
                <div className="flex flex-wrap items-center justify-between gap-2"><span className="font-medium">{p.cliente}{p.empresa && ` · ${p.empresa}`}</span>
                  <span className="font-semibold">{brl(valorAtribuido(p, f))}</span></div>
                <div className="flex flex-wrap gap-1 text-xs text-muted-foreground"><Badge variant="secondary">{MOTIVOS_PERDA.find((m) => m.id === p.tipo)?.rotulo ?? "Outro"}</Badge>
                  <span>{new Date(p.data).toLocaleDateString("pt-BR")}</span><span>· {p.vendedor}</span></div>
                <p className="break-words text-xs">{p.motivoTexto}</p>
              </CardContent></Card>))}
          </TabsContent>
        </Tabs>
        <p className="text-xs text-muted-foreground">"Nosso preço x cliente": quanto nosso preço estava acima (+) do valor que o cliente tinha, média dos itens com preço informado (entre parênteses). Com filtro de marca ou produto, o volume soma só esses itens.</p>
      </>}
    </div>
  );
}
