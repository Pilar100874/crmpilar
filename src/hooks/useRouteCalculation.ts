import { useState, useEffect } from 'react';

interface RouteInfo {
  distance: number; // km
  duration: number; // minutes
}

// Geocode address using Nominatim with multiple strategies
async function geocodeAddress(address: string, cep?: string): Promise<{ lat: number; lng: number } | null> {
  const searchQueries: string[] = [];
  
  if (cep) {
    searchQueries.push(`${cep}, Brasil`);
  }
  
  searchQueries.push(`${address}, Brasil`);
  
  const simplified = address.replace(/\d+/g, '').replace(/,\s*/g, ', ').trim();
  if (simplified !== address) {
    searchQueries.push(`${simplified}, Brasil`);
  }
  
  const parts = address.split(',').map(p => p.trim());
  if (parts.length >= 2) {
    const cityState = parts.slice(-2).join(', ');
    searchQueries.push(`${cityState}, Brasil`);
  }

  for (const query of searchQueries) {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1&countrycodes=br`,
        { headers: { 'Accept-Language': 'pt-BR' } }
      );
      const data = await response.json();
      
      if (data && data.length > 0) {
        return {
          lat: parseFloat(data[0].lat),
          lng: parseFloat(data[0].lon),
        };
      }
    } catch (error) {
      console.error('Geocode error:', error);
    }
  }
  
  return null;
}

export function useRouteCalculation(
  origemEndereco: string | null | undefined,
  destinoEndereco: string | null | undefined,
  origemCep: string | null | undefined,
  destinoCep: string | null | undefined
) {
  const [routeInfo, setRouteInfo] = useState<RouteInfo | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const calculateRoute = async () => {
      if (!origemEndereco && !origemCep) return;
      if (!destinoEndereco && !destinoCep) return;

      setLoading(true);

      try {
        // Geocode addresses
        const origemCoords = await geocodeAddress(origemEndereco || '', origemCep || undefined);
        const destinoCoords = await geocodeAddress(destinoEndereco || '', destinoCep || undefined);

        if (!origemCoords || !destinoCoords) {
          setRouteInfo(null);
          setLoading(false);
          return;
        }

        // Get route from OSRM
        const osrmUrl = `https://router.project-osrm.org/route/v1/driving/${origemCoords.lng},${origemCoords.lat};${destinoCoords.lng},${destinoCoords.lat}?overview=false`;
        
        const response = await fetch(osrmUrl);
        const data = await response.json();

        if (data.code === 'Ok' && data.routes && data.routes.length > 0) {
          const route = data.routes[0];
          setRouteInfo({
            distance: route.distance / 1000, // km
            duration: route.duration / 60, // minutes
          });
        } else {
          setRouteInfo(null);
        }
      } catch (error) {
        console.error('Route calculation error:', error);
        setRouteInfo(null);
      }

      setLoading(false);
    };

    calculateRoute();
  }, [origemEndereco, destinoEndereco, origemCep, destinoCep]);

  return { routeInfo, loading };
}
