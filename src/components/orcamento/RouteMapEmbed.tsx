import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

interface RouteMapEmbedProps {
  origemCoords: { lat: number; lng: number } | null;
  destinoCoords: { lat: number; lng: number } | null;
  origemEndereco?: string | null;
  destinoEndereco?: string | null;
}

export function RouteMapEmbed({ 
  origemCoords, 
  destinoCoords,
  origemEndereco,
  destinoEndereco
}: RouteMapEmbedProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);

  useEffect(() => {
    if (!mapRef.current || !origemCoords || !destinoCoords) return;

    // Cleanup previous map instance
    if (mapInstanceRef.current) {
      mapInstanceRef.current.remove();
      mapInstanceRef.current = null;
    }

    // Calculate center
    const centerLat = (origemCoords.lat + destinoCoords.lat) / 2;
    const centerLng = (origemCoords.lng + destinoCoords.lng) / 2;

    // Create map
    const map = L.map(mapRef.current).setView([centerLat, centerLng], 6);
    mapInstanceRef.current = map;

    // Add OpenStreetMap tiles
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
    }).addTo(map);

    // Create custom icons
    const originIcon = L.divIcon({
      className: 'custom-marker-origin',
      html: `<div style="background-color: #22c55e; width: 20px; height: 20px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 5px rgba(0,0,0,0.3);"></div>`,
      iconSize: [20, 20],
      iconAnchor: [10, 10],
    });

    const destinationIcon = L.divIcon({
      className: 'custom-marker-destination',
      html: `<div style="background-color: #ef4444; width: 20px; height: 20px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 5px rgba(0,0,0,0.3);"></div>`,
      iconSize: [20, 20],
      iconAnchor: [10, 10],
    });

    // Add markers
    const originMarker = L.marker([origemCoords.lat, origemCoords.lng], { icon: originIcon })
      .addTo(map)
      .bindPopup(`<b>Origem</b><br/>${origemEndereco || 'Coordenadas: ' + origemCoords.lat.toFixed(4) + ', ' + origemCoords.lng.toFixed(4)}`);

    const destMarker = L.marker([destinoCoords.lat, destinoCoords.lng], { icon: destinationIcon })
      .addTo(map)
      .bindPopup(`<b>Destino</b><br/>${destinoEndereco || 'Coordenadas: ' + destinoCoords.lat.toFixed(4) + ', ' + destinoCoords.lng.toFixed(4)}`);

    // Add route line
    const routeLine = L.polyline(
      [
        [origemCoords.lat, origemCoords.lng],
        [destinoCoords.lat, destinoCoords.lng]
      ],
      {
        color: '#3b82f6',
        weight: 4,
        opacity: 0.8,
        dashArray: '10, 10'
      }
    ).addTo(map);

    // Fit bounds to show both markers
    const bounds = L.latLngBounds(
      [origemCoords.lat, origemCoords.lng],
      [destinoCoords.lat, destinoCoords.lng]
    );
    map.fitBounds(bounds, { padding: [50, 50] });

    // Cleanup on unmount
    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [origemCoords, destinoCoords, origemEndereco, destinoEndereco]);

  if (!origemCoords || !destinoCoords) {
    return (
      <div className="w-full h-[400px] bg-muted/50 rounded-lg flex items-center justify-center">
        <p className="text-muted-foreground">Coordenadas não disponíveis para exibir o mapa</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div 
        ref={mapRef} 
        className="w-full h-[400px] rounded-lg overflow-hidden border"
        style={{ zIndex: 0 }}
      />
      
      {/* Legend */}
      <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded-full bg-green-500 border-2 border-white shadow-sm"></div>
          <span className="truncate max-w-[200px]">Origem{origemEndereco ? `: ${origemEndereco}` : ''}</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded-full bg-red-500 border-2 border-white shadow-sm"></div>
          <span className="truncate max-w-[200px]">Destino{destinoEndereco ? `: ${destinoEndereco}` : ''}</span>
        </div>
      </div>
    </div>
  );
}
