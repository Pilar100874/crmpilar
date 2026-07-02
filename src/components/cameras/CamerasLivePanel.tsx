// Painel colapsável com mosaico de câmeras ao vivo, para uso em outras telas
// (ex.: portaria/entrada/saída de veículos).
import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronUp, Radio } from "lucide-react";
import { CamerasLiveGrid } from "./CamerasLiveGrid";

interface Props {
  title?: string;
  filialId?: string | null;
  grupoId?: string | null;
  cameraIds?: string[];
  columns?: 1 | 2 | 3 | 4;
  defaultOpen?: boolean;
}

export function CamerasLivePanel({
  title = "Câmeras ao vivo",
  filialId,
  grupoId,
  cameraIds,
  columns = 3,
  defaultOpen = false,
}: Props) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <Card className="p-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-sm font-medium">
          <Radio className={`h-4 w-4 ${open ? "text-red-500 animate-pulse" : "text-muted-foreground"}`} />
          {title}
        </div>
        <Button size="sm" variant="ghost" onClick={() => setOpen((o) => !o)}>
          {open ? <><ChevronUp className="h-4 w-4 mr-1" /> Ocultar</> : <><ChevronDown className="h-4 w-4 mr-1" /> Mostrar</>}
        </Button>
      </div>
      {open && (
        <div className="pt-3">
          <CamerasLiveGrid
            filialId={filialId ?? null}
            grupoId={grupoId ?? null}
            cameraIds={cameraIds}
            columns={columns}
          />
        </div>
      )}
    </Card>
  );
}
