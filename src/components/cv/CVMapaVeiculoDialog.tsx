import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { MapPin, ExternalLink, Loader2 } from "lucide-react";

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
});

type Pos = { lat: number; lng: number; data_hora: string; velocidade: number | null };

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  veiculoLogisticaId?: string | null;
  titulo?: string;
};

export function CVMapaVeiculoDialog({ open, onOpenChange, veiculoLogisticaId, titulo }: Props) {
  const [pos, setPos] = useState<Pos | null>(null);
  const [loading, setLoading] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);

  useEffect(() => {
    if (!open) {
      setPos(null);
      return;
    }
    if (!veiculoLogisticaId) return;
    let cancelled = false;
    setLoading(true);
    (async () => {
      const { data } = await supabase
        .from("veiculo_posicoes")
        .select("lat, lng, data_hora, velocidade")
        .eq("veiculo_id", veiculoLogisticaId)
        .order("data_hora", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (!cancelled) {
        setPos((data as any) ?? null);
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, veiculoLogisticaId]);

  useEffect(() => {
    if (!open || !pos || !containerRef.current) return;
    const timer = setTimeout(() => {
      if (!containerRef.current) return;
      if (!mapRef.current) {
        mapRef.current = L.map(containerRef.current).setView([pos.lat, pos.lng], 16);
        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
          attribution: "&copy; OpenStreetMap",
          maxZoom: 19,
        }).addTo(mapRef.current);
      }
      mapRef.current.setView([pos.lat, pos.lng], 16);
      L.marker([pos.lat, pos.lng]).addTo(mapRef.current);
      mapRef.current.invalidateSize();
    }, 150);
    return () => clearTimeout(timer);
  }, [open, pos]);

  useEffect(() => {
    if (!open && mapRef.current) {
      mapRef.current.remove();
      mapRef.current = null;
    }
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5 text-primary" /> Localização {titulo ? `— ${titulo}` : ""}
          </DialogTitle>
        </DialogHeader>

        {loading && (
          <div className="h-72 flex items-center justify-center text-muted-foreground gap-2">
            <Loader2 className="h-4 w-4 animate-spin" /> Buscando localização...
          </div>
        )}

        {!loading && !pos && (
          <div className="h-40 flex items-center justify-center text-center text-sm text-muted-foreground px-6">
            Nenhuma posição de rastreamento disponível para este veículo.
          </div>
        )}

        {!loading && pos && (
          <div className="space-y-3">
            <div ref={containerRef} className="h-72 w-full rounded-lg overflow-hidden border" />
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
              <span>
                Última atualização: {new Date(pos.data_hora).toLocaleString("pt-BR")}
                {pos.velocidade != null ? ` · ${Math.round(pos.velocidade)} km/h` : ""}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  window.open(`https://www.google.com/maps?q=${pos.lat},${pos.lng}`, "_blank")
                }
              >
                <ExternalLink className="h-3.5 w-3.5 mr-1" /> Abrir no Google Maps
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
