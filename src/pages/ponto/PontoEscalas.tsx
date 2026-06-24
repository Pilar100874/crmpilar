import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { DeleteConfirmDialog } from "@/components/ui/delete-confirm-dialog";
import { Plus, Pencil, Trash2, CalendarClock } from "lucide-react";
import { toast } from "sonner";
import { usePontoEmpresa } from "./usePontoEmpresa";

type Escala = {
  id: string;
  empresa_id: string;
  nome: string;
  tipo: string;
  jornada: any;
  intervalo_minutos: number | null;
  carga_semanal_minutos: number | null;
  noturna: boolean | null;
  ativo: boolean;
};

const DIAS = [
  { key: "seg", label: "Seg" },
  { key: "ter", label: "Ter" },
  { key: "qua", label: "Qua" },
  { key: "qui", label: "Qui" },
  { key: "sex", label: "Sex" },
  { key: "sab", label: "Sáb" },
  { key: "dom", label: "Dom" },
];

type JornadaDia = { ativo: boolean; entrada: string; saida: string };

const jornadaDefault = (): Record<string, JornadaDia> => ({
  seg: { ativo: true, entrada: "08:00", saida: "17:00" },
  ter: { ativo: true, entrada: "08:00", saida: "17:00" },
  qua: { ativo: true, entrada: "08:00", saida: "17:00" },
  qui: { ativo: true, entrada: "08:00", saida: "17:00" },
  sex: { ativo: true, entrada: "08:00", saida: "17:00" },
  sab: { ativo: false, entrada: "08:00", saida: "12:00" },
  dom: { ativo: false, entrada: "08:00", saida: "12:00" },
});

const empty = {
  nome: "",
  tipo: "5x2",
  intervalo: "60",
  carga_semanal: "44",
  noturna: false,
  ativo: true,
  jornada: jornadaDefault(),
};

