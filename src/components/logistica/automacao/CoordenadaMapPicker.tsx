import { useEffect, useMemo, useRef, useState } from 'react';
import { MapContainer, TileLayer, Marker, Circle, useMapEvents, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { MapPin, Crosshair } from 'lucide-react';

const pinIcon = L.divIcon({
  className: '',
  html: `<div style="width:22px;height:22px;border-radius:9999px;background:hsl(var(--primary));border:3px solid #fff;box-shadow:0 0 0 3px hsla(var(--primary),0.35)"></div>`,
  iconSize: [22, 22],
  iconAnchor: [11, 11],
});

function ClickHandler({ onPick }: { onPick: (lat: number, lng: number) => void }) {
  useMapEvents({
    click: (e) => onPick(e.latlng.lat, e.latlng.lng),
  });
  return null;
}

function Recenter({ lat, lng, trigger }: { lat: number; lng: number; trigger: number }) {
  const map = useMap();
  useEffect(() => {
    map.setView([lat, lng], map.getZoom() < 14 ? 16 : map.getZoom());
    // Recentraliza apenas em mudanças externas (busca, geolocalização, abertura),
    // nunca durante o arraste do marcador.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trigger]);
  return null;
}

interface CoordenadaMapPickerProps {
  lat?: number;
  lng?: number;
  raioMetros?: number;
  onChange: (lat: number, lng: number) => void;
  label?: string;
}

/**
 * Seletor de coordenada no mapa: o usuário clica no ponto e a lat/lng é preenchida.
 */
export function CoordenadaMapPicker({ lat, lng, raioMetros = 200, onChange, label = 'Selecionar no mapa' }: CoordenadaMapPickerProps) {
  const [open, setOpen] = useState(false);
  const [temp, setTemp] = useState<{ lat: number; lng: number } | null>(null);
  const [busca, setBusca] = useState('');
  const [recenterKey, setRecenterKey] = useState(0);
  const markerRef = useRef<L.Marker | null>(null);
  const [buscando, setBuscando] = useState(false);

  const inicial = useMemo<[number, number]>(() => {
    if (typeof lat === 'number' && typeof lng === 'number') return [lat, lng];
    return [-23.55052, -46.633308]; // São Paulo como padrão
  }, [lat, lng]);

  useEffect(() => {
    if (open) {
      setTemp(typeof lat === 'number' && typeof lng === 'number' ? { lat, lng } : null);
      setRecenterKey((k) => k + 1);
    }
  }, [open, lat, lng]);

  const usarMinhaLocalizacao = () => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition((pos) => {
      setTemp({ lat: pos.coords.latitude, lng: pos.coords.longitude });
      setRecenterKey((k) => k + 1);
    });
  };

  const buscarEndereco = async () => {
    if (!busca.trim()) return;
    setBuscando(true);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(busca)}`
      );
      const data = await res.json();
      if (data?.[0]) {
        setTemp({ lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) });
        setRecenterKey((k) => k + 1);
      }
    } catch {
      /* silencioso */
    } finally {
      setBuscando(false);
    }
  };

  const confirmar = () => {
    if (temp) onChange(temp.lat, temp.lng);
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button type="button" variant="outline" size="sm" className="w-full">
          <MapPin className="h-4 w-4 mr-2" />
          {label}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Selecionar coordenada no mapa</DialogTitle>
          <DialogDescription>
            Clique no ponto desejado do mapa ou arraste o marcador para ajustar a latitude, a longitude e o raio da zona.
          </DialogDescription>
        </DialogHeader>

        <div className="flex gap-2">
          <Input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                buscarEndereco();
              }
            }}
            placeholder="Buscar endereço ou local..."
          />
          <Button type="button" variant="secondary" onClick={buscarEndereco} disabled={buscando}>
            Buscar
          </Button>
          <Button type="button" variant="outline" onClick={usarMinhaLocalizacao} title="Usar minha localização">
            <Crosshair className="h-4 w-4" />
          </Button>
        </div>

        <div className="h-[420px] w-full overflow-hidden rounded-md border">
          <MapContainer center={inicial} zoom={typeof lat === 'number' ? 16 : 12} style={{ height: '100%', width: '100%' }}>
            <TileLayer
              attribution='&copy; OpenStreetMap'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <ClickHandler onPick={(la, ln) => setTemp({ lat: la, lng: ln })} />
            {temp && (
              <>
                <Recenter lat={temp.lat} lng={temp.lng} trigger={recenterKey} />
                <Marker
                  position={[temp.lat, temp.lng]}
                  icon={pinIcon}
                  draggable
                  autoPan
                  ref={markerRef}
                  eventHandlers={{
                    drag: () => {
                      const p = markerRef.current?.getLatLng();
                      if (p) setTemp({ lat: p.lat, lng: p.lng });
                    },
                    dragend: () => {
                      const p = markerRef.current?.getLatLng();
                      if (p) setTemp({ lat: p.lat, lng: p.lng });
                    },
                  }}
                />
                <Circle
                  center={[temp.lat, temp.lng]}
                  radius={raioMetros || 200}
                  pathOptions={{ color: 'hsl(var(--primary))', fillOpacity: 0.12 }}
                />
              </>
            )}
          </MapContainer>
        </div>

        <div className="text-sm text-muted-foreground">
          {temp ? (
            <span>
              Ponto selecionado: <strong>{temp.lat.toFixed(6)}, {temp.lng.toFixed(6)}</strong> · raio{' '}
              <strong>{raioMetros || 200} m</strong> — arraste o marcador para ajustar
            </span>
          ) : (
            <span>Nenhum ponto selecionado ainda.</span>
          )}
        </div>

        <DialogFooter>
          <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
            Cancelar
          </Button>
          <Button type="button" onClick={confirmar} disabled={!temp}>
            Usar esta coordenada
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default CoordenadaMapPicker;
