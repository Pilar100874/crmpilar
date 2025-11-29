import React, { useState, useEffect, useRef } from 'react';
import { MapPin, Loader2, Building2, MapPinned } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

interface AddressSuggestion {
  id: string;
  display_name: string;
  lat: number;
  lon: number;
  label: string;
  type: 'cep' | 'city' | 'address';
}

interface AddressAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  onSelect: (address: string, lat: number, lng: number) => void;
  placeholder?: string;
  className?: string;
  hasError?: boolean;
  hasCoordinates?: boolean;
}

// Cache de coordenadas de cidades do IBGE
const cityCoordinatesCache: Record<string, { lat: number; lon: number }> = {};

// Busca cidades brasileiras via IBGE (100% gratuito e completo)
async function searchCitiesIBGE(query: string): Promise<AddressSuggestion[]> {
  if (query.length < 2) return [];
  
  try {
    // Busca todas as cidades e filtra localmente (API IBGE não tem filtro por nome)
    const response = await fetch(
      'https://servicodados.ibge.gov.br/api/v1/localidades/municipios?orderBy=nome'
    );
    
    if (!response.ok) return [];
    
    const cities = await response.json();
    const queryLower = query.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    
    // Filtra cidades que contêm o texto buscado
    const filtered = cities
      .filter((city: any) => {
        const cityName = city.nome.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        const stateName = city.microrregiao?.mesorregiao?.UF?.nome?.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '') || '';
        const stateSigla = city.microrregiao?.mesorregiao?.UF?.sigla?.toLowerCase() || '';
        
        return cityName.includes(queryLower) || 
               `${cityName} ${stateSigla}`.includes(queryLower) ||
               `${cityName} ${stateName}`.includes(queryLower);
      })
      .slice(0, 6);
    
    // Busca coordenadas para cada cidade encontrada
    const results: AddressSuggestion[] = [];
    
    for (const city of filtered) {
      const stateSigla = city.microrregiao?.mesorregiao?.UF?.sigla || '';
      const displayName = `${city.nome}, ${stateSigla}, Brasil`;
      const cacheKey = `${city.id}`;
      
      let coords = cityCoordinatesCache[cacheKey];
      
      if (!coords) {
        // Busca coordenadas via Nominatim
        try {
          const geoResponse = await fetch(
            `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(displayName)}&limit=1`,
            { headers: { 'Accept-Language': 'pt-BR', 'User-Agent': 'LogisticaApp/1.0' } }
          );
          const geoData = await geoResponse.json();
          
          if (geoData && geoData.length > 0) {
            coords = {
              lat: parseFloat(geoData[0].lat),
              lon: parseFloat(geoData[0].lon)
            };
            cityCoordinatesCache[cacheKey] = coords;
          }
        } catch (e) {
          console.error('Geo error:', e);
        }
      }
      
      if (coords) {
        results.push({
          id: `city-${city.id}`,
          display_name: displayName,
          lat: coords.lat,
          lon: coords.lon,
          label: displayName,
          type: 'city'
        });
      }
      
      // Pequeno delay para não sobrecarregar Nominatim
      if (filtered.indexOf(city) < filtered.length - 1) {
        await new Promise(r => setTimeout(r, 100));
      }
    }
    
    return results;
  } catch (error) {
    console.error('IBGE search error:', error);
    return [];
  }
}

// Busca por CEP usando ViaCEP + coordenadas
async function searchByCEP(cep: string): Promise<AddressSuggestion[]> {
  const cleanCep = cep.replace(/\D/g, '');
  if (cleanCep.length < 5) return [];

  try {
    const response = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`);
    const data = await response.json();
    
    if (data.erro) return [];
    
    const fullAddress = `${data.logradouro ? data.logradouro + ', ' : ''}${data.bairro ? data.bairro + ', ' : ''}${data.localidade}, ${data.uf}, Brasil`;
    
    // Busca coordenadas
    const geoResponse = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(fullAddress)}&countrycodes=br&limit=1`,
      { headers: { 'Accept-Language': 'pt-BR', 'User-Agent': 'LogisticaApp/1.0' } }
    );
    const geoData = await geoResponse.json();
    
    if (geoData && geoData.length > 0) {
      const displayParts = [];
      if (data.logradouro) displayParts.push(data.logradouro);
      if (data.bairro) displayParts.push(data.bairro);
      displayParts.push(`${data.localidade} - ${data.uf}`);
      displayParts.push(data.cep);
      
      return [{
        id: `cep-${cleanCep}`,
        display_name: displayParts.join(', '),
        lat: parseFloat(geoData[0].lat),
        lon: parseFloat(geoData[0].lon),
        label: displayParts.join(', '),
        type: 'cep'
      }];
    }
    
    return [];
  } catch (error) {
    console.error('CEP search error:', error);
    return [];
  }
}

