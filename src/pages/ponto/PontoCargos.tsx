import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { DeleteConfirmDialog } from "@/components/ui/delete-confirm-dialog";
import { Plus, Pencil, Trash2, Briefcase } from "lucide-react";
import { toast } from "sonner";
import { usePontoEmpresa } from "./usePontoEmpresa";

type Item = {
  id: string;
  nome: string;
  cbo: string | null;
  descricao: string | null;
  salario_base: number | null;
  ativo: boolean;
};

const empty = { nome: "", cbo: "", descricao: "", salario_base: "", ativo: true };

export default function PontoCargos() {
  const { empresaId } = usePontoEmpresa();
  const [items, setItems] = useState<Item[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Item | null>(null);
  const [form, setForm] = useState(empty);
  const [deleting, setDeleting] = useState<Item | null>(null);

  const load = async () => {
    if (!empresaId) return;
    const { data } = await supabase
      .from("ponto_cargos").select("*").eq("empresa_id", empresaId).order("nome");
    setItems((data as any) || []);
  };
  useEffect(() => { load(); }, [empresaId]);

  const openCreate = () => { setEditing(null); setForm(empty); setOpen(true); };
  const openEdit = (x: Item) => {
    setEditing(x);
    setForm({
      nome: x.nome,
      cbo: x.cbo ?? "",
      descricao: x.descricao ?? "",
      salario_base: x.salario_base != null ? String(x.salario_base) : "",
      ativo: x.ativo,
    });
    setOpen(true);
  };

  const save = async () => {
    if (!empresaId) return toast.error("Selecione uma empresa");
    if (!form.nome.trim()) return toast.error("Nome obrigatório");
    const sal = form.salario_base ? parseFloat(form.salario_base.replace(",", ".")) : null;
    if (sal !== null && isNaN(sal)) return toast.error("Salário inválido");
    const payload = {
      empresa_id: empresaId,
      nome: form.nome.trim(),
      cbo: form.cbo.trim() || null,
      descricao: form.descricao.trim() || null,
      salario_base: sal,
      ativo: form.ativo,
    };
    const { error } = editing
      ? await supabase.from("ponto_cargos").update(payload).eq("id", editing.id)
      : await supabase.from("ponto_cargos").insert(payload);
    if (error) return toast.error(error.message);
    toast.success("Salvo");
    setOpen(false);
    load();
  };

  const remove = async () => {
    if (!deleting) return;
    const { error } = await supabase.from("ponto_cargos").delete().eq("id", deleting.id);
    if (error) return toast.error(error.message);
    toast.success("Excluído");
    setDeleting(null);
    load();
  };

  return (
    <div className="space-y-4 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold sm:text-2xl">Cargos</h2>
          <p className="text-sm text-muted-foreground">Posições funcionais com CBO e salário base.</p>
        </div>
        <Button onClick={openCreate}><Plus className="mr-2 h-4 w-4" />Novo cargo</Button>
      </div>

      {items.length === 0 ? (
        <Card><CardContent className="flex flex-col items-center gap-3 py-10 text-center">
          <Briefcase className="h-8 w-8 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Nenhum cargo cadastrado.</p>
        </CardContent></Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((x) => (
            <Card key={x.id} className="transition-all hover:border-primary">
              <CardContent className="space-y-2 p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h3 className="truncate font-semibold">{x.nome}</h3>
                    {x.cbo && <p className="text-xs text-muted-foreground">CBO: {x.cbo}</p>}
                    {x.salario_base != null && (
                      <p className="text-xs text-muted-foreground">
                        R$ {Number(x.salario_base).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                      </p>
                    )}
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
          <DialogHeader><DialogTitle>{editing ? "Editar" : "Novo"} cargo</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Nome *</Label><Input value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>CBO</Label><Input value={form.cbo} onChange={(e) => setForm({ ...form, cbo: e.target.value })} placeholder="0000-00" /></div>
              <div><Label>Salário base (R$)</Label><Input value={form.salario_base} onChange={(e) => setForm({ ...form, salario_base: e.target.value })} placeholder="0,00" /></div>
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
        title="Excluir cargo"
      />
    </div>
  );
}
