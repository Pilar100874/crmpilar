import React, { useState, useEffect, useRef } from 'react';
import { MapPin, Loader2, MapPinned } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

interface AddressSuggestion {
  id: string;
  display_name: string;
  lat: number;
  lon: number;
  label: string;
  type: 'cep' | 'address';
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

// Busca por CEP usando ViaCEP + coordenadas via Nominatim
async function searchByCEP(cep: string): Promise<AddressSuggestion[]> {
  const cleanCep = cep.replace(/\D/g, '');
  
  // CEP brasileiro precisa ter 8 dígitos
  if (cleanCep.length !== 8) return [];

  try {
    console.log('Buscando CEP:', cleanCep);
    
    const response = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`);
    const data = await response.json();
    
    console.log('Resposta ViaCEP:', data);
    
    if (data.erro) {
      console.log('CEP não encontrado');
      return [];
    }
    
    // Monta endereço para buscar coordenadas - usa cidade + estado que sempre funciona
    const citySearch = `${data.localidade}, ${data.uf}, Brasil`;
    console.log('Buscando coordenadas para:', citySearch);
    
    const geoResponse = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(citySearch)}&countrycodes=br&limit=1`,
      { headers: { 'Accept-Language': 'pt-BR', 'User-Agent': 'LogisticaApp/1.0' } }
    );
    const geoData = await geoResponse.json();
    
    console.log('Resposta Nominatim:', geoData);
    
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
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}&countrycodes=br&limit=6&addressdetails=1`,
      { headers: { 'Accept-Language': 'pt-BR', 'User-Agent': 'LogisticaApp/1.0' } }
    );
    
    if (!response.ok) return [];
    
    const data = await response.json();
    
    if (data && data.length > 0) {
      return data.map((item: any) => {
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
  placeholder = 'Digite endereço ou CEP (8 dígitos)...',
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
      
      // Verifica se é busca por CEP (8 dígitos numéricos)
      const cleanQuery = query.replace(/\D/g, '');
      const isCepSearch = cleanQuery.length === 8;
      
      if (isCepSearch) {
        // Busca por CEP
        results = await searchByCEP(query);
      }
      
      // Se não é CEP ou CEP não encontrou, busca no Nominatim
      if (results.length === 0) {
        results = await searchNominatim(query);
      }
      
      // Remove duplicatas
      const uniqueResults: AddressSuggestion[] = [];
      for (const result of results) {
        const isDuplicate = uniqueResults.some(r => 
          Math.abs(r.lat - result.lat) < 0.001 && Math.abs(r.lon - result.lon) < 0.001
        );
        if (!isDuplicate) {
          uniqueResults.push(result);
        }
      }
      
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
                  {suggestion.type === 'cep' ? (
                    <MapPinned className="h-4 w-4 text-green-500" />
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
