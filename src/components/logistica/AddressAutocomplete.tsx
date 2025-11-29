import React, { useState, useEffect, useRef } from 'react';
import { MapPin, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';

interface AddressSuggestion {
  id: string;
  display_name: string;
  lat: number;
  lon: number;
  label: string;
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

export const AddressAutocomplete: React.FC<AddressAutocompleteProps> = ({
  value,
  onChange,
  onSelect,
  placeholder = 'Digite um endereço...',
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

  // Search addresses using OpenRouteService via edge function
  const searchAddresses = async (query: string) => {
    if (query.length < 3) {
      setSuggestions([]);
      setIsOpen(false);
      return;
    }

    setLoading(true);
    try {
      const response = await supabase.functions.invoke('openrouteservice-proxy', {
        body: {
          action: 'geocode',
          text: query + ', Brasil'
        }
      });

      if (response.error) throw response.error;

      const data = response.data;
      if (data.features && data.features.length > 0) {
        const suggestions: AddressSuggestion[] = data.features.map((feature: any) => ({
          id: feature.properties.id || `${feature.geometry.coordinates[0]}-${feature.geometry.coordinates[1]}`,
          display_name: feature.properties.label,
          lat: feature.geometry.coordinates[1],
          lon: feature.geometry.coordinates[0],
          label: feature.properties.label
        }));
        setSuggestions(suggestions);
        setIsOpen(suggestions.length > 0);
        setSelectedIndex(-1);
      } else {
        setSuggestions([]);
        setIsOpen(false);
      }
    } catch (error) {
      console.error('Address search error:', error);
      setSuggestions([]);
      setIsOpen(false);
    } finally {
      setLoading(false);
    }
  };

  // Debounced search
  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    debounceRef.current = setTimeout(() => {
      searchAddresses(value);
    }, 300);

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [value]);

  // Close dropdown on outside click
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
                <MapPin className="h-4 w-4 mt-0.5 text-muted-foreground flex-shrink-0" />
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
