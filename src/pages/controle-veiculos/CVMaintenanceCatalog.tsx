import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { GRUPOS_BIBLIOTECA, normalizarGrupo } from "@/lib/cv/gruposBiblioteca";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { BookOpen, Search, Plus, Pencil, Trash2, Loader2, ListChecks } from "lucide-react";
import { CVPageHeader, CVKpiCard } from "./CVPageHeader";
import ChecklistSaidaDialog from "./ChecklistSaidaDialog";
import { DeleteConfirmDialog } from "@/components/ui/delete-confirm-dialog";
import { listarCatalogo, CRITICIDADES, type CatalogItem } from "@/lib/cv/catalogo";
import { listarTiposVeiculoLogistica } from "@/lib/logistica/tiposVeiculo";
import { RESPONSAVEIS } from "@/lib/cv/checklistSaida";

const itemVazio = {
  codigo: "", tipo_veiculo: "", sistema: "", componente: "", acao: "",
  interval_principal: 10000, interval_days: 180, regra: "km ou dias",
  tol_principal: 500, tol_days: 15, criticidade: "Média",
  fabricante: "Genérico", observacoes: "", pecas: "", no_roteiro: true, ativo: true, uso_manutencao: true,
  checklist_responsaveis: [] as string[], checklist_selecionados: [] as string[], checklist_tipos: [] as string[],
};

const corCriticidade = (c: string) =>
  c === "Crítica" ? "border-destructive text-destructive"
  : c === "Alta" ? "border-destructive/60 text-destructive"
  : c === "Média" ? "border-primary/60 text-primary"
  : "border-muted-foreground/40 text-muted-foreground";

