import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DeleteConfirmDialog } from "@/components/ui/delete-confirm-dialog";
import { ListChecks, Plus, Edit, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { FINALIDADES_NFE, OPERACOES } from "@/lib/fiscal/motorFiscal";
import { useContextoInterno } from "@/lib/estoque/contexto";

const sb = supabase as any;
const vazio = { nome: "", operacao_base: "venda", natureza_operacao: "", finalidade_nfe: 1, movimenta_estoque: true, gera_financeiro: true, ativo: true };
const SUGESTOES = [
  { nome: "Venda de produção própria", operacao_base: "venda_producao", natureza_operacao: "Venda de produção do estabelecimento", finalidade_nfe: 1, movimenta_estoque: true, gera_financeiro: true },
  { nome: "Venda de mercadoria de revenda", operacao_base: "venda", natureza_operacao: "Venda de mercadoria adquirida de terceiros", finalidade_nfe: 1, movimenta_estoque: true, gera_financeiro: true },
  { nome: "Bonificação", operacao_base: "bonificacao", natureza_operacao: "Remessa em bonificação", finalidade_nfe: 1, movimenta_estoque: true, gera_financeiro: false },
  { nome: "Remessa para conserto", operacao_base: "remessa_conserto", natureza_operacao: "Remessa para conserto", finalidade_nfe: 1, movimenta_estoque: false, gera_financeiro: false },
  { nome: "Devolução de compra", operacao_base: "devolucao_compra", natureza_operacao: "Devolução de compra", finalidade_nfe: 4, movimenta_estoque: true, gera_financeiro: false },
];

export default function TiposOperacao() {
  const ctx = useContextoInterno();
  const [lista, setLista] = useState<any[]>([]);
  const [form, setForm] = useState<any | null>(null);
  const [excluir, setExcluir] = useState<any | null>(null);
  const carregar = async () => {
    if (!ctx.estabelecimentoId) return;
    const { data } = await sb.from("fiscal_tipos_operacao").select("*").eq("estabelecimento_id", ctx.estabelecimentoId).order("nome");
    setLista(data ?? []);
  };
  useEffect(() => { carregar(); }, [ctx.estabelecimentoId]);
  const salvar = async () => {
    if (!form.nome.trim()) return toast.error("Informe o nome");
    const { id, created_at, updated_at, ...dados } = form;
    const corpo = { ...dados, nome: form.nome.trim(), estabelecimento_id: ctx.estabelecimentoId, updated_at: new Date().toISOString() };
    const r = id ? await sb.from("fiscal_tipos_operacao").update(corpo).eq("id", id) : await sb.from("fiscal_tipos_operacao").insert(corpo);
    if (r.error) return toast.error(r.error.message);
    toast.success("Tipo de operação salvo"); setForm(null); carregar();
  };
  const criarSugestoes = async () => {
    const r = await sb.from("fiscal_tipos_operacao").insert(SUGESTOES.map((s) => ({ ...s, estabelecimento_id: ctx.estabelecimentoId })));
    if (r.error) return toast.error(r.error.message);
    toast.success("Tipos sugeridos criados"); carregar();
  };
  const set = (k: string, v: unknown) => setForm({ ...form, [k]: v });
  return (
    <div className="space-y-4 p-3 sm:p-6">
      <div className="flex flex-wrap items-center gap-2">
        <ListChecks className="h-6 w-6 text-primary" /><h1 className="flex-1 text-xl font-semibold sm:text-2xl">Tipos de operação</h1>
        {!form && <Button onClick={() => setForm({ ...vazio })}><Plus className="mr-1 h-4 w-4" />Novo tipo</Button>}
      </div>
      <p className="text-sm text-muted-foreground">Cada tipo define o que a nota representa. O Systax usa a operação base para devolver CFOP e impostos; a natureza vai impressa na NF-e.</p>
      {form && <Card><CardContent className="grid gap-3 p-4 sm:grid-cols-2">
        <div className="space-y-1"><Label>Nome *</Label><Input value={form.nome} onChange={(e) => set("nome", e.target.value)} /></div>
        <div className="space-y-1"><Label>Operação base (para o Systax)</Label><Select value={form.operacao_base} onValueChange={(v) => set("operacao_base", v)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{OPERACOES.map((o) => <SelectItem key={o.valor} value={o.valor}>{o.rotulo}</SelectItem>)}</SelectContent></Select></div>
        <div className="space-y-1"><Label>Natureza da operação (impressa na nota)</Label><Input value={form.natureza_operacao ?? ""} onChange={(e) => set("natureza_operacao", e.target.value)} placeholder="Ex.: Venda de produção do estabelecimento" /></div>
        <div className="space-y-1"><Label>Finalidade da NF-e</Label><Select value={String(form.finalidade_nfe)} onValueChange={(v) => set("finalidade_nfe", Number(v))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{FINALIDADES_NFE.map((f) => <SelectItem key={f.valor} value={String(f.valor)}>{f.rotulo}</SelectItem>)}</SelectContent></Select></div>
        <div className="flex flex-wrap gap-5 sm:col-span-2">
          <label className="flex items-center gap-2 text-sm"><Switch checked={form.movimenta_estoque} onCheckedChange={(v) => set("movimenta_estoque", v)} />Movimenta estoque</label>
          <label className="flex items-center gap-2 text-sm"><Switch checked={form.gera_financeiro} onCheckedChange={(v) => set("gera_financeiro", v)} />Gera cobrança</label>
          <label className="flex items-center gap-2 text-sm"><Switch checked={form.ativo} onCheckedChange={(v) => set("ativo", v)} />Ativo</label>
        </div>
        <div className="flex gap-2 sm:col-span-2"><Button onClick={salvar}>Salvar</Button><Button variant="outline" onClick={() => setForm(null)}>Cancelar</Button></div>
      </CardContent></Card>}
      {!lista.length && !form && <Card><CardContent className="space-y-2 p-6 text-center text-sm text-muted-foreground"><p>Nenhum tipo cadastrado.</p><Button variant="outline" onClick={criarSugestoes}>Criar tipos sugeridos</Button></CardContent></Card>}
      <div className="grid gap-2 sm:grid-cols-2">
        {lista.map((t) => <Card key={t.id}><CardContent className="flex items-start gap-2 p-3 text-sm">
          <div className="min-w-0 flex-1">
            <p className="font-medium">{t.nome} {!t.ativo && <Badge variant="outline">Inativo</Badge>}</p>
            <p className="text-xs text-muted-foreground">{OPERACOES.find((o) => o.valor === t.operacao_base)?.rotulo} • {FINALIDADES_NFE.find((f) => f.valor === t.finalidade_nfe)?.rotulo}</p>
            <p className="text-xs text-muted-foreground">{t.movimenta_estoque ? "Baixa estoque" : "Sem estoque"} • {t.gera_financeiro ? "Gera cobrança" : "Sem cobrança"}</p>
          </div>
          <Button size="icon" variant="ghost" aria-label="Editar" onClick={() => setForm({ ...t })}><Edit className="h-4 w-4" /></Button>
          <Button size="icon" variant="ghost" aria-label="Excluir" onClick={() => setExcluir(t)}><Trash2 className="h-4 w-4" /></Button>
        </CardContent></Card>)}
      </div>
      <DeleteConfirmDialog open={!!excluir} onOpenChange={(o: boolean) => !o && setExcluir(null)} title="Excluir tipo de operação?" description={`"${excluir?.nome ?? ""}" será excluído. Pedidos e notas já feitos continuam como estão.`}
        onConfirm={async () => { const r = await sb.from("fiscal_tipos_operacao").delete().eq("id", excluir.id); if (r.error) toast.error(r.error.message); else toast.success("Excluído"); setExcluir(null); carregar(); }} />
    </div>
  );
}
