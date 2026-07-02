import { useEffect, useMemo, useRef, useState } from "react";
import { MapContainer, TileLayer, Marker, Circle, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Search, LocateFixed, Loader2 } from "lucide-react";
import { toast } from "sonner";

const markerIcon = L.icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

function Recenter({ lat, lng }: { lat: number; lng: number }) {
  const map = useMap();
  useEffect(() => {
    map.setView([lat, lng], map.getZoom() < 15 ? 16 : map.getZoom(), { animate: true });
  }, [lat, lng]);
  return null;
}

export interface GeofenceMapPickerValue {
  lat: number;
  lng: number;
  raio: number;
}

interface Props {
  value: GeofenceMapPickerValue;
  onChange: (v: GeofenceMapPickerValue) => void;
  height?: number;
}

export default function GeofenceMapPicker({ value, onChange, height = 380 }: Props) {
  const [busca, setBusca] = useState("");
  const [buscando, setBuscando] = useState(false);
  const [sugestoes, setSugestoes] = useState<any[]>([]);
  const markerRef = useRef<L.Marker | null>(null);

  const buscarEndereco = async () => {
    if (!busca.trim()) return;
    setBuscando(true);
    setSugestoes([]);
    try {
      const url = `https://nominatim.openstreetmap.org/search?format=json&addressdetails=1&limit=5&countrycodes=br&q=${encodeURIComponent(
        busca
      )}`;
      const r = await fetch(url, { headers: { Accept: "application/json" } });
      const data = await r.json();
      if (!Array.isArray(data) || data.length === 0) {
        toast.error("Endereço não encontrado");
      } else {
        setSugestoes(data);
        const first = data[0];
        onChange({ ...value, lat: parseFloat(first.lat), lng: parseFloat(first.lon) });
      }
    } catch {
      toast.error("Falha ao buscar endereço");
    }
    setBuscando(false);
  };

  const usarMinhaLoc = () => {
    if (!navigator.geolocation) return toast.error("GPS indisponível");
    navigator.geolocation.getCurrentPosition(
      (p) => onChange({ ...value, lat: p.coords.latitude, lng: p.coords.longitude }),
      () => toast.error("Não consegui ler sua localização")
    );
  };

  const eventHandlers = useMemo(
    () => ({
      dragend() {
        const m = markerRef.current;
        if (m) {
          const p = m.getLatLng();
          onChange({ ...value, lat: p.lat, lng: p.lng });
        }
      },
    }),
    [value, onChange]
  );

  return (
    <div className="space-y-3">
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="flex-1 flex gap-2">
          <Input
            placeholder="Buscar endereço (rua, número, cidade)"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), buscarEndereco())}
          />
          <Button type="button" onClick={buscarEndereco} disabled={buscando} variant="secondary">
            {buscando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
          </Button>
        </div>
        <Button type="button" onClick={usarMinhaLoc} variant="outline">
          <LocateFixed className="mr-2 h-4 w-4" /> Minha localização
        </Button>
      </div>

      {sugestoes.length > 1 && (
        <div className="rounded-md border divide-y max-h-40 overflow-y-auto text-sm">
          {sugestoes.map((s, i) => (
            <button
              key={i}
              type="button"
              className="block w-full text-left px-3 py-2 hover:bg-muted/50"
              onClick={() => {
                onChange({ ...value, lat: parseFloat(s.lat), lng: parseFloat(s.lon) });
                setSugestoes([]);
              }}
            >
              {s.display_name}
            </button>
          ))}
        </div>
      )}

      <div className="rounded-md overflow-hidden border" style={{ height }}>
        <MapContainer
          center={[value.lat, value.lng]}
          zoom={16}
          style={{ height: "100%", width: "100%" }}
        >
          <TileLayer
            attribution="&copy; OpenStreetMap"
            url="https://{s}.tile.openstreetmap.org/{z}/{y}/{x}.png"
          />
          <Recenter lat={value.lat} lng={value.lng} />
          <Marker
            position={[value.lat, value.lng]}
            icon={markerIcon}
            draggable
            eventHandlers={eventHandlers}
            ref={(ref) => {
              if (ref) markerRef.current = ref as unknown as L.Marker;
            }}
          />
          <Circle
            center={[value.lat, value.lng]}
            radius={value.raio}
            pathOptions={{
              color: "hsl(var(--primary))",
              fillColor: "hsl(var(--primary))",
              fillOpacity: 0.15,
              weight: 2,
            }}
          />
        </MapContainer>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 items-end">
        <div className="sm:col-span-2">
          <Label className="text-xs">Raio permitido: <strong>{value.raio} m</strong></Label>
          <Slider
            value={[value.raio]}
            min={20}
            max={2000}
            step={10}
            onValueChange={(v) => onChange({ ...value, raio: v[0] })}
            className="mt-2"
          />
        </div>
        <div>
          <Label className="text-xs">Latitude</Label>
          <Input
            value={value.lat.toFixed(6)}
            onChange={(e) => {
              const n = parseFloat(e.target.value);
              if (!isNaN(n)) onChange({ ...value, lat: n });
            }}
          />
        </div>
        <div>
          <Label className="text-xs">Longitude</Label>
          <Input
            value={value.lng.toFixed(6)}
            onChange={(e) => {
              const n = parseFloat(e.target.value);
              if (!isNaN(n)) onChange({ ...value, lng: n });
            }}
          />
        </div>
      </div>

      <p className="text-xs text-muted-foreground">
        Dica: arraste o pino no mapa para ajustar o centro exato e use o controle de raio para dimensionar a área permitida.
      </p>
    </div>
  );
}
