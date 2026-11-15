import { useEffect, useMemo, useRef, useState } from "react";
import { useEtapasPendentes } from "@/contexts/UnsavedChangesContext";
import { useLocation, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DeleteConfirmDialog } from "@/components/ui/delete-confirm-dialog";
import { Boxes, Upload, Plus, Split, PackagePlus, X, ArrowDownCircle, ArrowUpCircle, Trash2, CheckCircle2, FileDown } from "lucide-react";
import { toast } from "sonner";
import { NotasRecebidasDfe } from "@/components/estoque/NotasRecebidasDfe";
import { AuditoriaEntradaNfe } from "@/components/estoque/AuditoriaEntradaNfe";
import { errosDesmembramento, expandirPartes, percentuaisIguais, type ParteEntrada } from "@/lib/compras/entradaNfe";
import { lerNfeXml } from "@/lib/fiscal/nfeXml";
import { baixarCsv, brl, dataBr, nomeEmpresa, qtd, useContextoInterno } from "@/lib/estoque/contexto";

const sb = supabase as any;
const ORIGENS: Record<string, string> = { ajuste: "Ajuste", compra_nfe: "Compra (NF-e)", venda: "Venda faturada", producao_entrada: "Produção (entrada)", producao_consumo: "Consumo na produção", perda: "Perda/avaria", devolucao: "Devolução", inventario: "Inventário" };
const soDig = (s?: string | null) => (s ?? "").replace(/\D/g, "");

export default function Estoque() {
  const loc = useLocation(); const nav = useNavigate();
  const aba = loc.pathname.includes("entrada") ? "entrada" : loc.pathname.includes("movimentacoes") ? "movimentacoes" : "saldos";
  const ctx = useContextoInterno();
  const [produtos, setProdutos] = useState<any[]>([]);
  const carregarProdutos = async () => {
    if (!ctx.estabelecimentoId) return;
    const { data } = await sb.from("produtos").select("id, nome, codigo, unidade, estoque, estoque_minimo, ean_13, gtin, ncm, cest, origem, tipo_item_fiscal, preco_tabela").eq("estabelecimento_id", ctx.estabelecimentoId).eq("ativo", true).order("nome");
    setProdutos(data ?? []);
  };
  useEffect(() => { carregarProdutos(); }, [ctx.estabelecimentoId]);
  return (
    <div className="space-y-4 p-3 sm:p-6">
      <div className="flex items-center gap-2"><Boxes className="h-6 w-6 text-primary" /><h1 className="text-xl font-semibold sm:text-2xl">Estoque</h1></div>
      <Tabs value={aba} onValueChange={(v) => nav(`/estoque/${v}`)}>
        <TabsList className="flex-wrap h-auto"><TabsTrigger value="saldos">Saldos</TabsTrigger><TabsTrigger value="movimentacoes">Movimentações</TabsTrigger><TabsTrigger value="entrada">Entrada de NF-e</TabsTrigger></TabsList>
        <TabsContent value="saldos"><Saldos produtos={produtos} ctx={ctx} onMudou={carregarProdutos} /></TabsContent>
        <TabsContent value="movimentacoes"><Movimentacoes produtos={produtos} ctx={ctx} /></TabsContent>
        <TabsContent value="entrada"><EntradaNfe produtos={produtos} ctx={ctx} onMudou={carregarProdutos} /></TabsContent>
      </Tabs>
    </div>
  );
}

