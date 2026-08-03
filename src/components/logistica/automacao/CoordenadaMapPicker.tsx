import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
  html: `<div style="width:22px;height:22px;border-radius:9999px;background:hsl(var(--primary));border:3px solid #fff;box-shadow:0 0 0 3px hsla(var(--primary),0.35);cursor:grab"></div>`,
  iconSize: [22, 22],
  iconAnchor: [11, 11],
});

interface CoordenadaMapPickerProps {
  lat?: number;
  lng?: number;
  raioMetros?: number;
  onChange: (lat: number, lng: number) => void;
  label?: string;
}

/**
 * Seletor de coordenada no mapa (Leaflet puro — o projeto usa React 18 e o
 * react-leaflet 5 exige React 19).
 * O usuário clica no ponto ou arrasta o marcador; o círculo do raio acompanha.
 */
export function CoordenadaMapPicker({
  lat,
  lng,
  raioMetros = 200,
  onChange,
  label = 'Selecionar no mapa',
}: CoordenadaMapPickerProps) {
  const [open, setOpen] = useState(false);
  const [temp, setTemp] = useState<{ lat: number; lng: number } | null>(null);
  const [busca, setBusca] = useState('');
  const [buscando, setBuscando] = useState(false);

  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const circleRef = useRef<L.Circle | null>(null);

  const inicial = useMemo<[number, number]>(
    () =>
      typeof lat === 'number' && typeof lng === 'number'
        ? [lat, lng]
        : [-23.55052, -46.633308],
    [lat, lng]
  );

  /** Cria/atualiza marcador + círculo. `recentrar` só em mudanças externas. */
  const aplicarPonto = useCallback(
    (la: number, ln: number, recentrar: boolean) => {
      const map = mapRef.current;
      setTemp({ lat: la, lng: ln });
      if (!map) return;

      if (!markerRef.current) {
        const m = L.marker([la, ln], { icon: pinIcon, draggable: true, autoPan: true }).addTo(map);
        const atualizar = () => {
          const p = m.getLatLng();
          setTemp({ lat: p.lat, lng: p.lng });
          circleRef.current?.setLatLng(p);
        };
        m.on('drag', atualizar);
        m.on('dragend', atualizar);
        markerRef.current = m;
      } else {
        markerRef.current.setLatLng([la, ln]);
      }

      if (!circleRef.current) {
        circleRef.current = L.circle([la, ln], {
          radius: raioMetros || 200,
          color: 'hsl(var(--primary))',
          fillOpacity: 0.12,
        }).addTo(map);
      } else {
        circleRef.current.setLatLng([la, ln]);
        circleRef.current.setRadius(raioMetros || 200);
      }

      if (recentrar) {
        map.setView([la, ln], map.getZoom() < 14 ? 16 : map.getZoom());
      }
    },
    [raioMetros]
  );

  // Inicializa o mapa quando o diálogo abre
  useEffect(() => {
    if (!open) return;
    const t = window.setTimeout(() => {
      if (!containerRef.current || mapRef.current) return;
      const map = L.map(containerRef.current, {
        center: inicial,
        zoom: typeof lat === 'number' ? 16 : 12,
      });
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap',
      }).addTo(map);
      map.on('click', (e: L.LeafletMouseEvent) => aplicarPonto(e.latlng.lat, e.latlng.lng, false));
      mapRef.current = map;
      map.invalidateSize();
      if (typeof lat === 'number' && typeof lng === 'number') aplicarPonto(lat, lng, true);
    }, 60);

    return () => {
      window.clearTimeout(t);
      mapRef.current?.remove();
      mapRef.current = null;
      markerRef.current = null;
      circleRef.current = null;
    };
  }, [open, inicial, lat, lng, aplicarPonto]);

  useEffect(() => {
    if (open) setTemp(typeof lat === 'number' && typeof lng === 'number' ? { lat, lng } : null);
  }, [open, lat, lng]);

  // Raio alterado externamente
  useEffect(() => {
    circleRef.current?.setRadius(raioMetros || 200);
  }, [raioMetros]);

  const usarMinhaLocalizacao = () => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition((pos) =>
      aplicarPonto(pos.coords.latitude, pos.coords.longitude, true)
    );
  };

  const buscarEndereco = async () => {
    if (!busca.trim()) return;
    setBuscando(true);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(busca)}`
      );
      const data = await res.json();
      if (data?.[0]) aplicarPonto(parseFloat(data[0].lat), parseFloat(data[0].lon), true);
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
            Clique no ponto desejado do mapa ou arraste o marcador para ajustar a latitude, a
            longitude e o raio da zona.
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
          <Button
            type="button"
            variant="outline"
            onClick={usarMinhaLocalizacao}
            title="Usar minha localização"
          >
            <Crosshair className="h-4 w-4" />
          </Button>
        </div>

        <div ref={containerRef} className="h-[420px] w-full overflow-hidden rounded-md border" />

        <div className="text-sm text-muted-foreground">
          {temp ? (
            <span>
              Ponto selecionado:{' '}
              <strong>
                {temp.lat.toFixed(6)}, {temp.lng.toFixed(6)}
              </strong>{' '}
              · raio <strong>{raioMetros || 200} m</strong> — arraste o marcador para ajustar
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
