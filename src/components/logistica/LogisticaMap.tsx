import React from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { VeiculoComStatus } from '@/types/logistica';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

// Fix Leaflet default marker icon issue
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

interface Coordinate {
  lat: number;
  lng: number;
}

interface RouteData {
  coordinates: Coordinate[];
  color?: string;
  distance?: number;
  duration?: number;
}

interface LogisticaMapProps {
  veiculos?: VeiculoComStatus[];
  routes?: RouteData[];
  center?: [number, number];
  zoom?: number;
  onVeiculoClick?: (veiculo: VeiculoComStatus) => void;
  className?: string;
  showControls?: boolean;
  fitBounds?: boolean;
}

// Create custom icons for vehicle status
const createVeiculoIcon = (status: 'movendo' | 'parado' | 'offline', direcao?: number) => {
  const colors = {
    movendo: '#22c55e',
    parado: '#f59e0b',
    offline: '#6b7280'
  };

  const rotation = direcao || 0;
  
  return L.divIcon({
    className: 'custom-vehicle-marker',
    html: `
      <div style="
        width: 32px;
        height: 32px;
        background: ${colors[status]};
        border: 3px solid white;
        border-radius: 50%;
        box-shadow: 0 2px 8px rgba(0,0,0,0.3);
        display: flex;
        align-items: center;
        justify-content: center;
        transform: rotate(${rotation}deg);
      ">
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9L18 10.8V7a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v3.8l-2.5.3C2.7 11.3 2 12.1 2 13v3c0 .6.4 1 1 1h2"/>
          <circle cx="7" cy="17" r="2"/>
          <circle cx="17" cy="17" r="2"/>
        </svg>
      </div>
    `,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
    popupAnchor: [0, -16]
  });
};

const statusLabel: Record<string, string> = {
  movendo: 'Em movimento',
  parado: 'Parado',
  offline: 'Offline'
};

export const LogisticaMap: React.FC<LogisticaMapProps> = ({
  veiculos = [],
  routes = [],
  center = [-15.7801, -47.9292], // Brasília - center of Brazil
  zoom = 4,
  onVeiculoClick,
  className = 'h-full w-full',
  showControls = true,
}) => {
  return (
    <MapContainer
      center={center}
      zoom={zoom}
      className={className}
      scrollWheelZoom={true}
      zoomControl={showControls}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      {/* Render routes */}
      {routes.map((route, index) => {
        if (route.coordinates.length < 2) return null;
        const positions: [number, number][] = route.coordinates.map(c => [c.lat, c.lng]);
        return (
          <Polyline
            key={`route-${index}`}
            positions={positions}
            pathOptions={{
              color: route.color || '#3b82f6',
              weight: 4,
              opacity: 0.8,
              lineCap: 'round',
              lineJoin: 'round'
            }}
          />
        );
      })}

      {/* Render vehicle markers */}
      {veiculos.map(veiculo => {
        if (!veiculo.ultima_posicao) return null;
        const { lat, lng, velocidade, data_hora, direcao } = veiculo.ultima_posicao;
        const icon = createVeiculoIcon(veiculo.status, direcao);

        return (
          <Marker
            key={veiculo.id}
            position={[lat, lng]}
            icon={icon}
            eventHandlers={{
              click: () => onVeiculoClick?.(veiculo)
            }}
          >
            <Popup>
              <div className="min-w-[200px]">
                <h3 className="font-bold text-lg mb-2">{veiculo.placa}</h3>
                {veiculo.descricao && (
                  <p className="text-sm text-gray-600 mb-2">{veiculo.descricao}</p>
                )}
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Motorista:</span>
                    <span>{veiculo.motorista || '-'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Status:</span>
                    <span className={`font-medium ${
                      veiculo.status === 'movendo' ? 'text-green-600' :
                      veiculo.status === 'parado' ? 'text-amber-600' : 'text-gray-500'
                    }`}>
                      {statusLabel[veiculo.status]}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Velocidade:</span>
                    <span>{Math.round(velocidade)} km/h</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Última atualização:</span>
                    <span>{format(new Date(data_hora), "HH:mm", { locale: ptBR })}</span>
                  </div>
                </div>
              </div>
            </Popup>
          </Marker>
        );
      })}
    </MapContainer>
  );
};