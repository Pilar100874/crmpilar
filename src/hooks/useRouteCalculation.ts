import { useState, useEffect } from 'react';

interface RouteInfo {
  distance: number; // km
  duration: number; // minutes
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

export function useRouteCalculation(
  origemEndereco: string | null | undefined,
  destinoEndereco: string | null | undefined,
  origemCep: string | null | undefined,
  destinoCep: string | null | undefined
) {
  const [routeInfo, setRouteInfo] = useState<RouteInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const calculateRoute = async () => {
      // Need at least CEP or address for both origin and destination
      if ((!origemEndereco && !origemCep) || (!destinoEndereco && !destinoCep)) {
        setRouteInfo(null);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        // Geocode addresses
        const origemCoords = await geocodeAddress(origemEndereco || '', origemCep || undefined);
        const destinoCoords = await geocodeAddress(destinoEndereco || '', destinoCep || undefined);

        if (!origemCoords) {
          console.log('Failed to geocode origin');
          setError('Não foi possível localizar o endereço de origem');
          setRouteInfo(null);
          setLoading(false);
          return;
        }

        if (!destinoCoords) {
          console.log('Failed to geocode destination');
          setError('Não foi possível localizar o endereço de destino');
          setRouteInfo(null);
          setLoading(false);
          return;
        }

        console.log('Coords found - Origin:', origemCoords, 'Destination:', destinoCoords);

        // Get route from OSRM
        const osrmUrl = `https://router.project-osrm.org/route/v1/driving/${origemCoords.lng},${origemCoords.lat};${destinoCoords.lng},${destinoCoords.lat}?overview=false`;
        
        const response = await fetch(osrmUrl);
        const data = await response.json();

        if (data.code === 'Ok' && data.routes && data.routes.length > 0) {
          const route = data.routes[0];
          console.log('Route found:', route.distance, 'meters,', route.duration, 'seconds');
          setRouteInfo({
            distance: route.distance / 1000, // km
            duration: route.duration / 60, // minutes
          });
        } else {
          console.log('OSRM failed:', data);
          setError('Não foi possível calcular a rota');
          setRouteInfo(null);
        }
      } catch (error) {
        console.error('Route calculation error:', error);
        setError('Erro ao calcular rota');
        setRouteInfo(null);
      }

      setLoading(false);
    };

    calculateRoute();
  }, [origemEndereco, destinoEndereco, origemCep, destinoCep]);

  return { routeInfo, loading, error };
}
