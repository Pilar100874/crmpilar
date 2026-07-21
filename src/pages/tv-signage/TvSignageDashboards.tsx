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
import { Plus, Pencil, Trash2, ExternalLink, MonitorPlay } from "lucide-react";
import { toast } from "sonner";
import { ROTAS_INTERNAS, getEstabelecimentoId } from "@/services/tvSignage/tvSignageService";

export default function TvSignageDashboards() {
  const [list, setList] = useState<any[]>([]);
  const [edit, setEdit] = useState<any | null>(null);

  const carregar = async () => {
    const { data } = await supabase.from("tv_dashboards").select("*").order("created_at", { ascending: false });
    setList(data || []);
  };
  useEffect(() => { carregar(); }, []);

  const salvar = async () => {
    if (!edit?.nome?.trim()) return toast.error("Informe o nome do dashboard");
    if (!edit?.tipo) return toast.error("Selecione o tipo");
    if (edit.tipo === "tela_interna" && !edit.rota_interna) return toast.error("Selecione a tela do sistema");
    if (edit.tipo === "url_externa" && !edit.url?.trim()) return toast.error("Informe a URL externa");
    const estId = await getEstabelecimentoId();
    if (!estId) return toast.error("Estabelecimento não encontrado");
    const payload = {
      nome: edit.nome, tipo: edit.tipo || "url_externa",
      url: edit.tipo === "url_externa" ? edit.url : null,
      rota_interna: edit.tipo === "tela_interna" ? edit.rota_interna : null,
      refresh_segundos: edit.refresh_segundos || 60,
      fullscreen: edit.fullscreen ?? true,
      cache_offline: edit.cache_offline ?? false,
      auto_update: edit.auto_update ?? true,
      timeout_segundos: edit.timeout_segundos || 30,
      descricao: edit.descricao || null,
    };
    if (edit.id) {
      const { error } = await supabase.from("tv_dashboards").update(payload).eq("id", edit.id);
      if (error) return toast.error(error.message);
    } else {
      const { error } = await supabase.from("tv_dashboards").insert({ ...payload, estabelecimento_id: estId } as any);
      if (error) return toast.error(error.message);
    }
    toast.success("Dashboard salvo");
    setEdit(null); carregar();
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-sm text-muted-foreground">Telas que podem ser projetadas nas TVs. Escolha uma URL externa ou uma tela interna do sistema.</p>
        <Button onClick={() => setEdit({ tipo: "tela_interna", refresh_segundos: 60, fullscreen: true, timeout_segundos: 30, auto_update: true })}>
          <Plus className="w-4 h-4 mr-1" />Novo dashboard
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {list.map((d) => (
          <Card key={d.id} className="p-4 flex flex-col gap-2">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
                  {d.tipo === "url_externa" ? <ExternalLink className="w-4 h-4 text-primary" /> : <MonitorPlay className="w-4 h-4 text-primary" />}
                </div>
                <div>
                  <div className="font-medium">{d.nome}</div>
                  <div className="text-xs text-muted-foreground truncate max-w-[200px]">{d.url || d.rota_interna}</div>
                </div>
              </div>
              <div className="flex gap-1">
                <Button variant="ghost" size="icon" onClick={() => setEdit(d)}><Pencil className="w-4 h-4" /></Button>
                <DeleteConfirmTrigger
                  onConfirm={async () => { await supabase.from("tv_dashboards").delete().eq("id", d.id); carregar(); }}
                  title="Excluir dashboard?"
                  description={`"${d.nome}" será removido.`}
                  trigger={<Button variant="ghost" size="icon"><Trash2 className="w-4 h-4 text-red-500" /></Button>}
                />
              </div>
            </div>
            <div className="text-xs text-muted-foreground flex gap-3 pt-2 border-t border-border">
              <span>⏱ {d.refresh_segundos}s</span>
              {d.fullscreen && <span>▣ Fullscreen</span>}
              {d.cache_offline && <span>💾 Offline</span>}
            </div>
          </Card>
        ))}
        {list.length === 0 && <Card className="p-8 text-center text-muted-foreground col-span-full">Nenhum dashboard. Crie o primeiro.</Card>}
      </div>

      <Dialog open={edit !== null} onOpenChange={(o) => !o && setEdit(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{edit?.id ? "Editar dashboard" : "Novo dashboard"}</DialogTitle></DialogHeader>
          {edit && (
            <div className="space-y-3">
              <div><Label>Nome</Label><Input value={edit.nome || ""} onChange={(e) => setEdit({ ...edit, nome: e.target.value })} /></div>
              <div><Label>Tipo</Label>
                <Select value={edit.tipo || "tela_interna"} onValueChange={(v) => setEdit({ ...edit, tipo: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="tela_interna">Tela do sistema</SelectItem><SelectItem value="url_externa">URL externa</SelectItem></SelectContent>
                </Select>
              </div>
              {edit.tipo === "tela_interna" ? (
                <div className="space-y-2">
                  <Label>Tela</Label>
                  <Select value={ROTAS_INTERNAS.find(r => r.value === edit.rota_interna) ? edit.rota_interna : "__custom__"} onValueChange={(v) => setEdit({ ...edit, rota_interna: v === "__custom__" ? (edit.rota_interna && !ROTAS_INTERNAS.find(r => r.value === edit.rota_interna) ? edit.rota_interna : "") : v })}>
                    <SelectTrigger><SelectValue placeholder="Escolha a tela" /></SelectTrigger>
                    <SelectContent className="max-h-80">
                      {ROTAS_INTERNAS.map((r) => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}
                      <SelectItem value="__custom__">✏️ Caminho customizado…</SelectItem>
                    </SelectContent>
                  </Select>
                  <Input
                    value={edit.rota_interna || ""}
                    onChange={(e) => setEdit({ ...edit, rota_interna: e.target.value })}
                    placeholder="/qualquer/rota/do/sistema"
                  />
                  <p className="text-[11px] text-muted-foreground">
                    Pode ser qualquer rota do sistema. Rotas fora de <code>/tv/*</code> exigem que o dispositivo esteja logado com um usuário no navegador.
                  </p>
                </div>
              ) : (
                <div><Label>URL</Label><Input value={edit.url || ""} onChange={(e) => setEdit({ ...edit, url: e.target.value })} placeholder="https://..." /></div>
              )}
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Refresh (segundos)</Label><Input type="number" value={edit.refresh_segundos} onChange={(e) => setEdit({ ...edit, refresh_segundos: parseInt(e.target.value) || 60 })} /></div>
                <div><Label>Timeout (segundos)</Label><Input type="number" value={edit.timeout_segundos} onChange={(e) => setEdit({ ...edit, timeout_segundos: parseInt(e.target.value) || 30 })} /></div>
              </div>
              <div className="flex flex-wrap gap-4 pt-2">
                <label className="flex items-center gap-2 text-sm"><Switch checked={!!edit.fullscreen} onCheckedChange={(v) => setEdit({ ...edit, fullscreen: v })} />Fullscreen</label>
                <label className="flex items-center gap-2 text-sm"><Switch checked={!!edit.cache_offline} onCheckedChange={(v) => setEdit({ ...edit, cache_offline: v })} />Cache offline</label>
                <label className="flex items-center gap-2 text-sm"><Switch checked={!!edit.auto_update} onCheckedChange={(v) => setEdit({ ...edit, auto_update: v })} />Auto-update</label>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEdit(null)}>Cancelar</Button>
            <Button onClick={salvar} disabled={!edit?.nome?.trim() || !edit?.tipo || (edit?.tipo === "tela_interna" && !edit?.rota_interna) || (edit?.tipo === "url_externa" && !edit?.url?.trim())}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
