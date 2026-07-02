import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DeleteConfirmDialog } from "@/components/ui/delete-confirm-dialog";
import { Layers, Plus, Edit, Trash2 } from "lucide-react";
import { toast } from "sonner";

const empty = {
  id: null as string | null,
  nome: "",
  setor: "",
  descricao: "",
  cor: "#f97316",
  ordem: 0,
  ativo: true,
};

const SETORES_SUGERIDOS = ["Expedição", "Portaria", "Produção", "Estoque", "Pátio", "Administrativo", "Externa"];

export default function CamerasGrupos() {
  const [rows, setRows] = useState<any[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<any>(empty);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const load = async () => {
    const [{ data: grupos }, { data: cams }] = await Promise.all([
      supabase.from("cameras_grupos").select("*").order("ordem").order("nome"),
      supabase.from("cv_cameras").select("id, grupo_id"),
    ]);
    setRows(grupos ?? []);
    const c: Record<string, number> = {};
    (cams ?? []).forEach((cam: any) => {
      if (cam.grupo_id) c[cam.grupo_id] = (c[cam.grupo_id] ?? 0) + 1;
    });
    setCounts(c);
  };

  useEffect(() => {
    load();
  }, []);

  const openNew = () => {
    setEditing(empty);
    setDialogOpen(true);
  };
  const openEdit = (r: any) => {
    setEditing(r);
    setDialogOpen(true);
  };

  const save = async () => {
    if (!editing.nome?.trim()) return toast.error("Informe um nome");
    const payload: any = { ...editing };
    delete payload.id;
    const q = editing.id
      ? supabase.from("cameras_grupos").update(payload).eq("id", editing.id)
      : supabase.from("cameras_grupos").insert(payload);
    const { error } = await q;
    if (error) return toast.error(error.message);
    toast.success("Grupo salvo");
    setDialogOpen(false);
    load();
  };

  const remove = async () => {
    if (!deleteId) return;
    const { error } = await supabase.from("cameras_grupos").delete().eq("id", deleteId);
    if (error) return toast.error(error.message);
    toast.success("Grupo removido");
    setDeleteId(null);
    load();
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-lg sm:text-xl font-bold flex items-center gap-2">
            <Layers className="h-5 w-5 text-primary shrink-0" /> Grupos / Setores
          </h2>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Organize as câmeras por local — expedição, portaria, produção…
          </p>
        </div>
        <Button size="sm" onClick={openNew} className="w-full sm:w-auto">
          <Plus className="h-4 w-4 mr-2" /> Novo grupo
        </Button>
      </div>

      <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
        {rows.length === 0 && (
          <Card className="col-span-full p-8 text-center text-muted-foreground">
            Nenhum grupo cadastrado
          </Card>
        )}
        {rows.map((r) => (
          <Card key={r.id} className={r.ativo ? "" : "opacity-60"}>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center justify-between text-base">
                <span className="flex items-center gap-2">
                  <span
                    className="inline-block h-3 w-3 rounded-full"
                    style={{ background: r.cor || "#f97316" }}
                  />
                  {r.nome}
                </span>
                <Badge variant="secondary">{counts[r.id] ?? 0} câm.</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm space-y-1">
              {r.setor && <div className="text-muted-foreground">Setor: {r.setor}</div>}
              {r.descricao && <div className="text-xs">{r.descricao}</div>}
              <div className="flex gap-2 pt-2">
                <Button size="sm" variant="outline" onClick={() => openEdit(r)}>
                  <Edit className="h-3 w-3 mr-1" /> Editar
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setDeleteId(r.id)}>
                  <Trash2 className="h-3 w-3 text-destructive" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing.id ? "Editar grupo" : "Novo grupo"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3">
            <div className="space-y-1">
              <Label>Nome</Label>
              <Input
                value={editing.nome}
                onChange={(e) => setEditing({ ...editing, nome: e.target.value })}
                placeholder="Ex.: Portaria principal"
              />
            </div>
            <div className="space-y-1">
              <Label>Setor</Label>
              <Input
                list="setores-list"
                value={editing.setor ?? ""}
                onChange={(e) => setEditing({ ...editing, setor: e.target.value })}
                placeholder="Expedição, Portaria, Produção…"
              />
              <datalist id="setores-list">
                {SETORES_SUGERIDOS.map((s) => (
                  <option key={s} value={s} />
                ))}
              </datalist>
            </div>
            <div className="space-y-1">
              <Label>Descrição</Label>
              <Input
                value={editing.descricao ?? ""}
                onChange={(e) => setEditing({ ...editing, descricao: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Cor</Label>
                <Input
                  type="color"
                  value={editing.cor ?? "#f97316"}
                  onChange={(e) => setEditing({ ...editing, cor: e.target.value })}
                />
              </div>
              <div className="space-y-1">
                <Label>Ordem</Label>
                <Input
                  type="number"
                  value={editing.ordem ?? 0}
                  onChange={(e) => setEditing({ ...editing, ordem: Number(e.target.value) || 0 })}
                />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Switch
                checked={editing.ativo}
                onCheckedChange={(v) => setEditing({ ...editing, ativo: v })}
              />
              <Label>Ativo</Label>
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={save}>Salvar</Button>
          </div>
        </DialogContent>
      </Dialog>

      <DeleteConfirmDialog
        open={!!deleteId}
        onOpenChange={(v) => !v && setDeleteId(null)}
        onConfirm={remove}
        title="Excluir grupo?"
        description="As câmeras vinculadas ficarão sem grupo, mas não serão removidas."
      />
    </div>
  );
}
