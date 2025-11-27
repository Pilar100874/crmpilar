import { useState, useEffect, useRef, useCallback } from 'react';

interface RouteInfo {
  distance: number; // km
  duration: number; // minutes
}

interface RouteCache {
  origemCep: string;
  destinoCep: string;
  idaEVolta: boolean;
  routeInfo: RouteInfo;
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
  
  if (cep) {
    const viaCepData = await getAddressFromCep(cep);
    if (viaCepData) {
      searchQueries.push(`${viaCepData.localidade}, ${viaCepData.uf}, Brasil`);
      if (viaCepData.bairro) {
        searchQueries.push(`${viaCepData.bairro}, ${viaCepData.localidade}, ${viaCepData.uf}, Brasil`);
      }
    }
    searchQueries.push(`${cep.replace(/\D/g, '')}, Brasil`);
  }
  
  if (address) {
    const parts = address.split(',').map(p => p.trim()).filter(p => p);
    if (parts.length >= 2) {
      const cityState = parts.slice(-2).join(', ');
      searchQueries.push(`${cityState}, Brasil`);
    }
    searchQueries.push(`${address}, Brasil`);
  }

  const uniqueQueries = [...new Set(searchQueries)];

  for (const query of uniqueQueries) {
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
      console.error('Geocode error for query:', query, error);
    }
    
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  return null;
}

export function useRouteCalculation(
  origemEndereco: string | null | undefined,
  destinoEndereco: string | null | undefined,
  origemCep: string | null | undefined,
  destinoCep: string | null | undefined,
  idaEVolta: boolean = true
) {
  const [routeInfo, setRouteInfo] = useState<RouteInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const cacheRef = useRef<RouteCache | null>(null);
  const lastCalculationRef = useRef<string | null>(null);

  const calculateRoute = useCallback(async () => {
    if ((!origemEndereco && !origemCep) || (!destinoEndereco && !destinoCep)) {
      setRouteInfo(null);
      return;
    }

    const cleanOrigemCep = origemCep?.replace(/\D/g, '') || '';
    const cleanDestinoCep = destinoCep?.replace(/\D/g, '') || '';
    
    // Create a unique key for this calculation
    const calculationKey = `${cleanOrigemCep}-${cleanDestinoCep}`;
    
    // Check cache - only recalculate if CEPs changed
    if (cacheRef.current && 
        cacheRef.current.origemCep === cleanOrigemCep && 
        cacheRef.current.destinoCep === cleanDestinoCep) {
      // Same route, just adjust for ida e volta
      const cachedBase = cacheRef.current.routeInfo;
      const baseDistance = cacheRef.current.idaEVolta ? cachedBase.distance / 2 : cachedBase.distance;
      const baseDuration = cacheRef.current.idaEVolta ? cachedBase.duration / 2 : cachedBase.duration;
      
      const multiplier = idaEVolta ? 2 : 1;
      setRouteInfo({
        distance: baseDistance * multiplier,
        duration: baseDuration * multiplier
      });
      return;
    }

    // Prevent duplicate calculations
    if (lastCalculationRef.current === calculationKey && loading) {
      return;
    }
    
    lastCalculationRef.current = calculationKey;
    setLoading(true);
    setError(null);

    try {
      const origemCoords = await geocodeAddress(origemEndereco || '', origemCep || undefined);
      const destinoCoords = await geocodeAddress(destinoEndereco || '', destinoCep || undefined);

      if (!origemCoords) {
        setError('Não foi possível localizar o endereço de origem');
        setRouteInfo(null);
        setLoading(false);
        return;
      }

      if (!destinoCoords) {
        setError('Não foi possível localizar o endereço de destino');
        setRouteInfo(null);
        setLoading(false);
        return;
      }

      const osrmUrl = `https://router.project-osrm.org/route/v1/driving/${origemCoords.lng},${origemCoords.lat};${destinoCoords.lng},${destinoCoords.lat}?overview=false`;
      
      const response = await fetch(osrmUrl);
      const data = await response.json();

      if (data.code === 'Ok' && data.routes && data.routes.length > 0) {
        const route = data.routes[0];
        const multiplier = idaEVolta ? 2 : 1;
        const newRouteInfo = {
          distance: (route.distance / 1000) * multiplier, // km
          duration: (route.duration / 60) * multiplier, // minutes
        };
        
        // Cache the result (store as one-way for easier recalculation)
        cacheRef.current = {
          origemCep: cleanOrigemCep,
          destinoCep: cleanDestinoCep,
          idaEVolta,
          routeInfo: newRouteInfo
        };
        
        setRouteInfo(newRouteInfo);
      } else {
        setError('Não foi possível calcular a rota');
        setRouteInfo(null);
      }
    } catch (error) {
      console.error('Route calculation error:', error);
      setError('Erro ao calcular rota');
      setRouteInfo(null);
    }

    setLoading(false);
  }, [origemEndereco, destinoEndereco, origemCep, destinoCep, idaEVolta]);

  // Only recalculate when CEPs change or idaEVolta toggles
  useEffect(() => {
    calculateRoute();
  }, [origemCep, destinoCep, idaEVolta]);

  return { routeInfo, loading, error };
}
