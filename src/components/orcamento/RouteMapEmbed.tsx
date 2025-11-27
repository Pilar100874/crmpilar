import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Loader2 } from 'lucide-react';

interface RouteMapEmbedProps {
  origemCoords: { lat: number; lng: number } | null;
  destinoCoords: { lat: number; lng: number } | null;
  origemEndereco?: string | null;
  destinoEndereco?: string | null;
}

// Decode polyline from OSRM (uses polyline encoding algorithm)
function decodePolyline(encoded: string): [number, number][] {
  const points: [number, number][] = [];
  let index = 0;
  let lat = 0;
  let lng = 0;

  while (index < encoded.length) {
    let shift = 0;
    let result = 0;
    let byte: number;

    do {
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);

    const deltaLat = result & 1 ? ~(result >> 1) : result >> 1;
    lat += deltaLat;

    shift = 0;
    result = 0;

    do {
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);

    const deltaLng = result & 1 ? ~(result >> 1) : result >> 1;
    lng += deltaLng;

    points.push([lat / 1e5, lng / 1e5]);
  }

  return points;
}

export function RouteMapEmbed({ 
  origemCoords, 
  destinoCoords,
  origemEndereco,
  destinoEndereco
}: RouteMapEmbedProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const [loading, setLoading] = useState(true);
  const [routeInfo, setRouteInfo] = useState<{ distance: number; duration: number } | null>(null);

  useEffect(() => {
    if (!mapRef.current || !origemCoords || !destinoCoords) return;

    // Cleanup previous map instance
    if (mapInstanceRef.current) {
      mapInstanceRef.current.remove();
      mapInstanceRef.current = null;
    }

    const initMap = async () => {
      setLoading(true);

      // Calculate center
      const centerLat = (origemCoords.lat + destinoCoords.lat) / 2;
      const centerLng = (origemCoords.lng + destinoCoords.lng) / 2;

      // Create map
      const map = L.map(mapRef.current!).setView([centerLat, centerLng], 6);
      mapInstanceRef.current = map;

      // Add OpenStreetMap tiles
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
      }).addTo(map);

      // Create custom icons
      const originIcon = L.divIcon({
        className: 'custom-marker-origin',
        html: `<div style="background-color: #22c55e; width: 24px; height: 24px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 8px rgba(0,0,0,0.4); display: flex; align-items: center; justify-content: center;"><span style="color: white; font-weight: bold; font-size: 12px;">A</span></div>`,
        iconSize: [24, 24],
        iconAnchor: [12, 12],
      });

      const destinationIcon = L.divIcon({
        className: 'custom-marker-destination',
        html: `<div style="background-color: #ef4444; width: 24px; height: 24px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 8px rgba(0,0,0,0.4); display: flex; align-items: center; justify-content: center;"><span style="color: white; font-weight: bold; font-size: 12px;">B</span></div>`,
        iconSize: [24, 24],
        iconAnchor: [12, 12],
      });

      // Add markers
      L.marker([origemCoords.lat, origemCoords.lng], { icon: originIcon })
        .addTo(map)
        .bindPopup(`<b>Origem</b><br/>${origemEndereco || 'Coordenadas: ' + origemCoords.lat.toFixed(4) + ', ' + origemCoords.lng.toFixed(4)}`);

      L.marker([destinoCoords.lat, destinoCoords.lng], { icon: destinationIcon })
        .addTo(map)
        .bindPopup(`<b>Destino</b><br/>${destinoEndereco || 'Coordenadas: ' + destinoCoords.lat.toFixed(4) + ', ' + destinoCoords.lng.toFixed(4)}`);

      // Fetch real route from OSRM
      try {
        const osrmUrl = `https://router.project-osrm.org/route/v1/driving/${origemCoords.lng},${origemCoords.lat};${destinoCoords.lng},${destinoCoords.lat}?overview=full&geometries=polyline`;
        
        const response = await fetch(osrmUrl);
        const data = await response.json();

        if (data.code === 'Ok' && data.routes && data.routes.length > 0) {
          const route = data.routes[0];
          const routeCoords = decodePolyline(route.geometry);
          
          // Draw the real route
          const routeLine = L.polyline(routeCoords, {
            color: '#3b82f6',
            weight: 5,
            opacity: 0.8,
          }).addTo(map);

          // Fit bounds to route
          map.fitBounds(routeLine.getBounds(), { padding: [50, 50] });

          // Set route info
          setRouteInfo({
            distance: route.distance / 1000, // km
            duration: route.duration / 60, // minutes
          });
        } else {
          // Fallback to straight line if OSRM fails
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

          const bounds = L.latLngBounds(
            [origemCoords.lat, origemCoords.lng],
            [destinoCoords.lat, destinoCoords.lng]
          );
          map.fitBounds(bounds, { padding: [50, 50] });
        }
      } catch (error) {
        console.error('Error fetching route:', error);
        // Fallback to straight line
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

        const bounds = L.latLngBounds(
          [origemCoords.lat, origemCoords.lng],
          [destinoCoords.lat, destinoCoords.lng]
        );
        map.fitBounds(bounds, { padding: [50, 50] });
      }

      setLoading(false);
    };

    initMap();

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
      <div className="relative">
        <div 
          ref={mapRef} 
          className="w-full h-[400px] rounded-lg overflow-hidden border"
          style={{ zIndex: 0 }}
        />
        {loading && (
          <div className="absolute inset-0 bg-background/80 flex items-center justify-center rounded-lg">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <span className="ml-2 text-muted-foreground">Carregando rota...</span>
          </div>
        )}
      </div>
      
      {/* Legend */}
      <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
        <div className="flex items-center gap-1">
          <div className="w-4 h-4 rounded-full bg-green-500 border-2 border-white shadow-sm flex items-center justify-center text-[8px] text-white font-bold">A</div>
          <span className="truncate max-w-[200px]">Origem{origemEndereco ? `: ${origemEndereco}` : ''}</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-4 h-4 rounded-full bg-red-500 border-2 border-white shadow-sm flex items-center justify-center text-[8px] text-white font-bold">B</div>
          <span className="truncate max-w-[200px]">Destino{destinoEndereco ? `: ${destinoEndereco}` : ''}</span>
        </div>
        {routeInfo && (
          <div className="flex items-center gap-2 ml-auto text-muted-foreground">
            <span>{routeInfo.distance.toFixed(1)} km</span>
            <span>•</span>
            <span>{Math.round(routeInfo.duration)} min</span>
          </div>
        )}
      </div>
    </div>
  );
}
