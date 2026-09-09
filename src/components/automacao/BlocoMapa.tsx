import { LazyLogisticaMap } from "@/components/logistica/LazyLogisticaMap";
import { Bloco } from "@/lib/automacao/api";

export default function BlocoMapa({ bloco }: { bloco: Bloco }) {
  const cfg = (bloco.config ?? {}) as { lat?: number; lng?: number; zoom?: number };
  const lat = Number(cfg.lat ?? -23.5505);
  const lng = Number(cfg.lng ?? -46.6333);

  return (
    <div className="h-full rounded-2xl border border-border bg-card overflow-hidden flex flex-col">
      <div className="px-3 py-2 text-sm font-semibold truncate">{bloco.nome}</div>
      <div className="flex-1 min-h-0">
        <LazyLogisticaMap
          center={[lat, lng]}
          zoom={Number(cfg.zoom ?? 15)}
          currentMarker={{ lat, lng, color: "#3b82f6", label: bloco.nome }}
          disableInteraction={false}
          compactIcons
          className="h-full w-full"
        />
      </div>
    </div>
  );
}
