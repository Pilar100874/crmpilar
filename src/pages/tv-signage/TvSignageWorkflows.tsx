import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Play, Zap } from "lucide-react";
import { getEstabelecimentoId } from "@/services/tvSignage/tvSignageService";
import { DeleteConfirmDialog } from "@/components/ui/delete-confirm-dialog";

const EVENTOS = [
  { value: "manual", label: "Manual (disparo pelo botão / API)" },
  { value: "caminhao_parado", label: "Caminhão parado" },
  { value: "caminhao_movimento", label: "Caminhão em movimento" },
  { value: "venda_realizada", label: "Venda realizada" },
  { value: "pedido_novo", label: "Novo pedido" },
  { value: "alerta_camera", label: "Alerta de câmera" },
  { value: "visita_iniciada", label: "Visita iniciada" },
  { value: "ponto_batido", label: "Ponto batido" },
];

const ICONES = ["Bell", "AlertTriangle", "CheckCircle2", "Info", "Truck", "ShoppingCart", "Camera", "Users", "Zap"];

type Workflow = {
  id?: string;
  nome: string;
  ativo: boolean;
  evento: string;
  filtros: any;
  mensagem_template: string;
  duracao_segundos: number;
  estilo: any;
  escopo_tipo: "todos" | "dispositivos" | "grupos" | "dashboard";
  escopo_ids: string[];
  dashboard_id: string | null;
};

const vazio = (): Workflow => ({
  nome: "",
  ativo: true,
  evento: "manual",
  filtros: {},
  mensagem_template: "",
  duracao_segundos: 8,
  estilo: { bg: "#0f172a", fg: "#ffffff", icone: "Bell", posicao: "bottom" },
  escopo_tipo: "todos",
  escopo_ids: [],
  dashboard_id: null,
});