export default function PontoEscalas() {
  const { empresaId } = usePontoEmpresa();
  const [items, setItems] = useState<Escala[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Escala | null>(null);
  const [form, setForm] = useState(empty);
  const [deleting, setDeleting] = useState<Escala | null>(null);

  const load = async () => {
    if (!empresaId) return;
    const { data } = await (supabase as any)
      .from("ponto_escalas")
      .select("*")
      .eq("empresa_id", empresaId)
      .order("nome");
    setItems((data as Escala[]) || []);
  };
  useEffect(() => { load(); }, [empresaId]);

  const openCreate = () => { setEditing(null); setForm(empty); setOpen(true); };
  const openEdit = (x: Escala) => {
    setEditing(x);
    const j = (x.jornada && typeof x.jornada === "object") ? x.jornada : jornadaDefault();
    const merged = { ...jornadaDefault(), ...j } as Record<string, JornadaDia>;
    setForm({
      nome: x.nome,
      tipo: x.tipo || "5x2",
      intervalo: x.intervalo_minutos != null ? String(x.intervalo_minutos) : "60",
      carga_semanal: x.carga_semanal_minutos != null ? String(Math.round(x.carga_semanal_minutos / 60)) : "44",
      noturna: !!x.noturna,
      ativo: x.ativo,
      jornada: merged,
    });
    setOpen(true);
  };

  const save = async () => {
    if (!empresaId) return toast.error("Selecione uma empresa");
    if (!form.nome.trim()) return toast.error("Nome obrigatório");
    const payload: any = {
      empresa_id: empresaId,
      nome: form.nome.trim(),
      tipo: form.tipo,
      jornada: form.jornada,
      intervalo_minutos: Number(form.intervalo) || 0,
      carga_semanal_minutos: (Number(form.carga_semanal) || 0) * 60,
      noturna: form.noturna,
      ativo: form.ativo,
    };
    const { error } = editing
      ? await (supabase as any).from("ponto_escalas").update(payload).eq("id", editing.id)
      : await (supabase as any).from("ponto_escalas").insert(payload);
    if (error) return toast.error(error.message);
    toast.success("Salvo");
    setOpen(false);
    load();
  };

  const remove = async () => {
    if (!deleting) return;
    const { error } = await (supabase as any).from("ponto_escalas").delete().eq("id", deleting.id);
    if (error) return toast.error(error.message);
    toast.success("Excluída");
    setDeleting(null);
    load();
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold sm:text-2xl">Escalas / Jornadas</h2>
          <p className="text-sm text-muted-foreground">
            Defina as jornadas de trabalho que serão vinculadas aos funcionários.
          </p>
        </div>
        <Button onClick={openCreate} disabled={!empresaId} className="w-full sm:w-auto">
          <Plus className="mr-2 h-4 w-4" /> Nova escala
        </Button>
      </div>

      {items.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
            <CalendarClock className="h-10 w-10 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              {empresaId ? "Nenhuma escala cadastrada." : "Selecione uma empresa primeiro."}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((x) => (
            <Card key={x.id}>
              <CardContent className="space-y-2 p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate font-medium">{x.nome}</p>
                    <div className="mt-1 flex flex-wrap gap-1">
                      <Badge variant="secondary" className="text-xs">{x.tipo}</Badge>
                      {x.noturna && <Badge variant="outline" className="text-xs">Noturna</Badge>}
                      {!x.ativo && <Badge variant="destructive" className="text-xs">Inativa</Badge>}
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <Button size="icon" variant="ghost" onClick={() => openEdit(x)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button size="icon" variant="ghost" onClick={() => setDeleting(x)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
                <div className="text-xs text-muted-foreground">
                  Carga semanal: {x.carga_semanal_minutos != null ? `${Math.round(x.carga_semanal_minutos / 60)}h` : "—"} ·
                  Intervalo: {x.intervalo_minutos ?? 0}min
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl w-[95vw] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? "Editar escala" : "Nova escala"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3 sm:grid-cols-6">
            <div className="sm:col-span-4">
              <Label>Nome *</Label>
              <Input value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} placeholder="Ex.: Comercial 44h" />
            </div>
            <div className="sm:col-span-2">
              <Label>Tipo</Label>
              <Select value={form.tipo} onValueChange={(v) => setForm({ ...form, tipo: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="5x2">5x2 (Seg-Sex)</SelectItem>
                  <SelectItem value="6x1">6x1 (Seg-Sáb)</SelectItem>
                  <SelectItem value="12x36">12x36</SelectItem>
                  <SelectItem value="escala_movel">Escala móvel</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="sm:col-span-2">
              <Label>Carga semanal (h)</Label>
              <Input type="number" value={form.carga_semanal} onChange={(e) => setForm({ ...form, carga_semanal: e.target.value })} />
            </div>
            <div className="sm:col-span-2">
              <Label>Intervalo (min)</Label>
              <Input type="number" value={form.intervalo} onChange={(e) => setForm({ ...form, intervalo: e.target.value })} />
            </div>
            <div className="sm:col-span-2 flex items-end gap-4">
              <label className="flex items-center gap-2 text-sm">
                <Switch checked={form.noturna} onCheckedChange={(v) => setForm({ ...form, noturna: v })} />
                Noturna
              </label>
              <label className="flex items-center gap-2 text-sm">
                <Switch checked={form.ativo} onCheckedChange={(v) => setForm({ ...form, ativo: v })} />
                Ativa
              </label>
            </div>

            <div className="sm:col-span-6">
              <Label>Jornada semanal</Label>
              <div className="mt-2 space-y-2 rounded-md border p-3">
                {DIAS.map((d) => {
                  const j = form.jornada[d.key];
                  return (
                    <div key={d.key} className="grid grid-cols-[80px_auto_1fr_1fr] items-center gap-2">
                      <span className="text-sm font-medium">{d.label}</span>
                      <Switch
                        checked={j.ativo}
                        onCheckedChange={(v) =>
                          setForm({ ...form, jornada: { ...form.jornada, [d.key]: { ...j, ativo: v } } })
                        }
                      />
                      <Input
                        type="time"
                        value={j.entrada}
                        disabled={!j.ativo}
                        onChange={(e) =>
                          setForm({ ...form, jornada: { ...form.jornada, [d.key]: { ...j, entrada: e.target.value } } })
                        }
                      />
                      <Input
                        type="time"
                        value={j.saida}
                        disabled={!j.ativo}
                        onChange={(e) =>
                          setForm({ ...form, jornada: { ...form.jornada, [d.key]: { ...j, saida: e.target.value } } })
                        }
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={save}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <DeleteConfirmDialog
        open={!!deleting}
        onOpenChange={(v) => !v && setDeleting(null)}
        onConfirm={remove}
        itemName={deleting?.nome ?? ""}
        title="Excluir escala"
      />
    </div>
  );
}