function Saldos({ produtos, ctx, onMudou }: any) {
  const [busca, setBusca] = useState(""); const [abaixo, setAbaixo] = useState(false);
  const [mov, setMov] = useState<any | null>(null);
  const lista = produtos.filter((p: any) => (!busca || `${p.nome} ${p.codigo ?? ""}`.toLowerCase().includes(busca.toLowerCase())) && (!abaixo || Number(p.estoque) <= Number(p.estoque_minimo || 0)));
  const salvar = async () => {
    const q = Number(mov.quantidade);
    if (!(q > 0)) return toast.error("Informe uma quantidade maior que zero");
    if (!mov.observacao?.trim()) return toast.error("Informe o motivo do ajuste");
    const { error } = await sb.from("estoque_movimentos").insert({ estabelecimento_id: ctx.estabelecimentoId, produto_id: mov.produto.id, tipo: mov.tipo, origem: mov.origem, quantidade: q, custo_unitario: mov.custo ? Number(mov.custo) : null, observacao: mov.observacao, usuario_id: ctx.usuarioId });
    if (error) return toast.error(error.message);
    toast.success("Movimentação registrada"); setMov(null); onMudou();
  };
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        <Input className="min-w-0 flex-1 basis-48" placeholder="Buscar produto" value={busca} onChange={(e) => setBusca(e.target.value)} />
        <Button size="sm" variant={abaixo ? "default" : "outline"} onClick={() => setAbaixo(!abaixo)}>Abaixo do mínimo</Button>
        <Button size="sm" variant="outline" onClick={() => baixarCsv("estoque.csv", [["Produto", "Código", "Unidade", "Estoque", "Mínimo"], ...lista.map((p: any) => [p.nome, p.codigo ?? "", p.unidade ?? "", p.estoque, p.estoque_minimo ?? 0])])}><FileDown className="mr-1 h-4 w-4" />Exportar</Button>
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        {lista.map((p: any) => { const baixo = Number(p.estoque) <= Number(p.estoque_minimo || 0) && Number(p.estoque_minimo) > 0; return (
          <Card key={p.id}><CardContent className="flex items-center gap-2 p-3">
            <div className="min-w-0 flex-1"><p className="font-medium">{p.nome}</p><p className="text-xs text-muted-foreground">{p.codigo ?? "sem código"} • mínimo {qtd(p.estoque_minimo)}</p></div>
            <span className={`text-lg font-semibold ${baixo ? "text-destructive" : ""}`}>{qtd(p.estoque)} <span className="text-xs font-normal">{p.unidade}</span></span>
            <Button size="icon" variant="outline" title="Entrada" onClick={() => setMov({ produto: p, tipo: "entrada", origem: "ajuste" })}><ArrowDownCircle className="h-4 w-4" /></Button>
            <Button size="icon" variant="outline" title="Saída" onClick={() => setMov({ produto: p, tipo: "saida", origem: "ajuste" })}><ArrowUpCircle className="h-4 w-4" /></Button>
          </CardContent></Card>); })}
      </div>
      <Dialog open={!!mov} onOpenChange={(o) => !o && setMov(null)}>
        <DialogContent><DialogHeader><DialogTitle>{mov?.tipo === "entrada" ? "Entrada" : "Saída"} — {mov?.produto?.nome}</DialogTitle></DialogHeader>
          {mov && <div className="grid gap-3 sm:grid-cols-2">
            <div><Label>Motivo</Label><Select value={mov.origem} onValueChange={(v) => setMov({ ...mov, origem: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>
              {(mov.tipo === "entrada" ? ["ajuste", "producao_entrada", "devolucao", "inventario"] : ["ajuste", "producao_consumo", "perda", "inventario"]).map((o) => <SelectItem key={o} value={o}>{ORIGENS[o]}</SelectItem>)}
            </SelectContent></Select></div>
            <div><Label>Quantidade ({mov.produto.unidade})</Label><Input type="number" value={mov.quantidade ?? ""} onChange={(e) => setMov({ ...mov, quantidade: e.target.value })} /></div>
            {mov.tipo === "entrada" && <div><Label>Custo unitário</Label><Input type="number" step="0.01" value={mov.custo ?? ""} onChange={(e) => setMov({ ...mov, custo: e.target.value })} /></div>}
            <div className="sm:col-span-2"><Label>Observação *</Label><Input value={mov.observacao ?? ""} onChange={(e) => setMov({ ...mov, observacao: e.target.value })} /></div>
          </div>}
          <DialogFooter><Button variant="outline" onClick={() => setMov(null)}>Cancelar</Button><Button onClick={salvar}>Registrar</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Movimentacoes({ produtos, ctx }: any) {
  const [produtoId, setProdutoId] = useState("todos"); const [lista, setLista] = useState<any[]>([]);
  useEffect(() => { (async () => {
    if (!ctx.estabelecimentoId) return;
    let q = sb.from("estoque_movimentos").select("*, produtos(nome, unidade)").eq("estabelecimento_id", ctx.estabelecimentoId).order("created_at", { ascending: false }).limit(300);
    if (produtoId !== "todos") q = q.eq("produto_id", produtoId);
    const { data } = await q; setLista(data ?? []);
  })(); }, [ctx.estabelecimentoId, produtoId]);
  return (
    <div className="space-y-3">
      <Select value={produtoId} onValueChange={setProdutoId}><SelectTrigger className="w-full sm:w-80"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="todos">Todos os produtos</SelectItem>{produtos.map((p: any) => <SelectItem key={p.id} value={p.id}>{p.nome}</SelectItem>)}</SelectContent></Select>
      {!lista.length && <p className="py-8 text-center text-sm text-muted-foreground">Nenhuma movimentação.</p>}
      <div className="space-y-1.5">
        {lista.map((m) => (
          <Card key={m.id}><CardContent className="flex flex-wrap items-center gap-2 p-2.5 text-sm">
            {m.tipo === "entrada" ? <ArrowDownCircle className="h-4 w-4 text-primary" /> : <ArrowUpCircle className="h-4 w-4 text-destructive" />}
            <span className="min-w-0 flex-1"><b>{m.produtos?.nome}</b> — {ORIGENS[m.origem] ?? m.origem}{m.documento ? ` • ${m.documento}` : ""}{m.observacao ? <span className="text-muted-foreground"> • {m.observacao}</span> : null}</span>
            <span>{m.tipo === "entrada" ? "+" : "−"}{qtd(m.quantidade)} {m.produtos?.unidade}</span>
            <span className="text-xs text-muted-foreground">saldo {qtd(m.saldo_anterior)} → {qtd(m.saldo_posterior)} • {new Date(m.created_at).toLocaleString("pt-BR")}</span>
          </CardContent></Card>
        ))}
      </div>
    </div>
  );
}

type ItemEdit = { codigo: string; descricao: string; ean?: string; ncm?: string; cfop?: string; cst?: string; unidade?: string; quantidade: number; valorUnitario: number; valorTotal: number; produto_id: string; fator: number; aliqIcms?: number; valorIcms?: number; aliqIpi?: number; valorIpi?: number; aliqPis?: number; valorPis?: number; aliqCofins?: number; valorCofins?: number; valorIcmsSt?: number; partes?: ParteEntrada[] };

function EntradaNfe({ produtos, ctx, onMudou }: any) {
  const [notas, setNotas] = useState<any[]>([]);
  const [fornecedores, setFornecedores] = useState<any[]>([]);
  const [edit, setEdit] = useState<any | null>(null);
  const [excluir, setExcluir] = useState<any | null>(null);
  const [novoProd, setNovoProd] = useState<any | null>(null);
  const arq = useRef<HTMLInputElement>(null);
  useEtapasPendentes("estoque-entrada-nfe", !!edit && edit.status !== "lancada", "Entrada de NF-e", () => { setEdit(null); setNovoProd(null); });
  const carregar = async () => {
    if (!ctx.estabelecimentoId) return;
    const [n, f] = await Promise.all([
      sb.from("notas_fiscais").select("*, empresas(nome_fantasia, nome)").eq("estabelecimento_id", ctx.estabelecimentoId).eq("tipo", "entrada").order("created_at", { ascending: false }).limit(200),
      sb.from("empresas").select("id, nome_fantasia, nome, cnpj, estado").eq("estabelecimento_id", ctx.estabelecimentoId).eq("eh_fornecedor", true).order("nome_fantasia"),
    ]);
    setNotas(n.data ?? []); setFornecedores(f.data ?? []);
  };
  useEffect(() => { carregar(); }, [ctx.estabelecimentoId]);

  /** De-para: SKU do fornecedor → código/EAN do produto → vazio para o usuário escolher. */
  const dePara = async (empresaId: string | null, itens: any[]): Promise<ItemEdit[]> => {
    const { data: vinc } = empresaId ? await sb.from("produto_fornecedores").select("produto_id, sku_fornecedor, fator_conversao").eq("empresa_id", empresaId) : { data: [] };
    return itens.map((i) => {
      const v = (vinc ?? []).find((x: any) => x.sku_fornecedor && x.sku_fornecedor.trim().toLowerCase() === i.codigo.trim().toLowerCase());
      const p = v ? null : produtos.find((x: any) => (i.ean && (x.ean_13 === i.ean || x.gtin === i.ean)) || (x.codigo && x.codigo === i.codigo));
      return { ...i, produto_id: v?.produto_id ?? p?.id ?? "", fator: Number(v?.fator_conversao) || 1 };
    });
  };

  const importarXml = async (file: File) => importarTexto(await file.text());
  const importarTexto = async (xmlTxt: string) => {
    try {
      const nfe = lerNfeXml(xmlTxt);
      if (notas.some((n) => n.chave === nfe.chave && n.status !== "cancelada")) return toast.error("Esta NF-e já foi importada");
      const forn = fornecedores.find((f) => soDig(f.cnpj) === soDig(nfe.emitente.cnpj));
      setEdit({ origem: "xml", xml: xmlTxt, chave: nfe.chave, numero: nfe.numero, serie: nfe.serie, data_emissao: nfe.dataEmissao, natureza_operacao: nfe.naturezaOperacao,
        empresa_id: forn?.id ?? "", participante_nome: nfe.emitente.nome, participante_cnpj: nfe.emitente.cnpj, participante_uf: nfe.emitente.uf, destinatario_cnpj: nfe.destinatarioCnpj, totais: nfe.totais,
        itens: await dePara(forn?.id ?? null, nfe.itens) });
      if (!forn) toast.warning("Fornecedor do XML não está cadastrado como Fornecedor — escolha ou cadastre em Empresas");
    } catch (e: any) { toast.error(e.message); }
  };
  const manual = () => setEdit({ origem: "manual", data_emissao: new Date().toISOString().slice(0, 10), empresa_id: "", numero: "", serie: "1", itens: [] });

  const total = (e: any) => e.itens.reduce((s: number, i: ItemEdit) => s + Number(i.valorTotal || i.quantidade * i.valorUnitario), 0);

  const salvar = async (lancar: boolean) => {
    if (!edit.empresa_id) return toast.error("Escolha o fornecedor");
    if (!edit.itens.length) return toast.error("Inclua ao menos um item");
    for (const [k, i] of (edit.itens as ItemEdit[]).entries()) { if (i.partes?.length) { const er = errosDesmembramento(i.partes); if (er.length) return toast.error(`Item ${k + 1}: ${er[0]}`); } }
    const linhas: ItemEdit[] = (edit.itens as ItemEdit[]).flatMap((i) => (i.partes?.length ? expandirPartes(i, i.partes).map((x) => ({ ...x, partes: undefined })) : [i]));
    if (lancar && linhas.some((i) => !i.produto_id)) return toast.error("Vincule todos os itens a um produto antes de dar entrada");
    const t = edit.totais ?? {};
    const vp = total(edit);
    const cab = { estabelecimento_id: ctx.estabelecimentoId, tipo: "entrada", status: lancar ? "lancada" : "rascunho", origem: edit.origem, empresa_id: edit.empresa_id,
      chave: edit.chave || null, numero: edit.numero, serie: edit.serie, data_emissao: edit.data_emissao, natureza_operacao: edit.natureza_operacao, participante_nome: edit.participante_nome,
      participante_cnpj: edit.participante_cnpj, participante_uf: edit.participante_uf, valor_produtos: t.produtos ?? vp, valor_frete: t.frete ?? 0, valor_desconto: t.desconto ?? 0,
      valor_icms: t.icms ?? 0, valor_icms_st: t.icmsSt ?? 0, valor_ipi: t.ipi ?? 0, valor_pis: t.pis ?? 0, valor_cofins: t.cofins ?? 0, valor_total: t.nota ?? vp, xml: edit.xml ?? null, usuario_id: ctx.usuarioId };
    let notaId = edit.id;
    if (notaId) { const r = await sb.from("notas_fiscais").update({ ...cab, updated_at: new Date().toISOString() }).eq("id", notaId); if (r.error) return toast.error(r.error.message); await sb.from("notas_fiscais_itens").delete().eq("nota_id", notaId); }
    else { const r = await sb.from("notas_fiscais").insert(cab).select("id").single(); if (r.error) return toast.error(r.error.message.includes("chave_unica") ? "Esta NF-e já foi importada" : r.error.message); notaId = r.data.id; }
    const itens = linhas.map((i: ItemEdit) => ({ nota_id: notaId, estabelecimento_id: ctx.estabelecimentoId, produto_id: i.produto_id || null, codigo_origem: i.codigo, descricao: i.descricao, ncm: i.ncm, cfop: i.cfop, cst: i.cst, unidade: i.unidade,
      quantidade: i.quantidade, fator_conversao: i.fator || 1, valor_unitario: i.valorUnitario, valor_total: i.valorTotal || i.quantidade * i.valorUnitario,
      aliq_icms: i.aliqIcms ?? 0, valor_icms: i.valorIcms ?? 0, aliq_ipi: i.aliqIpi ?? 0, valor_ipi: i.valorIpi ?? 0, aliq_pis: i.aliqPis ?? 0, valor_pis: i.valorPis ?? 0, aliq_cofins: i.aliqCofins ?? 0, valor_cofins: i.valorCofins ?? 0 }));
    const ri = await sb.from("notas_fiscais_itens").insert(itens); if (ri.error) return toast.error(ri.error.message);
    if (lancar) {
      const movs = linhas.map((i: ItemEdit) => ({ estabelecimento_id: ctx.estabelecimentoId, produto_id: i.produto_id, tipo: "entrada", origem: "compra_nfe", quantidade: i.quantidade * (i.fator || 1),
        custo_unitario: i.valorUnitario / (i.fator || 1), nota_fiscal_id: notaId, documento: `NF ${edit.numero}`, usuario_id: ctx.usuarioId }));
      const rm = await sb.from("estoque_movimentos").insert(movs); if (rm.error) return toast.error("Nota salva, mas a entrada no estoque falhou: " + rm.error.message);
      // Aprende o de-para: grava SKU do fornecedor no vínculo do produto.
      for (const i of linhas) {
        await sb.from("produto_fornecedores").upsert({ produto_id: i.produto_id, empresa_id: edit.empresa_id, estabelecimento_id: ctx.estabelecimentoId, sku_fornecedor: i.codigo, nome_comercial: i.descricao, unidade_compra: i.unidade, fator_conversao: i.fator || 1 }, { onConflict: "produto_id,empresa_id", ignoreDuplicates: false }).then(() => null, () => null);
      }
      onMudou();
    }
    toast.success(lancar ? "Entrada lançada e estoque atualizado" : "Rascunho salvo"); setEdit(null); carregar();
  };

  const abrir = async (n: any) => {
    const { data } = await sb.from("notas_fiscais_itens").select("*").eq("nota_id", n.id);
    setEdit({ ...n, totais: null, itens: (data ?? []).map((i: any) => ({ codigo: i.codigo_origem ?? "", descricao: i.descricao, ncm: i.ncm, cfop: i.cfop, cst: i.cst, unidade: i.unidade, quantidade: Number(i.quantidade), valorUnitario: Number(i.valor_unitario), valorTotal: Number(i.valor_total), produto_id: i.produto_id ?? "", fator: Number(i.fator_conversao) || 1 })) });
  };
  const setItem = (idx: number, campos: Partial<ItemEdit>) => setEdit((e: any) => ({ ...e, itens: e.itens.map((i: ItemEdit, k: number) => (k === idx ? { ...i, ...campos } : i)) }));
  const somenteLeitura = edit?.status === "lancada";

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        <input ref={arq} type="file" accept=".xml" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) importarXml(f); e.target.value = ""; }} />
        <Button size="sm" onClick={() => arq.current?.click()}><Upload className="mr-1 h-4 w-4" />Importar XML</Button>
        <Button size="sm" variant="outline" onClick={manual}><Plus className="mr-1 h-4 w-4" />Entrada manual</Button>
        <NotasRecebidasDfe chavesImportadas={notas.filter((n) => n.status !== "cancelada").map((n) => n.chave).filter(Boolean)} onImportarXml={importarTexto} />
      </div>
      {!notas.length && <p className="py-8 text-center text-sm text-muted-foreground">Nenhuma nota de entrada.</p>}
      <div className="space-y-1.5">
        {notas.map((n) => (
          <Card key={n.id} className="cursor-pointer" onClick={() => abrir(n)}><CardContent className="flex flex-wrap items-center gap-2 p-3 text-sm">
            <span className="min-w-0 flex-1"><b>NF {n.numero || "s/n"}</b> — {n.empresas ? nomeEmpresa(n.empresas) : n.participante_nome} <span className="text-xs text-muted-foreground">{dataBr(n.data_emissao)} • {n.origem === "xml" ? "XML" : "Manual"}</span></span>
            <span>{brl(n.valor_total)}</span>
            <Badge variant={n.status === "lancada" ? "default" : "outline"}>{n.status === "lancada" ? "Lançada" : n.status === "cancelada" ? "Cancelada" : "Rascunho"}</Badge>
            {n.status !== "lancada" && <Button size="icon" variant="ghost" onClick={(e) => { e.stopPropagation(); setExcluir(n); }}><Trash2 className="h-4 w-4" /></Button>}
          </CardContent></Card>
        ))}
      </div>

      <Dialog open={!!edit} onOpenChange={(o) => !o && setEdit(null)}>
        <DialogContent className="max-h-[90vh] max-w-4xl overflow-y-auto">
          <DialogHeader><DialogTitle>{somenteLeitura ? "Nota de entrada lançada" : "Entrada de NF-e"}</DialogTitle></DialogHeader>
          {edit && <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
              <div className="col-span-2"><Label>Fornecedor</Label><Select disabled={somenteLeitura} value={edit.empresa_id} onValueChange={async (v) => setEdit({ ...edit, empresa_id: v, itens: edit.origem === "xml" ? await dePara(v, edit.itens) : edit.itens })}><SelectTrigger><SelectValue placeholder={edit.participante_nome || "Escolha"} /></SelectTrigger><SelectContent>{fornecedores.map((f) => <SelectItem key={f.id} value={f.id}>{nomeEmpresa(f)}</SelectItem>)}</SelectContent></Select></div>
              <div><Label>Número</Label><Input disabled={somenteLeitura || edit.origem === "xml"} value={edit.numero ?? ""} onChange={(e) => setEdit({ ...edit, numero: e.target.value })} /></div>
              <div><Label>Emissão</Label><Input type="date" disabled={somenteLeitura || edit.origem === "xml"} value={edit.data_emissao ?? ""} onChange={(e) => setEdit({ ...edit, data_emissao: e.target.value })} /></div>
            </div>
            {edit.chave && <p className="break-all text-xs text-muted-foreground">Chave {edit.chave}</p>}
            <div className="space-y-2">
              {edit.itens.map((i: ItemEdit, k: number) => (
                <Card key={k}><CardContent className="grid grid-cols-2 gap-2 p-2.5 md:grid-cols-6">
                  <div className="col-span-2 min-w-0 md:col-span-2">
                    {edit.origem === "manual" && !somenteLeitura ? <Input placeholder="Descrição" value={i.descricao} onChange={(e) => setItem(k, { descricao: e.target.value })} /> : <p className="text-sm font-medium">{i.descricao}<span className="block text-xs text-muted-foreground">{i.codigo} • NCM {i.ncm || "—"} • CFOP {i.cfop || "—"}</span></p>}
                  </div>
                  <div className="col-span-2 space-y-1">{i.partes?.length ? <p className="text-xs font-medium text-primary">Desmembrado em {i.partes.length} produtos</p> : <Select disabled={somenteLeitura} value={i.produto_id} onValueChange={(v) => setItem(k, { produto_id: v, ...(edit.origem === "manual" && !i.descricao ? { descricao: produtos.find((p: any) => p.id === v)?.nome } : {}) })}><SelectTrigger className={i.produto_id ? "" : "border-destructive"}><SelectValue placeholder="Vincular produto" /></SelectTrigger><SelectContent>{produtos.map((p: any) => <SelectItem key={p.id} value={p.id}>{p.nome}</SelectItem>)}</SelectContent></Select>}
                    {!somenteLeitura && <div className="flex flex-wrap gap-1">
                      {!i.partes?.length && <Button type="button" size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={() => setNovoProd({ idx: k, nome: i.descricao, codigo: i.codigo, unidade: i.unidade ?? "", ncm: i.ncm ?? "" })}><PackagePlus className="mr-1 h-3.5 w-3.5" />Criar produto</Button>}
                      {i.partes?.length ? <Button type="button" size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={() => setItem(k, { partes: undefined })}><X className="mr-1 h-3.5 w-3.5" />Desfazer desmembramento</Button>
                        : <Button type="button" size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={() => { const pc = percentuaisIguais(2); setItem(k, { partes: [{ produto_id: i.produto_id, quantidade: i.quantidade * (i.fator || 1), percentual: pc[0] }, { produto_id: "", quantidade: 1, percentual: pc[1] }] }); }}><Split className="mr-1 h-3.5 w-3.5" />Desmembrar</Button>}
                    </div>}</div>
                  <div><Label className="text-xs">Qtd {i.unidade}</Label><Input type="number" disabled={somenteLeitura || edit.origem === "xml"} value={i.quantidade} onChange={(e) => setItem(k, { quantidade: Number(e.target.value), valorTotal: Number(e.target.value) * i.valorUnitario })} /></div>
                  <div><Label className="text-xs">Converter: 1 {i.unidade || "un"} =</Label><Input type="number" disabled={somenteLeitura || !!i.partes?.length} value={i.fator} onChange={(e) => setItem(k, { fator: Number(e.target.value) || 1 })} /></div>
                  <div><Label className="text-xs">Valor unit.</Label><Input type="number" step="0.01" disabled={somenteLeitura || edit.origem === "xml"} value={i.valorUnitario} onChange={(e) => setItem(k, { valorUnitario: Number(e.target.value), valorTotal: Number(e.target.value) * i.quantidade })} /></div>
                  <div className="flex items-end justify-between gap-1 text-sm md:col-span-1"><span>{brl(i.valorTotal)}</span>{edit.origem === "manual" && !somenteLeitura && <Button size="icon" variant="ghost" onClick={() => setEdit({ ...edit, itens: edit.itens.filter((_: any, x: number) => x !== k) })}><Trash2 className="h-4 w-4" /></Button>}</div>
                  {i.partes?.length ? <div className="col-span-2 space-y-1.5 rounded-md border border-dashed p-2 md:col-span-6">
                    <p className="text-xs text-muted-foreground">Informe quanto entra de cada produto (na unidade do estoque) e quanto do custo do item ({brl(i.valorTotal)}) vai para cada um.</p>
                    {i.partes.map((pt, j) => { const upd = (c: Partial<ParteEntrada>) => setItem(k, { partes: i.partes!.map((x, y) => (y === j ? { ...x, ...c } : x)) }); return (
                      <div key={j} className="grid grid-cols-[1fr_auto] gap-1.5 sm:grid-cols-[1fr_7rem_6rem_auto] sm:items-end">
                        <Select disabled={somenteLeitura} value={pt.produto_id} onValueChange={(v) => upd({ produto_id: v })}><SelectTrigger className={pt.produto_id ? "" : "border-destructive"}><SelectValue placeholder="Produto" /></SelectTrigger><SelectContent>{produtos.map((p: any) => <SelectItem key={p.id} value={p.id}>{p.nome}</SelectItem>)}</SelectContent></Select>
                        <Button size="icon" variant="ghost" className="sm:order-last" disabled={somenteLeitura || i.partes!.length <= 2} onClick={() => setItem(k, { partes: i.partes!.filter((_, y) => y !== j) })}><Trash2 className="h-4 w-4" /></Button>
                        <div><Label className="text-xs">Qtd ({produtos.find((p: any) => p.id === pt.produto_id)?.unidade ?? "un"})</Label><Input type="number" disabled={somenteLeitura} value={pt.quantidade} onChange={(e) => upd({ quantidade: Number(e.target.value) })} /></div>
                        <div><Label className="text-xs">% do custo</Label><Input type="number" step="0.01" disabled={somenteLeitura} value={pt.percentual} onChange={(e) => upd({ percentual: Number(e.target.value) })} /></div>
                      </div>); })}
                    {!somenteLeitura && <div className="flex flex-wrap gap-1">
                      <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => setItem(k, { partes: [...i.partes!, { produto_id: "", quantidade: 1, percentual: 0 }] })}><Plus className="mr-1 h-3.5 w-3.5" />Produto</Button>
                      <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => { const pc = percentuaisIguais(i.partes!.length); setItem(k, { partes: i.partes!.map((x, y) => ({ ...x, percentual: pc[y] })) }); }}>Ratear custo igual</Button>
                    </div>}
                    {errosDesmembramento(i.partes).map((er) => <p key={er} className="text-xs text-destructive">{er}</p>)}
                  </div>
                  : <p className="col-span-2 text-xs text-muted-foreground md:col-span-6">Conversão: 1 {i.unidade || "un"} da nota = {qtd(i.fator || 1)} {produtos.find((p: any) => p.id === i.produto_id)?.unidade ?? "un"} no estoque • Entra no estoque: {qtd(i.quantidade * (i.fator || 1))} {produtos.find((p: any) => p.id === i.produto_id)?.unidade ?? ""}</p>}
                </CardContent></Card>
              ))}
              {edit.origem === "manual" && !somenteLeitura && <Button size="sm" variant="outline" onClick={() => setEdit({ ...edit, itens: [...edit.itens, { codigo: "", descricao: "", quantidade: 1, valorUnitario: 0, valorTotal: 0, produto_id: "", fator: 1 }] })}><Plus className="mr-1 h-4 w-4" />Item</Button>}
            </div>
            <p className="text-right font-medium">Total: {brl(edit.totais?.nota ?? total(edit))}</p>
            {edit.origem === "xml" && <AuditoriaEntradaNfe edit={edit} produtos={produtos} estabelecimentoId={ctx.estabelecimentoId} />}
          </div>}
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setEdit(null)}>Fechar</Button>
            {!somenteLeitura && <><Button variant="outline" onClick={() => salvar(false)}>Salvar rascunho</Button><Button onClick={() => salvar(true)}><CheckCircle2 className="mr-1 h-4 w-4" />Dar entrada no estoque</Button></>}
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={!!novoProd} onOpenChange={(o) => !o && setNovoProd(null)}>
        <DialogContent><DialogHeader><DialogTitle>Criar produto a partir da nota</DialogTitle></DialogHeader>
          {novoProd && <div className="grid gap-2 sm:grid-cols-2">
            <div className="sm:col-span-2"><Label>Nome</Label><Input value={novoProd.nome} onChange={(e) => setNovoProd({ ...novoProd, nome: e.target.value })} /></div>
            <div><Label>Código (SKU)</Label><Input value={novoProd.codigo} onChange={(e) => setNovoProd({ ...novoProd, codigo: e.target.value })} /></div>
            <div><Label>Unidade do estoque</Label><Input value={novoProd.unidade} onChange={(e) => setNovoProd({ ...novoProd, unidade: e.target.value.toUpperCase() })} placeholder="UN, KG, PCT…" /></div>
            <div><Label>NCM</Label><Input value={novoProd.ncm} onChange={(e) => setNovoProd({ ...novoProd, ncm: e.target.value })} /></div>
            <p className="text-xs text-muted-foreground sm:col-span-2">O produto é criado como matéria-prima e já fica vinculado a este fornecedor ao dar entrada. Complete o restante (fiscal, preços) depois em Produtos.</p>
          </div>}
          <DialogFooter><Button variant="outline" onClick={() => setNovoProd(null)}>Cancelar</Button><Button onClick={async () => {
            if (!novoProd.nome?.trim()) return toast.error("Informe o nome");
            if (!novoProd.unidade?.trim()) return toast.error("Informe a unidade");
            const r = await sb.from("produtos").insert({ estabelecimento_id: ctx.estabelecimentoId, nome: novoProd.nome.trim(), codigo: novoProd.codigo?.trim() || null, unidade: novoProd.unidade.trim(), ncm: soDig(novoProd.ncm) || null, ativo: true, materia_prima: true, comercializavel: false, produzido: false }).select("id").single();
            if (r.error) return toast.error(r.error.message);
            await onMudou(); setItem(novoProd.idx, { produto_id: r.data.id, fator: 1 }); setNovoProd(null); toast.success("Produto criado e vinculado ao item");
          }}>Criar e vincular</Button></DialogFooter>
        </DialogContent>
      </Dialog>
      <DeleteConfirmDialog open={!!excluir} onOpenChange={(o) => !o && setExcluir(null)} onConfirm={async () => { await sb.from("notas_fiscais").delete().eq("id", excluir.id); setExcluir(null); carregar(); }} title="Excluir nota" description="O rascunho da nota será excluído." />
    </div>
  );
}
