import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Loader2, MapPin } from 'lucide-react';

interface RouteMapEmbedProps {
  origemCoords: { lat: number; lng: number } | null;
  destinoCoords: { lat: number; lng: number } | null;
  origemEndereco?: string | null;
  destinoEndereco?: string | null;
  origemCep?: string | null;
  destinoCep?: string | null;
  onRouteCalculated?: (routeInfo: { distance: number; duration: number } | null) => void;
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

// Get address details from CEP using ViaCEP
async function getAddressFromCep(cep: string): Promise<{ logradouro: string; bairro: string; localidade: string; uf: string } | null> {
  try {
    const cleanCep = cep.replace(/\D/g, '');
    const response = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`);
    const data = await response.json();
    if (data.erro) return null;
    return {
      logradouro: data.logradouro || '',
      bairro: data.bairro || '',
      localidade: data.localidade || '',
      uf: data.uf || ''
    };
  } catch (error) {
    console.error('ViaCEP error:', error);
    return null;
  }
}

// Geocode address using Nominatim with multiple strategies
async function geocodeAddress(address: string, cep?: string): Promise<{ lat: number; lng: number } | null> {
  const searchQueries: string[] = [];
  
  // Strategy 1: If we have CEP, get address from ViaCEP and use city + state (most reliable)
  if (cep) {
    const viaCepData = await getAddressFromCep(cep);
    if (viaCepData) {
      // Most reliable: city + state
      searchQueries.push(`${viaCepData.localidade}, ${viaCepData.uf}, Brasil`);
      // Try with neighborhood
      if (viaCepData.bairro) {
        searchQueries.push(`${viaCepData.bairro}, ${viaCepData.localidade}, ${viaCepData.uf}, Brasil`);
      }
    }
    // Also try CEP directly
    searchQueries.push(`${cep.replace(/\D/g, '')}, Brasil`);
  }
  
  // Strategy 2: Extract city and state from address
  if (address) {
    const parts = address.split(',').map(p => p.trim()).filter(p => p);
    if (parts.length >= 2) {
      // Try last two parts (usually city, state)
      const cityState = parts.slice(-2).join(', ');
      searchQueries.push(`${cityState}, Brasil`);
    }
    // Try full address
    searchQueries.push(`${address}, Brasil`);
  }

  // Remove duplicates
  const uniqueQueries = [...new Set(searchQueries)];

  for (const query of uniqueQueries) {
    try {
      console.log('Trying geocode query:', query);
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1&countrycodes=br`,
        { headers: { 'Accept-Language': 'pt-BR' } }
      );
      const data = await response.json();
      
      if (data && data.length > 0) {
        console.log('Geocode success for:', query, data[0]);
        return {
          lat: parseFloat(data[0].lat),
          lng: parseFloat(data[0].lon),
        };
      }
    } catch (error) {
      console.error('Geocode error for query:', query, error);
    }
    
    // Small delay to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  return null;
}

