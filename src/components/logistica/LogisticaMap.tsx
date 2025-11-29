import React from 'react';
import { MapContainer, TileLayer } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { VeiculoComStatus } from '@/types/logistica';

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

export const LogisticaMap: React.FC<LogisticaMapProps> = ({
  center = [-15.7801, -47.9292],
  zoom = 4,
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
    </MapContainer>
  );
};