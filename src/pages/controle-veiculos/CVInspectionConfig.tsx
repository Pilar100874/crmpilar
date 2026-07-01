import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Camera, Plus, Trash2, Save, Settings } from "lucide-react";
import { toast } from "sonner";
import { CVPageHeader } from "./CVPageHeader";

interface Angle { key: string; label: string; required: boolean; }

export default function CVInspectionConfig() {
  const [id, setId] = useState<string | null>(null);
  const [exitPhotos, setExitPhotos] = useState<Angle[]>([]);
  const [entryPhotos, setEntryPhotos] = useState<Angle[]>([]);
  const [exitRequired, setExitRequired] = useState(true);
  const [entryRequired, setEntryRequired] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    const { data } = await supabase
      .from("cv_inspection_config")
      .select("*")
      .eq("active", true)
      .order("created_at")
      .limit(1)
      .maybeSingle();
    if (data) {
      setId(data.id);
      setExitPhotos((data.exit_photos as any) ?? []);
      setEntryPhotos((data.entry_photos as any) ?? []);
      setExitRequired((data as any).exit_photos_required ?? true);
      setEntryRequired((data as any).entry_photos_required ?? true);
    }
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const addAngle = (list: Angle[], setter: (a: Angle[]) => void) => {
    setter([...list, { key: `angle_${Date.now()}`, label: "Novo ângulo", required: true }]);
  };
  const removeAngle = (i: number, list: Angle[], setter: (a: Angle[]) => void) => {
    setter(list.filter((_, idx) => idx !== i));
  };
  const updateAngle = (i: number, patch: Partial<Angle>, list: Angle[], setter: (a: Angle[]) => void) => {
    setter(list.map((a, idx) => (idx === i ? { ...a, ...patch } : a)));
  };

  const save = async () => {
    setSaving(true);
    const payload: any = {
      exit_photos: exitPhotos as any,
      entry_photos: entryPhotos as any,
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


  const renderList = (title: string, list: Angle[], setter: (a: Angle[]) => void) => (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between text-base">
          <span className="flex items-center gap-2"><Camera className="h-4 w-4 text-primary" /> {title}</span>
          <Button size="sm" variant="outline" onClick={() => addAngle(list, setter)}>
            <Plus className="h-4 w-4 mr-1" /> Adicionar
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {list.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">Nenhum ângulo configurado</p>}
        {list.map((a, i) => (
          <div key={i} className="flex flex-wrap items-end gap-2 p-3 border rounded bg-muted/30">
            <div className="flex-1 min-w-[180px] space-y-1">
              <Label className="text-xs">Nome exibido</Label>
              <Input value={a.label} onChange={(e) => updateAngle(i, { label: e.target.value }, list, setter)} />
            </div>
            <div className="w-32 space-y-1">
              <Label className="text-xs">Chave</Label>
              <Input value={a.key} onChange={(e) => updateAngle(i, { key: e.target.value }, list, setter)} />
            </div>
            <div className="flex items-center gap-2 pb-2">
              <Switch checked={a.required} onCheckedChange={(v) => updateAngle(i, { required: v }, list, setter)} />
              <Label className="text-sm">Obrigatória</Label>
            </div>
            <Button variant="ghost" size="icon" onClick={() => removeAngle(i, list, setter)}>
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          </div>
        ))}
      </CardContent>
    </Card>
  );

  if (loading) return <div className="p-6 text-center text-muted-foreground">Carregando...</div>;

  return (
    <div className="space-y-4">
      <CVPageHeader
        icon={Settings}
        title="Configuração de Vistoria"
        subtitle="Defina os ângulos de foto obrigatórios na entrada e saída"
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
      <div className="grid gap-4 lg:grid-cols-2">
        {renderList("Fotos na Saída", exitPhotos, setExitPhotos)}
        {renderList("Fotos na Entrada", entryPhotos, setEntryPhotos)}
      </div>
      <div className="flex justify-end">
        <Button onClick={save} disabled={saving}>
          <Save className="h-4 w-4 mr-2" /> {saving ? "Salvando..." : "Salvar configuração"}
        </Button>
      </div>
      <Card className="bg-muted/30">
        <CardContent className="p-4 text-sm text-muted-foreground space-y-1">
          <p className="flex items-center gap-2"><Badge variant="outline">Dica</Badge> Se a opção "obrigatórias" estiver <strong>ligada</strong>, ângulos marcados como Obrigatórios travam a conclusão até serem capturados.</p>
        </CardContent>
      </Card>
    </div>
  );
}
      <div className="flex justify-end">
        <Button onClick={save} disabled={saving}>
          <Save className="h-4 w-4 mr-2" /> {saving ? "Salvando..." : "Salvar configuração"}
        </Button>
      </div>
      <Card className="bg-muted/30">
        <CardContent className="p-4 text-sm text-muted-foreground space-y-1">
          <p className="flex items-center gap-2"><Badge variant="outline">Dica</Badge> Ângulos marcados como <strong>Obrigatórios</strong> bloqueiam a conclusão do registro caso a foto não seja tirada.</p>
        </CardContent>
      </Card>
    </div>
  );
}
