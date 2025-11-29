import React, { useState, useEffect, useRef } from 'react';
import { MapPin, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

interface AddressSuggestion {
  id: string;
  display_name: string;
  lat: number;
  lon: number;
  label: string;
  type?: string;
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

// Busca por CEP usando ViaCEP + Nominatim para coordenadas
async function searchByCEP(cep: string): Promise<AddressSuggestion[]> {
  const cleanCep = cep.replace(/\D/g, '');
  if (cleanCep.length < 5) return [];

  try {
    const response = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`);
    const data = await response.json();
    
    if (data.erro) return [];
    
    const fullAddress = `${data.logradouro ? data.logradouro + ', ' : ''}${data.bairro ? data.bairro + ', ' : ''}${data.localidade}, ${data.uf}`;
    
    // Busca coordenadas via Nominatim
    const geoResponse = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(fullAddress)}&countrycodes=br&limit=1`,
      { headers: { 'Accept-Language': 'pt-BR' } }
    );
    const geoData = await geoResponse.json();
    
    if (geoData && geoData.length > 0) {
      return [{
        id: `cep-${cleanCep}`,
        display_name: `${data.logradouro || ''}, ${data.bairro || ''}, ${data.localidade} - ${data.uf}, ${data.cep}`,
        lat: parseFloat(geoData[0].lat),
        lon: parseFloat(geoData[0].lon),
        label: `${data.logradouro || ''}, ${data.bairro || ''}, ${data.localidade} - ${data.uf}`,
        type: 'cep'
      }];
    }
    
    return [];
  } catch (error) {
    console.error('CEP search error:', error);
    return [];
  }
}

// Busca usando Photon (autocomplete melhor para Brasil)
async function searchPhoton(query: string): Promise<AddressSuggestion[]> {
  try {
    const response = await fetch(
      `https://photon.komoot.io/api/?q=${encodeURIComponent(query)}&limit=6&lang=pt&lat=-14.235&lon=-51.925&location_bias_scale=0.1`,
      { headers: { 'Accept': 'application/json' } }
    );
    
    if (!response.ok) return [];
    
    const data = await response.json();
    
    if (data.features && data.features.length > 0) {
      return data.features
        .filter((f: any) => f.properties?.country === 'Brazil' || f.properties?.country === 'Brasil')
        .map((feature: any) => {
          const props = feature.properties;
          const parts: string[] = [];
          
          if (props.name) parts.push(props.name);
          if (props.street && props.street !== props.name) parts.push(props.street);
          if (props.district) parts.push(props.district);
          if (props.city) parts.push(props.city);
          if (props.state) parts.push(props.state);
          
          const displayName = parts.join(', ') || props.name || 'Local desconhecido';
          
          return {
            id: `photon-${feature.geometry.coordinates[0]}-${feature.geometry.coordinates[1]}`,
            display_name: displayName,
            lat: feature.geometry.coordinates[1],
            lon: feature.geometry.coordinates[0],
            label: displayName,
            type: props.type || 'place'
          };
        });
    }
    return [];
  } catch (error) {
    console.error('Photon search error:', error);
    return [];
  }
}

// Busca usando Nominatim como fallback
async function searchNominatim(query: string): Promise<AddressSuggestion[]> {
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&countrycodes=br&limit=5&addressdetails=1`,
      { headers: { 'Accept-Language': 'pt-BR', 'User-Agent': 'LogisticaApp/1.0' } }
    );
    
    if (!response.ok) return [];
    
    const data = await response.json();
    
    if (data && data.length > 0) {
      return data.map((item: any) => ({
        id: `nom-${item.place_id}`,
        display_name: item.display_name,
        lat: parseFloat(item.lat),
        lon: parseFloat(item.lon),
        label: item.display_name,
        type: item.type
      }));
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
  placeholder = 'Digite um endereço ou CEP...',
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
      const isCepSearch = /^\d{5}/.test(query.replace(/\D/g, ''));
      let results: AddressSuggestion[] = [];
      
      // Se parece CEP, busca por CEP primeiro
      if (isCepSearch) {
        results = await searchByCEP(query);
      }
      
      // Busca via Photon (melhor autocomplete)
      if (results.length < 4) {
        const photonResults = await searchPhoton(query);
        results = [...results, ...photonResults];
      }
      
      // Se ainda não tem resultados suficientes, tenta Nominatim
      if (results.length < 3) {
        const nominatimResults = await searchNominatim(query);
        // Remove duplicatas baseado em coordenadas próximas
        const filteredNominatim = nominatimResults.filter(nr => 
          !results.some(r => 
            Math.abs(r.lat - nr.lat) < 0.001 && Math.abs(r.lon - nr.lon) < 0.001
          )
        );
        results = [...results, ...filteredNominatim];
      }
      
      // Limita a 8 resultados
      results = results.slice(0, 8);
      
      setSuggestions(results);
      setIsOpen(results.length > 0);
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
    }, 350);

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
        secondary: parts.slice(2, 5).join(', '),
      };
    }
    return {
      main: suggestion.display_name,
      secondary: '',
    };
  };

  const getTypeIcon = (type?: string) => {
    if (type === 'cep') return '📮';
    if (type === 'city' || type === 'town') return '🏙️';
    if (type === 'street' || type === 'road') return '🛣️';
    return null;
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
            const typeIcon = getTypeIcon(suggestion.type);
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
                  {typeIcon ? (
                    <span className="text-sm">{typeIcon}</span>
                  ) : (
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                  )}
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
