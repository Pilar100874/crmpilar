import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Radio } from "lucide-react";
import { CamerasLiveGrid } from "@/components/cameras/CamerasLiveGrid";

export default function CamerasAoVivo() {
  const [grupos, setGrupos] = useState<any[]>([]);
  const [filiais, setFiliais] = useState<any[]>([]);
  const [grupoId, setGrupoId] = useState<string>("all");
  const [filialId, setFilialId] = useState<string>("all");
  const [cols, setCols] = useState<string>("3");

  useEffect(() => {
    (async () => {
      const [g, f] = await Promise.all([
        supabase.from("cameras_grupos").select("id,nome").eq("ativo", true).order("nome"),
        supabase.from("ponto_filiais").select("id,nome").eq("ativo", true).order("nome"),
      ]);
      setGrupos(g.data ?? []);
      setFiliais(f.data ?? []);
    })();
  }, []);

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-lg sm:text-xl font-bold flex items-center gap-2">
            <Radio className="h-5 w-5 text-red-500 animate-pulse" /> Câmeras ao vivo
          </h2>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Streaming WebRTC via Coletor Desktop
          </p>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="space-y-1">
          <Label className="text-xs">Filial</Label>
          <Select value={filialId} onValueChange={setFilialId}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas</SelectItem>
              {filiais.map((f) => <SelectItem key={f.id} value={f.id}>{f.nome}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Grupo / Setor</Label>
          <Select value={grupoId} onValueChange={setGrupoId}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              {grupos.map((g) => <SelectItem key={g.id} value={g.id}>{g.nome}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Colunas</Label>
          <Select value={cols} onValueChange={setCols}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="1">1</SelectItem>
              <SelectItem value="2">2</SelectItem>
              <SelectItem value="3">3</SelectItem>
              <SelectItem value="4">4</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <CamerasLiveGrid
        filialId={filialId === "all" ? null : filialId}
        grupoId={grupoId === "all" ? null : grupoId}
        columns={Number(cols) as 1 | 2 | 3 | 4}
      />
    </div>
  );
}