export function RouteMapEmbed({ 
  origemCoords, 
  destinoCoords,
  origemEndereco,
  destinoEndereco,
  origemCep,
  destinoCep,
  onRouteCalculated
}: RouteMapEmbedProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const [loading, setLoading] = useState(true);
  const [geocoding, setGeocoding] = useState(false);
  const [routeInfo, setRouteInfo] = useState<{ distance: number; duration: number } | null>(null);
  const [resolvedOrigemCoords, setResolvedOrigemCoords] = useState<{ lat: number; lng: number } | null>(origemCoords);
  const [resolvedDestinoCoords, setResolvedDestinoCoords] = useState<{ lat: number; lng: number } | null>(destinoCoords);
  const [geocodeError, setGeocodeError] = useState<string | null>(null);

  // Callback when route info is calculated
  useEffect(() => {
    if (onRouteCalculated) {
      onRouteCalculated(routeInfo);
    }
  }, [routeInfo, onRouteCalculated]);

  // Geocode addresses if coordinates are not available
  useEffect(() => {
    const resolveCoordinates = async () => {
      // If we already have coordinates, use them
      if (origemCoords && destinoCoords) {
        setResolvedOrigemCoords(origemCoords);
        setResolvedDestinoCoords(destinoCoords);
        return;
      }

      // Try to geocode addresses
      if (origemEndereco || destinoEndereco) {
        setGeocoding(true);
        setGeocodeError(null);

        let newOrigemCoords = origemCoords;
        let newDestinoCoords = destinoCoords;

        if (!origemCoords && origemEndereco) {
          newOrigemCoords = await geocodeAddress(origemEndereco, origemCep || undefined);
        }

        if (!destinoCoords && destinoEndereco) {
          newDestinoCoords = await geocodeAddress(destinoEndereco, destinoCep || undefined);
        }

        if (newOrigemCoords && newDestinoCoords) {
          setResolvedOrigemCoords(newOrigemCoords);
          setResolvedDestinoCoords(newDestinoCoords);
        } else {
          setGeocodeError('Não foi possível localizar os endereços no mapa');
        }

        setGeocoding(false);
      }
    };

    resolveCoordinates();
  }, [origemCoords, destinoCoords, origemEndereco, destinoEndereco, origemCep, destinoCep]);

  useEffect(() => {
    if (!mapRef.current || !resolvedOrigemCoords || !resolvedDestinoCoords) return;

    // Cleanup previous map instance
    if (mapInstanceRef.current) {
      mapInstanceRef.current.remove();
      mapInstanceRef.current = null;
    }

    const initMap = async () => {
      setLoading(true);

      // Calculate center
      const centerLat = (resolvedOrigemCoords.lat + resolvedDestinoCoords.lat) / 2;
      const centerLng = (resolvedOrigemCoords.lng + resolvedDestinoCoords.lng) / 2;

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
      L.marker([resolvedOrigemCoords.lat, resolvedOrigemCoords.lng], { icon: originIcon })
        .addTo(map)
        .bindPopup(`<b>Origem</b><br/>${origemEndereco || 'Coordenadas: ' + resolvedOrigemCoords.lat.toFixed(4) + ', ' + resolvedOrigemCoords.lng.toFixed(4)}`);

      L.marker([resolvedDestinoCoords.lat, resolvedDestinoCoords.lng], { icon: destinationIcon })
        .addTo(map)
        .bindPopup(`<b>Destino</b><br/>${destinoEndereco || 'Coordenadas: ' + resolvedDestinoCoords.lat.toFixed(4) + ', ' + resolvedDestinoCoords.lng.toFixed(4)}`);

      // Fetch real route from OSRM
      try {
        const osrmUrl = `https://router.project-osrm.org/route/v1/driving/${resolvedOrigemCoords.lng},${resolvedOrigemCoords.lat};${resolvedDestinoCoords.lng},${resolvedDestinoCoords.lat}?overview=full&geometries=polyline`;
        
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
              [resolvedOrigemCoords.lat, resolvedOrigemCoords.lng],
              [resolvedDestinoCoords.lat, resolvedDestinoCoords.lng]
            ],
            {
              color: '#3b82f6',
              weight: 4,
              opacity: 0.8,
              dashArray: '10, 10'
            }
          ).addTo(map);

          const bounds = L.latLngBounds(
            [resolvedOrigemCoords.lat, resolvedOrigemCoords.lng],
            [resolvedDestinoCoords.lat, resolvedDestinoCoords.lng]
          );
          map.fitBounds(bounds, { padding: [50, 50] });
        }
      } catch (error) {
        console.error('Error fetching route:', error);
        // Fallback to straight line
        const routeLine = L.polyline(
          [
            [resolvedOrigemCoords.lat, resolvedOrigemCoords.lng],
            [resolvedDestinoCoords.lat, resolvedDestinoCoords.lng]
          ],
          {
            color: '#3b82f6',
            weight: 4,
            opacity: 0.8,
            dashArray: '10, 10'
          }
        ).addTo(map);

        const bounds = L.latLngBounds(
          [resolvedOrigemCoords.lat, resolvedOrigemCoords.lng],
          [resolvedDestinoCoords.lat, resolvedDestinoCoords.lng]
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
  }, [resolvedOrigemCoords, resolvedDestinoCoords, origemEndereco, destinoEndereco]);

  // Show geocoding state
  if (geocoding) {
    return (
      <div className="w-full h-[400px] bg-muted/50 rounded-lg flex flex-col items-center justify-center gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-muted-foreground">Localizando endereços...</p>
      </div>
    );
  }

  // Show error if geocoding failed
  if (geocodeError) {
    return (
      <div className="w-full h-[400px] bg-muted/50 rounded-lg flex flex-col items-center justify-center gap-3">
        <MapPin className="h-8 w-8 text-muted-foreground" />
        <p className="text-muted-foreground">{geocodeError}</p>
        {(origemEndereco || destinoEndereco) && (
          <div className="text-xs text-muted-foreground text-center space-y-1 mt-2">
            {origemEndereco && <p><strong>Origem:</strong> {origemEndereco}</p>}
            {destinoEndereco && <p><strong>Destino:</strong> {destinoEndereco}</p>}
          </div>
        )}
      </div>
    );
  }

  if (!resolvedOrigemCoords || !resolvedDestinoCoords) {
    return (
      <div className="w-full h-[400px] bg-muted/50 rounded-lg flex flex-col items-center justify-center gap-3">
        <MapPin className="h-8 w-8 text-muted-foreground" />
        <p className="text-muted-foreground">Coordenadas não disponíveis para exibir o mapa</p>
        {(origemEndereco || destinoEndereco) && (
          <div className="text-xs text-muted-foreground text-center space-y-1 mt-2">
            {origemEndereco && <p><strong>Origem:</strong> {origemEndereco}</p>}
            {destinoEndereco && <p><strong>Destino:</strong> {destinoEndereco}</p>}
          </div>
        )}
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
