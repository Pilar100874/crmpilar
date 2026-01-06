import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { VeiculoPosicao } from '@/types/logistica';

interface WatchRouteMapViewProps {
  posicoes: VeiculoPosicao[];
}

const WatchRouteMapView = ({ posicoes }: WatchRouteMapViewProps) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const routeLayerRef = useRef<L.Polyline | null>(null);
  const startMarkerRef = useRef<L.CircleMarker | null>(null);
  const endMarkerRef = useRef<L.CircleMarker | null>(null);

  const routeCoordinates = posicoes.map(p => [p.lat, p.lng] as [number, number]);
  const lastPosition = posicoes.length > 0 ? posicoes[posicoes.length - 1] : null;
  const defaultCenter: [number, number] = lastPosition 
    ? [lastPosition.lat, lastPosition.lng]
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

  // Update route when posicoes change
  useEffect(() => {
    if (!mapRef.current) return;

    const map = mapRef.current;

    // Remove existing layers
    if (routeLayerRef.current) {
      routeLayerRef.current.remove();
      routeLayerRef.current = null;
    }
    if (startMarkerRef.current) {
      startMarkerRef.current.remove();
      startMarkerRef.current = null;
    }
    if (endMarkerRef.current) {
      endMarkerRef.current.remove();
      endMarkerRef.current = null;
    }

    if (posicoes.length === 0) return;

    // Add route polyline
    if (routeCoordinates.length > 1) {
      routeLayerRef.current = L.polyline(routeCoordinates, {
        color: '#3b82f6',
        weight: 3,
        opacity: 0.8
      }).addTo(map);
    }

    // Add start marker
    if (posicoes.length > 0) {
      startMarkerRef.current = L.circleMarker([posicoes[0].lat, posicoes[0].lng], {
        radius: 5,
        fillColor: '#22c55e',
        fillOpacity: 1,
        color: 'white',
        weight: 2
      }).addTo(map);
    }

    // Add end marker (current position)
    if (lastPosition) {
      endMarkerRef.current = L.circleMarker([lastPosition.lat, lastPosition.lng], {
        radius: 6,
        fillColor: '#ef4444',
        fillOpacity: 1,
        color: 'white',
        weight: 2
      }).addTo(map);
    }

    // Fit bounds to show entire route
    if (posicoes.length > 0) {
      const bounds = L.latLngBounds(posicoes.map(p => [p.lat, p.lng]));
      map.fitBounds(bounds, { padding: [20, 20], maxZoom: 15 });
    }
  }, [posicoes]);

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

export default WatchRouteMapView;
