import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Tag, Wrench, Zap, Shield, Package, Car } from "lucide-react";
import { CVPageHeader } from "./CVPageHeader";
import type { DefectType, DefectCategory } from "@/types/vehicle";

const CATS: { value: DefectCategory; label: string; icon: any; tone: string; bg: string }[] = [
  { value: "mechanical", label: "Mecânico", icon: Wrench, tone: "text-amber-600 dark:text-amber-400", bg: "bg-amber-500/10 ring-amber-500/20" },
  { value: "electrical", label: "Elétrico", icon: Zap, tone: "text-sky-600 dark:text-sky-400", bg: "bg-sky-500/10 ring-sky-500/20" },
  { value: "bodywork", label: "Carroceria", icon: Car, tone: "text-primary", bg: "bg-primary/10 ring-primary/20" },
  { value: "safety", label: "Segurança", icon: Shield, tone: "text-destructive", bg: "bg-destructive/10 ring-destructive/20" },
  { value: "other", label: "Outros", icon: Package, tone: "text-muted-foreground", bg: "bg-muted ring-border" },
];

const empty = { name: "", description: "", category: "mechanical" as DefectCategory };

export default function CVDefectTypes() {
  const [rows, setRows] = useState<DefectType[]>([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<any>(empty);
  const [editing, setEditing] = useState<string | null>(null);

  const load = async () => {
    const { data, error } = await supabase.from("cv_defect_types").select("*").order("category").order("name");
    if (error) return toast.error(error.message);
    setRows((data ?? []) as DefectType[]);
  };
  useEffect(() => { load(); }, []);

  const save = async () => {
    if (!form.name) return toast.error("Nome obrigatório");
    let error;
    if (editing) {
      ({ error } = await supabase.from("cv_defect_types").update(form).eq("id", editing));
    } else {
      const estId = await getEstabelecimentoId();
      if (!estId) return toast.error("Estabelecimento não encontrado");
      ({ error } = await supabase.from("cv_defect_types").insert({ ...form, estabelecimento_id: estId }));
    }
    if (error) return toast.error(error.message);
    toast.success("Salvo"); setOpen(false); load();
  };
  const remove = async (id: string) => {
    if (!confirm("Excluir?")) return;
    const { error } = await supabase.from("cv_defect_types").delete().eq("id", id);
    if (error) return toast.error(error.message);
    load();
  };

  const grouped = CATS.map(c => ({ ...c, items: rows.filter(r => r.category === c.value) }));

  return (
    <div className="space-y-4">
      <CVPageHeader
        icon={Tag}
        title="Tipos de Defeito"
        subtitle={`${rows.length} tipos catalogados`}
        actions={
          <Button
            onClick={() => { setForm(empty); setEditing(null); setOpen(true); }}
            className="bg-white text-primary hover:bg-white/90"
          >
            <Plus className="h-4 w-4 mr-1" />Novo Tipo
          </Button>
        }
      />

      {rows.length === 0 ? (
        <Card><CardContent className="py-16 text-center text-muted-foreground">
          <Tag className="h-12 w-12 mx-auto mb-3 opacity-40" />
          Nenhum tipo cadastrado.
        </CardContent></Card>
      ) : (
        <div className="space-y-6">
          {grouped.filter(g => g.items.length > 0).map(g => (
            <div key={g.value}>
              <div className="flex items-center gap-2 mb-2">
                <div className={`flex h-8 w-8 items-center justify-center rounded-lg ring-1 ${g.bg}`}>
                  <g.icon className={`h-4 w-4 ${g.tone}`} />
                </div>
                <h3 className="font-semibold text-sm">{g.label}</h3>
                <Badge variant="secondary" className="h-5">{g.items.length}</Badge>
              </div>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {g.items.map(t => (
                  <Card key={t.id} className="group hover:shadow-md hover:-translate-y-0.5 transition-all">
                    <CardContent className="p-4 space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <p className="font-medium leading-tight">{t.name}</p>
                        <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => {
                            setForm({ name: t.name, description: t.description ?? "", category: t.category });
                            setEditing(t.id); setOpen(true);
                          }}><Pencil className="h-3.5 w-3.5" /></Button>
                          <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => remove(t.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                        </div>
                      </div>
                      {t.description && <p className="text-xs text-muted-foreground line-clamp-2">{t.description}</p>}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing ? "Editar" : "Novo"} Tipo</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Nome</Label><Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></div>
            <div>
              <Label>Categoria</Label>
              <Select value={form.category} onValueChange={v => setForm({ ...form, category: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{CATS.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Descrição</Label><Textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={save}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
