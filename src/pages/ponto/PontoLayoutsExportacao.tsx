import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { usePontoEmpresa } from "./usePontoEmpresa";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { DeleteConfirmDialog } from "@/components/ui/delete-confirm-dialog";
import { Badge } from "@/components/ui/badge";
import { Plus, Pencil, Trash2, FileCog, Sparkles } from "lucide-react";
import { toast } from "sonner";

// Campos disponíveis (vindos do espelho diário / banco de horas)
const CAMPOS = [
  { value: "horas_extras_1", label: "Total de horas extras 1" },
  { value: "horas_extras_2", label: "Total de horas extras 2" },
  { value: "horas_noturnas", label: "Total de horas noturnas" },
  { value: "horas_atraso", label: "Total de horas em atraso" },
  { value: "dias_falta", label: "Total de dias com falta" },
  { value: "desconto_dsr_dias", label: "Desconto DSR (Dias)" },
  { value: "desconto_dsr_horas", label: "Desconto DSR (Horas)" },
  { value: "abono_horas", label: "Abono em horas" },
  { value: "banco_horas_credito", label: "Banco de horas — crédito" },
  { value: "banco_horas_debito", label: "Banco de horas — débito" },
  { value: "adicional_periculosidade", label: "Adicional periculosidade" },
];

const SOFTWARES = [
  { value: "dominio_layout1", label: "Domínio - Layout 1" },
  { value: "dominio_layout2", label: "Domínio - Layout 2" },
  { value: "sage", label: "Sage" },
  { value: "senior", label: "Senior" },
  { value: "folhamatic", label: "Folhamatic" },
];

const FILTROS = [
  { value: "nenhum", label: "Nenhum filtro" },
  { value: "fechamento", label: "Número do fechamento" },
  { value: "departamento", label: "Departamento" },
  { value: "filial", label: "Filial" },
];

type Evento = { evento: string; campo: string };
type Layout = {
  id?: string;
  empresa_id: string;
  software: string;
  descricao: string;
  tamanho_matricula: number;
  incluir_dias_falta: boolean;
  periodo_inicio: string | null;
  periodo_fim: string | null;
  formato_horas: string;
  filtrar_por: string;
  filtro_fechamento: string | null;
  desconsiderar_ignoradas_bh: boolean;
  considerar_abono_parcial: boolean;
  considerar_suspensao: boolean;
  considerar_banco_horas: boolean;
  considerar_comissionistas: boolean;
  token_integracao: string | null;
  eventos: Evento[];
  ativo: boolean;
};

const novoLayout = (empresa_id: string): Layout => ({
  empresa_id,
  software: "dominio_layout1",
  descricao: "",
  tamanho_matricula: 10,
  incluir_dias_falta: true,
  periodo_inicio: null,
  periodo_fim: null,
  formato_horas: "sexagesimal",
  filtrar_por: "nenhum",
  filtro_fechamento: null,
  desconsiderar_ignoradas_bh: true,
  considerar_abono_parcial: false,
  considerar_suspensao: true,
  considerar_banco_horas: true,
  considerar_comissionistas: true,
  token_integracao: null,
  eventos: [],
  ativo: true,
});

const PRESET_ADICIONAL_50_100: Layout = {
  ...novoLayout(""),
  software: "dominio_layout1",
  descricao: "Adicional 50/100% (Motorista)",
  filtrar_por: "nenhum",
  considerar_abono_parcial: false,
  eventos: [
    { evento: "150", campo: "horas_extras_1" },
    { evento: "200", campo: "horas_extras_2" },
    { evento: "25", campo: "horas_noturnas" },
    { evento: "8069", campo: "horas_atraso" },
    { evento: "8792", campo: "dias_falta" },
    { evento: "8794", campo: "desconto_dsr_dias" },
  ],
};

