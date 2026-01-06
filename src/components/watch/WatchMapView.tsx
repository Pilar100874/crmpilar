import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { VeiculoComStatus } from '@/types/logistica';

// Fix for default marker icons
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

const createVehicleIcon = (status: 'movendo' | 'parado' | 'offline') => {
  const colors = {
    movendo: '#22c55e',
    parado: '#fbbf24',
    offline: '#6b7280'
  };
  
  return L.divIcon({
    className: 'custom-vehicle-icon',
    html: `
      <div style="
        width: 20px;
        height: 20px;
        background: ${colors[status]};
        border: 2px solid white;
        border-radius: 50%;
        box-shadow: 0 2px 8px rgba(0,0,0,0.3);
        display: flex;
        align-items: center;
        justify-content: center;
      ">
        <svg width="10" height="10" viewBox="0 0 24 24" fill="white">
          <path d="M18.92 6.01C18.72 5.42 18.16 5 17.5 5h-11c-.66 0-1.21.42-1.42 1.01L3 12v8c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h12v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-8l-2.08-5.99zM6.5 16c-.83 0-1.5-.67-1.5-1.5S5.67 13 6.5 13s1.5.67 1.5 1.5S7.33 16 6.5 16zm11 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zM5 11l1.5-4.5h11L19 11H5z"/>
        </svg>
      </div>
    `,
    iconSize: [20, 20],
    iconAnchor: [10, 10]
  });
};

interface WatchMapViewProps {
  veiculos: VeiculoComStatus[];
  selectedVeiculoId: string | null;
  onVeiculoClick?: (id: string) => void;
}

const WatchMapView = ({ veiculos, onVeiculoClick }: WatchMapViewProps) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markersRef = useRef<Map<string, L.Marker>>(new Map());

  const validVeiculos = veiculos.filter(v => v.ultima_posicao);
  const defaultCenter: [number, number] = validVeiculos.length > 0 
    ? [validVeiculos[0].ultima_posicao!.lat, validVeiculos[0].ultima_posicao!.lng]
    : [-23.5505, -46.6333];

  // Initialize map
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    mapRef.current = L.map(mapContainerRef.current, {
      zoomControl: false,
      attributionControl: false
    }).setView(defaultCenter, 13);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(mapRef.current);

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  // Update markers when veiculos change
  useEffect(() => {
    if (!mapRef.current) return;

    const map = mapRef.current;
    const currentMarkers = markersRef.current;

    // Remove markers that no longer exist
    const currentIds = new Set(validVeiculos.map(v => v.id));
    currentMarkers.forEach((marker, id) => {
      if (!currentIds.has(id)) {
        marker.remove();
        currentMarkers.delete(id);
      }
    });

    // Add or update markers
    validVeiculos.forEach(veiculo => {
      const pos: L.LatLngExpression = [veiculo.ultima_posicao!.lat, veiculo.ultima_posicao!.lng];
      const existingMarker = currentMarkers.get(veiculo.id);

      if (existingMarker) {
        existingMarker.setLatLng(pos);
        existingMarker.setIcon(createVehicleIcon(veiculo.status));
      } else {
        const marker = L.marker(pos, { icon: createVehicleIcon(veiculo.status) })
          .addTo(map)
          .bindPopup(`
            <div style="font-size: 11px; line-height: 1.3;">
              <strong>${veiculo.placa}</strong>
              ${veiculo.motorista ? `<br/>${veiculo.motorista}` : ''}
              <br/>${Math.round(veiculo.ultima_posicao!.velocidade)} km/h
            </div>
          `);

        marker.on('click', () => {
          onVeiculoClick?.(veiculo.id);
        });

        currentMarkers.set(veiculo.id, marker);
      }
    });

    // Fit bounds to show all vehicles
    if (validVeiculos.length > 0) {
      const bounds = L.latLngBounds(validVeiculos.map(v => [v.ultima_posicao!.lat, v.ultima_posicao!.lng]));
      map.fitBounds(bounds, { padding: [20, 20], maxZoom: 14 });
    }
  }, [veiculos, onVeiculoClick]);

  return (
    <>
      <div ref={mapContainerRef} style={{ width: '100%', height: '100%' }} />
      <style>{`
        .leaflet-container {
          background: #f0f0f0;
        }
      `}</style>
    </>
  );
};

export default WatchMapView;
