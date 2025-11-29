import React, { useEffect, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { VeiculoComStatus } from '@/types/logistica';

// Fix leaflet default icon issue
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

const createVeiculoIcon = (status: string) => {
  const color = status === 'movendo' ? '#22c55e' : status === 'parado' ? '#eab308' : '#6b7280';
  return L.divIcon({
    className: 'custom-vehicle-icon',
    html: `<div style="background-color: ${color}; width: 24px; height: 24px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);"></div>`,
    iconSize: [24, 24],
    iconAnchor: [12, 12],
  });
};

interface RouteData {
  coordinates: Array<{ lat: number; lng: number }>;
  color?: string;
  distance?: number;
  duration?: number;
}

interface LogisticaMapInternalProps {
  veiculos?: VeiculoComStatus[];
  routes?: RouteData[];
  center?: [number, number];
  zoom?: number;
  onVeiculoClick?: (veiculo: VeiculoComStatus) => void;
  className?: string;
  fitBounds?: boolean;
}

const FitBoundsToData: React.FC<{ veiculos: VeiculoComStatus[]; routes: RouteData[] }> = ({ veiculos, routes }) => {
  const map = useMap();
  
  useEffect(() => {
    const allPoints: [number, number][] = [];
    
    veiculos.filter(v => v.ultima_posicao).forEach(v => {
      allPoints.push([v.ultima_posicao!.lat, v.ultima_posicao!.lng]);
    });
    
    routes.forEach(route => {
      route.coordinates.forEach(coord => {
        allPoints.push([coord.lat, coord.lng]);
      });
    });
    
    if (allPoints.length > 0) {
      const bounds = L.latLngBounds(allPoints);
      map.fitBounds(bounds, { padding: [50, 50] });
    }
  }, [veiculos, routes, map]);
  
  return null;
};

const LogisticaMapInternal: React.FC<LogisticaMapInternalProps> = ({
  veiculos = [],
  routes = [],
  center = [-15.7801, -47.9292],
  zoom = 4,
  onVeiculoClick,
  className = 'h-full w-full',
  fitBounds = true,
}) => {
  const veiculosComPosicao = useMemo(() => 
    veiculos.filter(v => v.ultima_posicao), 
    [veiculos]
  );

  return (
    <MapContainer
      center={center}
      zoom={zoom}
      className={className}
      scrollWheelZoom={true}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      
      {fitBounds && (veiculosComPosicao.length > 0 || routes.length > 0) && (
        <FitBoundsToData veiculos={veiculosComPosicao} routes={routes} />
      )}
      
      {routes.map((route, index) => (
        <Polyline
          key={`route-${index}`}
          positions={route.coordinates.map(c => [c.lat, c.lng] as [number, number])}
          color={route.color || '#3b82f6'}
          weight={4}
          opacity={0.8}
        />
      ))}
      
      {veiculosComPosicao.map((veiculo) => (
        <Marker
          key={veiculo.id}
          position={[veiculo.ultima_posicao!.lat, veiculo.ultima_posicao!.lng]}
          icon={createVeiculoIcon(veiculo.status)}
          eventHandlers={{
            click: () => onVeiculoClick?.(veiculo),
          }}
        >
          <Popup>
            <div className="text-sm">
              <p className="font-bold">{veiculo.placa}</p>
              <p>{veiculo.descricao || 'Sem descrição'}</p>
              <p>Velocidade: {veiculo.ultima_posicao?.velocidade || 0} km/h</p>
            </div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
};

export default LogisticaMapInternal;
