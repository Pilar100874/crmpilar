import { useEffect } from 'react';
import { MapContainer, TileLayer, Polyline, CircleMarker, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { VeiculoPosicao } from '@/types/logistica';

const MapUpdater = ({ positions }: { positions: VeiculoPosicao[] }) => {
  const map = useMap();
  
  useEffect(() => {
    if (positions.length > 0) {
      const bounds = L.latLngBounds(positions.map(p => [p.lat, p.lng]));
      map.fitBounds(bounds, { padding: [20, 20], maxZoom: 15 });
    }
  }, [positions, map]);
  
  return null;
};

interface WatchRouteMapViewProps {
  posicoes: VeiculoPosicao[];
}

const WatchRouteMapView = ({ posicoes }: WatchRouteMapViewProps) => {
  const routeCoordinates = posicoes.map(p => [p.lat, p.lng] as [number, number]);
  const lastPosition = posicoes.length > 0 ? posicoes[posicoes.length - 1] : null;
  const defaultCenter: [number, number] = lastPosition 
    ? [lastPosition.lat, lastPosition.lng]
    : [-23.5505, -46.6333];

  return (
    <>
      <MapContainer
        center={defaultCenter}
        zoom={13}
        style={{ width: '100%', height: '100%' }}
        zoomControl={false}
        attributionControl={false}
      >
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        />
        <MapUpdater positions={posicoes} />
        
        {/* Route polyline */}
        <Polyline
          positions={routeCoordinates}
          pathOptions={{ 
            color: '#3b82f6', 
            weight: 3,
            opacity: 0.8
          }}
        />
        
        {/* Start marker */}
        {posicoes.length > 0 && (
          <CircleMarker
            center={[posicoes[0].lat, posicoes[0].lng]}
            radius={5}
            pathOptions={{ 
              fillColor: '#22c55e',
              fillOpacity: 1,
              color: 'white',
              weight: 2
            }}
          />
        )}
        
        {/* End marker (current position) */}
        {lastPosition && (
          <CircleMarker
            center={[lastPosition.lat, lastPosition.lng]}
            radius={6}
            pathOptions={{ 
              fillColor: '#ef4444',
              fillOpacity: 1,
              color: 'white',
              weight: 2
            }}
          />
        )}
      </MapContainer>
      <style>{`
        .leaflet-container {
          background: #1a1a2e;
        }
      `}</style>
    </>
  );
};

export default WatchRouteMapView;
