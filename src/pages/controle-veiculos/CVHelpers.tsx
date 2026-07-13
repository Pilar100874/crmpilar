import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, HardHat, Phone, IdCard, Search, ToggleLeft, ToggleRight, User } from "lucide-react";
import { CVPageHeader } from "./CVPageHeader";

interface Helper { id: string; name: string; phone: string | null; document: string | null; active: boolean; }
const empty = { name: "", phone: "", document: "", active: true };

export default function CVHelpers() {
  const [rows, setRows] = useState<Helper[]>([]);
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<any>(empty);
  const [editing, setEditing] = useState<string | null>(null);

  const load = async () => {
    const { data, error } = await supabase.from("cv_helpers").select("*").order("name");
    if (error) return toast.error(error.message);
    setRows((data ?? []) as Helper[]);
  };
  useEffect(() => { load(); }, []);

  const save = async () => {
    if (!form.name) return toast.error("Nome obrigatório");
    let error;
    if (editing) {
      ({ error } = await supabase.from("cv_helpers").update(form).eq("id", editing));
    } else {
      const estId = await getEstabelecimentoId();
      if (!estId) return toast.error("Estabelecimento não encontrado");
      ({ error } = await supabase.from("cv_helpers").insert({ ...form, estabelecimento_id: estId }));
    }
    if (error) return toast.error(error.message);
    toast.success("Salvo"); setOpen(false); load();
  };
  const remove = async (id: string) => {
    if (!confirm("Excluir ajudante?")) return;
    const { error } = await supabase.from("cv_helpers").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Excluído"); load();
  };
  const toggle = async (d: Helper) => {
    await supabase.from("cv_helpers").update({ active: !d.active }).eq("id", d.id);
    load();
  };

  const filtered = rows.filter(d =>
    !q || d.name.toLowerCase().includes(q.toLowerCase()) || (d.document ?? "").toLowerCase().includes(q.toLowerCase())
  );

  return (
    <div className="space-y-4">
      <CVPageHeader
        icon={HardHat}
        title="Ajudantes"
        subtitle={`${rows.length} cadastrados • ${rows.filter(r => r.active).length} ativos`}
        actions={
          <Button
            onClick={() => { setForm(empty); setEditing(null); setOpen(true); }}
            className="bg-white text-primary hover:bg-white/90"
          >
            <Plus className="h-4 w-4 mr-1" />Novo Ajudante
          </Button>
        }
      />

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Buscar nome ou documento..." value={q} onChange={e => setQ(e.target.value)} className="pl-9" />
      </div>

      {filtered.length === 0 ? (
        <Card><CardContent className="py-16 text-center text-muted-foreground">
          <HardHat className="h-12 w-12 mx-auto mb-3 opacity-40" />
          Nenhum ajudante encontrado.
        </CardContent></Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filtered.map(d => (
            <Card key={d.id} className="group hover:shadow-md hover:-translate-y-0.5 transition-all">
              <CardContent className="p-4 space-y-3">
                <div className="flex items-start gap-3">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary/10 ring-1 ring-primary/20">
                    <User className="h-5 w-5 text-primary" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold truncate">{d.name}</p>
                    {d.active
                      ? <Badge className="mt-1 h-5 bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-0">Ativo</Badge>
                      : <Badge variant="secondary" className="mt-1 h-5">Inativo</Badge>}
                  </div>
                </div>
                <div className="space-y-1.5 text-sm">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <IdCard className="h-4 w-4" />
                    <span className="font-mono truncate">{d.document || "—"}</span>
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Phone className="h-4 w-4" />
                    <span className="truncate">{d.phone || "—"}</span>
                  </div>
                </div>
                <div className="flex items-center justify-end gap-0.5 pt-2 border-t">
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => {
                    setForm({ name: d.name, document: d.document ?? "", phone: d.phone ?? "", active: d.active });
                    setEditing(d.id); setOpen(true);
                  }}><Pencil className="h-4 w-4" /></Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => toggle(d)}>
                    {d.active ? <ToggleRight className="h-4 w-4 text-emerald-500" /> : <ToggleLeft className="h-4 w-4 text-muted-foreground" />}
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => remove(d.id)}><Trash2 className="h-4 w-4" /></Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing ? "Editar" : "Novo"} Ajudante</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Nome</Label><Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></div>
            <div><Label>Documento (RG/CPF)</Label><Input value={form.document} onChange={e => setForm({ ...form, document: e.target.value })} /></div>
            <div><Label>Telefone</Label><Input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} /></div>
            <div className="flex items-center gap-2">
              <Switch checked={form.active} onCheckedChange={v => setForm({ ...form, active: v })} />
              <Label>Ativo</Label>
            </div>
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
