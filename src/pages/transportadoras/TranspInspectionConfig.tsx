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
import { getEstabelecimentoId } from "@/lib/estabelecimento";
import { TRANSP_ANGLES } from "@/lib/transportadoras/dados";

type AngleSource = "device" | "ip_camera";
interface Angle { key: string; label: string; required: boolean; source?: AngleSource; camera_id?: string | null }
interface CameraOption { id: string; nome: string }

export default function TranspInspectionConfig() {
  const [id, setId] = useState<string | null>(null);
  const [entryPhotos, setEntryPhotos] = useState<Angle[]>([]);
  const [exitPhotos, setExitPhotos] = useState<Angle[]>([]);
  const [entryRequired, setEntryRequired] = useState(true);
  const [exitRequired, setExitRequired] = useState(true);
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
    }));

  const load = async () => {
    const [{ data }, { data: cams }] = await Promise.all([
      supabase.from("transp_inspection_config").select("*").eq("active", true).order("created_at").limit(1).maybeSingle(),
      supabase.from("cv_cameras").select("id, nome").eq("ativo", true).order("nome"),
    ]);
    setCameras((cams ?? []) as CameraOption[]);
    if (data) {
      setId(data.id);
      const en = normalize((data.entry_photos as any) ?? []);
      const ex = normalize((data.exit_photos as any) ?? []);
      setEntryPhotos(en.length ? en : normalize(TRANSP_ANGLES as any));
      setExitPhotos(ex.length ? ex : normalize(TRANSP_ANGLES as any));
      setEntryRequired((data as any).entry_photos_required ?? true);
      setExitRequired((data as any).exit_photos_required ?? true);
    } else {
      setEntryPhotos(normalize(TRANSP_ANGLES as any));
      setExitPhotos(normalize(TRANSP_ANGLES as any));
    }
    setLoading(false);
  };
  useEffect(() => { load(); }, []);


  const slugify = (s: string) =>
    s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "") || `angle_${Date.now()}`;

  const save = async () => {
    setSaving(true);
    const payload: any = {
      entry_photos: entryPhotos as any,
      exit_photos: exitPhotos as any,
      entry_photos_required: entryRequired,
      exit_photos_required: exitRequired,
      updated_at: new Date().toISOString(),
    };
    let q;
    if (id) {
      q = supabase.from("transp_inspection_config").update(payload).eq("id", id);
    } else {
      const estId = await getEstabelecimentoId();
      q = supabase.from("transp_inspection_config").insert({ ...payload, name: "default", estabelecimento_id: estId });
    }
    const { error } = await q;
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Configuração salva");
    load();
  };

  const renderList = (
    titulo: string,
    list: Angle[],
    setList: (v: Angle[]) => void,
  ) => (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between text-base">
          <span className="flex items-center gap-2"><Camera className="h-4 w-4 text-primary" /> {titulo}</span>
          <Button size="sm" variant="outline" onClick={() => setList([...list, { key: `angle_${Date.now()}`, label: "Novo ângulo", required: true }])}>
            <Plus className="h-4 w-4 mr-1" /> Adicionar
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {list.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">Nenhum ângulo configurado</p>}
        {list.map((a, i) => (
          <div key={i} className="flex flex-col sm:flex-row sm:items-end gap-2 p-3 border rounded bg-muted/30">
            <div className="flex-1 space-y-1">
              <Label className="text-xs">Nome do ângulo</Label>
              <Input
                value={a.label}
                onChange={(e) =>
                  setList(list.map((x, idx) => (idx === i ? { ...x, label: e.target.value, key: slugify(e.target.value) } : x)))
                }
              />
            </div>
            <div className="flex items-center justify-between gap-3 sm:pb-2">
              <div className="flex items-center gap-2">
                <Switch
                  checked={a.required}
                  onCheckedChange={(v) => setList(list.map((x, idx) => (idx === i ? { ...x, required: v } : x)))}
                />
                <Label className="text-sm">Obrigatória</Label>
              </div>
              <Button variant="ghost" size="icon" onClick={() => setList(list.filter((_, idx) => idx !== i))}>
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );

  if (loading) return <div className="p-6 text-center text-muted-foreground">Carregando...</div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Settings className="h-5 w-5 text-primary" />
        <div>
          <h2 className="text-lg font-bold">Configuração de Vistoria (Transportadoras)</h2>
          <p className="text-xs text-muted-foreground">Ângulos de foto exclusivos do módulo de terceiros — independente do Controle de Veículos.</p>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="p-4 flex items-center justify-between gap-3">
          <div>
            <p className="font-medium">Fotos da Entrada obrigatórias</p>
            <p className="text-xs text-muted-foreground">Se desligado, é possível concluir a entrada sem fotos.</p>
          </div>
          <Switch checked={entryRequired} onCheckedChange={setEntryRequired} />
        </Card>
        <Card className="p-4 flex items-center justify-between gap-3">
          <div>
            <p className="font-medium">Fotos da Saída obrigatórias</p>
            <p className="text-xs text-muted-foreground">Se desligado, é possível concluir a saída sem fotos.</p>
          </div>
          <Switch checked={exitRequired} onCheckedChange={setExitRequired} />
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {renderList("Ângulos da Entrada", entryPhotos, setEntryPhotos)}
        {renderList("Ângulos da Saída", exitPhotos, setExitPhotos)}
      </div>

      <div className="flex justify-end">
        <Button onClick={save} disabled={saving}>
          <Save className="h-4 w-4 mr-2" /> {saving ? "Salvando..." : "Salvar configuração"}
        </Button>
      </div>

      <Card className="bg-muted/30">
        <CardContent className="p-4 text-sm text-muted-foreground">
          <p className="flex items-center gap-2">
            <Badge variant="outline">Dica</Badge>
            Entrada e saída podem ter listas diferentes — aqui não há comparação de avarias, apenas registro fotográfico.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
