import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { DeleteConfirmDialog } from "@/components/ui/delete-confirm-dialog";
import { Plus, Pencil, Trash2, Building2, Share2 } from "lucide-react";
import { toast } from "sonner";
import { usePontoEmpresa } from "./usePontoEmpresa";

type Item = {
  id: string;
  nome: string;
  centro_custo: string | null;
  descricao: string | null;
  filial_id: string | null;
  ativo: boolean;
};

const empty = { nome: "", centro_custo: "", descricao: "", filial_id: "", ativo: true, compartilhado: true };

export default function PontoDepartamentos() {
  const { empresaId } = usePontoEmpresa();
  const [items, setItems] = useState<Item[]>([]);
  const [filiais, setFiliais] = useState<{ id: string; nome: string }[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Item | null>(null);
  const [form, setForm] = useState(empty);
  const [deleting, setDeleting] = useState<Item | null>(null);

  const load = async () => {
    if (!empresaId) return;
    const { data } = await supabase
      .from("ponto_departamentos")
      .select("id, nome, centro_custo, descricao, filial_id, ativo")
      .eq("empresa_id", empresaId)
      .order("nome");
    setItems((data as any) || []);
    const { data: f } = await supabase
      .from("ponto_filiais").select("id, nome").eq("empresa_id", empresaId).order("nome");
    setFiliais((f as any) || []);
  };
  useEffect(() => { load(); }, [empresaId]);

  const openCreate = () => { setEditing(null); setForm(empty); setOpen(true); };
  const openEdit = (x: Item) => {
    setEditing(x);
    setForm({
      nome: x.nome,
      centro_custo: x.centro_custo ?? "",
      descricao: x.descricao ?? "",
      filial_id: x.filial_id ?? "",
      ativo: x.ativo,
      compartilhado: !x.filial_id,
    });
    setOpen(true);
  };

  const save = async () => {
    if (!empresaId) return toast.error("Selecione uma empresa");
    if (!form.nome.trim()) return toast.error("Nome obrigatório");
    const payload = {
      empresa_id: empresaId,
      nome: form.nome.trim(),
      centro_custo: form.centro_custo.trim() || null,
      descricao: form.descricao.trim() || null,
      filial_id: form.filial_id || null,
      ativo: form.ativo,
    };
    const { error } = editing
      ? await supabase.from("ponto_departamentos").update(payload).eq("id", editing.id)
      : await supabase.from("ponto_departamentos").insert(payload);
    if (error) return toast.error(error.message);
    toast.success("Salvo");
    setOpen(false);
    load();
  };

  const remove = async () => {
    if (!deleting) return;
    const { error } = await supabase.from("ponto_departamentos").delete().eq("id", deleting.id);
    if (error) return toast.error(error.message);
    toast.success("Excluído");
    setDeleting(null);
    load();
  };

  return (
    <div className="space-y-4 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold sm:text-2xl">Departamentos</h2>
          <p className="text-sm text-muted-foreground">Setores da empresa para organização e centros de custo.</p>
        </div>
        <Button onClick={openCreate}><Plus className="mr-2 h-4 w-4" />Novo departamento</Button>
      </div>

      {items.length === 0 ? (
        <Card><CardContent className="flex flex-col items-center gap-3 py-10 text-center">
          <Building2 className="h-8 w-8 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Nenhum departamento cadastrado.</p>
        </CardContent></Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((x) => (
            <Card key={x.id} className="transition-all hover:border-primary">
              <CardContent className="space-y-2 p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h3 className="truncate font-semibold">{x.nome}</h3>
                    {x.centro_custo && <p className="text-xs text-muted-foreground">CC: {x.centro_custo}</p>}
                    {x.filial_id && <p className="text-xs text-muted-foreground truncate">{filiais.find(f => f.id === x.filial_id)?.nome ?? "—"}</p>}
                  </div>
                  <Badge variant={x.ativo ? "default" : "secondary"}>{x.ativo ? "Ativo" : "Inativo"}</Badge>
                </div>
                {x.descricao && <p className="text-xs text-muted-foreground line-clamp-2">{x.descricao}</p>}
                <div className="flex gap-2 pt-1">
                  <Button size="sm" variant="outline" onClick={() => openEdit(x)}><Pencil className="h-3.5 w-3.5" /></Button>
                  <Button size="sm" variant="outline" onClick={() => setDeleting(x)}><Trash2 className="h-3.5 w-3.5" /></Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{editing ? "Editar" : "Novo"} departamento</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Nome *</Label><Input value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Centro de custo</Label><Input value={form.centro_custo} onChange={(e) => setForm({ ...form, centro_custo: e.target.value })} /></div>
              <div>
                <Label>Filial (opcional)</Label>
                <Select value={form.filial_id || "_none"} onValueChange={(v) => setForm({ ...form, filial_id: v === "_none" ? "" : v })}>
                  <SelectTrigger><SelectValue placeholder="Toda a empresa" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="_none">Toda a empresa</SelectItem>
                    {filiais.map((f) => <SelectItem key={f.id} value={f.id}>{f.nome}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div><Label>Descrição</Label><Input value={form.descricao} onChange={(e) => setForm({ ...form, descricao: e.target.value })} /></div>
            <div className="flex items-center gap-2">
              <input id="ativo" type="checkbox" checked={form.ativo} onChange={(e) => setForm({ ...form, ativo: e.target.checked })} />
              <Label htmlFor="ativo">Ativo</Label>
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
        title="Excluir departamento"
      />
    </div>
  );
}