export default function TvSignageWorkflows() {
  const [lista, setLista] = useState<any[]>([]);
  const [edit, setEdit] = useState<Workflow | null>(null);
  const [devices, setDevices] = useState<any[]>([]);
  const [grupos, setGrupos] = useState<any[]>([]);
  const [dashboards, setDashboards] = useState<any[]>([]);
  const [confirmDelete, setConfirmDelete] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);

  const carregar = async () => {
    const { data } = await supabase.from("tv_workflows").select("*").order("created_at", { ascending: false });
    setLista(data || []);
  };

  useEffect(() => {
    carregar();
    supabase.from("tv_devices").select("id,nome").order("nome").then(({ data }) => setDevices(data || []));
    supabase.from("tv_groups").select("id,nome").order("nome").then(({ data }) => setGrupos(data || []));
    supabase.from("tv_dashboards").select("id,nome").order("nome").then(({ data }) => setDashboards(data || []));
  }, []);

  const salvar = async () => {
    if (!edit) return;
    if (!edit.nome.trim() || !edit.mensagem_template.trim()) {
      toast.error("Nome e mensagem são obrigatórios");
      return;
    }
    setLoading(true);
    const estId = await getEstabelecimentoId();
    if (!estId) { toast.error("Estabelecimento não encontrado"); setLoading(false); return; }

    const payload: any = {
      nome: edit.nome,
      ativo: edit.ativo,
      evento: edit.evento,
      filtros: edit.filtros || {},
      mensagem_template: edit.mensagem_template,
      duracao_segundos: edit.duracao_segundos,
      estilo: edit.estilo,
      escopo_tipo: edit.escopo_tipo,
      escopo_ids: edit.escopo_ids || [],
      dashboard_id: edit.dashboard_id,
      estabelecimento_id: estId,
    };

    let res;
    if (edit.id) res = await supabase.from("tv_workflows").update(payload).eq("id", edit.id);
    else res = await supabase.from("tv_workflows").insert(payload);

    setLoading(false);
    if (res.error) { toast.error("Erro ao salvar: " + res.error.message); return; }
    toast.success("Workflow salvo");
    setEdit(null);
    carregar();
  };

  const excluir = async () => {
    if (!confirmDelete) return;
    const { error } = await supabase.from("tv_workflows").delete().eq("id", confirmDelete.id);
    if (error) { toast.error(error.message); return; }
    toast.success("Excluído");
    setConfirmDelete(null);
    carregar();
  };

  const disparar = async (wf: any) => {
    const { data, error } = await supabase.functions.invoke("tv-workflow-dispatch", {
      body: { workflow_id: wf.id, evento: wf.evento, payload: {} },
    });
    if (error) { toast.error(error.message); return; }
    toast.success(`Disparado para ${data?.execucoes ?? 0} dispositivo(s)`);
  };

  const preview = useMemo(() => {
    if (!edit) return null;
    return edit.estilo || {};
  }, [edit]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Workflows</h2>
          <p className="text-sm text-muted-foreground">
            Mensagens automáticas que aparecem em uma barra na tela remota quando um evento acontece.
          </p>
        </div>
        <Button onClick={() => setEdit(vazio())}>
          <Plus className="w-4 h-4 mr-2" /> Novo workflow
        </Button>
      </div>

      <div className="grid gap-3">
        {lista.map((wf) => (
          <Card key={wf.id} className="p-4 flex items-center gap-4">
            <div
              className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
              style={{ background: wf.estilo?.bg || "#0f172a", color: wf.estilo?.fg || "#fff" }}
            >
              <Zap className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-medium text-foreground truncate">{wf.nome}</span>
                {wf.ativo ? <Badge variant="default">Ativo</Badge> : <Badge variant="secondary">Inativo</Badge>}
                <Badge variant="outline">{EVENTOS.find((e) => e.value === wf.evento)?.label || wf.evento}</Badge>
                <Badge variant="outline">{wf.duracao_segundos}s</Badge>
                <Badge variant="outline">
                  {wf.escopo_tipo === "todos" ? "Todos dispositivos" :
                    wf.escopo_tipo === "dispositivos" ? `${(wf.escopo_ids || []).length} dispositivo(s)` :
                    wf.escopo_tipo === "grupos" ? `${(wf.escopo_ids || []).length} grupo(s)` :
                    "Por dashboard"}
                </Badge>
              </div>
              <div className="text-sm text-muted-foreground truncate mt-1">{wf.mensagem_template}</div>
            </div>
            <div className="flex gap-1">
              <Button size="sm" variant="ghost" title="Disparar agora" onClick={() => disparar(wf)}>
                <Play className="w-4 h-4" />
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setEdit(wf)}>
                <Pencil className="w-4 h-4" />
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setConfirmDelete(wf)}>
                <Trash2 className="w-4 h-4 text-destructive" />
              </Button>
            </div>
          </Card>
        ))}
        {lista.length === 0 && (
          <Card className="p-8 text-center text-muted-foreground text-sm">
            Nenhum workflow cadastrado. Clique em "Novo workflow" para criar.
          </Card>
        )}
      </div>

      <Dialog open={!!edit} onOpenChange={(o) => !o && setEdit(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>{edit?.id ? "Editar workflow" : "Novo workflow"}</DialogTitle>
          </DialogHeader>
          {edit && (
            <div className="space-y-4 overflow-y-auto pr-2 flex-1">
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <Label>Nome</Label>
                  <Input value={edit.nome} onChange={(e) => setEdit({ ...edit, nome: e.target.value })} />
                </div>
                <div>
                  <Label>Evento gatilho</Label>
                  <Select value={edit.evento} onValueChange={(v) => setEdit({ ...edit, evento: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {EVENTOS.map((e) => <SelectItem key={e.value} value={e.value}>{e.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Duração (segundos)</Label>
                  <Input type="number" min={1} max={120}
                    value={edit.duracao_segundos}
                    onChange={(e) => setEdit({ ...edit, duracao_segundos: parseInt(e.target.value) || 8 })} />
                </div>
                <div className="col-span-2 flex items-center gap-3">
                  <Switch checked={edit.ativo} onCheckedChange={(v) => setEdit({ ...edit, ativo: v })} />
                  <Label>Workflow ativo</Label>
                </div>
              </div>

              <div>
                <Label>Mensagem (use {"{variavel}"} para dados do evento — ex.: {"{placa}, {motorista}, {valor}"})</Label>
                <Textarea rows={2} value={edit.mensagem_template}
                  onChange={(e) => setEdit({ ...edit, mensagem_template: e.target.value })} />
              </div>

              <Card className="p-3 space-y-3">
                <div className="text-sm font-medium">Estilo da barra</div>
                <div className="grid grid-cols-4 gap-3">
                  <div>
                    <Label className="text-xs">Cor de fundo</Label>
                    <Input type="color" value={edit.estilo?.bg || "#0f172a"}
                      onChange={(e) => setEdit({ ...edit, estilo: { ...edit.estilo, bg: e.target.value } })} />
                  </div>
                  <div>
                    <Label className="text-xs">Cor do texto</Label>
                    <Input type="color" value={edit.estilo?.fg || "#ffffff"}
                      onChange={(e) => setEdit({ ...edit, estilo: { ...edit.estilo, fg: e.target.value } })} />
                  </div>
                  <div>
                    <Label className="text-xs">Ícone</Label>
                    <Select value={edit.estilo?.icone || "Bell"}
                      onValueChange={(v) => setEdit({ ...edit, estilo: { ...edit.estilo, icone: v } })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {ICONES.map((i) => <SelectItem key={i} value={i}>{i}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs">Posição</Label>
                    <Select value={edit.estilo?.posicao || "bottom"}
                      onValueChange={(v) => setEdit({ ...edit, estilo: { ...edit.estilo, posicao: v } })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="bottom">Inferior</SelectItem>
                        <SelectItem value="top">Superior</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                {preview && (
                  <div
                    className="rounded-md px-4 py-3 text-lg font-bold flex items-center gap-3"
                    style={{ background: preview.bg, color: preview.fg }}
                  >
                    <span className="opacity-80 text-xs">Prévia:</span>
                    <span className="truncate">
                      {edit.mensagem_template || "Sua mensagem aparecerá aqui"}
                    </span>
                  </div>
                )}
              </Card>

              <Card className="p-3 space-y-3">
                <div className="text-sm font-medium">Onde exibir</div>
                <Select value={edit.escopo_tipo}
                  onValueChange={(v: any) => setEdit({ ...edit, escopo_tipo: v, escopo_ids: [], dashboard_id: null })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos os dispositivos</SelectItem>
                    <SelectItem value="dispositivos">Dispositivos específicos</SelectItem>
                    <SelectItem value="grupos">Grupos de dispositivos</SelectItem>
                    <SelectItem value="dashboard">Apenas quando estiver em um dashboard específico</SelectItem>
                  </SelectContent>
                </Select>

                {edit.escopo_tipo === "dispositivos" && (
                  <div className="grid grid-cols-2 gap-1 max-h-48 overflow-y-auto border rounded p-2">
                    {devices.map((d) => (
                      <label key={d.id} className="flex items-center gap-2 text-sm">
                        <input type="checkbox"
                          checked={edit.escopo_ids.includes(d.id)}
                          onChange={(e) => setEdit({
                            ...edit,
                            escopo_ids: e.target.checked
                              ? [...edit.escopo_ids, d.id]
                              : edit.escopo_ids.filter((x) => x !== d.id),
                          })} />
                        {d.nome}
                      </label>
                    ))}
                    {devices.length === 0 && <span className="text-xs text-muted-foreground">Nenhum dispositivo</span>}
                  </div>
                )}

                {edit.escopo_tipo === "grupos" && (
                  <div className="grid grid-cols-2 gap-1 max-h-48 overflow-y-auto border rounded p-2">
                    {grupos.map((g) => (
                      <label key={g.id} className="flex items-center gap-2 text-sm">
                        <input type="checkbox"
                          checked={edit.escopo_ids.includes(g.id)}
                          onChange={(e) => setEdit({
                            ...edit,
                            escopo_ids: e.target.checked
                              ? [...edit.escopo_ids, g.id]
                              : edit.escopo_ids.filter((x) => x !== g.id),
                          })} />
                        {g.nome}
                      </label>
                    ))}
                    {grupos.length === 0 && <span className="text-xs text-muted-foreground">Nenhum grupo</span>}
                  </div>
                )}

                {edit.escopo_tipo === "dashboard" && (
                  <Select value={edit.dashboard_id || ""}
                    onValueChange={(v) => setEdit({ ...edit, dashboard_id: v })}>
                    <SelectTrigger><SelectValue placeholder="Selecione um dashboard" /></SelectTrigger>
                    <SelectContent>
                      {dashboards.map((d) => <SelectItem key={d.id} value={d.id}>{d.nome}</SelectItem>)}
                    </SelectContent>
                  </Select>
                )}
              </Card>
            </div>
          )}
          <DialogFooter className="border-t pt-3">
            <Button variant="outline" onClick={() => setEdit(null)}>Cancelar</Button>
            <Button onClick={salvar} disabled={loading}>{loading ? "Salvando..." : "Salvar"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <DeleteConfirmDialog
        open={!!confirmDelete}
        onOpenChange={(o) => !o && setConfirmDelete(null)}
        onConfirm={excluir}
        title="Excluir workflow?"
        description={confirmDelete ? `"${confirmDelete.nome}" será removido permanentemente.` : ""}
      />
    </div>
  );
}
