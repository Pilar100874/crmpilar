import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Camera, Layers, Plus, TestTube, ImageIcon } from "lucide-react";
import { toast } from "sonner";

export default function CamerasDashboard() {
  const navigate = useNavigate();
  const [grupos, setGrupos] = useState<any[]>([]);
  const [cams, setCams] = useState<any[]>([]);
  const [snapshots, setSnapshots] = useState<Record<string, string>>({});
  const [testing, setTesting] = useState<string | null>(null);

  const load = async () => {
    const [{ data: g }, { data: c }] = await Promise.all([
      supabase.from("cameras_grupos").select("*").eq("ativo", true).order("ordem").order("nome"),
      supabase.from("cv_cameras").select("*").eq("ativo", true).order("nome"),
    ]);
    setGrupos(g ?? []);
    setCams(c ?? []);
  };

  useEffect(() => {
    load();
  }, []);

  const snapshot = async (cam: any) => {
    setTesting(cam.id);
    try {
      const { data, error } = await supabase.functions.invoke("cv-camera-snapshot", {
        body: { camera_id: cam.id },
      });
      if (error) throw error;
      const url = (data as any)?.signed_url;
      if (url) {
        setSnapshots((s) => ({ ...s, [cam.id]: url }));
        toast.success("Snapshot atualizado");
      } else throw new Error((data as any)?.error || "Falha");
    } catch (e: any) {
      toast.error(e.message ?? "Falha");
    } finally {
      setTesting(null);
    }
  };

  const camsPorGrupo = (id: string | null) =>
    cams.filter((c) => (id === null ? !c.grupo_id : c.grupo_id === id));

  const semGrupo = camsPorGrupo(null);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Camera className="h-5 w-5 text-primary" /> Dashboard de Câmeras
          </h2>
          <p className="text-sm text-muted-foreground">
            {grupos.length} grupo(s) · {cams.length} câmera(s) ativa(s)
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => navigate("/cameras/grupos")}>
            <Layers className="h-4 w-4 mr-2" /> Grupos
          </Button>
          <Button onClick={() => navigate("/cameras/cameras")}>
            <Plus className="h-4 w-4 mr-2" /> Nova câmera
          </Button>
        </div>
      </div>

      {grupos.length === 0 && cams.length === 0 && (
        <Card className="p-8 text-center text-muted-foreground">
          Nenhum grupo ou câmera cadastrada. Comece criando um grupo (setor) e depois adicione câmeras.
        </Card>
      )}

      {grupos.map((g) => {
        const list = camsPorGrupo(g.id);
        return (
          <Card key={g.id}>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <span
                  className="inline-block h-3 w-3 rounded-full"
                  style={{ background: g.cor || "#f97316" }}
                />
                {g.nome}
                {g.setor && <span className="text-xs text-muted-foreground">· {g.setor}</span>}
                <Badge variant="secondary" className="ml-auto">
                  {list.length} câm.
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {list.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhuma câmera neste grupo</p>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {list.map((c) => (
                    <CameraCard
                      key={c.id}
                      cam={c}
                      snapshot={snapshots[c.id]}
                      testing={testing === c.id}
                      onCapture={() => snapshot(c)}
                    />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}

      {semGrupo.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base text-muted-foreground">Sem grupo</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {semGrupo.map((c) => (
                <CameraCard
                  key={c.id}
                  cam={c}
                  snapshot={snapshots[c.id]}
                  testing={testing === c.id}
                  onCapture={() => snapshot(c)}
                />
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function CameraCard({
  cam,
  snapshot,
  testing,
  onCapture,
}: {
  cam: any;
  snapshot?: string;
  testing: boolean;
  onCapture: () => void;
}) {
  return (
    <Card className="overflow-hidden">
      <div className="aspect-video bg-muted flex items-center justify-center relative">
        {snapshot ? (
          <img src={snapshot} alt={cam.nome} className="w-full h-full object-cover" />
        ) : (
          <ImageIcon className="h-8 w-8 text-muted-foreground/50" />
        )}
        <Badge className="absolute top-2 right-2" variant={cam.tipo_rede === "publica" ? "default" : "secondary"}>
          {cam.tipo_rede === "publica" ? "Pública" : "Interna"}
        </Badge>
      </div>
      <CardContent className="p-3 space-y-1">
        <div className="font-medium text-sm flex items-center gap-2">
          <Camera className="h-3.5 w-3.5 text-primary" /> {cam.nome}
        </div>
        <div className="text-xs text-muted-foreground truncate">
          {cam.protocolo}://{cam.host}:{cam.porta ?? "auto"}
        </div>
        <Button size="sm" variant="secondary" className="w-full mt-2" disabled={testing} onClick={onCapture}>
          <TestTube className="h-3 w-3 mr-1" /> {testing ? "Capturando..." : "Atualizar snapshot"}
        </Button>
      </CardContent>
    </Card>
  );
}
