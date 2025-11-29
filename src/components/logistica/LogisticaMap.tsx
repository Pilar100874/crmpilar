import React, { useEffect, useRef } from 'react';
import { MapContainer, TileLayer, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { VeiculoComStatus } from '@/types/logistica';
import { VeiculoMarker } from './VeiculoMarker';
import { RoutePolyline } from './RoutePolyline';

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

// Component to fit map bounds
const FitBounds: React.FC<{ veiculos: VeiculoComStatus[]; routes: RouteData[] }> = ({ veiculos, routes }) => {
  const map = useMap();

  useEffect(() => {
    const points: L.LatLngExpression[] = [];

    // Add vehicle positions
    veiculos.forEach(v => {
      if (v.ultima_posicao) {
        points.push([v.ultima_posicao.lat, v.ultima_posicao.lng]);
      }
    });

    // Add route coordinates
    routes.forEach(r => {
      r.coordinates.forEach(c => {
        points.push([c.lat, c.lng]);
      });
    });

    if (points.length > 0) {
      const bounds = L.latLngBounds(points);
      map.fitBounds(bounds, { padding: [50, 50] });
    }
  }, [veiculos, routes, map]);

  return null;
};

export const LogisticaMap: React.FC<LogisticaMapProps> = ({
  veiculos = [],
  routes = [],
  center = [-15.7801, -47.9292], // Brasília - center of Brazil
  zoom = 4,
  onVeiculoClick,
  className = 'h-full w-full',
  showControls = true,
  fitBounds = true
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
      {routes.map((route, index) => (
        <RoutePolyline
          key={`route-${index}`}
          coordinates={route.coordinates}
          color={route.color || '#3b82f6'}
          distance={route.distance}
          duration={route.duration}
        />
      ))}

      {/* Render vehicle markers */}
      {veiculos.map(veiculo => (
        <VeiculoMarker
          key={veiculo.id}
          veiculo={veiculo}
          onClick={onVeiculoClick}
        />
      ))}

      {/* Fit bounds to show all markers/routes */}
      {fitBounds && (veiculos.length > 0 || routes.length > 0) && (
        <FitBounds veiculos={veiculos} routes={routes} />
      )}
    </MapContainer>
  );
};