export default function CVMaintenanceCatalog() {
  const [itens, setItens] = useState<CatalogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [tipo, setTipo] = useState("todos");
  const [sistema, setSistema] = useState("todos");
  const [crit, setCrit] = useState("todas");
  const [somenteRoteiro, setSomenteRoteiro] = useState(false);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<any>(itemVazio);
  const [editing, setEditing] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [excluir, setExcluir] = useState<CatalogItem | null>(null);
  const [abaBiblioteca, setAbaBiblioteca] = useState("manutencao");
  const [tiposLogistica, setTiposLogistica] = useState<string[]>([]);

  const load = async () => {
    setLoading(true);
    try { setItens(await listarCatalogo(true)); }
    catch (e: any) { toast.error(e.message); }
    setLoading(false);
  };
  useEffect(() => {
    load();
    listarTiposVeiculoLogistica().then(setTiposLogistica).catch(() => {});
  }, []);

  // Somente tipos cadastrados nos veículos da Logística
  const tipos = useMemo(
    () => Array.from(new Set(tiposLogistica.filter(Boolean))).sort((a, b) => a.localeCompare(b, "pt-BR")),
    [tiposLogistica],
  );
  const sistemas = useMemo(
    () => Array.from(new Set([...itens.map(i => normalizarGrupo(i.sistema)), ...GRUPOS_BIBLIOTECA])).sort(),
    [itens, tipo],
  );

  const filtrados = itens.filter(i => {
    const texto = `${i.codigo ?? ""} ${i.componente} ${i.acao} ${i.sistema}`.toLowerCase();
    return (abaBiblioteca === "biblioteca" || i.uso_manutencao) && (!q || texto.includes(q.toLowerCase()))
      && (tipo === "todos" || i.tipo_veiculo === tipo || (!i.uso_manutencao && (!i.checklist_tipos.length || i.checklist_tipos.includes(tipo))))
      && (sistema === "todos" || normalizarGrupo(i.sistema) === sistema)
      && (crit === "todas" || i.criticidade === crit)
      && (!somenteRoteiro || i.no_roteiro);
  });

  const toggleRoteiro = async (i: CatalogItem, valor: boolean) => {
    setItens(prev => prev.map(x => x.id === i.id ? { ...x, no_roteiro: valor } : x));
    const { error } = await supabase.from("cv_maintenance_catalog").update({ no_roteiro: valor }).eq("id", i.id);
    if (error) { toast.error(error.message); load(); }
  };

  const marcarTodos = async (valor: boolean) => {
    const ids = filtrados.filter(i => i.uso_manutencao).map(i => i.id);
    if (!ids.length) return;
    const { error } = await supabase.from("cv_maintenance_catalog").update({ no_roteiro: valor }).in("id", ids);
    if (error) return toast.error(error.message);
    toast.success(`${ids.length} item(ns) ${valor ? "incluídos no" : "removidos do"} roteiro padrão`);
    load();
  };

  const abrirNovo = () => {
    setForm({ ...itemVazio, tipo_veiculo: tipo !== "todos" ? tipo : (tipos[0] ?? "") });
    setEditing(null); setOpen(true);
  };
  const abrirEdicao = (i: CatalogItem) => {
    setForm({
      uso_manutencao: i.uso_manutencao, checklist_responsaveis: i.checklist_responsaveis, checklist_selecionados: i.checklist_selecionados, checklist_tipos: i.checklist_tipos,
      codigo: i.codigo ?? "", tipo_veiculo: i.tipo_veiculo, sistema: normalizarGrupo(i.sistema), componente: i.componente,
      acao: i.acao, interval_principal: i.interval_principal ?? 0, interval_days: i.interval_days ?? 0,
      regra: i.regra, tol_principal: i.tol_principal, tol_days: i.tol_days, criticidade: i.criticidade,
      fabricante: i.fabricante ?? "", observacoes: i.observacoes ?? "", pecas: (i as any).pecas ?? "", no_roteiro: i.no_roteiro, ativo: i.ativo,
    });
    setEditing(i.id); setOpen(true);
  };

  const salvar = async () => {
    if ((form.uso_manutencao && !form.tipo_veiculo) || !form.componente || !form.acao) {
      return toast.error("Tipo de veículo, componente e ação são obrigatórios");
    }
    setSaving(true);
    const payload = {
      ...form,
      sistema: normalizarGrupo(form.sistema || "Geral"),
      tipo_veiculo: form.uso_manutencao ? form.tipo_veiculo : "Todos",
      no_roteiro: form.uso_manutencao && form.no_roteiro,
      checklist_selecionados: form.checklist_selecionados.filter((r: string) => form.checklist_responsaveis.includes(r)),
      interval_principal: Number(form.interval_principal) || null,
      interval_days: Number(form.interval_days) || null,
      tol_principal: Number(form.tol_principal) || 0,
      tol_days: Number(form.tol_days) || 0,
      codigo: form.codigo || null,
      pecas: form.pecas || null,
    };
    const { error } = editing
      ? await supabase.from("cv_maintenance_catalog").update(payload).eq("id", editing)
      : await supabase.from("cv_maintenance_catalog").insert(payload);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Item salvo"); setOpen(false); load();
  };

  const confirmarExclusao = async () => {
    if (!excluir) return;
    const { error } = await supabase.from("cv_maintenance_catalog").delete().eq("id", excluir.id);
    if (error) return toast.error(error.message);
    toast.success("Item excluído"); setExcluir(null); load();
  };

  const noRoteiro = itens.filter(i => i.no_roteiro).length;

  return (
    <div className="space-y-4">
      <CVPageHeader
        icon={BookOpen}
        title="Biblioteca de Manutenção e Check lists"
        subtitle="Manutenção preventiva e verificações de saída por grupo e responsável"
        actions={
          <div className="flex flex-wrap gap-2">
          <Button onClick={() => setAbaBiblioteca("checklist")} variant="outline">
            <ListChecks className="h-4 w-4 mr-1" />Check list de saída
          </Button>
          <Button onClick={abrirNovo} variant="outline">
            <Plus className="h-4 w-4 mr-1" />Novo item
          </Button>
          </div>
        }
      />

      <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
        <CVKpiCard label="Itens na biblioteca" value={itens.length} icon={BookOpen} tone="primary" />
        <CVKpiCard label="No roteiro padrão" value={noRoteiro} icon={ListChecks} tone="success" />
        <CVKpiCard label="Tipos de veículo" value={tipos.length} icon={ListChecks} tone="warning" />
        <CVKpiCard label="Resultado do filtro" value={filtrados.length} icon={Search} tone="primary" />
      </div>

      <Tabs value={abaBiblioteca} onValueChange={v => { setAbaBiblioteca(v); if (v !== "checklist") load(); }}>
        <TabsList className="h-auto flex flex-wrap justify-start">
          <TabsTrigger value="manutencao">Manutenção preventiva</TabsTrigger>
          <TabsTrigger value="checklist">Check list de saída</TabsTrigger>
          <TabsTrigger value="biblioteca">Todos os itens</TabsTrigger>
        </TabsList>
      </Tabs>
      {abaBiblioteca === "checklist" ? <ChecklistSaidaDialog embedded tipos={tipos} /> : <>
      <div>
        <div className="p-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <div className="relative lg:col-span-2">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Buscar componente, ação ou código..." className="pl-9" value={q} onChange={e => setQ(e.target.value)} />
          </div>
          <Select value={tipo} onValueChange={v => { setTipo(v); setSistema("todos"); }}>
            <SelectTrigger><SelectValue placeholder="Tipo de veículo" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos os tipos</SelectItem>
              {tipos.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={sistema} onValueChange={setSistema}>
            <SelectTrigger><SelectValue placeholder="Grupo" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos os grupos</SelectItem>
              {sistemas.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={crit} onValueChange={setCrit}>
            <SelectTrigger><SelectValue placeholder="Criticidade" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todas">Todas as criticidades</SelectItem>
              {CRITICIDADES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
          <div className="flex items-center gap-2 sm:col-span-2">
            <Switch checked={somenteRoteiro} onCheckedChange={setSomenteRoteiro} />
            <Label className="text-sm">Mostrar só o roteiro padrão</Label>
          </div>
          <div className="flex gap-2 lg:col-span-3 justify-end">
            <Button variant="outline" size="sm" onClick={() => marcarTodos(true)}>Incluir filtrados no roteiro</Button>
            <Button variant="outline" size="sm" onClick={() => marcarTodos(false)}>Remover filtrados</Button>
          </div>
        </div>
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" />Carregando...</p>
      ) : filtrados.length === 0 ? (
        <Card><CardContent className="py-16 text-center text-muted-foreground">Nenhum item encontrado.</CardContent></Card>
      ) : (
        <div className="space-y-2">
          {filtrados.map(i => (
            <Card key={i.id} className={i.no_roteiro ? "border-primary/40" : ""}>
              <CardContent className="p-3 flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-2 shrink-0">
                  <Switch disabled={!i.uso_manutencao} checked={i.no_roteiro} onCheckedChange={v => toggleRoteiro(i, v)} />
                  <span className="text-[11px] text-muted-foreground w-16">{!i.uso_manutencao ? "Check list" : i.no_roteiro ? "No roteiro" : "Fora"}</span>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold truncate">
                    {i.componente} — <span className="font-normal">{i.acao}</span>
                  </p>
                  <p className="text-xs text-muted-foreground truncate">
                    {i.uso_manutencao ? i.tipo_veiculo : "Check list de saída"} · {normalizarGrupo(i.sistema)}
                    {i.interval_principal ? ` · a cada ${i.interval_principal.toLocaleString("pt-BR")} ${i.regra.includes("horas") ? "h" : "km"}` : ""}
                    {i.interval_days ? ` · ou ${i.interval_days} dias` : ""}
                    {i.codigo ? ` · ${i.codigo}` : ""}
                  </p>
                </div>
                <Badge variant="outline" className={`shrink-0 ${corCriticidade(i.criticidade)}`}>{i.criticidade}</Badge>
                {!!i.checklist_responsaveis.length && <Badge variant="secondary">{i.checklist_responsaveis.map(r => RESPONSAVEIS.find(x => x.valor === r)?.rotulo ?? r).join(" / ")}</Badge>}
                {!i.ativo && <Badge variant="secondary" className="shrink-0">Inativo</Badge>}
                <div className="flex gap-1 shrink-0">
                  <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => abrirEdicao(i)}><Pencil className="h-3.5 w-3.5" /></Button>
                  <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive" onClick={() => setExcluir(i)}><Trash2 className="h-3.5 w-3.5" /></Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      </>}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing ? "Editar item da biblioteca" : "Novo item da biblioteca"}</DialogTitle></DialogHeader>
          <div className="space-y-3 border-b pb-3">
            <Label>Utilização do item</Label>
            <div className="flex items-center gap-2"><Switch checked={form.uso_manutencao} onCheckedChange={v => setForm({ ...form, uso_manutencao: v })} /><Label>Manutenção preventiva</Label></div>
            <div className="flex flex-wrap gap-4">{RESPONSAVEIS.map(({ valor: r, rotulo }) => <label key={r} className="flex gap-2 items-center text-sm"><Checkbox checked={form.checklist_responsaveis.includes(r)} onCheckedChange={v => setForm({ ...form, checklist_responsaveis: v ? [...form.checklist_responsaveis, r] : form.checklist_responsaveis.filter((x: string) => x !== r) })} />Check list do {rotulo.toLowerCase()}</label>)}</div>
            {!!form.checklist_responsaveis.length && <div><Label>Tipos no check list</Label><div className="flex flex-wrap gap-3 mt-2"><label className="flex items-center gap-2 text-sm"><Checkbox checked={!form.checklist_tipos.length} onCheckedChange={v => v && setForm({ ...form, checklist_tipos: [] })} />Todos</label>{tipos.map(t => <label key={t} className="flex items-center gap-2 text-sm"><Checkbox checked={form.checklist_tipos.includes(t)} onCheckedChange={v => setForm({ ...form, checklist_tipos: v ? [...form.checklist_tipos, t] : form.checklist_tipos.filter((x: string) => x !== t) })} />{t}</label>)}</div></div>}
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div><Label>Tipo de veículo *</Label>
              <Select disabled={!form.uso_manutencao} value={form.tipo_veiculo || ""} onValueChange={v => setForm({ ...form, tipo_veiculo: v })}>
                <SelectTrigger><SelectValue placeholder="Selecione o tipo" /></SelectTrigger>
                <SelectContent>
                  {!form.uso_manutencao && <SelectItem value="Todos">Todos</SelectItem>}
                  {tipos.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
              <p className="text-[11px] text-muted-foreground mt-1">Tipos do cadastro de Veículos da Logística.</p>
            </div>
            <div><Label>Grupo</Label><Select value={form.sistema || "Geral"} onValueChange={v => setForm({ ...form, sistema: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{sistemas.map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}</SelectContent></Select></div>
            <div><Label>Componente / item *</Label><Input value={form.componente} onChange={e => setForm({ ...form, componente: e.target.value })} /></div>
            <div><Label>Ação / verificação *</Label><Input value={form.acao} onChange={e => setForm({ ...form, acao: e.target.value })} placeholder="Trocar, Inspecionar..." /></div>
            <div><Label>Intervalo principal (km/horas)</Label><Input disabled={!form.uso_manutencao} type="number" value={form.interval_principal} onChange={e => setForm({ ...form, interval_principal: e.target.value })} /></div>
            <div><Label>Intervalo em dias</Label><Input disabled={!form.uso_manutencao} type="number" value={form.interval_days} onChange={e => setForm({ ...form, interval_days: e.target.value })} /></div>
            <div><Label>Tolerância principal</Label><Input disabled={!form.uso_manutencao} type="number" value={form.tol_principal} onChange={e => setForm({ ...form, tol_principal: e.target.value })} /></div>
            <div><Label>Tolerância em dias</Label><Input disabled={!form.uso_manutencao} type="number" value={form.tol_days} onChange={e => setForm({ ...form, tol_days: e.target.value })} /></div>
            <div>
              <Label>Regra de vencimento</Label>
              <Select value={form.regra} onValueChange={v => setForm({ ...form, regra: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="km ou dias">km ou dias</SelectItem>
                  <SelectItem value="horas ou dias">horas ou dias</SelectItem>
                  <SelectItem value="dias">dias</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Criticidade</Label>
              <Select value={form.criticidade} onValueChange={v => setForm({ ...form, criticidade: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{CRITICIDADES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Código</Label><Input value={form.codigo} onChange={e => setForm({ ...form, codigo: e.target.value })} /></div>
            <div><Label>Fabricante/modelo</Label><Input value={form.fabricante} onChange={e => setForm({ ...form, fabricante: e.target.value })} /></div>
            <div className="sm:col-span-2"><Label>Peças / insumos necessários</Label><Input value={form.pecas} onChange={e => setForm({ ...form, pecas: e.target.value })} placeholder="Ex.: FILTRO DE ÓLEO; ÓLEO 15W40 12L; JUNTA" /></div>
            <div className="sm:col-span-2"><Label>Observações</Label><Input value={form.observacoes} onChange={e => setForm({ ...form, observacoes: e.target.value })} /></div>
            <div className="flex items-center gap-2"><Switch disabled={!form.uso_manutencao} checked={form.no_roteiro} onCheckedChange={c => setForm({ ...form, no_roteiro: c })} /><Label>Faz parte do roteiro padrão</Label></div>
            <div className="flex items-center gap-2"><Switch checked={form.ativo} onCheckedChange={c => setForm({ ...form, ativo: c })} /><Label>Ativo</Label></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={salvar} disabled={saving}>{saving && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <DeleteConfirmDialog
        open={!!excluir}
        onOpenChange={o => { if (!o) setExcluir(null); }}
        onConfirm={confirmarExclusao}
        itemName={excluir ? `${excluir.componente} — ${excluir.acao}` : ""}
        description="Este item será removido da biblioteca de manutenção preventiva."
      />
    </div>
  );
}
