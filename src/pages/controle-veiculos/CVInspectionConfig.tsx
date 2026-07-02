import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Camera, Plus, Trash2, Save, Settings } from "lucide-react";
import { toast } from "sonner";
import { CVPageHeader } from "./CVPageHeader";

type AngleSource = "device" | "ip_camera";
interface Angle { key: string; label: string; required: boolean; source?: AngleSource; camera_id?: string | null; exit_camera_id?: string | null; }
interface CameraOption { id: string; nome: string; }


export default function CVInspectionConfig() {
  const [id, setId] = useState<string | null>(null);
  const [photos, setPhotos] = useState<Angle[]>([]);
  const [exitRequired, setExitRequired] = useState(true);
  const [entryRequired, setEntryRequired] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [cameras, setCameras] = useState<CameraOption[]>([]);

  const normalize = (list: any[]): Angle[] =>
    (list ?? []).map((a: any) => ({
      key: a.key,
      label: a.label,
      required: !!a.required,
      source: a.source === "ip_camera" ? "ip_camera" : "device",
      camera_id: a.camera_id ?? null,
      exit_camera_id: a.exit_camera_id ?? null,
    }));

  const load = async () => {
    const [{ data }, { data: cams }] = await Promise.all([
      supabase.from("cv_inspection_config").select("*").eq("active", true).order("created_at").limit(1).maybeSingle(),
      supabase.from("cv_cameras").select("id, nome").eq("ativo", true).order("nome"),
    ]);
    setCameras((cams ?? []) as CameraOption[]);
    if (data) {
      setId(data.id);
      const base = normalize((data.exit_photos as any) ?? []);
      const fallback = normalize((data.entry_photos as any) ?? []);
      setPhotos(base.length ? base : fallback);
      setExitRequired((data as any).exit_photos_required ?? true);
      setEntryRequired((data as any).entry_photos_required ?? true);
    }
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const slugify = (s: string) =>
    s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "") || `angle_${Date.now()}`;

  const addAngle = () => setPhotos([...photos, { key: `angle_${Date.now()}`, label: "Novo ângulo", required: true, source: "device", camera_id: null, exit_camera_id: null }]);
  const removeAngle = (i: number) => setPhotos(photos.filter((_, idx) => idx !== i));

  const updateAngle = (i: number, patch: Partial<Angle>) =>
    setPhotos(photos.map((a, idx) => {
      if (idx !== i) return a;
      const next = { ...a, ...patch };
      if (patch.label !== undefined) next.key = slugify(patch.label);
      return next;
    }));

  const save = async () => {
    setSaving(true);
    const payload: any = {
      exit_photos: photos as any,
      entry_photos: photos as any, // mantém sincronizado — mesma lista para entrada e saída
      exit_photos_required: exitRequired,
      entry_photos_required: entryRequired,
      updated_at: new Date().toISOString(),
    };
    const q = id
      ? supabase.from("cv_inspection_config").update(payload).eq("id", id)
      : supabase.from("cv_inspection_config").insert({ ...payload, name: "default" });
    const { error } = await q;
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Configuração salva");
    load();
  };

  if (loading) return <div className="p-6 text-center text-muted-foreground">Carregando...</div>;

  return (
    <div className="space-y-4">
      <CVPageHeader
        icon={Settings}
        title="Configuração de Vistoria"
        subtitle="Ângulos de foto usados na entrada e na saída do veículo"
      />
      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="p-4 flex items-center justify-between gap-3">
          <div>
            <p className="font-medium">Fotos da Saída obrigatórias</p>
            <p className="text-xs text-muted-foreground">Se desligado, o operador pode concluir a saída sem tirar fotos.</p>
          </div>
          <Switch checked={exitRequired} onCheckedChange={setExitRequired} />
        </Card>
        <Card className="p-4 flex items-center justify-between gap-3">
          <div>
            <p className="font-medium">Fotos da Entrada obrigatórias</p>
            <p className="text-xs text-muted-foreground">Se desligado, o operador pode concluir a entrada sem tirar fotos.</p>
          </div>
          <Switch checked={entryRequired} onCheckedChange={setEntryRequired} />
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center justify-between text-base">
            <span className="flex items-center gap-2"><Camera className="h-4 w-4 text-primary" /> Ângulos de foto (entrada e saída)</span>
            <Button size="sm" variant="outline" onClick={addAngle}>
              <Plus className="h-4 w-4 mr-1" /> Adicionar
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {photos.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">Nenhum ângulo configurado</p>}
          {photos.map((a, i) => (
            <div key={i} className="flex flex-wrap items-end gap-2 p-3 border rounded bg-muted/30">
              <div className="flex-1 min-w-[220px] space-y-1">
                <Label className="text-xs">Nome do ângulo</Label>
                <Input value={a.label} onChange={(e) => updateAngle(i, { label: e.target.value })} />
              </div>
              <div className="min-w-[160px] space-y-1">
                <Label className="text-xs">Origem da imagem</Label>
                <Select
                  value={a.source ?? "device"}
                  onValueChange={(v) => updateAngle(i, { source: v as AngleSource, camera_id: v === "device" ? null : a.camera_id ?? null, exit_camera_id: v === "device" ? null : a.exit_camera_id ?? null })}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="device">Foto</SelectItem>
                    <SelectItem value="ip_camera">Câmera IP</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {a.source === "ip_camera" && (
                <>
                  <div className="min-w-[200px] space-y-1">
                    <Label className="text-xs">Câmera (Entrada)</Label>
                    <Select
                      value={a.camera_id ?? ""}
                      onValueChange={(v) => updateAngle(i, { camera_id: v })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={cameras.length ? "Selecione a câmera" : "Nenhuma câmera cadastrada"} />
                      </SelectTrigger>
                      <SelectContent>
                        {cameras.map((c) => (
                          <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="min-w-[200px] space-y-1">
                    <Label className="text-xs" title="Use quando o veículo entra por um ponto e sai por outro — a comparação usará esta câmera na saída.">
                      Câmera de saída (inverter)
                    </Label>
                    <Select
                      value={a.exit_camera_id ?? "__same__"}
                      onValueChange={(v) => updateAngle(i, { exit_camera_id: v === "__same__" ? null : v })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Mesma da entrada" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__same__">Mesma da entrada</SelectItem>
                        {cameras.map((c) => (
                          <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </>
              )}
              <div className="flex items-center gap-2 pb-2">
                <Switch checked={a.required} onCheckedChange={(v) => updateAngle(i, { required: v })} />
                <Label className="text-sm">Obrigatória</Label>
              </div>
              <Button variant="ghost" size="icon" onClick={() => removeAngle(i)}>
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </div>

          ))}
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={save} disabled={saving}>
          <Save className="h-4 w-4 mr-2" /> {saving ? "Salvando..." : "Salvar configuração"}
        </Button>
      </div>
      <Card className="bg-muted/30">
        <CardContent className="p-4 text-sm text-muted-foreground space-y-1">
          <p className="flex items-center gap-2"><Badge variant="outline">Dica</Badge> A mesma lista de ângulos é usada tanto na entrada quanto na saída, para que a comparação lado a lado funcione corretamente.</p>
          <p className="flex items-center gap-2"><Badge variant="outline">Inversão</Badge> Para câmeras IP, defina a <strong>Câmera de saída</strong> quando o veículo entra por um lado e sai por outro — o sistema fará a captura pela câmera correspondente ao sentido.</p>
        </CardContent>
      </Card>
    </div>
  );
}


