import React from 'react';
import { Polyline } from 'react-leaflet';

interface Coordinate {
  lat: number;
  lng: number;
}

interface RoutePolylineProps {
  coordinates: Coordinate[];
  color?: string;
  weight?: number;
  opacity?: number;
  distance?: number;
  duration?: number;
  showTooltip?: boolean;
}

export const RoutePolyline: React.FC<RoutePolylineProps> = ({
  coordinates,
  color = '#3b82f6',
  weight = 4,
  opacity = 0.8,
}) => {
  if (coordinates.length < 2) return null;

  const positions: [number, number][] = coordinates.map(c => [c.lat, c.lng]);

  return (
    <Polyline
      positions={positions}
      pathOptions={{
        color,
        weight,
        opacity,
        lineCap: 'round',
        lineJoin: 'round'
      }}
    />
  );
};