import { CameraLiveTile } from "@/components/cameras/CameraLiveTile";
import { Camera as CameraIcon } from "lucide-react";
import { Bloco } from "@/lib/automacao/api";

export default function BlocoCamera({ bloco }: { bloco: Bloco }) {
  const cfg = (bloco.config ?? {}) as { camera_id?: string; filial_id?: string | null };

  if (!cfg.camera_id) {
    return (
      <div className="h-full rounded-2xl border border-border bg-card flex flex-col items-center justify-center gap-2 text-muted-foreground">
        <CameraIcon className="h-6 w-6 opacity-50" />
        <p className="text-xs">Escolha uma câmera na configuração</p>
      </div>
    );
  }

  return (
    <div className="h-full rounded-2xl border border-border bg-card overflow-hidden">
      <CameraLiveTile
        cameraId={cfg.camera_id}
        cameraNome={bloco.nome}
        filialId={cfg.filial_id ?? null}
        className="h-full w-full"
      />
    </div>
  );
}