const PRESET_ADICIONAL_60_100: Layout = {
  ...novoLayout(""),
  software: "dominio_layout1",
  descricao: "Adicional 60/100% (Geral)",
  filtrar_por: "fechamento",
  considerar_abono_parcial: false,
  eventos: [
    { evento: "151", campo: "horas_extras_1" },
    { evento: "200", campo: "horas_extras_2" },
    { evento: "25", campo: "horas_noturnas" },
    { evento: "8069", campo: "horas_atraso" },
    { evento: "8792", campo: "dias_falta" },
    { evento: "8794", campo: "desconto_dsr_dias" },
  ],
};

export default function PontoLayoutsExportacao() {
  const { empresaId } = usePontoEmpresa();
  const [list, setList] = useState<Layout[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Layout | null>(null);
  const [delId, setDelId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    if (!empresaId) return;
    const { data, error } = await supabase
      .from("ponto_export_layouts")
      .select("*")
      .eq("empresa_id", empresaId)
      .order("descricao");
    if (error) return toast.error(error.message);
    setList((data || []).map((l: any) => ({ ...l, eventos: l.eventos || [] })));
  };

  useEffect(() => { load(); }, [empresaId]);

  const openNew = () => { if (!empresaId) return; setEditing(novoLayout(empresaId)); setOpen(true); };
  const openEdit = (l: Layout) => { setEditing({ ...l, eventos: [...(l.eventos || [])] }); setOpen(true); };

  const criarPresets = async () => {
    if (!empresaId) return;
    setLoading(true);
    try {
      const presets = [
        { ...PRESET_ADICIONAL_50_100, empresa_id: empresaId },
        { ...PRESET_ADICIONAL_60_100, empresa_id: empresaId },
      ];
      const { error } = await supabase.from("ponto_export_layouts").insert(presets as any);
      if (error) throw error;
      toast.success("Layouts padrão criados");
      load();
    } catch (e: any) { toast.error(e.message); }
    finally { setLoading(false); }
  };

  const save = async () => {
    if (!editing) return;
    if (!editing.descricao.trim()) return toast.error("Descrição obrigatória");
    setLoading(true);
    try {
      const payload: any = { ...editing };
      if (!payload.id) {
        const { error } = await supabase.from("ponto_export_layouts").insert(payload);
        if (error) throw error;
      } else {
        const { id, created_at, updated_at, ...upd } = payload as any;
        const { error } = await supabase.from("ponto_export_layouts").update(upd).eq("id", id);
        if (error) throw error;
      }
      toast.success("Layout salvo");
      setOpen(false); setEditing(null); load();
    } catch (e: any) { toast.error(e.message); }
    finally { setLoading(false); }
  };

  const remove = async () => {
    if (!delId) return;
    const { error } = await supabase.from("ponto_export_layouts").delete().eq("id", delId);
    if (error) return toast.error(error.message);
    toast.success("Layout removido");
    setDelId(null); load();
  };

  const addEvento = () => editing && setEditing({ ...editing, eventos: [...editing.eventos, { evento: "", campo: "" }] });
  const updEvento = (i: number, k: keyof Evento, v: string) => {
    if (!editing) return;
    const next = [...editing.eventos]; next[i] = { ...next[i], [k]: v };
    setEditing({ ...editing, eventos: next });
  };
  const delEvento = (i: number) => editing && setEditing({ ...editing, eventos: editing.eventos.filter((_, j) => j !== i) });

  if (!empresaId) {
    return <div className="p-6 text-sm text-muted-foreground">Selecione uma empresa para gerenciar os layouts de exportação.</div>;
  }

  return (
    <div className="space-y-4 p-1 sm:p-2">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div>
          <h2 className="text-xl font-semibold flex items-center gap-2"><FileCog className="w-5 h-5" /> Layouts de Exportação</h2>
          <p className="text-sm text-muted-foreground">Configure os eventos/rubricas usados na geração do arquivo da folha (Domínio, Sage, Senior etc.).</p>
        </div>
        <div className="flex gap-2">
          {list.length === 0 && (
            <Button variant="outline" onClick={criarPresets} disabled={loading}>
              <Sparkles className="w-4 h-4 mr-2" /> Criar 2 layouts padrão
            </Button>
          )}
          <Button onClick={openNew}><Plus className="w-4 h-4 mr-2" /> Novo layout</Button>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        {list.map((l) => (
          <Card key={l.id} className="hover:shadow-md transition-shadow">
            <CardHeader className="pb-2">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <CardTitle className="text-base">{l.descricao}</CardTitle>
                  <div className="flex gap-2 mt-1 flex-wrap">
                    <Badge variant="outline">{SOFTWARES.find((s) => s.value === l.software)?.label || l.software}</Badge>
                    <Badge variant="secondary">{l.formato_horas}</Badge>
                    <Badge variant="secondary">Matrícula: {l.tamanho_matricula}</Badge>
                    {!l.ativo && <Badge variant="destructive">Inativo</Badge>}
                  </div>
                </div>
                <div className="flex gap-1">
                  <Button size="icon" variant="ghost" onClick={() => openEdit(l)}><Pencil className="w-4 h-4" /></Button>
                  <Button size="icon" variant="ghost" onClick={() => setDelId(l.id!)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-2 text-sm">
              <div className="text-xs text-muted-foreground mb-1">{(l.eventos || []).length} evento(s) configurado(s)</div>
              <div className="flex flex-wrap gap-1">
                {(l.eventos || []).slice(0, 6).map((e, i) => (
                  <Badge key={i} variant="outline" className="text-xs">{e.evento} → {CAMPOS.find((c) => c.value === e.campo)?.label || e.campo}</Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
        {list.length === 0 && (
          <Card className="md:col-span-2"><CardContent className="py-12 text-center text-sm text-muted-foreground">
            Nenhum layout cadastrado. Clique em <strong>Criar 2 layouts padrão</strong> para começar com os modelos Adicional 50/100% e 60/100%.
          </CardContent></Card>
        )}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing?.id ? "Editar layout" : "Novo layout"}</DialogTitle></DialogHeader>
          {editing && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="md:col-span-2">
                  <Label>Software *</Label>
                  <Select value={editing.software} onValueChange={(v) => setEditing({ ...editing, software: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{SOFTWARES.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Tamanho da matrícula *</Label>
                  <Input type="number" value={editing.tamanho_matricula} onChange={(e) => setEditing({ ...editing, tamanho_matricula: Number(e.target.value) || 10 })} />
                </div>
                <div className="md:col-span-2">
                  <Label>Descrição *</Label>
                  <Input value={editing.descricao} onChange={(e) => setEditing({ ...editing, descricao: e.target.value })} placeholder="Ex: Adicional 50/100% (Motorista)" />
                </div>
                <div>
                  <Label>Formato das horas</Label>
                  <Select value={editing.formato_horas} onValueChange={(v) => setEditing({ ...editing, formato_horas: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="sexagesimal">Sexagesimal</SelectItem>
                      <SelectItem value="centesimal">Centesimal</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Período - Início</Label>
                  <Input type="date" value={editing.periodo_inicio || ""} onChange={(e) => setEditing({ ...editing, periodo_inicio: e.target.value || null })} />
                </div>
                <div>
                  <Label>Período - Fim</Label>
                  <Input type="date" value={editing.periodo_fim || ""} onChange={(e) => setEditing({ ...editing, periodo_fim: e.target.value || null })} />
                </div>
                <div>
                  <Label>Filtrar por</Label>
                  <Select value={editing.filtrar_por} onValueChange={(v) => setEditing({ ...editing, filtrar_por: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{FILTROS.map((f) => <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                {editing.filtrar_por === "fechamento" && (
                  <div className="md:col-span-2">
                    <Label>Número do fechamento</Label>
                    <Input value={editing.filtro_fechamento || ""} onChange={(e) => setEditing({ ...editing, filtro_fechamento: e.target.value })} placeholder="Ex: 523 - 01/04/2024 - 30/04/2024" />
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 p-3 border rounded-lg bg-muted/30">
                <div className="flex items-center justify-between gap-2"><Label className="text-xs">Incluir dias de falta</Label>
                  <Switch checked={editing.incluir_dias_falta} onCheckedChange={(v) => setEditing({ ...editing, incluir_dias_falta: v })} /></div>
                <div className="flex items-center justify-between gap-2"><Label className="text-xs">Desconsid. ignoradas BH</Label>
                  <Switch checked={editing.desconsiderar_ignoradas_bh} onCheckedChange={(v) => setEditing({ ...editing, desconsiderar_ignoradas_bh: v })} /></div>
                <div className="flex items-center justify-between gap-2"><Label className="text-xs">Abono parcial</Label>
                  <Switch checked={editing.considerar_abono_parcial} onCheckedChange={(v) => setEditing({ ...editing, considerar_abono_parcial: v })} /></div>
                <div className="flex items-center justify-between gap-2"><Label className="text-xs">Suspensão</Label>
                  <Switch checked={editing.considerar_suspensao} onCheckedChange={(v) => setEditing({ ...editing, considerar_suspensao: v })} /></div>
                <div className="flex items-center justify-between gap-2"><Label className="text-xs">Banco de horas</Label>
                  <Switch checked={editing.considerar_banco_horas} onCheckedChange={(v) => setEditing({ ...editing, considerar_banco_horas: v })} /></div>
                <div className="flex items-center justify-between gap-2"><Label className="text-xs">Comissionistas</Label>
                  <Switch checked={editing.considerar_comissionistas} onCheckedChange={(v) => setEditing({ ...editing, considerar_comissionistas: v })} /></div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label className="text-base">Campos e Eventos</Label>
                  <Button size="sm" variant="outline" onClick={addEvento}><Plus className="w-4 h-4 mr-1" /> Adicionar evento</Button>
                </div>
                <div className="space-y-2">
                  {editing.eventos.map((ev, i) => (
                    <div key={i} className="grid grid-cols-12 gap-2 items-end p-2 border rounded">
                      <div className="col-span-3">
                        <Label className="text-xs">Evento *</Label>
                        <Input value={ev.evento} onChange={(e) => updEvento(i, "evento", e.target.value)} placeholder="150" />
                      </div>
                      <div className="col-span-8">
                        <Label className="text-xs">Campo *</Label>
                        <Select value={ev.campo} onValueChange={(v) => updEvento(i, "campo", v)}>
                          <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                          <SelectContent>{CAMPOS.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}</SelectContent>
                        </Select>
                      </div>
                      <div className="col-span-1">
                        <Button size="icon" variant="ghost" onClick={() => delEvento(i)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
                      </div>
                    </div>
                  ))}
                  {editing.eventos.length === 0 && (
                    <div className="text-xs text-muted-foreground text-center py-4 border rounded border-dashed">Nenhum evento. Clique em "Adicionar evento".</div>
                  )}
                </div>
              </div>

              <div>
                <Label>Token de integração (opcional)</Label>
                <Input value={editing.token_integracao || ""} onChange={(e) => setEditing({ ...editing, token_integracao: e.target.value })} placeholder="Token usado pelo software de folha" />
              </div>

              <div className="flex items-center gap-2">
                <Switch checked={editing.ativo} onCheckedChange={(v) => setEditing({ ...editing, ativo: v })} />
                <Label>Layout ativo</Label>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={save} disabled={loading}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <DeleteConfirmDialog
        open={!!delId}
        onOpenChange={(o) => !o && setDelId(null)}
        onConfirm={remove}
        title="Excluir layout"
        description="Esta ação não pode ser desfeita."
      />
    </div>
  );
}
