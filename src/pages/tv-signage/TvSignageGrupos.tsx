import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DeleteConfirmDialog } from "@/components/ui/delete-confirm-dialog";
import { Plus, Pencil, Trash2, Users } from "lucide-react";
import { toast } from "sonner";
import { getEstabelecimentoId } from "@/services/tvSignage/tvSignageService";

export default function TvSignageGrupos() {
  const [list, setList] = useState<any[]>([]);
  const [edit, setEdit] = useState<any | null>(null);

  const carregar = async () => {
    const { data } = await supabase.from("tv_groups").select("*").order("nome");
    setList(data || []);
  };
  useEffect(() => { carregar(); }, []);

  const salvar = async () => {
    const estId = await getEstabelecimentoId();
    if (!estId) return;
    const payload = { nome: edit.nome, descricao: edit.descricao || null, local: edit.local || null };
    if (edit.id) await supabase.from("tv_groups").update(payload).eq("id", edit.id);
    else await supabase.from("tv_groups").insert({ ...payload, estabelecimento_id: estId } as any);
    toast.success("Grupo salvo");
    setEdit(null); carregar();
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-sm text-muted-foreground">Organize dispositivos por localização, filial ou área.</p>
        <Button onClick={() => setEdit({})}><Plus className="w-4 h-4 mr-1" />Novo grupo</Button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {list.map((g) => (
          <Card key={g.id} className="p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center"><Users className="w-4 h-4 text-primary" /></div>
              <div>
                <div className="font-medium">{g.nome}</div>
                <div className="text-xs text-muted-foreground">{g.local || g.descricao || "—"}</div>
              </div>
            </div>
            <div className="flex gap-1">
              <Button variant="ghost" size="icon" onClick={() => setEdit(g)}><Pencil className="w-4 h-4" /></Button>
              <DeleteConfirmDialog
                onConfirm={async () => { await supabase.from("tv_groups").delete().eq("id", g.id); carregar(); }}
                title="Excluir grupo?"
                description={`"${g.nome}" será removido. Dispositivos ficarão sem grupo.`}
                trigger={<Button variant="ghost" size="icon"><Trash2 className="w-4 h-4 text-red-500" /></Button>}
              />
            </div>
          </Card>
        ))}
        {list.length === 0 && <Card className="p-8 text-center text-muted-foreground col-span-full">Nenhum grupo criado.</Card>}
      </div>

      <Dialog open={edit !== null} onOpenChange={(o) => !o && setEdit(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>{edit?.id ? "Editar grupo" : "Novo grupo"}</DialogTitle></DialogHeader>
          {edit && (
            <div className="space-y-3">
              <div><Label>Nome</Label><Input value={edit.nome || ""} onChange={(e) => setEdit({ ...edit, nome: e.target.value })} /></div>
              <div><Label>Local</Label><Input value={edit.local || ""} onChange={(e) => setEdit({ ...edit, local: e.target.value })} /></div>
              <div><Label>Descrição</Label><Input value={edit.descricao || ""} onChange={(e) => setEdit({ ...edit, descricao: e.target.value })} /></div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEdit(null)}>Cancelar</Button>
            <Button onClick={salvar} disabled={!edit?.nome}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
