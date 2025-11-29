import React, { useEffect, useRef } from 'react';
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

const LogisticaMapInternal: React.FC<LogisticaMapInternalProps> = ({
  veiculos = [],
  routes = [],
  center = [-15.7801, -47.9292],
  zoom = 4,
  onVeiculoClick,
  className = 'h-full w-full',
  fitBounds = true,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markersRef = useRef<Map<string, L.Marker>>(new Map());
  const routeLayersRef = useRef<L.Polyline[]>([]);

  // Initialize map
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    mapRef.current = L.map(mapContainerRef.current).setView(center, zoom);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(mapRef.current);

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
    const veiculosComPosicao = veiculos.filter(v => v.ultima_posicao);

    // Remove markers that no longer exist
    const currentIds = new Set(veiculosComPosicao.map(v => v.id));
    currentMarkers.forEach((marker, id) => {
      if (!currentIds.has(id)) {
        marker.remove();
        currentMarkers.delete(id);
      }
    });

    // Add or update markers
    veiculosComPosicao.forEach(veiculo => {
      const pos: L.LatLngExpression = [veiculo.ultima_posicao!.lat, veiculo.ultima_posicao!.lng];
      const existingMarker = currentMarkers.get(veiculo.id);

      if (existingMarker) {
        existingMarker.setLatLng(pos);
        existingMarker.setIcon(createVeiculoIcon(veiculo.status));
      } else {
        const marker = L.marker(pos, { icon: createVeiculoIcon(veiculo.status) })
          .addTo(map)
          .bindPopup(`
            <div class="text-sm">
              <p class="font-bold">${veiculo.placa}</p>
              <p>${veiculo.descricao || 'Sem descrição'}</p>
              <p>Velocidade: ${veiculo.ultima_posicao?.velocidade || 0} km/h</p>
            </div>
          `);

        marker.on('click', () => {
          onVeiculoClick?.(veiculo);
        });

        currentMarkers.set(veiculo.id, marker);
      }
    });

    // Fit bounds if enabled
    if (fitBounds && veiculosComPosicao.length > 0) {
      const allPoints: L.LatLngExpression[] = veiculosComPosicao.map(v => 
        [v.ultima_posicao!.lat, v.ultima_posicao!.lng] as L.LatLngExpression
      );
      
      routes.forEach(route => {
        route.coordinates.forEach(coord => {
          allPoints.push([coord.lat, coord.lng]);
        });
      });

      if (allPoints.length > 0) {
        const bounds = L.latLngBounds(allPoints);
        map.fitBounds(bounds, { padding: [50, 50] });
      }
    }
  }, [veiculos, fitBounds, onVeiculoClick]);

  // Update routes
  useEffect(() => {
    if (!mapRef.current) return;

    const map = mapRef.current;

    // Remove existing route layers
    routeLayersRef.current.forEach(layer => layer.remove());
    routeLayersRef.current = [];

    // Add new routes
    const allRoutePoints: L.LatLngExpression[] = [];
    
    routes.forEach(route => {
      const positions: L.LatLngExpression[] = route.coordinates.map(c => [c.lat, c.lng]);
      const polyline = L.polyline(positions, {
        color: route.color || '#3b82f6',
        weight: 4,
        opacity: 0.8
      }).addTo(map);
      routeLayersRef.current.push(polyline);
      
      // Collect all points for bounds
      positions.forEach(p => allRoutePoints.push(p));
    });

    // Fit bounds to show all routes
    if (fitBounds && allRoutePoints.length > 0) {
      const bounds = L.latLngBounds(allRoutePoints);
      map.fitBounds(bounds, { padding: [50, 50] });
    }
  }, [routes, fitBounds]);

  return (
    <div ref={mapContainerRef} className={className} />
  );
};

export default LogisticaMapInternal;