// Busca endereços via Nominatim
async function searchNominatim(query: string): Promise<AddressSuggestion[]> {
  try {
    // Adiciona "Brasil" para melhorar resultados
    const searchQuery = query.toLowerCase().includes('brasil') ? query : `${query}, Brasil`;
    
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}&countrycodes=br&limit=5&addressdetails=1`,
      { headers: { 'Accept-Language': 'pt-BR', 'User-Agent': 'LogisticaApp/1.0' } }
    );
    
    if (!response.ok) return [];
    
    const data = await response.json();
    
    if (data && data.length > 0) {
      return data.map((item: any) => {
        // Formata o endereço de forma mais limpa
        const address = item.address || {};
        const parts = [];
        
        if (address.road) parts.push(address.road);
        if (address.suburb || address.neighbourhood) parts.push(address.suburb || address.neighbourhood);
        if (address.city || address.town || address.village) parts.push(address.city || address.town || address.village);
        if (address.state) parts.push(address.state);
        
        const displayName = parts.length > 0 ? parts.join(', ') : item.display_name;
        
        return {
          id: `nom-${item.place_id}`,
          display_name: displayName,
          lat: parseFloat(item.lat),
          lon: parseFloat(item.lon),
          label: displayName,
          type: 'address' as const
        };
      });
    }
    return [];
  } catch (error) {
    console.error('Nominatim search error:', error);
    return [];
  }
}

export const AddressAutocomplete: React.FC<AddressAutocompleteProps> = ({
  value,
  onChange,
  onSelect,
  placeholder = 'Digite cidade, endereço ou CEP...',
  className,
  hasError,
  hasCoordinates,
}) => {
  const [suggestions, setSuggestions] = useState<AddressSuggestion[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<NodeJS.Timeout>();

  const searchAddresses = async (query: string) => {
    if (query.length < 3) {
      setSuggestions([]);
      setIsOpen(false);
      return;
    }

    setLoading(true);
    
    try {
      let results: AddressSuggestion[] = [];
      const isCepSearch = /^\d{5}/.test(query.replace(/\D/g, ''));
      
      // Busca em paralelo para ser mais rápido
      const promises: Promise<AddressSuggestion[]>[] = [];
      
      if (isCepSearch) {
        promises.push(searchByCEP(query));
      }
      
      // Sempre busca no Nominatim
      promises.push(searchNominatim(query));
      
      const allResults = await Promise.all(promises);
      results = allResults.flat();
      
      // Remove duplicatas baseado em coordenadas próximas
      const uniqueResults: AddressSuggestion[] = [];
      for (const result of results) {
        const isDuplicate = uniqueResults.some(r => 
          Math.abs(r.lat - result.lat) < 0.001 && Math.abs(r.lon - result.lon) < 0.001
        );
        if (!isDuplicate) {
          uniqueResults.push(result);
        }
      }
      
      // Limita a 8 resultados
      const finalResults = uniqueResults.slice(0, 8);
      
      setSuggestions(finalResults);
      setIsOpen(finalResults.length > 0);
      setSelectedIndex(-1);
    } catch (error) {
      console.error('Address search error:', error);
      setSuggestions([]);
      setIsOpen(false);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    debounceRef.current = setTimeout(() => {
      searchAddresses(value);
    }, 400);

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [value]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (suggestion: AddressSuggestion) => {
    onSelect(suggestion.display_name, suggestion.lat, suggestion.lon);
    setIsOpen(false);
    setSuggestions([]);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen || suggestions.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => (prev < suggestions.length - 1 ? prev + 1 : prev));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => (prev > 0 ? prev - 1 : -1));
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedIndex >= 0 && selectedIndex < suggestions.length) {
          handleSelect(suggestions[selectedIndex]);
        }
        break;
      case 'Escape':
        setIsOpen(false);
        break;
    }
  };

  const formatAddress = (suggestion: AddressSuggestion): { main: string; secondary: string } => {
    const parts = suggestion.display_name.split(', ');
    if (parts.length > 2) {
      return {
        main: parts.slice(0, 2).join(', '),
        secondary: parts.slice(2, 4).join(', '),
      };
    }
    return {
      main: suggestion.display_name,
      secondary: '',
    };
  };

  const getTypeIcon = (type: AddressSuggestion['type']) => {
    switch (type) {
      case 'cep':
        return <MapPinned className="h-4 w-4 text-green-500" />;
      case 'city':
        return <Building2 className="h-4 w-4 text-blue-500" />;
      default:
        return <MapPin className="h-4 w-4 text-muted-foreground" />;
    }
  };

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <Input
          ref={inputRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => suggestions.length > 0 && setIsOpen(true)}
          placeholder={placeholder}
          className={cn(
            className,
            hasError && 'border-destructive',
            hasCoordinates && 'border-green-500'
          )}
        />
        {loading && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          </div>
        )}
      </div>

      {isOpen && suggestions.length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-popover border rounded-md shadow-lg max-h-60 overflow-auto">
          {suggestions.map((suggestion, index) => {
            const { main, secondary } = formatAddress(suggestion);
            return (
              <div
                key={suggestion.id}
                onClick={() => handleSelect(suggestion)}
                className={cn(
                  'flex items-start gap-2 px-3 py-2 cursor-pointer transition-colors',
                  index === selectedIndex ? 'bg-accent' : 'hover:bg-accent/50'
                )}
              >
                <div className="flex items-center justify-center w-5 h-5 mt-0.5">
                  {getTypeIcon(suggestion.type)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{main}</p>
                  {secondary && (
                    <p className="text-xs text-muted-foreground truncate">{secondary}</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
