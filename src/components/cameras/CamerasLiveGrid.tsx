// Mosaico ao vivo de câmeras. Aceita filtros opcionais por grupo/filial.
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { CameraLiveTile } from "./CameraLiveTile";
import { Camera as CameraIcon, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  filialId?: string | null;
  grupoId?: string | null;
  cameraIds?: string[];         // se passado, ignora outros filtros
  columns?: 1 | 2 | 3 | 4;
  emptyMessage?: string;
  className?: string;
}

export function CamerasLiveGrid({
  filialId,
  grupoId,
  cameraIds,
  columns = 3,
  emptyMessage = "Nenhuma câmera ativa para exibir",
  className,
}: Props) {
  const [cams, setCams] = useState<any[] | null>(null);

  useEffect(() => {
    (async () => {
      let q = supabase.from("cv_cameras").select("id,nome,filial_id,grupo_id,ativo").eq("ativo", true).order("nome");
      if (cameraIds && cameraIds.length) q = q.in("id", cameraIds);
      else {
        if (filialId) q = q.eq("filial_id", filialId);
        if (grupoId) q = q.eq("grupo_id", grupoId);
      }
      const { data } = await q;
      setCams(data ?? []);
    })();
  }, [filialId, grupoId, JSON.stringify(cameraIds)]);

  if (cams === null) {
    return (
      <div className="flex items-center justify-center py-10 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin mr-2" /> Carregando câmeras...
      </div>
    );
  }
  if (cams.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-10 text-muted-foreground gap-2">
        <CameraIcon className="h-8 w-8 opacity-40" />
        <p className="text-sm">{emptyMessage}</p>
      </div>
    );
  }

  const colClass =
    columns === 1 ? "grid-cols-1" :
    columns === 2 ? "grid-cols-1 sm:grid-cols-2" :
    columns === 4 ? "grid-cols-1 sm:grid-cols-2 lg:grid-cols-4" :
    "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3";

  return (
    <div className={cn("grid gap-3", colClass, className)}>
      {cams.map((c) => (
        <CameraLiveTile
          key={c.id}
          cameraId={c.id}
          cameraNome={c.nome}
          filialId={c.filial_id ?? filialId ?? null}
        />
      ))}
    </div>
  );
}
