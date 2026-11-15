import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DeleteConfirmDialog } from "@/components/ui/delete-confirm-dialog";
import { Landmark, Plus, Pencil, Trash2, Wand2 } from "lucide-react";
import { toast } from "sonner";
import { OPERACOES, cfopPadrao, regrasSugeridas, type Destino } from "@/lib/fiscal/regrasFiscais";
import { REGIMES_TRIBUTARIOS, rotuloRegime } from "@/lib/fiscal/regimeTributario";
import { useContextoInterno } from "@/lib/estoque/contexto";

const sb = supabase as any;
const DESTINOS: [Destino, string][] = [["interna", "Dentro do estado"], ["interestadual", "Fora do estado"], ["exterior", "Exterior"]];
const vazia = { nome: "", operacao: "venda", destino: "interna", regime: "", ncm_prefixo: "", cfop: "5102", cst: "", aliq_icms: 0, aliq_ipi: 0, aliq_pis: 0, aliq_cofins: 0, ativo: true };

export default function RegrasFiscais() {
  const { estabelecimentoId } = useContextoInterno();
  const [lista, setLista] = useState<any[]>([]); const [form, setForm] = useState<any | null>(null); const [excluir, setExcluir] = useState<any | null>(null);
  const [regimeSug, setRegimeSug] = useState("simples_nacional");
  const carregar = async () => { if (!estabelecimentoId) return; const { data } = await sb.from("regras_fiscais").select("*").eq("estabelecimento_id", estabelecimentoId).order("operacao").order("destino"); setLista(data ?? []); };
  useEffect(() => { carregar(); }, [estabelecimentoId]);
  const salvar = async () => {
    if (!form.nome.trim() || !/^\d{4}$/.test(form.cfop)) return toast.error("Informe nome e CFOP com 4 dígitos");
    const dados = { ...form, regime: form.regime || null, ncm_prefixo: form.ncm_prefixo?.replace(/\D/g, "") || null, estabelecimento_id: estabelecimentoId, updated_at: new Date().toISOString() };
    for (const k of ["aliq_icms", "aliq_ipi", "aliq_pis", "aliq_cofins"]) dados[k] = Number(dados[k]) || 0;
    const r = form.id ? await sb.from("regras_fiscais").update(dados).eq("id", form.id) : await sb.from("regras_fiscais").insert(dados);
    if (r.error) return toast.error(r.error.message);
    toast.success("Regra salva"); setForm(null); carregar();
  };
  const criarSugeridas = async () => {
    const r = await sb.from("regras_fiscais").insert(regrasSugeridas(regimeSug).map((x) => ({ ...x, estabelecimento_id: estabelecimentoId })));
    if (r.error) return toast.error(r.error.message);
    toast.success("Regras sugeridas criadas — confira as alíquotas com seu contador"); carregar();
  };
  const rotOp = (v: string) => OPERACOES.find((o) => o.valor === v)?.rotulo ?? v;
  return (
    <div className="space-y-4 p-3 sm:p-6">
      <div className="flex items-center gap-2"><Landmark className="h-6 w-6 text-primary" /><h1 className="text-xl font-semibold sm:text-2xl">Regras fiscais</h1></div>
      <p className="text-sm text-muted-foreground">Definem CFOP, CST/CSOSN e alíquotas usadas no faturamento. Vale a regra mais específica: mesma operação e destino, regime da unidade emissora e o maior início de NCM. Sem regra, o sistema usa o CFOP padrão da operação sem impostos destacados.</p>
      <div className="flex flex-wrap items-center gap-2">
        <Button size="sm" onClick={() => setForm({ ...vazia })}><Plus className="mr-1 h-4 w-4" />Nova regra</Button>
        <Select value={regimeSug} onValueChange={setRegimeSug}><SelectTrigger className="w-full sm:w-56"><SelectValue /></SelectTrigger><SelectContent>{REGIMES_TRIBUTARIOS.map((r) => <SelectItem key={r.valor} value={r.valor}>{r.rotulo}</SelectItem>)}</SelectContent></Select>
        <Button size="sm" variant="outline" onClick={criarSugeridas}><Wand2 className="mr-1 h-4 w-4" />Criar regras sugeridas</Button>
      </div>
      {!lista.length && <p className="py-8 text-center text-sm text-muted-foreground">Nenhuma regra cadastrada.</p>}
      <div className="grid gap-2 sm:grid-cols-2">
        {lista.map((r) => (
          <Card key={r.id}><CardContent className="space-y-1 p-3 text-sm">
            <div className="flex items-start gap-2"><span className="min-w-0 flex-1 font-medium">{r.nome}</span>{!r.ativo && <Badge variant="outline">Inativa</Badge>}
              <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setForm({ ...r, regime: r.regime ?? "", ncm_prefixo: r.ncm_prefixo ?? "", cst: r.cst ?? "" })}><Pencil className="h-4 w-4" /></Button>
              <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setExcluir(r)}><Trash2 className="h-4 w-4" /></Button></div>
            <p className="text-xs text-muted-foreground">{rotOp(r.operacao)} • {DESTINOS.find((d) => d[0] === r.destino)?.[1]} • {r.regime ? rotuloRegime(r.regime) : "qualquer regime"}{r.ncm_prefixo ? ` • NCM ${r.ncm_prefixo}…` : ""}</p>
            <p>CFOP <b>{r.cfop}</b> • CST/CSOSN {r.cst || "—"} • ICMS {r.aliq_icms}% • IPI {r.aliq_ipi}% • PIS {r.aliq_pis}% • COFINS {r.aliq_cofins}%</p>
          </CardContent></Card>
        ))}
      </div>
      <Dialog open={!!form} onOpenChange={(o) => !o && setForm(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto"><DialogHeader><DialogTitle>{form?.id ? "Editar regra" : "Nova regra fiscal"}</DialogTitle></DialogHeader>
          {form && <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2"><Label>Nome</Label><Input value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} /></div>
            <div><Label>Operação</Label><Select value={form.operacao} onValueChange={(v) => setForm({ ...form, operacao: v, cfop: cfopPadrao(v, form.destino) })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{OPERACOES.map((o) => <SelectItem key={o.valor} value={o.valor}>{o.rotulo}</SelectItem>)}</SelectContent></Select></div>
            <div><Label>Destino</Label><Select value={form.destino} onValueChange={(v) => setForm({ ...form, destino: v, cfop: cfopPadrao(form.operacao, v as Destino) })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{DESTINOS.map(([v, t]) => <SelectItem key={v} value={v}>{t}</SelectItem>)}</SelectContent></Select></div>
            <div><Label>Regime</Label><Select value={form.regime || "qualquer"} onValueChange={(v) => setForm({ ...form, regime: v === "qualquer" ? "" : v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="qualquer">Qualquer</SelectItem>{REGIMES_TRIBUTARIOS.map((r) => <SelectItem key={r.valor} value={r.valor}>{r.rotulo}</SelectItem>)}</SelectContent></Select></div>
            <div><Label>Início do NCM (opcional)</Label><Input value={form.ncm_prefixo} onChange={(e) => setForm({ ...form, ncm_prefixo: e.target.value })} placeholder="ex.: 4818" /></div>
            <div><Label>CFOP</Label><Input value={form.cfop} onChange={(e) => setForm({ ...form, cfop: e.target.value.replace(/\D/g, "").slice(0, 4) })} /></div>
            <div><Label>CST / CSOSN</Label><Input value={form.cst} onChange={(e) => setForm({ ...form, cst: e.target.value.replace(/\D/g, "").slice(0, 3) })} placeholder="00, 60, 102…" /></div>
            {([["aliq_icms", "ICMS %"], ["aliq_ipi", "IPI %"], ["aliq_pis", "PIS %"], ["aliq_cofins", "COFINS %"]]).map(([k, t]) => (
              <div key={k}><Label>{t}</Label><Input type="number" step="0.01" value={form[k]} onChange={(e) => setForm({ ...form, [k]: e.target.value })} /></div>))}
            <label className="col-span-2 flex items-center gap-2"><Switch checked={form.ativo} onCheckedChange={(v) => setForm({ ...form, ativo: v })} />Regra ativa</label>
          </div>}
          <DialogFooter><Button variant="outline" onClick={() => setForm(null)}>Cancelar</Button><Button onClick={salvar}>Salvar</Button></DialogFooter>
        </DialogContent>
      </Dialog>
      <DeleteConfirmDialog open={!!excluir} onOpenChange={(o) => !o && setExcluir(null)} onConfirm={async () => { await sb.from("regras_fiscais").delete().eq("id", excluir.id); setExcluir(null); carregar(); }} title="Excluir regra fiscal" itemName={excluir?.nome} />
    </div>
  );
}
