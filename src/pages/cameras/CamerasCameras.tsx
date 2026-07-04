import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DeleteConfirmDialog } from "@/components/ui/delete-confirm-dialog";
import { Camera, Plus, Edit, Trash2, Wifi, TestTube, Radio } from "lucide-react";
import { toast } from "sonner";
import { CameraLiveViewer } from "@/components/cameras/CameraLiveViewer";
import { StatusPingDot } from "@/components/StatusPingDot";


const MARCAS = [
  { value: "tplink_tapo", label: "TP-Link Tapo" },
  { value: "hikvision", label: "Hikvision" },
  { value: "intelbras", label: "Intelbras" },
  { value: "generica_http", label: "Genérica HTTP" },
  { value: "generica_rtsp", label: "Genérica RTSP" },
];

const emptyCam = {
  id: null as string | null,
  nome: "",
  marca: "hikvision",
  tipo_rede: "interna",
  host: "",
  porta: 80,
  protocolo: "http",
  usuario: "",
  senha: "",
  snapshot_path: "",
  local_descricao: "",
  ativo: true,
  grupo_id: null as string | null,
  filial_id: null as string | null,
};

export default function CamerasCameras() {
  const [rows, setRows] = useState<any[]>([]);
  const [grupos, setGrupos] = useState<any[]>([]);
  const [filtroGrupo, setFiltroGrupo] = useState<string>("all");
  const [collectorEnabled, setCollectorEnabled] = useState(false);
  const [collectorId, setCollectorId] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<any>(emptyCam);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [testing, setTesting] = useState<string | null>(null);
  const [liveCam, setLiveCam] = useState<{ id: string; nome: string; filial_id: string | null } | null>(null);
  const [filiais, setFiliais] = useState<any[]>([]);

  const load = async () => {
    const [{ data: cams }, { data: coletor }, { data: grps }, { data: fils }] = await Promise.all([
      supabase.from("cv_cameras").select("*").order("nome"),
      supabase.from("cv_coletor_config").select("*").maybeSingle(),
      supabase.from("cameras_grupos").select("*").order("ordem").order("nome"),
      supabase.from("ponto_filiais").select("id,nome,cidade,uf").eq("ativo", true).order("nome"),
    ]);
    setRows(cams ?? []);
    setGrupos(grps ?? []);
    setFiliais(fils ?? []);
    if (coletor) {
      setCollectorEnabled(coletor.cameras_habilitado);
      setCollectorId(coletor.id);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const openNew = () => {
    setEditing({ ...emptyCam, grupo_id: filtroGrupo !== "all" ? filtroGrupo : null });
    setDialogOpen(true);
  };
  const openEdit = (r: any) => {
    setEditing({ ...emptyCam, ...r });
    setDialogOpen(true);
  };

  const slugify = (s: string) =>
    (s || "camera").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "") || `camera_${Date.now()}`;

  const save = async () => {
    const payload: any = { ...editing };
    delete payload.id;
    if (!payload.angulo_key) payload.angulo_key = slugify(payload.nome);
    const q = editing.id
      ? supabase.from("cv_cameras").update(payload).eq("id", editing.id)
      : supabase.from("cv_cameras").insert(payload);
    const { error } = await q;
    if (error) return toast.error(error.message);
    toast.success("Câmera salva");
    setDialogOpen(false);
    load();
  };

  const remove = async () => {
    if (!deleteId) return;
    const { error } = await supabase.from("cv_cameras").delete().eq("id", deleteId);
    if (error) return toast.error(error.message);
    toast.success("Câmera removida");
    setDeleteId(null);
    load();
  };

  const testSnapshot = async (cam: any) => {
    setTesting(cam.id);
    try {
      const { data, error } = await supabase.functions.invoke("cv-camera-snapshot", {
        body: { camera_id: cam.id },
      });
      if (error) throw error;
      if ((data as any)?.signed_url) {
        window.open((data as any).signed_url, "_blank");
        toast.success("Snapshot capturado");
      } else throw new Error((data as any)?.error || "Falha");
    } catch (e: any) {
      toast.error(e.message ?? "Falha ao testar");
    } finally {
      setTesting(null);
    }
  };

  const toggleCollector = async (v: boolean) => {
    setCollectorEnabled(v);
    if (collectorId) {
      await supabase.from("cv_coletor_config").update({ cameras_habilitado: v }).eq("id", collectorId);
    } else {
      const { data } = await supabase
        .from("cv_coletor_config")
        .insert({ cameras_habilitado: v })
        .select()
        .single();
      if (data) setCollectorId(data.id);
    }
    toast.success("Configuração do Coletor atualizada");
  };

  const filtered = rows.filter((r) => {
    if (filtroGrupo === "all") return true;
    if (filtroGrupo === "none") return !r.grupo_id;
    return r.grupo_id === filtroGrupo;
  });

  const grupoNome = (id: string | null) =>
    id ? grupos.find((g) => g.id === id)?.nome ?? "—" : "Sem grupo";

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-lg sm:text-xl font-bold flex items-center gap-2">
            <Camera className="h-5 w-5 text-primary shrink-0" /> Câmeras
          </h2>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Tapo, Hikvision, Intelbras · IPs públicos ou locais via Coletor
          </p>
        </div>
        <Button size="sm" onClick={openNew} className="w-full sm:w-auto">
          <Plus className="h-4 w-4 mr-2" /> Nova câmera
        </Button>
      </div>

      <Card className="p-3 sm:p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-start gap-3">
          <Wifi className="h-5 w-5 text-primary mt-0.5 shrink-0" />
          <div className="min-w-0">
            <p className="font-medium text-sm">Módulo de câmeras no Coletor Desktop</p>
            <p className="text-xs text-muted-foreground">
              Necessário para câmeras internas (rede local). Públicas funcionam sem Coletor.
            </p>
          </div>
        </div>
        <Switch checked={collectorEnabled} onCheckedChange={toggleCollector} />
      </Card>

      <div className="flex flex-col sm:flex-row sm:items-center gap-2">
        <Label className="text-sm text-muted-foreground shrink-0">Filtrar por grupo:</Label>
        <Select value={filtroGrupo} onValueChange={setFiltroGrupo}>
          <SelectTrigger className="w-full sm:w-64">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os grupos</SelectItem>
            <SelectItem value="none">Sem grupo</SelectItem>
            {grupos.map((g) => (
              <SelectItem key={g.id} value={g.id}>
                {g.nome}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.length === 0 && (
          <Card className="col-span-full p-8 text-center text-muted-foreground">
            Nenhuma câmera nesta seleção
          </Card>
        )}
        {filtered.map((r) => (
          <Card key={r.id} className={r.ativo ? "" : "opacity-60"}>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center justify-between text-base">
                <span className="flex items-center gap-2">
                  <Camera className="h-4 w-4 text-primary" /> {r.nome}
                </span>
                <Badge variant={r.tipo_rede === "publica" ? "default" : "secondary"}>
                  {r.tipo_rede === "publica" ? "Pública" : "Interna"}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm space-y-1">
              <div className="text-xs">
                <Badge variant="outline">{grupoNome(r.grupo_id)}</Badge>
              </div>
              <div className="text-muted-foreground">
                {MARCAS.find((m) => m.value === r.marca)?.label} · {r.protocolo}://{r.host}:{r.porta ?? "auto"}
              </div>
              {r.local_descricao && <div className="text-xs">Local: {r.local_descricao}</div>}
              <div className="flex gap-2 pt-2">
                <Button size="sm" variant="outline" onClick={() => openEdit(r)}>
                  <Edit className="h-3 w-3 mr-1" /> Editar
                </Button>
                {r.tipo_rede === "publica" && (
                  <Button
                    size="sm"
                    variant="secondary"
                    disabled={testing === r.id}
                    onClick={() => testSnapshot(r)}
                  >
                    <TestTube className="h-3 w-3 mr-1" /> {testing === r.id ? "..." : "Testar"}
                  </Button>
                )}
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => setLiveCam({ id: r.id, nome: r.nome, filial_id: r.filial_id ?? null })}
                >
                  <Radio className="h-3 w-3 mr-1" /> Ao vivo
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setDeleteId(r.id)}>
                  <Trash2 className="h-3 w-3 text-destructive" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <CameraLiveViewer
        cameraId={liveCam?.id ?? null}
        cameraNome={liveCam?.nome}
        filialId={liveCam?.filial_id ?? null}
        onClose={() => setLiveCam(null)}
      />

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing.id ? "Editar câmera" : "Nova câmera"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="sm:col-span-2 space-y-1">
              <Label>Nome</Label>
              <Input value={editing.nome} onChange={(e) => setEditing({ ...editing, nome: e.target.value })} />
            </div>
            <div className="sm:col-span-2 space-y-1">
              <Label>Grupo / Setor</Label>
              <Select
                value={editing.grupo_id ?? "none"}
                onValueChange={(v) => setEditing({ ...editing, grupo_id: v === "none" ? null : v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sem grupo</SelectItem>
                  {grupos.map((g) => (
                    <SelectItem key={g.id} value={g.id}>
                      {g.nome}
                      {g.setor ? ` — ${g.setor}` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="sm:col-span-2 space-y-1">
              <Label>Filial</Label>
              <Select
                value={editing.filial_id ?? "none"}
                onValueChange={(v) => setEditing({ ...editing, filial_id: v === "none" ? null : v })}
              >
                <SelectTrigger><SelectValue placeholder="Selecione a filial" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sem filial (todas)</SelectItem>
                  {filiais.map((f) => (
                    <SelectItem key={f.id} value={f.id}>
                      {f.nome}{f.cidade ? ` — ${f.cidade}/${f.uf}` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-[11px] text-muted-foreground">
                Define qual Coletor Desktop irá acessar essa câmera. Necessário quando há IPs iguais em filiais diferentes.
              </p>
            </div>
            <div className="space-y-1">
              <Label>Marca</Label>
              <Select value={editing.marca} onValueChange={(v) => setEditing({ ...editing, marca: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {MARCAS.map((m) => (
                    <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Tipo de rede</Label>
              <Select value={editing.tipo_rede} onValueChange={(v) => setEditing({ ...editing, tipo_rede: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="publica">Pública (IP acessível pela internet)</SelectItem>
                  <SelectItem value="interna">Interna (usar Coletor Desktop)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Host / IP</Label>
              <Input value={editing.host} onChange={(e) => setEditing({ ...editing, host: e.target.value })} />
            </div>
            <div className="space-y-1">
              <Label>Porta</Label>
              <Input
                type="number"
                value={editing.porta ?? ""}
                onChange={(e) => setEditing({ ...editing, porta: Number(e.target.value) || null })}
              />
            </div>
            <div className="space-y-1">
              <Label>Protocolo</Label>
              <Select value={editing.protocolo} onValueChange={(v) => setEditing({ ...editing, protocolo: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="http">HTTP</SelectItem>
                  <SelectItem value="https">HTTPS</SelectItem>
                  <SelectItem value="rtsp">RTSP</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Usuário</Label>
              <Input value={editing.usuario ?? ""} onChange={(e) => setEditing({ ...editing, usuario: e.target.value })} />
            </div>
            <div className="space-y-1">
              <Label>Senha</Label>
              <Input
                type="password"
                value={editing.senha ?? ""}
                onChange={(e) => setEditing({ ...editing, senha: e.target.value })}
              />
            </div>
            <div className="sm:col-span-2 space-y-1">
              <Label>Snapshot path (opcional)</Label>
              <Input
                placeholder="/ISAPI/Streaming/channels/101/picture"
                value={editing.snapshot_path ?? ""}
                onChange={(e) => setEditing({ ...editing, snapshot_path: e.target.value })}
              />
              <p className="text-[11px] text-muted-foreground">
                Deixe em branco para usar o padrão da marca.
              </p>
            </div>
            <div className="sm:col-span-2 space-y-1">
              <Label>Descrição do local</Label>
              <Input
                placeholder="Ex.: Doca 2 — parede leste"
                value={editing.local_descricao ?? ""}
                onChange={(e) => setEditing({ ...editing, local_descricao: e.target.value })}
              />
            </div>
            <div className="sm:col-span-2 flex items-center gap-2">
              <Switch checked={editing.ativo} onCheckedChange={(v) => setEditing({ ...editing, ativo: v })} />
              <Label>Ativa</Label>
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={save}>Salvar</Button>
          </div>
        </DialogContent>
      </Dialog>

      <DeleteConfirmDialog
        open={!!deleteId}
        onOpenChange={(v) => !v && setDeleteId(null)}
        onConfirm={remove}
        title="Excluir câmera?"
        description="Esta ação não pode ser desfeita."
      />
    </div>
  );
}
