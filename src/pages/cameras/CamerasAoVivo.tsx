import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Radio, Building2, Layers, Loader2, Camera as CameraIcon } from "lucide-react";
import { CameraLiveTile } from "@/components/cameras/CameraLiveTile";
import { cn } from "@/lib/utils";

interface Cam {
  id: string;
  nome: string;
  filial_id: string | null;
  grupo_id: string | null;
  ativo: boolean;
}

const SEM_FILIAL = "__sem_filial__";
const SEM_GRUPO = "__sem_grupo__";

export default function CamerasAoVivo() {
  const [grupos, setGrupos] = useState<any[]>([]);
  const [filiais, setFiliais] = useState<any[]>([]);
  const [cams, setCams] = useState<Cam[] | null>(null);
  const [grupoId, setGrupoId] = useState<string>("all");
  const [filialId, setFilialId] = useState<string>("all");
  const [cols, setCols] = useState<string>("3");

  useEffect(() => {
    (async () => {
      const [g, f, c] = await Promise.all([
        supabase.from("cameras_grupos").select("id,nome").eq("ativo", true).order("nome"),
        supabase.from("ponto_filiais").select("id,nome").eq("ativo", true).order("nome"),
        supabase.from("cv_cameras").select("id,nome,filial_id,grupo_id,ativo").eq("ativo", true).order("nome"),
      ]);
      setGrupos(g.data ?? []);
      setFiliais(f.data ?? []);
      setCams((c.data ?? []) as Cam[]);
    })();
  }, []);

  const filialMap = useMemo(() => Object.fromEntries(filiais.map((f) => [f.id, f.nome])), [filiais]);
  const grupoMap = useMemo(() => Object.fromEntries(grupos.map((g) => [g.id, g.nome])), [grupos]);

  // Filtra
  const filtered = useMemo(() => {
    if (!cams) return [];
    return cams.filter((c) => {
      if (filialId !== "all" && (c.filial_id ?? SEM_FILIAL) !== filialId) return false;
      if (grupoId !== "all" && (c.grupo_id ?? SEM_GRUPO) !== grupoId) return false;
      return true;
    });
  }, [cams, filialId, grupoId]);

  // Agrupa por filial -> setor
  const grouped = useMemo(() => {
    const map = new Map<string, Map<string, Cam[]>>();
    for (const c of filtered) {
      const fk = c.filial_id ?? SEM_FILIAL;
      const gk = c.grupo_id ?? SEM_GRUPO;
      if (!map.has(fk)) map.set(fk, new Map());
      const inner = map.get(fk)!;
      if (!inner.has(gk)) inner.set(gk, []);
      inner.get(gk)!.push(c);
    }
    return map;
  }, [filtered]);

  const colClass =
    cols === "1" ? "grid-cols-1" :
    cols === "2" ? "grid-cols-1 sm:grid-cols-2" :
    cols === "4" ? "grid-cols-1 sm:grid-cols-2 lg:grid-cols-4" :
    "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3";

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-lg sm:text-xl font-bold flex items-center gap-2">
            <Radio className="h-5 w-5 text-red-500 animate-pulse" /> Câmeras ao vivo
          </h2>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Streaming WebRTC via Coletor Desktop · agrupadas por filial e setor
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
              <SelectItem value={SEM_FILIAL}>Sem filial</SelectItem>
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
              <SelectItem value={SEM_GRUPO}>Sem setor</SelectItem>
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

      {cams === null && (
        <div className="flex items-center justify-center py-10 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin mr-2" /> Carregando câmeras...
        </div>
      )}

      {cams !== null && filtered.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-2">
          <CameraIcon className="h-8 w-8 opacity-40" />
          <p className="text-sm">Nenhuma câmera ativa para os filtros selecionados</p>
        </div>
      )}

      <div className="space-y-6">
        {Array.from(grouped.entries()).map(([fk, setores]) => {
          const filialNome = fk === SEM_FILIAL ? "Sem filial" : filialMap[fk] ?? "Filial";
          const totalNaFilial = Array.from(setores.values()).reduce((n, arr) => n + arr.length, 0);
          return (
            <section key={fk} className="space-y-3">
              <div className="flex items-center gap-2 border-b pb-2">
                <Building2 className="h-4 w-4 text-primary" />
                <h3 className="text-sm font-semibold">{filialNome}</h3>
                <span className="text-xs text-muted-foreground">
                  · {totalNaFilial} câmera{totalNaFilial === 1 ? "" : "s"}
                </span>
              </div>

              <div className="space-y-4 pl-1">
                {Array.from(setores.entries()).map(([gk, list]) => {
                  const setorNome = gk === SEM_GRUPO ? "Sem setor" : grupoMap[gk] ?? "Setor";
                  return (
                    <div key={gk} className="space-y-2">
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Layers className="h-3.5 w-3.5" />
                        <span className="font-medium">{setorNome}</span>
                        <span>· {list.length}</span>
                      </div>
                      <div className={cn("grid gap-3", colClass)}>
                        {list.map((c) => (
                          <CameraLiveTile
                            key={c.id}
                            cameraId={c.id}
                            cameraNome={c.nome}
                            filialId={c.filial_id ?? null}
                          />
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
