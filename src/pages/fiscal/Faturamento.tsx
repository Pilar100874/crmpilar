import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { FunctionsHttpError } from "@supabase/supabase-js";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Receipt, FileCheck2, Ban, Send, RefreshCw, FileText, FileCode } from "lucide-react";
import { toast } from "sonner";
import { OPERACOES, calcularImpostos, destinoOperacao, escolherRegra } from "@/lib/fiscal/regrasFiscais";
import { rotuloRegime } from "@/lib/fiscal/regimeTributario";
import { brl, dataBr, nomeEmpresa, qtd, useContextoInterno } from "@/lib/estoque/contexto";

const sb = supabase as any;

export default function Faturamento() {
  const ctx = useContextoInterno();
  const [pedidos, setPedidos] = useState<any[]>([]); const [notas, setNotas] = useState<any[]>([]);
  const [unidades, setUnidades] = useState<any[]>([]); const [regras, setRegras] = useState<any[]>([]);
  const [prep, setPrep] = useState<any | null>(null); const [cancelar, setCancelar] = useState<any | null>(null);
  const carregar = async () => {
    if (!ctx.estabelecimentoId) return;
    const [o, n, u, r] = await Promise.all([
      sb.from("orcamentos").select("id, created_at, valor_total, unidade_id, empresas(id, nome_fantasia, nome, cnpj, estado), orcamento_itens(produto_id, quantidade, preco_unitario, subtotal, produtos(nome, ncm, unidade))").eq("estabelecimento_id", ctx.estabelecimentoId).eq("etapa", "finalizado").order("created_at", { ascending: false }).limit(200),
      sb.from("notas_fiscais").select("*").eq("estabelecimento_id", ctx.estabelecimentoId).eq("tipo", "saida").order("created_at", { ascending: false }).limit(300),
      sb.from("unidades").select("id, nome, uf, cnpj, regime_tributario, certificado_valido_ate").eq("estabelecimento_id", ctx.estabelecimentoId).order("nome"),
      sb.from("regras_fiscais").select("*").eq("estabelecimento_id", ctx.estabelecimentoId).eq("ativo", true),
    ]);
    setPedidos(o.data ?? []); setNotas(n.data ?? []); setUnidades(u.data ?? []); setRegras(r.data ?? []);
  };
  useEffect(() => { carregar(); }, [ctx.estabelecimentoId]);

  const notaDo = (id: string) => notas.find((n) => n.orcamento_id === id && n.status !== "cancelada");
  const calcular = (p: any, unidadeId: string, operacao: string) => {
    const un = unidades.find((u) => u.id === unidadeId);
    const destino = destinoOperacao(un?.uf, p.empresas?.estado);
    const itens = (p.orcamento_itens ?? []).map((i: any) => {
      const regra = escolherRegra(regras, { operacao, destino, regime: un?.regime_tributario, ncm: i.produtos?.ncm });
      const valor = Number(i.subtotal) || Number(i.quantidade) * Number(i.preco_unitario);
      return { ...i, valor, regra, imp: calcularImpostos(valor, regra, un?.regime_tributario) };
    });
    return { un, destino, itens };
  };
  const faturar = async () => {
    const { un, itens } = calcular(prep.pedido, prep.unidadeId, prep.operacao);
    if (!un) return toast.error("Escolha a unidade emissora");
    if (!un.regime_tributario) return toast.error("Defina o regime tributário da unidade no cadastro de Unidades");
    const soma = (k: string) => itens.reduce((s: number, i: any) => s + i.imp[k], 0);
    const valorProdutos = itens.reduce((s: number, i: any) => s + i.valor, 0);
    const p = prep.pedido;
    const r = await sb.from("notas_fiscais").insert({ estabelecimento_id: ctx.estabelecimentoId, unidade_id: un.id, tipo: "saida", status: "pronta", origem: "orcamento", orcamento_id: p.id, empresa_id: p.empresas?.id ?? null,
      natureza_operacao: OPERACOES.find((o) => o.valor === prep.operacao)?.rotulo, participante_nome: nomeEmpresa(p.empresas), participante_cnpj: p.empresas?.cnpj, participante_uf: p.empresas?.estado,
      data_emissao: new Date().toISOString().slice(0, 10), valor_produtos: valorProdutos, valor_icms: soma("icms"), valor_ipi: soma("ipi"), valor_pis: soma("pis"), valor_cofins: soma("cofins"),
      valor_total: valorProdutos + soma("ipi"), usuario_id: ctx.usuarioId }).select("id").single();
    if (r.error) return toast.error(r.error.message);
    const ri = await sb.from("notas_fiscais_itens").insert(itens.map((i: any) => ({ nota_id: r.data.id, estabelecimento_id: ctx.estabelecimentoId, produto_id: i.produto_id, descricao: i.produtos?.nome ?? "Item", ncm: i.produtos?.ncm, unidade: i.produtos?.unidade,
      cfop: i.regra.cfop, cst: i.regra.cst, quantidade: i.quantidade, valor_unitario: i.preco_unitario, valor_total: i.valor,
      aliq_icms: i.regra.aliq_icms, valor_icms: i.imp.icms, aliq_ipi: i.regra.aliq_ipi, valor_ipi: i.imp.ipi, aliq_pis: i.regra.aliq_pis, valor_pis: i.imp.pis, aliq_cofins: i.regra.aliq_cofins, valor_cofins: i.imp.cofins })));
    if (ri.error) return toast.error(ri.error.message);
    const rm = await sb.from("estoque_movimentos").insert(itens.filter((i: any) => i.produto_id).map((i: any) => ({ estabelecimento_id: ctx.estabelecimentoId, unidade_id: un.id, produto_id: i.produto_id, tipo: "saida", origem: "venda", quantidade: Number(i.quantidade), nota_fiscal_id: r.data.id, documento: "Faturamento", usuario_id: ctx.usuarioId })));
    if (rm.error) toast.error("Nota criada, mas a baixa do estoque falhou: " + rm.error.message); else toast.success("Pedido faturado e estoque baixado");
    setPrep(null); carregar();
  };
  const confirmarCancelamento = async () => {
    const n = cancelar;
    if (n.status === "emitida") {
      if (justificativa.trim().length < 15) return toast.error("A justificativa precisa ter pelo menos 15 caracteres");
      try { await chamar({ acao: "cancelar", nota_id: n.id, justificativa: justificativa.trim() }); } catch (e: any) { return toast.error(e.message); }
    }
    const { data: movs } = await sb.from("estoque_movimentos").select("produto_id, quantidade").eq("nota_fiscal_id", n.id).eq("tipo", "saida");
    await sb.from("notas_fiscais").update({ status: "cancelada", updated_at: new Date().toISOString() }).eq("id", n.id);
    if (movs?.length) await sb.from("estoque_movimentos").insert(movs.map((m: any) => ({ estabelecimento_id: ctx.estabelecimentoId, produto_id: m.produto_id, tipo: "entrada", origem: "devolucao", quantidade: m.quantidade, nota_fiscal_id: n.id, documento: "Cancelamento do faturamento", usuario_id: ctx.usuarioId })));
    toast.success("Faturamento cancelado e estoque devolvido"); setCancelar(null); carregar();
  };
  const [ocupado, setOcupado] = useState<string | null>(null);
  const [justificativa, setJustificativa] = useState("");
  const chamar = async (body: any) => {
    const { data, error } = await supabase.functions.invoke("nfe-focus", { body });
    if (error) {
      let msg = error.message;
      if (error instanceof FunctionsHttpError) { try { const j = await error.context.json(); msg = j.error + (j.detalhes ? ` — ${typeof j.detalhes === "string" ? j.detalhes : JSON.stringify(j.detalhes)}` : ""); } catch { /* corpo não JSON */ } }
      throw new Error(msg);
    }
    return data;
  };
  const consultar = async (n: any, silencioso = false) => {
    try { const r = await chamar({ acao: "consultar", nota_id: n.id }); if (!silencioso) toast.info(`Situação: ${r.status_sefaz}${r.mensagem_sefaz ? ` — ${r.mensagem_sefaz}` : ""}`); await carregar(); return r.status_sefaz; }
    catch (e: any) { if (!silencioso) toast.error(e.message); return null; }
  };
  const emitir = async (n: any) => {
    setOcupado(n.id);
    try {
      await chamar({ acao: "emitir", nota_id: n.id });
      toast.info("Nota enviada à SEFAZ, aguardando autorização…");
      for (let i = 0; i < 6; i++) {
        await new Promise((r) => setTimeout(r, 4000));
        const st = await consultar(n, true);
        if (st === "autorizado") { toast.success("NF-e autorizada"); break; }
        if (st && st.startsWith("erro")) { toast.error("SEFAZ rejeitou a nota — veja a mensagem no pedido"); break; }
      }
    } catch (e: any) { toast.error(e.message); }
    setOcupado(null); carregar();
  };
  const baixar = async (n: any, tipo: "xml" | "danfe") => {
    const { data: { session } } = await supabase.auth.getSession();
    const resp = await fetch(`https://${import.meta.env.VITE_SUPABASE_PROJECT_ID}.supabase.co/functions/v1/nfe-focus`, { method: "POST", headers: { Authorization: `Bearer ${session?.access_token}`, apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY, "Content-Type": "application/json" }, body: JSON.stringify({ acao: "arquivo", nota_id: n.id, tipo }) });
    if (!resp.ok) return toast.error("Arquivo indisponível");
    const a = document.createElement("a"); a.href = URL.createObjectURL(await resp.blob()); a.download = `NFe-${n.numero || n.id}.${tipo === "danfe" ? "pdf" : "xml"}`; a.click();
  };
  const calc = prep ? calcular(prep.pedido, prep.unidadeId, prep.operacao) : null;
  return (
    <div className="space-y-4 p-3 sm:p-6">
      <div className="flex items-center gap-2"><Receipt className="h-6 w-6 text-primary" /><h1 className="text-xl font-semibold sm:text-2xl">Faturamento</h1></div>
      <p className="text-sm text-muted-foreground">Pedidos finalizados viram notas de saída com CFOP e impostos pelas regras fiscais, e o estoque é baixado. Depois de faturar, use "Emitir NF-e" para transmitir à SEFAZ pelo Focus NFe e baixar o DANFE e o XML autorizado. O CNPJ da unidade precisa estar cadastrado no Focus NFe com o certificado digital.</p>
      {!pedidos.length && <p className="py-8 text-center text-sm text-muted-foreground">Nenhum pedido finalizado.</p>}
      <div className="space-y-2">
        {pedidos.map((p) => { const n = notaDo(p.id); return (
          <Card key={p.id}><CardContent className="flex flex-wrap items-center gap-2 p-3 text-sm">
            <span className="min-w-0 flex-1"><b>{nomeEmpresa(p.empresas)}</b> <span className="text-xs text-muted-foreground">{dataBr(p.created_at)} • {(p.orcamento_itens ?? []).length} item(ns)</span></span>
            <span>{brl(p.valor_total)}</span>
            {n ? <>
              <Badge variant={n.status === "emitida" ? "default" : "outline"}>{n.status === "emitida" ? `NF-e ${n.numero} autorizada${n.ambiente === "homologacao" ? " (teste)" : ""}` : n.status_sefaz ? `SEFAZ: ${n.status_sefaz}` : "Faturado — falta emitir"}</Badge>
              {n.status !== "emitida" && <Button size="sm" disabled={ocupado === n.id} onClick={() => emitir(n)}><Send className="mr-1 h-4 w-4" />{ocupado === n.id ? "Emitindo…" : "Emitir NF-e"}</Button>}
              {n.ref_externa && <Button size="sm" variant="outline" onClick={() => consultar(n)}><RefreshCw className="mr-1 h-4 w-4" />Situação</Button>}
              {n.status === "emitida" && <><Button size="sm" variant="outline" onClick={() => baixar(n, "danfe")}><FileText className="mr-1 h-4 w-4" />DANFE</Button><Button size="sm" variant="outline" onClick={() => baixar(n, "xml")}><FileCode className="mr-1 h-4 w-4" />XML</Button></>}
              <Button size="sm" variant="outline" onClick={() => { setJustificativa(""); setCancelar(n); }}><Ban className="mr-1 h-4 w-4" />Cancelar</Button>
              {n.mensagem_sefaz && n.status !== "emitida" && <p className="w-full text-xs text-destructive">{n.mensagem_sefaz}</p>}
            </>
              : <Button size="sm" onClick={() => setPrep({ pedido: p, unidadeId: p.unidade_id ?? unidades[0]?.id ?? "", operacao: "venda" })}><FileCheck2 className="mr-1 h-4 w-4" />Faturar</Button>}
          </CardContent></Card>); })}
      </div>
      <Dialog open={!!prep} onOpenChange={(o) => !o && setPrep(null)}>
        <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto"><DialogHeader><DialogTitle>Faturar pedido — {nomeEmpresa(prep?.pedido?.empresas)}</DialogTitle></DialogHeader>
          {prep && calc && <div className="space-y-3">
            <div className="grid gap-2 sm:grid-cols-2">
              <div><Label>Unidade emissora</Label><Select value={prep.unidadeId} onValueChange={(v) => setPrep({ ...prep, unidadeId: v })}><SelectTrigger><SelectValue placeholder="Escolha" /></SelectTrigger><SelectContent>{unidades.map((u) => <SelectItem key={u.id} value={u.id}>{u.nome}{u.uf ? ` (${u.uf})` : ""}</SelectItem>)}</SelectContent></Select></div>
              <div><Label>Operação</Label><Select value={prep.operacao} onValueChange={(v) => setPrep({ ...prep, operacao: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{OPERACOES.filter((o) => !o.valor.startsWith("compra")).map((o) => <SelectItem key={o.valor} value={o.valor}>{o.rotulo}</SelectItem>)}</SelectContent></Select></div>
            </div>
            <p className="text-xs text-muted-foreground">{calc.un?.regime_tributario ? rotuloRegime(calc.un.regime_tributario) : "Unidade sem regime tributário"} • {calc.destino === "interna" ? "dentro do estado" : calc.destino === "interestadual" ? "fora do estado" : "exterior"}{!prep.pedido.empresas?.estado ? " (cliente sem UF cadastrada)" : ""}</p>
            {calc.itens.map((i: any, k: number) => (
              <Card key={k}><CardContent className="p-2.5 text-sm">
                <p className="font-medium">{i.produtos?.nome} — {qtd(i.quantidade)} {i.produtos?.unidade} • {brl(i.valor)}</p>
                <p className="text-xs text-muted-foreground">Regra: {i.regra.nome} • CFOP {i.regra.cfop} • CST/CSOSN {i.regra.cst || "—"} • NCM {i.produtos?.ncm || "não cadastrado"}</p>
                <p className="text-xs">ICMS {brl(i.imp.icms)} • IPI {brl(i.imp.ipi)} • PIS {brl(i.imp.pis)} • COFINS {brl(i.imp.cofins)}</p>
              </CardContent></Card>))}
            <p className="text-right font-medium">Total da nota: {brl(calc.itens.reduce((s: number, i: any) => s + i.imp.total, 0))}</p>
          </div>}
          <DialogFooter><Button variant="outline" onClick={() => setPrep(null)}>Cancelar</Button><Button onClick={faturar}>Faturar e baixar estoque</Button></DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={!!cancelar} onOpenChange={(o) => !o && setCancelar(null)}>
        <DialogContent><DialogHeader><DialogTitle>Cancelar faturamento?</DialogTitle></DialogHeader><p className="text-sm">{cancelar?.status === "emitida" ? "A NF-e será cancelada na SEFAZ (prazo legal de 24 horas na maioria dos estados) e os itens voltam para o estoque." : "O faturamento será cancelado e os itens voltam para o estoque."}</p>
          {cancelar?.status === "emitida" && <div><Label>Justificativa (mínimo 15 caracteres)</Label><Textarea value={justificativa} onChange={(e) => setJustificativa(e.target.value)} /></div>}
          <DialogFooter><Button variant="outline" onClick={() => setCancelar(null)}>Voltar</Button><Button variant="destructive" onClick={confirmarCancelamento}>Cancelar faturamento</Button></DialogFooter></DialogContent>
      </Dialog>
    </div>
  );
}
