import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { FileDown, Loader2, Plus, Sparkles } from "lucide-react";
import { RESPONSAVEIS, gerarPdfChecklist, itensSugeridos, listarChecklist, type Responsavel } from "@/lib/cv/checklistSaida";
import { listarCatalogo, type CatalogItem } from "@/lib/cv/catalogo";
import { GRUPOS_BIBLIOTECA, normalizarGrupo, disponivelNoChecklist, selecionarResponsavel } from "@/lib/cv/gruposBiblioteca";

interface Props { open?: boolean; onOpenChange?: (v: boolean) => void; tipos: string[]; embedded?: boolean }

export default function ChecklistSaidaDialog({ open = true, onOpenChange, tipos, embedded = false }: Props) {
  const [itens, setItens] = useState<CatalogItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [aba, setAba] = useState<Responsavel>("motorista");
  const [grupo, setGrupo] = useState("todos");
  const [tipo, setTipo] = useState("todos");
  const [busca, setBusca] = useState("");
  const [novo, setNovo] = useState({ grupo: "Geral", item: "" });
  const load = async () => {
    setLoading(true);
    try { setItens(await listarCatalogo(true)); } catch (e: any) { toast.error(e.message); }
    setLoading(false);
  };
  useEffect(() => { if (open) load(); }, [open]);
  const grupos = useMemo(() => Array.from(new Set([...GRUPOS_BIBLIOTECA, ...itens.map(i => normalizarGrupo(i.sistema))])).sort(), [itens]);
  const disponiveis = itens.filter(i => disponivelNoChecklist(i, aba, grupo, tipo)
    && `${i.componente} ${i.acao}`.toLowerCase().includes(busca.toLowerCase()));
  const selecionados = itens.filter(i => i.ativo && i.checklist_selecionados.includes(aba));

  const carregarSugestoes = async () => {
    setSaving(true);
    try {
      const existentes = new Set(itens.flatMap(i => i.checklist_responsaveis.map(r => `${r}|${i.componente}`)));
      const novos = itensSugeridos().filter(i => !existentes.has(`${i.responsavel}|${i.item}`));
      if (!novos.length) { toast.info("Todos os itens sugeridos já estão cadastrados"); return; }
      const { error } = await supabase.from("cv_maintenance_catalog").insert(novos.map(i => ({
        tipo_veiculo: "Todos", sistema: i.categoria, componente: i.item, acao: "Verificar antes da saída",
        uso_manutencao: false, no_roteiro: false, checklist_responsaveis: [i.responsavel],
        checklist_selecionados: [i.responsavel], checklist_tipos: i.tipos_veiculo, checklist_ordem: i.ordem,
      })));
      if (error) throw error;
      toast.success(`${novos.length} itens adicionados aos check lists`); await load();
    } catch (e: any) { toast.error(e.message); } finally { setSaving(false); }
  };
  const adicionar = async () => {
    if (!novo.item.trim()) return toast.error("Informe o item");
    setSaving(true);
    const { error } = await supabase.from("cv_maintenance_catalog").insert({
      tipo_veiculo: "Todos", sistema: novo.grupo, componente: novo.item.trim(), acao: "Verificar antes da saída",
      uso_manutencao: false, no_roteiro: false, checklist_responsaveis: [aba], checklist_selecionados: [aba],
      checklist_tipos: tipo === "todos" ? [] : [tipo], checklist_ordem: itens.length,
    });
    setSaving(false);
    if (error) return toast.error(error.message);
    setNovo({ ...novo, item: "" }); await load();
  };
  const selecionar = async (i: CatalogItem, valor: boolean) => {
    setSaving(true);
    const prox = selecionarResponsavel(i, aba, valor);
    const { error } = await supabase.from("cv_maintenance_catalog").update({ checklist_selecionados: prox }).eq("id", i.id);
    setSaving(false);
    if (error) return toast.error(error.message);
    setItens(prev => prev.map(x => x.id === i.id ? { ...x, checklist_selecionados: prox } : x));
  };
  const conteudo = <div className="min-w-0 space-y-4">
    <div className="flex flex-wrap items-center justify-between gap-2">
      <Tabs value={aba} onValueChange={v => setAba(v as Responsavel)}>
        <TabsList>{RESPONSAVEIS.map(r => <TabsTrigger key={r.valor} value={r.valor}>{r.rotulo} ({itens.filter(i => i.ativo && i.checklist_selecionados.includes(r.valor)).length})</TabsTrigger>)}</TabsList>
      </Tabs>
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" onClick={carregarSugestoes} disabled={saving}><Sparkles className="h-4 w-4 mr-1" />Adicionar sugestões</Button>
        <Button disabled={saving || !itens.some(i => i.checklist_selecionados.length) || !tipos.length} onClick={async () => {
          try { gerarPdfChecklist(await listarChecklist(), tipos); } catch (e: any) { toast.error(e.message); }
        }}><FileDown className="h-4 w-4 mr-1" />Gerar PDF para imprimir</Button>
      </div>
    </div>
    <div className="grid gap-3 sm:grid-cols-3">
      <div><Label>Grupo</Label><Select value={grupo} onValueChange={setGrupo}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="todos">Todos os grupos</SelectItem>{grupos.map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}</SelectContent></Select></div>
      <div><Label>Tipo de veículo</Label><Select value={tipo} onValueChange={setTipo}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="todos">Todos os tipos</SelectItem>{tipos.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent></Select></div>
      <div><Label htmlFor="busca-checklist">Buscar item</Label><Input id="busca-checklist" value={busca} onChange={e => setBusca(e.target.value)} placeholder="Nome do item" /></div>
    </div>
    {!tipos.length && <p className="text-sm text-destructive">Nenhum tipo de veículo cadastrado para impressão.</p>}
    {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <div className="grid gap-5 lg:grid-cols-2">
      <section className="min-w-0"><h3 className="font-semibold mb-2">Itens disponíveis ({disponiveis.length})</h3>
        <div className="divide-y border rounded-md max-h-[460px] overflow-y-auto">{disponiveis.map(i => <label key={i.id} className="flex gap-3 p-3 items-start cursor-pointer">
          <Checkbox aria-label={`Incluir ${i.componente}`} checked={i.checklist_selecionados.includes(aba)} disabled={saving} onCheckedChange={v => selecionar(i, v === true)} />
          <div className="min-w-0 text-sm break-words"><span className="block">{i.componente}{i.uso_manutencao ? ` — ${i.acao}` : ""}</span><Badge variant="outline" className="mt-1">{normalizarGrupo(i.sistema)}</Badge><span className="block text-xs text-muted-foreground mt-1">{i.checklist_tipos.length ? i.checklist_tipos.join(", ") : "Todos os tipos de veículo"}</span></div>
        </label>)}{!disponiveis.length && <p className="p-4 text-sm text-muted-foreground">Nenhum item para estes filtros.</p>}</div>
      </section>
      <section className="min-w-0"><h3 className="font-semibold mb-2">Check list selecionado ({selecionados.length})</h3>
        <div className="divide-y border rounded-md max-h-[460px] overflow-y-auto">{selecionados.map(i => <div key={i.id} className="p-3 flex gap-2 items-start"><div className="flex-1 min-w-0 text-sm break-words">{i.componente}<span className="block text-xs text-muted-foreground">{normalizarGrupo(i.sistema)}</span></div><Button aria-label={`Remover ${i.componente} do check list`} title="Retirar do check list" size="sm" variant="ghost" disabled={saving} onClick={() => selecionar(i, false)}>Retirar</Button></div>)}{!selecionados.length && <p className="p-4 text-sm text-muted-foreground">Nenhum item selecionado.</p>}</div>
      </section>
    </div>}
    <section className="border-t pt-4"><h3 className="font-semibold mb-2">Novo item do check list</h3><div className="grid gap-2 sm:grid-cols-[180px_1fr_auto]">
      <Select value={novo.grupo} onValueChange={g => setNovo({ ...novo, grupo: g })}><SelectTrigger aria-label="Grupo do novo item"><SelectValue /></SelectTrigger><SelectContent>{grupos.map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}</SelectContent></Select>
      <Input aria-label="Item a verificar" placeholder="Item a verificar" value={novo.item} onChange={e => setNovo({ ...novo, item: e.target.value })} />
      <Button disabled={saving} onClick={adicionar}><Plus className="h-4 w-4 mr-1" />Adicionar</Button>
    </div></section>
  </div>;
  if (embedded) return conteudo;
  return <Dialog open={open} onOpenChange={onOpenChange}><DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto"><DialogHeader><DialogTitle>Check list diário de saída de veículos</DialogTitle></DialogHeader>{conteudo}<DialogFooter><Button variant="outline" onClick={() => onOpenChange?.(false)}>Fechar</Button></DialogFooter></DialogContent></Dialog>;
}
