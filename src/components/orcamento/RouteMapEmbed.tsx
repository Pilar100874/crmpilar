import { useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix for default marker icons in Leaflet with Vite
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

// Custom icons for origin and destination
const createCustomIcon = (color: string) => {
  return L.divIcon({
    className: 'custom-marker',
    html: `<div style="background-color: ${color}; width: 24px; height: 24px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 5px rgba(0,0,0,0.3);"></div>`,
    iconSize: [24, 24],
    iconAnchor: [12, 12],
  });
};

const originIcon = createCustomIcon('#22c55e'); // Green for origin
const destinationIcon = createCustomIcon('#ef4444'); // Red for destination

interface RouteMapEmbedProps {
  origemCoords: { lat: number; lng: number } | null;
  destinoCoords: { lat: number; lng: number } | null;
  origemEndereco?: string | null;
  destinoEndereco?: string | null;
}

// Component to fit bounds when coords change
function FitBounds({ origemCoords, destinoCoords }: { 
  origemCoords: { lat: number; lng: number }; 
  destinoCoords: { lat: number; lng: number };
}) {
  const map = useMap();
  
  useEffect(() => {
    if (origemCoords && destinoCoords) {
      const bounds = L.latLngBounds(
        [origemCoords.lat, origemCoords.lng],
        [destinoCoords.lat, destinoCoords.lng]
      );
      map.fitBounds(bounds, { padding: [50, 50] });
    }
  }, [map, origemCoords, destinoCoords]);
  
  return null;
}

export function RouteMapEmbed({ 
  origemCoords, 
  destinoCoords,
  origemEndereco,
  destinoEndereco
}: RouteMapEmbedProps) {
  if (!origemCoords || !destinoCoords) {
    return (
      <div className="w-full h-[400px] bg-muted/50 rounded-lg flex items-center justify-center">
        <p className="text-muted-foreground">Coordenadas não disponíveis para exibir o mapa</p>
      </div>
    );
  }

  const routeLine: [number, number][] = [
    [origemCoords.lat, origemCoords.lng],
    [destinoCoords.lat, destinoCoords.lng]
  ];

  const centerLat = (origemCoords.lat + destinoCoords.lat) / 2;
  const centerLng = (origemCoords.lng + destinoCoords.lng) / 2;

  return (
    <div className="w-full h-[400px] rounded-lg overflow-hidden border">
      <MapContainer
        center={[centerLat, centerLng]}
        zoom={6}
        style={{ height: '100%', width: '100%' }}
        scrollWheelZoom={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        
        <FitBounds origemCoords={origemCoords} destinoCoords={destinoCoords} />
        
        {/* Origin marker */}
        <Marker 
          position={[origemCoords.lat, origemCoords.lng]} 
          icon={originIcon}
        />
        
        {/* Destination marker */}
        <Marker 
          position={[destinoCoords.lat, destinoCoords.lng]} 
          icon={destinationIcon}
        />
        
        {/* Route line */}
        <Polyline
          positions={routeLine}
          color="#3b82f6"
          weight={4}
          opacity={0.8}
          dashArray="10, 10"
        />
      </MapContainer>
      
      {/* Legend */}
      <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded-full bg-green-500 border-2 border-white shadow-sm"></div>
          <span>Origem{origemEndereco ? `: ${origemEndereco}` : ''}</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded-full bg-red-500 border-2 border-white shadow-sm"></div>
          <span>Destino{destinoEndereco ? `: ${destinoEndereco}` : ''}</span>
        </div>
      </div>
    </div>
  );
}
