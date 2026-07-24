import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DeleteConfirmTrigger } from "@/components/tv-signage/DeleteConfirmTrigger";
import { Plus, Trash2, Pencil, GripVertical, ArrowUp, ArrowDown, PlayCircle } from "lucide-react";
import { toast } from "sonner";
import { getEstabelecimentoId } from "@/services/tvSignage/tvSignageService";

export default function TvSignagePlaylists() {
  const [playlists, setPlaylists] = useState<any[]>([]);
  const [dashboards, setDashboards] = useState<any[]>([]);
  const [edit, setEdit] = useState<any | null>(null);
  const [items, setItems] = useState<any[]>([]);
  const [addDashId, setAddDashId] = useState<string>("");
  const [addDur, setAddDur] = useState(30);

  const carregar = async () => {
    const [{ data: p }, { data: d }] = await Promise.all([
      supabase.from("tv_playlists").select("*, items:tv_playlist_items(count)").order("created_at", { ascending: false }),
      supabase.from("tv_dashboards").select("id, nome"),
    ]);
    setPlaylists(p || []); setDashboards(d || []);
  };
  useEffect(() => { carregar(); }, []);

  const abrirEditor = async (p: any) => {
    setEdit(p);
    if (p.id) {
      const { data } = await supabase.from("tv_playlist_items").select("*, dashboard:tv_dashboards(nome)").eq("playlist_id", p.id).order("ordem");
      setItems(data || []);
    } else setItems([]);
  };

  const salvar = async () => {
    const estId = await getEstabelecimentoId();
    if (!estId) return;
    if (edit.id) {
      await supabase.from("tv_playlists").update({ nome: edit.nome, loop: edit.loop }).eq("id", edit.id);
    } else {
      const { data } = await supabase.from("tv_playlists").insert({ nome: edit.nome, loop: edit.loop ?? true, estabelecimento_id: estId } as any).select().single();
      if (data) setEdit(data);
    }
    toast.success("Playlist salva");
    carregar();
  };

  const addItem = async () => {
    if (!edit?.id || !addDashId) return;
    const ordem = items.length;
    const { data } = await supabase.from("tv_playlist_items").insert({
      playlist_id: edit.id, dashboard_id: addDashId, ordem, duracao_segundos: addDur,
    } as any).select("*, dashboard:tv_dashboards(nome)").single();
    if (data) setItems([...items, data]);
    setAddDashId("");
  };

  const removeItem = async (id: string) => {
    await supabase.from("tv_playlist_items").delete().eq("id", id);
    setItems(items.filter((i) => i.id !== id));
  };

  const move = async (idx: number, dir: -1 | 1) => {
    const arr = [...items];
    const j = idx + dir;
    if (j < 0 || j >= arr.length) return;
    [arr[idx], arr[j]] = [arr[j], arr[idx]];
    arr.forEach((it, i) => (it.ordem = i));
    setItems(arr);
    await Promise.all(arr.map((it) => supabase.from("tv_playlist_items").update({ ordem: it.ordem }).eq("id", it.id)));
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-sm text-muted-foreground">Sequência de telas com temporizador para rotação automática.</p>
        <Button onClick={() => abrirEditor({ loop: true })}><Plus className="w-4 h-4 mr-1" />Nova playlist</Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {playlists.map((p) => (
          <Card key={p.id} className="p-4">
            <div className="flex items-start justify-between mb-2">
              <div>
                <div className="font-medium">{p.nome}</div>
                <div className="text-xs text-muted-foreground">{p.items?.[0]?.count ?? 0} telas • {p.loop ? "loop" : "sem loop"}</div>
              </div>
              <div className="flex gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  title="Prévia sem dispositivo"
                  onClick={() => window.open(`/tv-signage/simular?playlist_id=${p.id}`, "_blank")}
                >
                  <PlayCircle className="w-4 h-4 text-primary" />
                </Button>
                <Button variant="ghost" size="icon" onClick={() => abrirEditor(p)}><Pencil className="w-4 h-4" /></Button>
                <DeleteConfirmTrigger
                  onConfirm={async () => { await supabase.from("tv_playlists").delete().eq("id", p.id); carregar(); }}
                  title="Excluir playlist?"
                  description={`"${p.nome}" será removida.`}
                  trigger={<Button variant="ghost" size="icon"><Trash2 className="w-4 h-4 text-red-500" /></Button>}
                />
              </div>
            </div>
          </Card>
        ))}
        {playlists.length === 0 && <Card className="p-8 text-center text-muted-foreground col-span-full">Nenhuma playlist criada.</Card>}
      </div>

      <Dialog open={edit !== null} onOpenChange={(o) => {
        if (o) return;
        if (edit?.id && items.length === 0) { toast.error("Adicione pelo menos uma tela à rotação antes de sair"); return; }
        setEdit(null); carregar();
      }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{edit?.id ? "Editar playlist" : "Nova playlist"}</DialogTitle></DialogHeader>
          {edit && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div><Label>Nome</Label><Input value={edit.nome || ""} onChange={(e) => setEdit({ ...edit, nome: e.target.value })} /></div>
                <div className="flex items-end"><label className="flex items-center gap-2 text-sm"><Switch checked={!!edit.loop} onCheckedChange={(v) => setEdit({ ...edit, loop: v })} />Loop infinito</label></div>
              </div>
              <Button onClick={salvar} disabled={!edit.nome}>Salvar dados da playlist</Button>

              {edit.id && (
                <>
                  <div className="border-t border-border pt-4">
                    <h3 className="font-medium mb-3">Telas na rotação</h3>
                    <div className="flex gap-2 mb-3">
                      <Select value={addDashId} onValueChange={setAddDashId}>
                        <SelectTrigger className="flex-1"><SelectValue placeholder="Selecione um dashboard" /></SelectTrigger>
                        <SelectContent>{dashboards.map((d) => <SelectItem key={d.id} value={d.id}>{d.nome}</SelectItem>)}</SelectContent>
                      </Select>
                      <Input type="number" className="w-24" value={addDur} onChange={(e) => setAddDur(parseInt(e.target.value) || 30)} placeholder="seg" />
                      <Button onClick={addItem} disabled={!addDashId}>Adicionar</Button>
                    </div>
                    <div className="space-y-2">
                      {items.map((it, idx) => (
                        <div key={it.id} className="flex items-center gap-2 p-2 border border-border rounded-lg">
                          <GripVertical className="w-4 h-4 text-muted-foreground" />
                          <div className="flex-1">
                            <div className="text-sm font-medium">{it.dashboard?.nome}</div>
                            <div className="text-xs text-muted-foreground">{it.duracao_segundos}s</div>
                          </div>
                          <Button variant="ghost" size="icon" onClick={() => move(idx, -1)}><ArrowUp className="w-4 h-4" /></Button>
                          <Button variant="ghost" size="icon" onClick={() => move(idx, 1)}><ArrowDown className="w-4 h-4" /></Button>
                          <Button variant="ghost" size="icon" onClick={() => removeItem(it.id)}><Trash2 className="w-4 h-4 text-red-500" /></Button>
                        </div>
                      ))}
                      {items.length === 0 && <p className="text-xs text-muted-foreground text-center py-4">Adicione telas para compor a rotação.</p>}
                    </div>
                  </div>
                </>
              )}
            </div>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                if (edit?.id && items.length === 0) {
                  return toast.error("Adicione pelo menos uma tela à rotação antes de sair");
                }
                setEdit(null); carregar();
              }}
            >Fechar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
