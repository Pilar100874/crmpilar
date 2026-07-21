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
  const [grupos, setGrupos] = useState<any[]>([]);
  const [camerasList, setCamerasList] = useState<any[]>([]);

  const carregar = async () => {
    const { data } = await supabase.from("tv_dashboards").select("*").order("created_at", { ascending: false });
    setList(data || []);
  };
  useEffect(() => {
    carregar();
    supabase.from("cameras_grupos").select("id,nome,cor").eq("ativo", true).order("nome").then(({ data }) => setGrupos(data || []));
    supabase.from("cv_cameras").select("id,nome,grupo_id").eq("ativo", true).order("nome").then(({ data }) => setCamerasList(data || []));
  }, []);

  // Deriva query params atuais quando a rota é /tv/cameras
  const parseCamsCfg = (rota: string | null | undefined) => {
    const cfg = { grupos: [] as string[], cameras: [] as string[], rotate: 0 };
    if (!rota) return cfg;
    const qIdx = rota.indexOf("?");
    if (qIdx < 0) return cfg;
    const sp = new URLSearchParams(rota.slice(qIdx + 1));
    cfg.grupos = (sp.get("grupos") || "").split(",").map((s) => s.trim()).filter(Boolean);
    cfg.cameras = (sp.get("cameras") || "").split(",").map((s) => s.trim()).filter(Boolean);
    cfg.rotate = parseInt(sp.get("rotate") || "0") || 0;
    return cfg;
  };
  const buildCamsRoute = (cfg: { grupos: string[]; cameras: string[]; rotate: number }) => {
    const sp = new URLSearchParams();
    if (cfg.cameras.length) sp.set("cameras", cfg.cameras.join(","));
    else if (cfg.grupos.length) sp.set("grupos", cfg.grupos.join(","));
    if (cfg.rotate > 0) sp.set("rotate", String(cfg.rotate));
    const qs = sp.toString();
    return qs ? `/tv/cameras?${qs}` : "/tv/cameras";
  };
  const isCamsRoute = (r?: string | null) => !!r && r.split("?")[0] === "/tv/cameras";
  const camsCfg = isCamsRoute(edit?.rota_interna) ? parseCamsCfg(edit.rota_interna) : { grupos: [], cameras: [], rotate: 0 };
  const updateCamsCfg = (patch: Partial<{ grupos: string[]; cameras: string[]; rotate: number }>) => {
    const merged = { ...camsCfg, ...patch };
    setEdit({ ...edit, rota_interna: buildCamsRoute(merged) });
  };


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
        <DialogContent className="max-w-lg max-h-[90vh] flex flex-col p-0">
          <DialogHeader className="p-6 pb-2"><DialogTitle>{edit?.id ? "Editar dashboard" : "Novo dashboard"}</DialogTitle></DialogHeader>
          {edit && (
            <div className="space-y-3 overflow-y-auto px-6 py-2 flex-1">
              <div><Label>Nome</Label><Input value={edit.nome || ""} onChange={(e) => setEdit({ ...edit, nome: e.target.value })} /></div>
              <div><Label>Tipo</Label>
                <Select value={edit.tipo || "tela_interna"} onValueChange={(v) => setEdit({ ...edit, tipo: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="tela_interna">Tela do sistema</SelectItem><SelectItem value="url_externa">URL externa</SelectItem></SelectContent>
                </Select>
              </div>
              {edit.tipo === "tela_interna" ? (
                <>
                  <div><Label>Tela</Label>
                    <Select
                      value={(edit.rota_interna || "").split("?")[0] || ""}
                      onValueChange={(v) => setEdit({ ...edit, rota_interna: v })}
                    >
                      <SelectTrigger><SelectValue placeholder="Escolha a tela" /></SelectTrigger>
                      <SelectContent>{ROTAS_INTERNAS.map((r) => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  {isCamsRoute(edit.rota_interna) && (
                    <div className="space-y-3 rounded-md border p-3 bg-muted/30">
                      <div className="text-xs font-medium">Configuração do mosaico de câmeras</div>
                      <div>
                        <Label className="text-xs">Grupos de câmeras (opcional)</Label>
                        <p className="text-[11px] text-muted-foreground mb-1">
                          Selecione um ou mais grupos. Se nada for escolhido, todas as câmeras ativas serão exibidas.
                        </p>
                        <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto">
                          {grupos.map((g) => {
                            const on = camsCfg.grupos.includes(g.id);
                            return (
                              <button
                                key={g.id}
                                type="button"
                                onClick={() => {
                                  const next = on ? camsCfg.grupos.filter((x) => x !== g.id) : [...camsCfg.grupos, g.id];
                                  updateCamsCfg({ grupos: next, cameras: [] });
                                }}
                                className={`px-2 py-1 rounded-md text-xs border ${on ? "bg-primary text-primary-foreground border-primary" : "hover:bg-muted"}`}
                              >
                                <span className="inline-block h-2 w-2 rounded-full mr-1 align-middle" style={{ background: g.cor || "#f97316" }} />
                                {g.nome}
                              </button>
                            );
                          })}
                          {grupos.length === 0 && <span className="text-xs text-muted-foreground">Nenhum grupo cadastrado</span>}
                        </div>
                      </div>
                      <div>
                        <Label className="text-xs">Câmeras específicas (opcional)</Label>
                        <p className="text-[11px] text-muted-foreground mb-1">
                          Se preencher, sobrepõe a seleção por grupos.
                        </p>
                        <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto">
                          {camerasList.map((c) => {
                            const on = camsCfg.cameras.includes(c.id);
                            return (
                              <button
                                key={c.id}
                                type="button"
                                onClick={() => {
                                  const next = on ? camsCfg.cameras.filter((x) => x !== c.id) : [...camsCfg.cameras, c.id];
                                  updateCamsCfg({ cameras: next });
                                }}
                                className={`px-2 py-1 rounded-md text-xs border ${on ? "bg-primary text-primary-foreground border-primary" : "hover:bg-muted"}`}
                              >
                                {c.nome}
                              </button>
                            );
                          })}
                          {camerasList.length === 0 && <span className="text-xs text-muted-foreground">Nenhuma câmera ativa</span>}
                        </div>
                      </div>
                      <div>
                        <Label className="text-xs">Rotação automática entre páginas (segundos)</Label>
                        <Input
                          type="number"
                          min={0}
                          value={camsCfg.rotate}
                          onChange={(e) => updateCamsCfg({ rotate: Math.max(0, parseInt(e.target.value) || 0) })}
                          placeholder="0 = manual"
                        />
                        <p className="text-[11px] text-muted-foreground mt-1">
                          Cada página exibe 16 câmeras. Use 0 para avanço manual.
                        </p>
                      </div>
                    </div>
                  )}
                </>
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
